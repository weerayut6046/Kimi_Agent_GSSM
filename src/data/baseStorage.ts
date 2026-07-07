import { supabase } from '@/lib/supabase';
import type {
  User, EmployeeProfile, Position, Skill, Station,
  Shift, Schedule, LeaveRequest, SwapRequest,
  Attendance, Notification, FuelPrice, DailyAccounting,
} from '@/types';
import { hashPassword } from '@/lib/security';

// ============================================
// ID Generator Helper
// ============================================
export const generateId = (): string =>
  'id-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);

// ============================================
// Backup Version
// ============================================
export const BACKUP_VERSION = '1.0.0';

// ============================================
// Audit Trail Helper
// ============================================
const sanitizeForJsonb = (value: unknown): unknown => {
  if (value === undefined || value === null) return null;
  try {
    return JSON.parse(JSON.stringify(value));
  } catch {
    return null;
  }
};

export const logAudit = async (params: {
  tableName: string;
  recordId: string;
  action: 'create' | 'update' | 'delete';
  oldValue?: unknown;
  newValue?: unknown;
  performedBy?: string;
  performedByEmail?: string | null;
  performedByName?: string | null;
}): Promise<void> => {
  try {
    const payload = {
      table_name: params.tableName,
      record_id: params.recordId,
      action: params.action,
      old_value: sanitizeForJsonb(params.oldValue),
      new_value: sanitizeForJsonb(params.newValue),
      performed_by: params.performedBy || 'system',
      performed_by_email: params.performedByEmail || null,
      performed_by_name: params.performedByName || null,
      ip_address: null,
    };
    const { error } = await supabase.from('audit_logs').insert(payload);
    if (error) {
      console.error('Audit log insert error:', error.message, error.code, error.details, payload);
    }
  } catch (err) {
    console.error('Audit log failed:', err);
  }
};

// Helper to check for RLS errors and provide helpful messages
export const checkForRLSError = (error: { message?: string; code?: string }, operation: string): void => {
  if (error?.message?.includes('406') || error?.message?.includes('Not Acceptable')) {
    console.error(`
❌ RLS (Row Level Security) Error ในการ ${operation}

ปัญหา: Supabase บล็อกการเข้าถึงข้อมูลเนื่องจากไม่มี RLS Policy

วิธีแก้ไข:
1. ไปที่ Supabase Dashboard → Table Editor → [ชื่อตาราง] → Policies
2. คลิก "New Policy" หรือปิด RLS ชั่วคราว (สำหรับ development)

SQL สำหรับสร้าง Policy:
  CREATE POLICY "Allow all" ON [ชื่อตาราง] FOR ALL USING (true) WITH CHECK (true);

หรือปิด RLS:
  ALTER TABLE [ชื่อตาราง] DISABLE ROW LEVEL SECURITY;
    `);
  }
};

// ============================================
// Name Helper
// ============================================
export const splitFullName = (fullName: string): { firstName: string; lastName: string } => {
  const parts = fullName.trim().split(/\s+/);
  if (parts.length === 1) return { firstName: parts[0], lastName: '' };
  return { firstName: parts[0], lastName: parts.slice(1).join(' ') };
};

// ============================================
// User Mapping Helpers
// ============================================
export const mapUserFromDb = (row: Record<string, unknown>): User => ({
  id: row.id as string,
  authUid: (row.authuid || row.authUid) as string,
  email: row.email as string,
  password: row.password as string,
  role: row.role as 'admin' | 'manager' | 'staff',
  profileId: row.profileid as string,
  createdAt: row.createdat as string,
  updatedAt: row.updatedat as string,
});

export const mapUserToDb = (user: User | Partial<User>): Record<string, unknown> => {
  const result: Record<string, unknown> = {};
  if (user.id !== undefined) result.id = user.id;
  if (user.authUid !== undefined) result.authuid = user.authUid;
  if (user.email !== undefined) result.email = user.email;
  if (user.password !== undefined) result.password = user.password;
  if (user.role !== undefined) result.role = user.role;
  if (user.profileId !== undefined) result.profileid = user.profileId;
  if (user.createdAt !== undefined) result.createdat = user.createdAt;
  if (user.updatedAt !== undefined) result.updatedat = user.updatedAt;
  return result;
};

// ============================================
// Profile (Employee) Mapping Helpers
// ============================================
export const mapProfileFromDb = (row: Record<string, unknown>): EmployeeProfile => ({
  id: row.id as string,
  userId: row.userid as string,
  firstName: (row.firstname as string) || '',
  lastName: (row.lastname as string) || '',
  fullName: (row.fullname as string) || `${row.firstname || ''} ${row.lastname || ''}`.trim(),
  phone: row.phone as string,
  avatar: row.avatar as string,
  positionId: row.positionid as string,
  stationId: row.stationid as string,
  status: row.status as 'active' | 'inactive',
  hireDate: row.hiredate as string,
  position: { id: '', name: '', description: '' },
  skills: [],
});

export const mapProfileToDb = (profile: EmployeeProfile | Partial<EmployeeProfile>): Record<string, unknown> => {
  const result: Record<string, unknown> = {};
  if (profile.id !== undefined) result.id = profile.id;
  if (profile.userId !== undefined) result.userid = profile.userId;
  if (profile.firstName !== undefined) result.firstname = profile.firstName;
  if (profile.lastName !== undefined) result.lastname = profile.lastName;
  if (profile.fullName !== undefined) result.fullname = profile.fullName;
  if (profile.phone !== undefined) result.phone = profile.phone;
  if (profile.avatar !== undefined) result.avatar = profile.avatar;
  if (profile.positionId !== undefined) result.positionid = profile.positionId;
  if (profile.stationId !== undefined) result.stationid = profile.stationId;
  if (profile.status !== undefined) result.status = profile.status;
  if (profile.hireDate !== undefined) result.hiredate = profile.hireDate;
  return result;
};

// ============================================
// Position / Skill / Station Mapping Helpers
// ============================================
export const mapPositionFromDb = (row: Record<string, unknown>): Position => ({
  id: row.id as string,
  name: row.name as string,
  description: row.description as string,
});

export const mapSkillFromDb = (row: Record<string, unknown>): Skill => ({
  id: row.id as string,
  name: row.name as string,
  code: row.code as string,
});

export const mapStationFromDb = (row: Record<string, unknown>): Station => ({
  id: row.id as string,
  name: row.name as string,
  address: row.address as string,
  phone: row.phone as string,
  managerId: row.managerid as string,
});

export const mapStationToDb = (station: Station | Partial<Station>): Record<string, unknown> => {
  const result: Record<string, unknown> = {};
  if (station.id !== undefined) result.id = station.id;
  if (station.name !== undefined) result.name = station.name;
  if (station.address !== undefined) result.address = station.address;
  if (station.phone !== undefined) result.phone = station.phone;
  if (station.managerId !== undefined) result.managerid = station.managerId;
  return result;
};

// ============================================
// Shift / Schedule Mapping Helpers
// ============================================
export const mapShiftFromDb = (row: Record<string, unknown>): Shift => ({
  id: row.id as string,
  name: row.name as string,
  startTime: row.starttime as string,
  endTime: row.endtime as string,
  minStaff: row.minstaff as number,
  requiredSkills: (row.requiredskills as string[]) || [],
  color: row.color as string,
});

export const mapShiftToDb = (shift: Shift | Partial<Shift>): Record<string, unknown> => {
  const result: Record<string, unknown> = {};
  if (shift.id !== undefined) result.id = shift.id;
  if (shift.name !== undefined) result.name = shift.name;
  if (shift.startTime !== undefined) result.starttime = shift.startTime;
  if (shift.endTime !== undefined) result.endtime = shift.endTime;
  if (shift.minStaff !== undefined) result.minstaff = shift.minStaff;
  if (shift.requiredSkills !== undefined) result.requiredskills = shift.requiredSkills;
  if (shift.color !== undefined) result.color = shift.color;
  return result;
};

export const mapScheduleFromDb = (row: Record<string, unknown>): Schedule => ({
  id: row.id as string,
  date: row.date as string,
  shiftId: row.shiftid as string,
  shift: {} as Shift,
  employeeId: row.employeeid as string,
  employee: {} as EmployeeProfile,
  stationId: row.stationid as string,
  status: row.status as Schedule['status'],
  note: row.note as string,
  createdBy: row.createdby as string,
  createdAt: row.createdat as string,
});

export const mapScheduleToDb = (schedule: Schedule | Partial<Schedule>): Record<string, unknown> => {
  const result: Record<string, unknown> = {};
  if (schedule.id !== undefined) result.id = schedule.id;
  if (schedule.date !== undefined) result.date = schedule.date;
  if (schedule.shiftId !== undefined) result.shiftid = schedule.shiftId;
  if (schedule.employeeId !== undefined) result.employeeid = schedule.employeeId;
  if (schedule.stationId !== undefined) result.stationid = schedule.stationId;
  if (schedule.status !== undefined) result.status = schedule.status;
  if (schedule.note !== undefined) result.note = schedule.note;
  if (schedule.createdBy !== undefined) result.createdby = schedule.createdBy;
  if (schedule.createdAt !== undefined) result.createdat = schedule.createdAt;
  return result;
};

// ============================================
// Leave / Swap / Attendance Mapping Helpers
// ============================================
export const mapLeaveRequestFromDb = (row: Record<string, unknown>): LeaveRequest => ({
  id: row.id as string,
  employeeId: row.employeeid as string,
  employee: undefined as unknown as EmployeeProfile,
  type: row.type as LeaveRequest['type'],
  startDate: row.startdate as string,
  endDate: row.enddate as string,
  days: row.days as number,
  reason: row.reason as string,
  status: row.status as LeaveRequest['status'],
  approvedBy: row.approvedby as string | null,
  approvedAt: row.approvedat as string | null,
  createdAt: row.createdat as string,
});

export const mapLeaveRequestToDb = (request: Omit<LeaveRequest, 'employee'>): Record<string, unknown> => ({
  id: request.id,
  employeeid: request.employeeId,
  type: request.type,
  startdate: request.startDate,
  enddate: request.endDate,
  days: request.days,
  reason: request.reason,
  status: request.status,
  approvedby: request.approvedBy,
  approvedat: request.approvedAt,
  createdat: request.createdAt,
});

export const mapSwapRequestFromDb = (row: Record<string, unknown>): SwapRequest => ({
  id: row.id as string,
  requesterId: row.requesterid as string,
  requester: undefined as unknown as EmployeeProfile,
  requestedId: row.requestedid as string,
  requested: undefined as unknown as EmployeeProfile,
  scheduleId: row.scheduleid as string,
  schedule: undefined as unknown as Schedule,
  targetScheduleId: row.targetscheduleid as string,
  targetSchedule: undefined as unknown as Schedule,
  status: row.status as SwapRequest['status'],
  approvedBy: row.approvedby as string | null,
  createdAt: row.createdat as string,
});

export const mapSwapRequestToDb = (request: Omit<SwapRequest, 'requester' | 'requested' | 'schedule' | 'targetSchedule'>): Record<string, unknown> => ({
  id: request.id,
  requesterid: request.requesterId,
  requestedid: request.requestedId,
  scheduleid: request.scheduleId,
  targetscheduleid: request.targetScheduleId,
  status: request.status,
  approvedby: request.approvedBy,
  createdat: request.createdAt,
});

export const mapAttendanceFromDb = (row: Record<string, unknown>): Attendance => ({
  id: row.id as string,
  employeeId: row.employeeid as string,
  employee: undefined as unknown as EmployeeProfile,
  scheduleId: row.scheduleid as string,
  schedule: undefined as unknown as Schedule,
  checkIn: row.checkin as string | null,
  checkOut: row.checkout as string | null,
  checkInLocation: row.checkinlocation as string,
  checkOutLocation: row.checkoutlocation as string,
  note: row.note as string,
  status: row.status as Attendance['status'],
});

export const mapAttendanceToDb = (attendance: Omit<Attendance, 'employee' | 'schedule'>): Record<string, unknown> => ({
  id: attendance.id,
  employeeid: attendance.employeeId,
  scheduleid: attendance.scheduleId,
  checkin: attendance.checkIn,
  checkout: attendance.checkOut,
  checkinlocation: attendance.checkInLocation,
  checkoutlocation: attendance.checkOutLocation,
  note: attendance.note,
  status: attendance.status,
});

// ============================================
// Notification Mapping Helpers
// ============================================
export const mapNotificationFromDb = (row: Record<string, unknown>): Notification => ({
  id: row.id as string,
  userId: (row.userid || row.userId) as string,
  title: row.title as string,
  message: row.message as string,
  type: row.type as Notification['type'],
  read: row.read === true || row.read === 'true',
  createdAt: (row.createdat || row.createdAt) as string,
});

export const mapNotificationToDb = (notification: Notification | Partial<Notification>): Record<string, unknown> => {
  const result: Record<string, unknown> = {};
  if (notification.id !== undefined) result.id = notification.id;
  if (notification.userId !== undefined) result.userid = notification.userId;
  if (notification.title !== undefined) result.title = notification.title;
  if (notification.message !== undefined) result.message = notification.message;
  if (notification.type !== undefined) result.type = notification.type;
  if (notification.read !== undefined) result.read = notification.read;
  if (notification.createdAt !== undefined) result.createdat = notification.createdAt;
  return result;
};

// ============================================
// Fuel Price / Daily Accounting Mapping Helpers
// ============================================
export const mapFuelPriceFromDb = (row: Record<string, unknown>): FuelPrice => ({
  id: row.id as string,
  '95': Number(row['95']) || 0,
  'B7': Number(row['B7']) || 0,
  'B10': Number(row['B10']) || 0,
  'Diesel': Number(row['Diesel']) || 0,
  effectiveDate: (row.effectivedate || row.effectiveDate) as string,
  createdAt: (row.createdat || row.createdAt) as string,
});

export const mapFuelPriceToDb = (price: FuelPrice | Partial<FuelPrice>): Record<string, unknown> => {
  const result: Record<string, unknown> = {};
  if (price.id !== undefined) result.id = price.id;
  if (price['95'] !== undefined) result['95'] = price['95'];
  if (price['B7'] !== undefined) result['B7'] = price['B7'];
  if (price['B10'] !== undefined) result['B10'] = price['B10'];
  if (price['Diesel'] !== undefined) result['Diesel'] = price['Diesel'];
  if (price.effectiveDate !== undefined) result.effectivedate = price.effectiveDate;
  if (price.createdAt !== undefined) result.createdat = price.createdAt;
  return result;
};

// Helpers สำหรับแปลงค่าจากฐานข้อมูลให้ปลอดภัย
const safeNumber = (value: unknown): number => {
  if (value === null || value === undefined) return 0;
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const parsed = parseFloat(value);
    return Number.isNaN(parsed) ? 0 : parsed;
  }
  if (typeof value === 'boolean') return value ? 1 : 0;
  const parsed = Number(value);
  return Number.isNaN(parsed) ? 0 : parsed;
};

const safeJson = (value: unknown): unknown => {
  if (value === null || value === undefined) return undefined;
  if (typeof value === 'object') return value;
  if (typeof value === 'string') {
    try {
      return JSON.parse(value);
    } catch {
      return undefined;
    }
  }
  return undefined;
};

const safeFuelSales = (value: unknown): DailyAccounting['fuelSales'] => {
  const parsed = safeJson(value) as Record<string, unknown> | undefined;
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return { '95': 0, 'B7': 0, 'B10': 0, 'Diesel': 0 };
  }
  return {
    '95': safeNumber(parsed['95']),
    'B7': safeNumber(parsed['B7']),
    'B10': safeNumber(parsed['B10']),
    'Diesel': safeNumber(parsed['Diesel']),
  };
};

const safeFuelAmount = (value: unknown): DailyAccounting['fuelAmount'] => {
  const parsed = safeJson(value) as Record<string, unknown> | undefined;
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return { '95': 0, 'B7': 0, 'B10': 0, 'Diesel': 0 };
  }
  return {
    '95': safeNumber(parsed['95']),
    'B7': safeNumber(parsed['B7']),
    'B10': safeNumber(parsed['B10']),
    'Diesel': safeNumber(parsed['Diesel']),
  };
};

const safeNozzleCash = (value: unknown): { start: number; end: number } => {
  const parsed = safeJson(value) as Record<string, unknown> | undefined;
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return { start: 0, end: 0 };
  }
  return { start: safeNumber(parsed.start), end: safeNumber(parsed.end) };
};

const safeDispenserCash = (value: unknown): DailyAccounting['dispenserCash'] => {
  const parsed = safeJson(value) as Record<string, unknown> | undefined;
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return {
      dispenser1: { nozzle1: { start: 0, end: 0 }, nozzle2: { start: 0, end: 0 } },
      dispenser2: { nozzle1: { start: 0, end: 0 }, nozzle2: { start: 0, end: 0 } },
    };
  }
  const d1 = safeJson(parsed.dispenser1) as Record<string, unknown> | undefined;
  const d2 = safeJson(parsed.dispenser2) as Record<string, unknown> | undefined;
  return {
    dispenser1: {
      nozzle1: safeNozzleCash(d1?.nozzle1),
      nozzle2: safeNozzleCash(d1?.nozzle2),
    },
    dispenser2: {
      nozzle1: safeNozzleCash(d2?.nozzle1),
      nozzle2: safeNozzleCash(d2?.nozzle2),
    },
  };
};

const safeNozzleMeter = (value: unknown): { start: number; end: number; fuelType: '95' | 'B7' | 'B10' | 'Diesel' } => {
  const parsed = safeJson(value) as Record<string, unknown> | undefined;
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return { start: 0, end: 0, fuelType: '95' };
  }
  const fuelType = (parsed.fuelType as '95' | 'B7' | 'B10' | 'Diesel') || '95';
  return { start: safeNumber(parsed.start), end: safeNumber(parsed.end), fuelType };
};

const safeFuelMeter = (value: unknown): DailyAccounting['fuelMeter'] => {
  const parsed = safeJson(value) as Record<string, unknown> | undefined;
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return {
      dispenser1: { nozzle1: { start: 0, end: 0, fuelType: '95' }, nozzle2: { start: 0, end: 0, fuelType: 'Diesel' } },
      dispenser2: { nozzle1: { start: 0, end: 0, fuelType: '95' }, nozzle2: { start: 0, end: 0, fuelType: 'B7' } },
    };
  }
  const d1 = safeJson(parsed.dispenser1) as Record<string, unknown> | undefined;
  const d2 = safeJson(parsed.dispenser2) as Record<string, unknown> | undefined;
  return {
    dispenser1: {
      nozzle1: safeNozzleMeter(d1?.nozzle1),
      nozzle2: safeNozzleMeter(d1?.nozzle2),
    },
    dispenser2: {
      nozzle1: safeNozzleMeter(d2?.nozzle1),
      nozzle2: safeNozzleMeter(d2?.nozzle2),
    },
  };
};

const safeItems = (value: unknown): DailyAccounting['items'] => {
  const parsed = safeJson(value) as Record<string, unknown> | undefined;
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return { twoT: 0, capital: 0, transfer: 0, others: 0 };
  }
  return {
    twoT: safeNumber(parsed.twoT),
    capital: safeNumber(parsed.capital),
    transfer: safeNumber(parsed.transfer),
    others: safeNumber(parsed.others),
  };
};

export const mapDailyAccountingFromDb = (row: Record<string, unknown>): DailyAccounting => ({
  id: row.id as string,
  date: row.date as string,
  shiftId: (row.shiftid ?? row.shiftId) as string,
  employeeId: (row.employeeid ?? row.employeeId) as string,
  fuelMeter: safeFuelMeter(row.fuelmeter ?? row.fuelMeter),
  fuelSales: safeFuelSales(row.fuelsales ?? row.fuelSales),
  fuelAmount: safeFuelAmount(row.fuelamount ?? row.fuelAmount),
  totalFuelAmount: safeNumber(row.totalfuelamount ?? row.totalFuelAmount),
  systemAmount: safeNumber(row.systemamount ?? row.systemAmount),
  cashAmount: safeNumber(row.cashamount ?? row.cashAmount),
  actualCashCounted: safeNumber(row.actualcashcounted ?? row.actualCashCounted),
  dispenserCash: safeDispenserCash(row.dispensercash ?? row.dispenserCash),
  items: safeItems(row.items),
  totalAmount: safeNumber(row.totalamount ?? row.totalAmount),
  difference: safeNumber(row.difference),
  note: (row.note ?? '') as string,
  createdAt: (row.createdat ?? row.createdAt) as string,
  updatedAt: (row.updatedat ?? row.updatedAt) as string,
  isDeleted: Boolean(row.isdeleted ?? row.isDeleted ?? false),
  deletedAt: (row.deletedat ?? row.deletedAt) as string | undefined,
  deletedBy: (row.deletedby ?? row.deletedBy) as string | undefined,
  shift: undefined as unknown as Shift,
  employee: undefined as unknown as EmployeeProfile,
});

export const mapDailyAccountingToDb = (account: DailyAccounting | Partial<DailyAccounting>): Record<string, unknown> => {
  const result: Record<string, unknown> = {};
  if (account.id !== undefined) result.id = account.id;
  if (account.date !== undefined) result.date = account.date;
  if (account.shiftId !== undefined) result.shiftid = account.shiftId;
  if (account.employeeId !== undefined) result.employeeid = account.employeeId;
  if (account.fuelMeter !== undefined) result.fuelmeter = account.fuelMeter;
  if (account.fuelSales !== undefined) result.fuelsales = account.fuelSales;
  if (account.fuelAmount !== undefined) result.fuelamount = account.fuelAmount;
  if (account.totalFuelAmount !== undefined) result.totalfuelamount = account.totalFuelAmount;
  if (account.systemAmount !== undefined) result.systemamount = account.systemAmount;
  if (account.cashAmount !== undefined) result.cashamount = account.cashAmount;
  if (account.actualCashCounted !== undefined) result.actualcashcounted = account.actualCashCounted;
  if (account.dispenserCash !== undefined) result.dispensercash = account.dispenserCash;
  if (account.items !== undefined) result.items = account.items;
  if (account.totalAmount !== undefined) result.totalamount = account.totalAmount;
  if (account.difference !== undefined) result.difference = account.difference;
  if (account.note !== undefined) result.note = account.note;
  if (account.createdAt !== undefined) result.createdat = account.createdAt;
  if (account.updatedAt !== undefined) result.updatedat = account.updatedAt;
  if (account.isDeleted !== undefined) result.isdeleted = account.isDeleted;
  if (account.deletedAt !== undefined) result.deletedat = account.deletedAt;
  if (account.deletedBy !== undefined) result.deletedby = account.deletedBy;
  return result;
};

// ============================================
// User Storage
// ============================================
export const userStorage = {
  getAll: async (): Promise<User[]> => {
    const { data, error } = await supabase.from('users').select('*');
    if (error) {
      console.error('Error fetching users:', error);
      checkForRLSError(error, 'ดึงข้อมูล users');
      return [];
    }
    return (data || []).map((row: Record<string, unknown>) => mapUserFromDb(row));
  },
  getById: async (id: string): Promise<User | undefined> => {
    const { data, error } = await supabase.from('users').select('*').eq('id', id).single();
    if (error) {
      console.error(error);
      return undefined;
    }
    return data ? mapUserFromDb(data as Record<string, unknown>) : undefined;
  },
  getByAuthUid: async (authUid: string): Promise<User | undefined> => {
    const { data, error } = await supabase.from('users').select('*').eq('authuid', authUid).maybeSingle();
    if (error) {
      console.error('[userStorage.getByAuthUid] error:', error.message, error.code);
      return undefined;
    }
    return data ? mapUserFromDb(data as Record<string, unknown>) : undefined;
  },
  getByEmail: async (email: string): Promise<User | undefined> => {
    const { data, error } = await supabase.from('users').select('*').eq('email', email).maybeSingle();
    if (error) {
      console.error('[userStorage.getByEmail] error:', error.message, error.code);
      return undefined;
    }
    return data ? mapUserFromDb(data as Record<string, unknown>) : undefined;
  },
  create: async (user: Omit<User, 'id' | 'createdAt' | 'updatedAt'>): Promise<User> => {
    const now = new Date().toISOString();
    const newUser: User = {
      ...user,
      id: generateId(),
      createdAt: now,
      updatedAt: now,
    };
    const dbUser = mapUserToDb(newUser);
    const { error } = await supabase.from('users').insert(dbUser);
    if (error) {
      console.error('Error creating user:', error);
      throw error;
    }
    await logAudit({ tableName: 'users', recordId: newUser.id, action: 'create', newValue: dbUser });
    return newUser;
  },
  update: async (id: string, updates: Partial<User>): Promise<void> => {
    const dbUpdates = mapUserToDb(updates);
    const { error } = await supabase.from('users').update(dbUpdates).eq('id', id);
    if (error) console.error(error);
    else await logAudit({ tableName: 'users', recordId: id, action: 'update', newValue: dbUpdates });
  },
  delete: async (id: string): Promise<void> => {
    const { error } = await supabase.from('users').delete().eq('id', id);
    if (error) console.error(error);
    else await logAudit({ tableName: 'users', recordId: id, action: 'delete' });
  },
};

// ============================================
// Employee (Profile) Storage
// ============================================
export const employeeStorage = {
  getAll: async (): Promise<EmployeeProfile[]> => {
    const [{ data: profiles }, { data: profileSkills }, { data: positions }, { data: skills }] = await Promise.all([
      supabase.from('profiles').select('*'),
      supabase.from('profile_skills').select('*'),
      supabase.from('positions').select('*'),
      supabase.from('skills').select('*'),
    ]);

    return (profiles || []).map((row: Record<string, unknown>) => {
      const profile = mapProfileFromDb(row);
      const position = (positions || []).find((p: Position) => p.id === profile.positionId);
      const skillIds = (profileSkills || [])
        .filter((ps: Record<string, unknown>) => ps.profileid === profile.id)
        .map((ps: Record<string, unknown>) => ps.skillid as string);
      const employeeSkills = (skills || []).filter((s: Skill) => skillIds.includes(s.id));

      return {
        ...profile,
        position: position || { id: '', name: '', description: '' },
        skills: employeeSkills,
      } as EmployeeProfile;
    });
  },
  getById: async (id: string): Promise<EmployeeProfile | undefined> => {
    const [{ data: row }, { data: profileSkills }, { data: positions }, { data: skills }] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', id).single(),
      supabase.from('profile_skills').select('*').eq('profileid', id),
      supabase.from('positions').select('*'),
      supabase.from('skills').select('*'),
    ]);

    if (!row) return undefined;

    const profile = mapProfileFromDb(row);
    const position = (positions || []).find((p: Position) => p.id === profile.positionId);
    const skillIds = (profileSkills || []).map((ps: Record<string, unknown>) => ps.skillid as string);
    const employeeSkills = (skills || []).filter((s: Skill) => skillIds.includes(s.id));

    return {
      ...profile,
      position: position || { id: '', name: '', description: '' },
      skills: employeeSkills,
    } as EmployeeProfile;
  },
  getByUserId: async (userId: string): Promise<EmployeeProfile | undefined> => {
    const { data: row, error } = await supabase.from('profiles').select('*').eq('userid', userId).single();
    if (error || !row) return undefined;
    const profile = mapProfileFromDb(row);
    return employeeStorage.getById(profile.id);
  },
  create: async (employee: EmployeeProfile & { email?: string; password?: string; role?: 'admin' | 'manager' | 'staff' }): Promise<EmployeeProfile> => {
    const profileData = employee;
    const { skills, email, password, role } = employee;

    const { firstName, lastName } = splitFullName(profileData.fullName);

    const dbProfileData = {
      id: profileData.id || generateId(),
      userid: '',
      firstname: firstName,
      lastname: lastName,
      fullname: profileData.fullName,
      phone: profileData.phone,
      avatar: profileData.avatar,
      positionid: profileData.positionId,
      stationid: profileData.stationId,
      status: profileData.status,
      hiredate: profileData.hireDate,
    } as Record<string, unknown>;

    const { error: profileError } = await supabase.from('profiles').insert(dbProfileData);
    if (profileError) {
      console.error('Error creating profile:', profileError);
      throw profileError;
    }
    await logAudit({ tableName: 'profiles', recordId: dbProfileData.id as string, action: 'create', newValue: dbProfileData });

    if (email && password && role) {
      const userId = generateId();
      const now = new Date().toISOString();
      const hashedPassword = await hashPassword(password);

      const dbUser = {
        id: userId,
        authuid: null,
        email: email,
        password: hashedPassword,
        role: role,
        profileid: dbProfileData.id,
        createdat: now,
        updatedat: now,
      };

      const { error: userError } = await supabase.from('users').insert(dbUser);
      if (userError) {
        console.error('Error creating user:', userError);
      } else {
        await supabase.from('profiles').update({ userid: userId }).eq('id', dbProfileData.id);
        try {
          const { data: signUpData, error: authError } = await supabase.auth.signUp({
            email,
            password,
          });
          if (authError) {
            console.warn('Could not create auth user (rate limit or other error):', authError.message);
          } else if (signUpData?.user) {
            await supabase.from('users').update({ authuid: signUpData.user.id }).eq('id', userId);
          }
        } catch (authErr) {
          console.warn('Auth signup error:', authErr);
        }
      }
    }

    if (skills && skills.length > 0) {
      const psRows = skills.map(s => ({ profileid: dbProfileData.id, skillid: s.id }));
      await supabase.from('profile_skills').insert(psRows);
    }

    const createdProfile = await employeeStorage.getById(dbProfileData.id as string);
    if (!createdProfile) {
      throw new Error('ไม่สามารถสร้างพนักงานได้');
    }
    return createdProfile;
  },
  update: async (id: string, updates: Partial<EmployeeProfile> & { email?: string; password?: string; role?: 'admin' | 'manager' | 'staff' }): Promise<void> => {
    const profileData = updates;
    const { skills } = updates;

    if (profileData.fullName !== undefined) {
      const { firstName, lastName } = splitFullName(profileData.fullName);
      profileData.firstName = firstName;
      profileData.lastName = lastName;
    }

    const dbProfileData: Record<string, unknown> = {};
    if (profileData.firstName !== undefined) dbProfileData.firstname = profileData.firstName;
    if (profileData.lastName !== undefined) dbProfileData.lastname = profileData.lastName;
    if (profileData.fullName !== undefined) dbProfileData.fullname = profileData.fullName;
    if (profileData.phone !== undefined) dbProfileData.phone = profileData.phone;
    if (profileData.avatar !== undefined) dbProfileData.avatar = profileData.avatar;
    if (profileData.positionId !== undefined) dbProfileData.positionid = profileData.positionId;
    if (profileData.stationId !== undefined) dbProfileData.stationid = profileData.stationId;
    if (profileData.status !== undefined) dbProfileData.status = profileData.status;
    if (profileData.hireDate !== undefined) dbProfileData.hiredate = profileData.hireDate;
    if (profileData.userId !== undefined) dbProfileData.userid = profileData.userId;

    const { error } = await supabase.from('profiles').update(dbProfileData).eq('id', id);
    if (error) console.error('Error updating profile:', error);
    else await logAudit({ tableName: 'profiles', recordId: id, action: 'update', newValue: dbProfileData });

    if (skills) {
      await supabase.from('profile_skills').delete().eq('profileid', id);
      if (skills.length > 0) {
        const psRows = skills.map(s => ({ profileid: id, skillid: s.id }));
        const { error: psError } = await supabase.from('profile_skills').insert(psRows);
        if (psError) console.error('Error updating profile_skills:', psError);
      }
    }
  },
  delete: async (id: string): Promise<void> => {
    const { data: userData } = await supabase.from('users').select('id').eq('profileid', id);
    if (userData && userData.length > 0) {
      const userIds = userData.map((u: { id: string }) => u.id);
      const { error: userError } = await supabase.from('users').delete().in('id', userIds);
      if (userError) console.error('Error deleting user:', userError);
    }

    await supabase.from('profile_skills').delete().eq('profileid', id);

    const { error } = await supabase.from('profiles').delete().eq('id', id);
    if (error) console.error('Error deleting profile:', error);
    else await logAudit({ tableName: 'profiles', recordId: id, action: 'delete' });
  },
};

// ============================================
// Position Storage
// ============================================
export const positionStorage = {
  getAll: async (): Promise<Position[]> => {
    const { data, error } = await supabase.from('positions').select('*');
    if (error) {
      console.error(error);
      return [];
    }
    return (data || []).map((row: Record<string, unknown>) => mapPositionFromDb(row));
  },
  getById: async (id: string): Promise<Position | undefined> => {
    const { data, error } = await supabase.from('positions').select('*').eq('id', id).single();
    if (error) {
      console.error(error);
      return undefined;
    }
    return data ? mapPositionFromDb(data as Record<string, unknown>) : undefined;
  },
  create: async (position: Omit<Position, 'id'>): Promise<Position> => {
    const newPosition: Position = { ...position, id: generateId() };
    const { error } = await supabase.from('positions').insert(newPosition);
    if (error) {
      console.error('Error creating position:', error);
      throw error;
    }
    await logAudit({ tableName: 'positions', recordId: newPosition.id, action: 'create', newValue: newPosition });
    return newPosition;
  },
  update: async (id: string, updates: Partial<Position>): Promise<void> => {
    const { error } = await supabase.from('positions').update(updates).eq('id', id);
    if (error) console.error(error);
    else await logAudit({ tableName: 'positions', recordId: id, action: 'update', newValue: updates as Record<string, unknown> });
  },
  delete: async (id: string): Promise<void> => {
    const { error } = await supabase.from('positions').delete().eq('id', id);
    if (error) console.error(error);
    else await logAudit({ tableName: 'positions', recordId: id, action: 'delete' });
  },
};

// ============================================
// Skill Storage
// ============================================
export const skillStorage = {
  getAll: async (): Promise<Skill[]> => {
    const { data, error } = await supabase.from('skills').select('*');
    if (error) {
      console.error(error);
      return [];
    }
    return (data || []).map((row: Record<string, unknown>) => mapSkillFromDb(row));
  },
  getById: async (id: string): Promise<Skill | undefined> => {
    const { data, error } = await supabase.from('skills').select('*').eq('id', id).single();
    if (error) {
      console.error(error);
      return undefined;
    }
    return data ? mapSkillFromDb(data as Record<string, unknown>) : undefined;
  },
  create: async (skill: Omit<Skill, 'id'>): Promise<Skill> => {
    const newSkill: Skill = { ...skill, id: generateId() };
    const { error } = await supabase.from('skills').insert(newSkill);
    if (error) {
      console.error('Error creating skill:', error);
      throw error;
    }
    await logAudit({ tableName: 'skills', recordId: newSkill.id, action: 'create', newValue: newSkill });
    return newSkill;
  },
  update: async (id: string, updates: Partial<Skill>): Promise<void> => {
    const { error } = await supabase.from('skills').update(updates).eq('id', id);
    if (error) console.error(error);
    else await logAudit({ tableName: 'skills', recordId: id, action: 'update', newValue: updates as Record<string, unknown> });
  },
  delete: async (id: string): Promise<void> => {
    const { error } = await supabase.from('skills').delete().eq('id', id);
    if (error) console.error(error);
    else await logAudit({ tableName: 'skills', recordId: id, action: 'delete' });
  },
};

// ============================================
// Station Storage
// ============================================
export const stationStorage = {
  getAll: async (): Promise<Station[]> => {
    const { data, error } = await supabase.from('stations').select('*');
    if (error) {
      console.error('Error fetching stations:', error);
      checkForRLSError(error, 'ดึงข้อมูลสาขา');
      return [];
    }
    return (data || []).map((row: Record<string, unknown>) => mapStationFromDb(row));
  },
  getById: async (id: string): Promise<Station | undefined> => {
    const { data, error } = await supabase.from('stations').select('*').eq('id', id).single();
    if (error) {
      console.error(error);
      return undefined;
    }
    return data ? mapStationFromDb(data as Record<string, unknown>) : undefined;
  },
  create: async (station: Omit<Station, 'id'>): Promise<Station> => {
    const newStation: Station = { ...station, id: generateId() };
    const dbStation = mapStationToDb(newStation);
    const { error } = await supabase.from('stations').insert(dbStation);
    if (error) {
      console.error('Error creating station:', error);
      throw error;
    }
    await logAudit({ tableName: 'stations', recordId: newStation.id, action: 'create', newValue: dbStation });
    return newStation;
  },
  update: async (id: string, updates: Partial<Station>): Promise<boolean> => {
    const dbUpdates = mapStationToDb(updates);
    const { error } = await supabase.from('stations').update(dbUpdates).eq('id', id);
    if (error) {
      console.error(error);
      return false;
    }
    await logAudit({ tableName: 'stations', recordId: id, action: 'update', newValue: dbUpdates });
    return true;
  },
  delete: async (id: string): Promise<boolean> => {
    const { error } = await supabase.from('stations').delete().eq('id', id);
    if (error) {
      console.error(error);
      return false;
    }
    await logAudit({ tableName: 'stations', recordId: id, action: 'delete' });
    return true;
  },
};

// ============================================
// Shift Storage
// ============================================
export const shiftStorage = {
  getAll: async (): Promise<Shift[]> => {
    const { data, error } = await supabase.from('shifts').select('*');
    if (error) {
      console.error(error);
      return [];
    }
    return (data || []).map((s: Record<string, unknown>) => mapShiftFromDb(s));
  },
  getById: async (id: string): Promise<Shift | undefined> => {
    const { data, error } = await supabase.from('shifts').select('*').eq('id', id).single();
    if (error) {
      console.error(error);
      return undefined;
    }
    return data ? mapShiftFromDb(data as Record<string, unknown>) : undefined;
  },
  create: async (shift: Omit<Shift, 'id' | 'requiredSkills'>): Promise<Shift> => {
    const newShift: Shift = { ...shift, id: generateId(), requiredSkills: [] };
    const dbShift = mapShiftToDb(newShift);
    const { error } = await supabase.from('shifts').insert(dbShift);
    if (error) {
      console.error('Error creating shift:', error);
      throw error;
    }
    await logAudit({ tableName: 'shifts', recordId: newShift.id, action: 'create', newValue: dbShift });
    return newShift;
  },
  update: async (id: string, updates: Partial<Shift>): Promise<boolean> => {
    const dbUpdates: Record<string, unknown> = {};
    if (updates.name !== undefined) dbUpdates.name = updates.name;
    if (updates.startTime !== undefined) dbUpdates.starttime = updates.startTime;
    if (updates.endTime !== undefined) dbUpdates.endtime = updates.endTime;
    if (updates.minStaff !== undefined) dbUpdates.minstaff = updates.minStaff;
    if (updates.requiredSkills !== undefined) dbUpdates.requiredskills = updates.requiredSkills;
    if (updates.color !== undefined) dbUpdates.color = updates.color;

    const { error } = await supabase.from('shifts').update(dbUpdates).eq('id', id);
    if (error) {
      console.error(error);
      return false;
    }
    await logAudit({ tableName: 'shifts', recordId: id, action: 'update', newValue: dbUpdates });
    return true;
  },
  delete: async (id: string): Promise<boolean> => {
    const { error } = await supabase.from('shifts').delete().eq('id', id);
    if (error) {
      console.error(error);
      return false;
    }
    await logAudit({ tableName: 'shifts', recordId: id, action: 'delete' });
    return true;
  },
};

// ============================================
// Schedule Storage
// ============================================
export const scheduleStorage = {
  getAll: async (): Promise<Schedule[]> => {
    const { data, error } = await supabase.from('schedules').select('*');
    if (error) {
      console.error(error);
      return [];
    }
    return (data || []).map(mapScheduleFromDb);
  },
  getById: async (id: string): Promise<Schedule | undefined> => {
    const { data, error } = await supabase.from('schedules').select('*').eq('id', id).single();
    if (error) {
      console.error(error);
      return undefined;
    }
    return data ? mapScheduleFromDb(data as Record<string, unknown>) : undefined;
  },
  getByDate: async (date: string): Promise<Schedule[]> => {
    const { data, error } = await supabase.from('schedules').select('*').eq('date', date);
    if (error) {
      console.error(error);
      return [];
    }
    return (data || []).map(mapScheduleFromDb);
  },
  getByEmployee: async (employeeId: string): Promise<Schedule[]> => {
    const { data, error } = await supabase.from('schedules').select('*').eq('employeeid', employeeId);
    if (error) {
      console.error(error);
      return [];
    }
    return (data || []).map(mapScheduleFromDb);
  },
  getByDateRange: async (startDate: string, endDate: string): Promise<Schedule[]> => {
    const { data, error } = await supabase
      .from('schedules')
      .select('*')
      .gte('date', startDate)
      .lte('date', endDate);
    if (error) {
      console.error(error);
      return [];
    }
    return (data || []).map(mapScheduleFromDb);
  },
  getRecent: async (limit: number = 100): Promise<Schedule[]> => {
    const { data, error } = await supabase
      .from('schedules')
      .select('*')
      .order('date', { ascending: false })
      .limit(limit);
    if (error) {
      console.error(error);
      return [];
    }
    return (data || []).map(mapScheduleFromDb);
  },
  create: async (schedule: Omit<Schedule, 'id' | 'shift' | 'employee'>): Promise<Schedule> => {
    const newSchedule: Schedule = { ...schedule, id: generateId(), shift: {} as Shift, employee: {} as EmployeeProfile };
    const dbSchedule = mapScheduleToDb(newSchedule);
    const { error } = await supabase.from('schedules').insert(dbSchedule);
    if (error) {
      console.error('Error creating schedule:', error);
      throw error;
    }
    await logAudit({ tableName: 'schedules', recordId: newSchedule.id, action: 'create', newValue: dbSchedule });
    return newSchedule;
  },
  createMany: async (schedules: Omit<Schedule, 'id' | 'shift' | 'employee'>[]): Promise<Schedule[]> => {
    const newSchedules = schedules.map(s => ({ ...s, id: generateId(), shift: {} as Shift, employee: {} as EmployeeProfile }));
    const schedulesData = newSchedules.map(mapScheduleToDb);
    const { error } = await supabase.from('schedules').insert(schedulesData);
    if (error) {
      console.error('Error creating schedules:', error);
      throw error;
    }
    for (const schedule of newSchedules) {
      await logAudit({ tableName: 'schedules', recordId: schedule.id, action: 'create', newValue: mapScheduleToDb(schedule) });
    }
    return newSchedules;
  },
  update: async (id: string, updates: Partial<Schedule>): Promise<void> => {
    const dbUpdates: Record<string, unknown> = {};
    if (updates.date !== undefined) dbUpdates.date = updates.date;
    if (updates.shiftId !== undefined) dbUpdates.shiftid = updates.shiftId;
    if (updates.employeeId !== undefined) dbUpdates.employeeid = updates.employeeId;
    if (updates.stationId !== undefined) dbUpdates.stationid = updates.stationId;
    if (updates.status !== undefined) dbUpdates.status = updates.status;
    if (updates.note !== undefined) dbUpdates.note = updates.note;
    if (updates.createdBy !== undefined) dbUpdates.createdby = updates.createdBy;
    if (updates.createdAt !== undefined) dbUpdates.createdat = updates.createdAt;

    const { error } = await supabase.from('schedules').update(dbUpdates).eq('id', id);
    if (error) console.error(error);
    else await logAudit({ tableName: 'schedules', recordId: id, action: 'update', newValue: dbUpdates });
  },
  delete: async (id: string): Promise<void> => {
    const { error } = await supabase.from('schedules').delete().eq('id', id);
    if (error) console.error(error);
    else await logAudit({ tableName: 'schedules', recordId: id, action: 'delete' });
  },
  deleteByDateRange: async (startDate: string, endDate: string): Promise<void> => {
    const { data: schedulesToDelete } = await supabase
      .from('schedules')
      .select('id')
      .gte('date', startDate)
      .lte('date', endDate);

    if (schedulesToDelete && schedulesToDelete.length > 0) {
      const scheduleIds = schedulesToDelete.map(s => s.id);
      const { error: attendanceError } = await supabase
        .from('attendances')
        .delete()
        .in('scheduleid', scheduleIds);
      if (attendanceError) console.error('Error deleting attendances:', attendanceError);
    }

    const { error } = await supabase.from('schedules').delete().gte('date', startDate).lte('date', endDate);
    if (error) console.error(error);
  },
  clearAll: async (): Promise<void> => {
    const { error: attendanceError } = await supabase.from('attendances').delete().neq('id', '');
    if (attendanceError) console.error('Error deleting attendances:', attendanceError);

    const { error: swapError } = await supabase.from('swap_requests').delete().neq('id', '');
    if (swapError) console.error('Error deleting swap_requests:', swapError);

    const { error } = await supabase.from('schedules').delete().neq('id', '');
    if (error) console.error(error);
  },
};

// ============================================
// Leave Request Storage
// ============================================
export const leaveRequestStorage = {
  getAll: async (): Promise<LeaveRequest[]> => {
    const { data, error } = await supabase.from('leave_requests').select('*');
    if (error) {
      console.error(error);
      return [];
    }
    return (data || []).map((row: Record<string, unknown>) => mapLeaveRequestFromDb(row));
  },
  getById: async (id: string): Promise<LeaveRequest | undefined> => {
    const { data, error } = await supabase.from('leave_requests').select('*').eq('id', id).single();
    if (error) {
      console.error(error);
      return undefined;
    }
    return data ? mapLeaveRequestFromDb(data as Record<string, unknown>) : undefined;
  },
  getByEmployee: async (employeeId: string): Promise<LeaveRequest[]> => {
    const { data, error } = await supabase.from('leave_requests').select('*').eq('employeeid', employeeId);
    if (error) {
      console.error(error);
      return [];
    }
    return (data || []).map((row: Record<string, unknown>) => mapLeaveRequestFromDb(row));
  },
  getPending: async (): Promise<LeaveRequest[]> => {
    const { data, error } = await supabase.from('leave_requests').select('*').eq('status', 'pending');
    if (error) {
      console.error(error);
      return [];
    }
    return (data || []).map((row: Record<string, unknown>) => mapLeaveRequestFromDb(row));
  },
  getRecent: async (limit: number = 50): Promise<LeaveRequest[]> => {
    const { data, error } = await supabase
      .from('leave_requests')
      .select('*')
      .order('createdat', { ascending: false })
      .limit(limit);
    if (error) {
      console.error(error);
      return [];
    }
    return (data || []).map((row: Record<string, unknown>) => mapLeaveRequestFromDb(row));
  },
  create: async (leave: Omit<LeaveRequest, 'id' | 'employee' | 'status' | 'approvedBy' | 'approvedAt' | 'createdAt'>): Promise<LeaveRequest> => {
    const newLeave: LeaveRequest = {
      ...leave,
      id: generateId(),
      employee: undefined as unknown as EmployeeProfile,
      status: 'pending',
      approvedBy: null,
      approvedAt: null,
      createdAt: new Date().toISOString(),
    };
    const dbData = mapLeaveRequestToDb(newLeave);
    const { error } = await supabase.from('leave_requests').insert(dbData);
    if (error) {
      console.error('Error creating leave request:', error);
      throw error;
    }
    await logAudit({ tableName: 'leave_requests', recordId: newLeave.id, action: 'create', newValue: dbData });
    return newLeave;
  },
  update: async (id: string, updates: Partial<LeaveRequest>): Promise<void> => {
    const updateData = { ...updates };
    delete (updateData as { employee?: unknown }).employee;
    const dbData: Record<string, unknown> = {};
    if (updateData.employeeId !== undefined) dbData.employeeid = updateData.employeeId;
    if (updateData.type !== undefined) dbData.type = updateData.type;
    if (updateData.startDate !== undefined) dbData.startdate = updateData.startDate;
    if (updateData.endDate !== undefined) dbData.enddate = updateData.endDate;
    if (updateData.days !== undefined) dbData.days = updateData.days;
    if (updateData.reason !== undefined) dbData.reason = updateData.reason;
    if (updateData.status !== undefined) dbData.status = updateData.status;
    if (updateData.approvedBy !== undefined) dbData.approvedby = updateData.approvedBy;
    if (updateData.approvedAt !== undefined) dbData.approvedat = updateData.approvedAt;
    if (updateData.createdAt !== undefined) dbData.createdat = updateData.createdAt;

    const { error } = await supabase.from('leave_requests').update(dbData).eq('id', id);
    if (error) console.error(error);
    else await logAudit({ tableName: 'leave_requests', recordId: id, action: 'update', newValue: dbData });
  },
  delete: async (id: string): Promise<void> => {
    const { error } = await supabase.from('leave_requests').delete().eq('id', id);
    if (error) console.error(error);
    else await logAudit({ tableName: 'leave_requests', recordId: id, action: 'delete' });
  },
};

// ============================================
// Swap Request Storage
// ============================================
export const swapRequestStorage = {
  getAll: async (): Promise<SwapRequest[]> => {
    const { data, error } = await supabase.from('swap_requests').select('*');
    if (error) {
      console.error(error);
      return [];
    }
    return (data || []).map((row: Record<string, unknown>) => mapSwapRequestFromDb(row));
  },
  getById: async (id: string): Promise<SwapRequest | undefined> => {
    const { data, error } = await supabase.from('swap_requests').select('*').eq('id', id).single();
    if (error) {
      console.error(error);
      return undefined;
    }
    return data ? mapSwapRequestFromDb(data as Record<string, unknown>) : undefined;
  },
  getByEmployee: async (employeeId: string): Promise<SwapRequest[]> => {
    const { data, error } = await supabase
      .from('swap_requests')
      .select('*')
      .or(`requesterid.eq.${employeeId},requestedid.eq.${employeeId}`);
    if (error) {
      console.error(error);
      return [];
    }
    return (data || []).map((row: Record<string, unknown>) => mapSwapRequestFromDb(row));
  },
  getPending: async (): Promise<SwapRequest[]> => {
    const { data, error } = await supabase.from('swap_requests').select('*').eq('status', 'pending');
    if (error) {
      console.error(error);
      return [];
    }
    return (data || []).map((row: Record<string, unknown>) => mapSwapRequestFromDb(row));
  },
  getRecent: async (limit: number = 50): Promise<SwapRequest[]> => {
    const { data, error } = await supabase
      .from('swap_requests')
      .select('*')
      .order('createdat', { ascending: false })
      .limit(limit);
    if (error) {
      console.error(error);
      return [];
    }
    return (data || []).map((row: Record<string, unknown>) => mapSwapRequestFromDb(row));
  },
  create: async (swap: Omit<SwapRequest, 'id' | 'requester' | 'requested' | 'schedule' | 'targetSchedule' | 'status' | 'approvedBy' | 'createdAt'>): Promise<SwapRequest> => {
    const newSwap: SwapRequest = {
      ...swap,
      id: generateId(),
      requester: undefined as unknown as EmployeeProfile,
      requested: undefined as unknown as EmployeeProfile,
      schedule: undefined as unknown as Schedule,
      targetSchedule: undefined as unknown as Schedule,
      status: 'pending',
      approvedBy: null,
      createdAt: new Date().toISOString(),
    };
    const dbData = mapSwapRequestToDb(newSwap);
    const { error } = await supabase.from('swap_requests').insert(dbData);
    if (error) {
      console.error('Error creating swap request:', error);
      throw error;
    }
    await logAudit({ tableName: 'swap_requests', recordId: newSwap.id, action: 'create', newValue: dbData });
    return newSwap;
  },
  update: async (id: string, updates: Partial<SwapRequest>): Promise<void> => {
    const updateData = { ...updates };
    delete (updateData as { requester?: unknown }).requester;
    delete (updateData as { requested?: unknown }).requested;
    delete (updateData as { schedule?: unknown }).schedule;
    delete (updateData as { targetSchedule?: unknown }).targetSchedule;
    const dbData: Record<string, unknown> = {};
    if (updateData.requesterId !== undefined) dbData.requesterid = updateData.requesterId;
    if (updateData.requestedId !== undefined) dbData.requestedid = updateData.requestedId;
    if (updateData.scheduleId !== undefined) dbData.scheduleid = updateData.scheduleId;
    if (updateData.targetScheduleId !== undefined) dbData.targetscheduleid = updateData.targetScheduleId;
    if (updateData.status !== undefined) dbData.status = updateData.status;
    if (updateData.approvedBy !== undefined) dbData.approvedby = updateData.approvedBy;
    if (updateData.createdAt !== undefined) dbData.createdat = updateData.createdAt;
    const { error } = await supabase.from('swap_requests').update(dbData).eq('id', id);
    if (error) console.error(error);
    else await logAudit({ tableName: 'swap_requests', recordId: id, action: 'update', newValue: dbData });
  },
  delete: async (id: string): Promise<void> => {
    const { error } = await supabase.from('swap_requests').delete().eq('id', id);
    if (error) console.error(error);
    else await logAudit({ tableName: 'swap_requests', recordId: id, action: 'delete' });
  },
};

// ============================================
// Attendance Storage
// ============================================
export const attendanceStorage = {
  getAll: async (): Promise<Attendance[]> => {
    const { data, error } = await supabase.from('attendances').select('*');
    if (error) {
      console.error(error);
      return [];
    }
    return (data || []).map((row: Record<string, unknown>) => mapAttendanceFromDb(row));
  },
  getById: async (id: string): Promise<Attendance | undefined> => {
    const { data, error } = await supabase.from('attendances').select('*').eq('id', id).single();
    if (error) {
      console.error(error);
      return undefined;
    }
    return data ? mapAttendanceFromDb(data as Record<string, unknown>) : undefined;
  },
  getByEmployee: async (employeeId: string): Promise<Attendance[]> => {
    const { data, error } = await supabase.from('attendances').select('*').eq('employeeid', employeeId);
    if (error) {
      console.error(error);
      return [];
    }
    return (data || []).map((row: Record<string, unknown>) => mapAttendanceFromDb(row));
  },
  getBySchedule: async (scheduleId: string): Promise<Attendance[]> => {
    const { data, error } = await supabase.from('attendances').select('*').eq('scheduleid', scheduleId);
    if (error) {
      console.error(error);
      return [];
    }
    return (data || []).map((row: Record<string, unknown>) => mapAttendanceFromDb(row));
  },
  getRecent: async (limit: number = 100): Promise<Attendance[]> => {
    const { data, error } = await supabase
      .from('attendances')
      .select('*')
      .order('id', { ascending: false })
      .limit(limit);
    if (error) {
      console.error(error);
      return [];
    }
    return (data || []).map((row: Record<string, unknown>) => mapAttendanceFromDb(row));
  },
  create: async (attendance: Omit<Attendance, 'id' | 'employee' | 'schedule'>): Promise<Attendance> => {
    const newAttendance: Attendance = {
      ...attendance,
      id: generateId(),
      employee: undefined as unknown as EmployeeProfile,
      schedule: undefined as unknown as Schedule,
    };
    const dbData = mapAttendanceToDb(newAttendance);
    const { error } = await supabase.from('attendances').insert(dbData);
    if (error) {
      console.error('Error creating attendance:', error);
      throw error;
    }
    await logAudit({ tableName: 'attendances', recordId: newAttendance.id, action: 'create', newValue: dbData });
    return newAttendance;
  },
  update: async (id: string, updates: Partial<Attendance>): Promise<void> => {
    const updateData = { ...updates };
    delete (updateData as { employee?: unknown }).employee;
    delete (updateData as { schedule?: unknown }).schedule;
    const dbData: Record<string, unknown> = {};
    if (updateData.employeeId !== undefined) dbData.employeeid = updateData.employeeId;
    if (updateData.scheduleId !== undefined) dbData.scheduleid = updateData.scheduleId;
    if (updateData.checkIn !== undefined) dbData.checkin = updateData.checkIn;
    if (updateData.checkOut !== undefined) dbData.checkout = updateData.checkOut;
    if (updateData.checkInLocation !== undefined) dbData.checkinlocation = updateData.checkInLocation;
    if (updateData.checkOutLocation !== undefined) dbData.checkoutlocation = updateData.checkOutLocation;
    if (updateData.note !== undefined) dbData.note = updateData.note;
    if (updateData.status !== undefined) dbData.status = updateData.status;
    const { error } = await supabase.from('attendances').update(dbData).eq('id', id);
    if (error) console.error(error);
    else await logAudit({ tableName: 'attendances', recordId: id, action: 'update', newValue: dbData });
  },
  delete: async (id: string): Promise<void> => {
    const { error } = await supabase.from('attendances').delete().eq('id', id);
    if (error) console.error(error);
    else await logAudit({ tableName: 'attendances', recordId: id, action: 'delete' });
  },
};

// ============================================
// Notification Storage
// ============================================
export const notificationStorage = {
  getAll: async (): Promise<Notification[]> => {
    const { data, error } = await supabase.from('notifications').select('*');
    if (error) {
      console.error(error);
      return [];
    }
    return (data || []).map((row: Record<string, unknown>) => mapNotificationFromDb(row));
  },
  getByUser: async (userId: string): Promise<Notification[]> => {
    const { data, error } = await supabase.from('notifications').select('*').eq('userid', userId);
    if (error) {
      console.error(error);
      return [];
    }
    return (data || []).map((row: Record<string, unknown>) => mapNotificationFromDb(row));
  },
  getRecentByUser: async (userId: string, limit: number = 50): Promise<Notification[]> => {
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('userid', userId)
      .order('createdat', { ascending: false })
      .limit(limit);
    if (error) {
      console.error(error);
      return [];
    }
    return (data || []).map((row: Record<string, unknown>) => mapNotificationFromDb(row));
  },
  getUnread: async (userId: string): Promise<Notification[]> => {
    const { data, error } = await supabase.from('notifications').select('*').eq('userid', userId).eq('read', false);
    if (error) {
      console.error(error);
      return [];
    }
    return (data || []).map((row: Record<string, unknown>) => mapNotificationFromDb(row));
  },
  create: async (notification: Omit<Notification, 'id' | 'createdAt'>): Promise<Notification> => {
    const newNotification: Notification = {
      ...notification,
      id: generateId(),
      createdAt: new Date().toISOString(),
    };
    const dbData = mapNotificationToDb(newNotification);
    const { error } = await supabase.from('notifications').insert(dbData);
    if (error) {
      console.error('Error creating notification:', error);
      throw error;
    }
    await logAudit({ tableName: 'notifications', recordId: newNotification.id, action: 'create', newValue: dbData });
    return newNotification;
  },
  markAsRead: async (id: string): Promise<void> => {
    const { error } = await supabase.from('notifications').update({ read: true }).eq('id', id);
    if (error) console.error(error);
  },
  markAllAsRead: async (userId: string): Promise<void> => {
    const { error } = await supabase.from('notifications').update({ read: true }).eq('userid', userId);
    if (error) console.error(error);
  },
  delete: async (id: string): Promise<void> => {
    const { error } = await supabase.from('notifications').delete().eq('id', id);
    if (error) console.error(error);
    else await logAudit({ tableName: 'notifications', recordId: id, action: 'delete' });
  },
  deleteAllRead: async (userId: string): Promise<void> => {
    const { error } = await supabase.from('notifications').delete().eq('userid', userId).eq('read', true);
    if (error) console.error(error);
  },
  deleteAll: async (userId: string): Promise<void> => {
    const { error } = await supabase.from('notifications').delete().eq('userid', userId);
    if (error) console.error(error);
  },
};

// ============================================
// Fuel Price Storage
// ============================================
export const fuelPriceStorage = {
  getAll: async (): Promise<FuelPrice[]> => {
    const { data, error } = await supabase.from('fuel_prices').select('*');
    if (error) {
      console.error(error);
      return [];
    }
    return (data || []).map((row: Record<string, unknown>) => mapFuelPriceFromDb(row));
  },
  getById: async (id: string): Promise<FuelPrice | undefined> => {
    const { data, error } = await supabase.from('fuel_prices').select('*').eq('id', id).single();
    if (error) {
      console.error(error);
      return undefined;
    }
    return data ? mapFuelPriceFromDb(data as Record<string, unknown>) : undefined;
  },
  getCurrentPrice: async (): Promise<FuelPrice | null> => {
    const { data, error } = await supabase
      .from('fuel_prices')
      .select('*')
      .order('effectivedate', { ascending: false })
      .limit(1);
    if (error || !data || data.length === 0) return null;
    return mapFuelPriceFromDb(data[0] as Record<string, unknown>);
  },
  create: async (price: Omit<FuelPrice, 'id' | 'createdAt'>): Promise<FuelPrice> => {
    const newPrice: FuelPrice = {
      ...price,
      id: generateId(),
      createdAt: new Date().toISOString(),
    };
    const dbPrice = mapFuelPriceToDb(newPrice);
    const { error } = await supabase.from('fuel_prices').insert(dbPrice);
    if (error) {
      console.error('Error creating fuel price:', error);
      throw error;
    }
    await logAudit({ tableName: 'fuel_prices', recordId: newPrice.id, action: 'create', newValue: dbPrice });
    return newPrice;
  },
  update: async (id: string, updates: Partial<FuelPrice>): Promise<void> => {
    const dbUpdates = mapFuelPriceToDb(updates);
    const { error } = await supabase.from('fuel_prices').update(dbUpdates).eq('id', id);
    if (error) {
      console.error('Error updating fuel price:', error);
      throw error;
    }
    await logAudit({ tableName: 'fuel_prices', recordId: id, action: 'update', newValue: dbUpdates });
  },
  delete: async (id: string): Promise<void> => {
    const { error } = await supabase.from('fuel_prices').delete().eq('id', id);
    if (error) console.error(error);
    else await logAudit({ tableName: 'fuel_prices', recordId: id, action: 'delete' });
  },
};

// ============================================
// Daily Accounting Storage
// ============================================

// Helper: ตรวจสอบว่า error เกิดจากคอลัมน์หาย (ยังไม่ได้รัน migration)
const isMissingColumnError = (error: { code?: string; message?: string } | null | undefined): boolean => {
  if (!error) return false;
  if (error.code === '42703') return true;
  return error.message?.toLowerCase().includes('isdeleted') === true;
};

// Helper: ลบ soft-delete fields ออกจาก payload สำหรับ legacy DB
const stripSoftDeleteFields = (data: Record<string, unknown>): Record<string, unknown> => {
  const { isdeleted, deletedat, deletedby, ...rest } = data;
  void isdeleted;
  void deletedat;
  void deletedby;
  return rest;
};

export const dailyAccountingStorage = {
  getAll: async (): Promise<DailyAccounting[]> => {
    let { data, error } = await supabase.from('daily_accounting').select('*').eq('isdeleted', false);
    if (error && isMissingColumnError(error)) {
      console.warn('[dailyAccountingStorage] isdeleted column missing, falling back');
      ({ data, error } = await supabase.from('daily_accounting').select('*'));
    }
    if (error) {
      console.error('[dailyAccountingStorage.getAll] error:', error);
      checkForRLSError(error, 'ดึงข้อมูลบัญชีรายวัน');
      return [];
    }
    return (data || []).map((row: Record<string, unknown>) => mapDailyAccountingFromDb(row));
  },
  getById: async (id: string): Promise<DailyAccounting | undefined> => {
    let { data, error } = await supabase.from('daily_accounting').select('*').eq('id', id).eq('isdeleted', false).single();
    if (error && isMissingColumnError(error)) {
      ({ data, error } = await supabase.from('daily_accounting').select('*').eq('id', id).single());
    }
    if (error) {
      console.error('[dailyAccountingStorage.getById] error:', error);
      checkForRLSError(error, 'ดึงข้อมูลบัญชีรายวัน');
      return undefined;
    }
    return data ? mapDailyAccountingFromDb(data as Record<string, unknown>) : undefined;
  },
  getByDate: async (date: string): Promise<DailyAccounting[]> => {
    let { data, error } = await supabase.from('daily_accounting').select('*').eq('date', date).eq('isdeleted', false);
    if (error && isMissingColumnError(error)) {
      ({ data, error } = await supabase.from('daily_accounting').select('*').eq('date', date));
    }
    if (error) {
      console.error('[dailyAccountingStorage.getByDate] error:', error);
      checkForRLSError(error, 'ดึงข้อมูลบัญชีรายวัน');
      return [];
    }
    return (data || []).map((row: Record<string, unknown>) => mapDailyAccountingFromDb(row));
  },
  getByDateRange: async (startDate: string, endDate: string): Promise<DailyAccounting[]> => {
    let { data, error } = await supabase
      .from('daily_accounting')
      .select('*')
      .gte('date', startDate)
      .lte('date', endDate)
      .eq('isdeleted', false);
    if (error && isMissingColumnError(error)) {
      ({ data, error } = await supabase
        .from('daily_accounting')
        .select('*')
        .gte('date', startDate)
        .lte('date', endDate));
    }
    if (error) {
      console.error('[dailyAccountingStorage.getByDateRange] error:', error);
      checkForRLSError(error, 'ดึงข้อมูลบัญชีรายวัน');
      return [];
    }
    return (data || []).map((row: Record<string, unknown>) => mapDailyAccountingFromDb(row));
  },
  getRecent: async (limit: number = 100): Promise<DailyAccounting[]> => {
    let { data, error } = await supabase
      .from('daily_accounting')
      .select('*')
      .eq('isdeleted', false)
      .order('date', { ascending: false })
      .limit(limit);
    if (error && isMissingColumnError(error)) {
      console.warn('[dailyAccountingStorage] isdeleted column missing, falling back');
      ({ data, error } = await supabase
        .from('daily_accounting')
        .select('*')
        .order('date', { ascending: false })
        .limit(limit));
    }
    if (error) {
      console.error('[dailyAccountingStorage.getRecent] error:', error);
      checkForRLSError(error, 'ดึงข้อมูลบัญชีรายวัน');
      return [];
    }
    return (data || []).map((row: Record<string, unknown>) => mapDailyAccountingFromDb(row));
  },
  getByShift: async (shiftId: string): Promise<DailyAccounting[]> => {
    let { data, error } = await supabase.from('daily_accounting').select('*').eq('shiftid', shiftId).eq('isdeleted', false);
    if (error && isMissingColumnError(error)) {
      ({ data, error } = await supabase.from('daily_accounting').select('*').eq('shiftid', shiftId));
    }
    if (error) {
      console.error('[dailyAccountingStorage.getByShift] error:', error);
      checkForRLSError(error, 'ดึงข้อมูลบัญชีรายวัน');
      return [];
    }
    return (data || []).map((row: Record<string, unknown>) => mapDailyAccountingFromDb(row));
  },
  create: async (account: Omit<DailyAccounting, 'id' | 'shift' | 'employee' | 'fuelSales' | 'fuelAmount' | 'totalFuelAmount' | 'totalAmount' | 'difference' | 'createdAt' | 'updatedAt'>): Promise<DailyAccounting> => {
    const now = new Date().toISOString();
    const newAccount: DailyAccounting = {
      ...account,
      id: generateId(),
      shift: undefined as unknown as Shift,
      employee: undefined as unknown as EmployeeProfile,
      fuelSales: { '95': 0, 'B7': 0, 'B10': 0, 'Diesel': 0 },
      fuelAmount: { '95': 0, 'B7': 0, 'B10': 0, 'Diesel': 0 },
      totalFuelAmount: 0,
      totalAmount: 0,
      difference: 0,
      isDeleted: false,
      createdAt: now,
      updatedAt: now,
    };
    const dbData = mapDailyAccountingToDb(newAccount);
    let { error } = await supabase.from('daily_accounting').insert(dbData);
    if (error && isMissingColumnError(error)) {
      console.warn('[dailyAccountingStorage.create] soft-delete columns missing, falling back');
      ({ error } = await supabase.from('daily_accounting').insert(stripSoftDeleteFields(dbData)));
    }
    if (error) {
      console.error('Error creating daily accounting:', error);
      checkForRLSError(error, 'สร้างบัญชีรายวัน');
      throw error;
    }
    await logAudit({ tableName: 'daily_accounting', recordId: newAccount.id, action: 'create', newValue: dbData });
    return newAccount;
  },
  update: async (id: string, updates: Partial<DailyAccounting>): Promise<void> => {
    const updateData = { ...updates };
    delete (updateData as { shift?: unknown }).shift;
    delete (updateData as { employee?: unknown }).employee;
    const dbData = mapDailyAccountingToDb(updateData);
    const { error } = await supabase.from('daily_accounting').update(dbData).eq('id', id);
    if (error) {
      console.error('Error updating daily accounting:', error);
      throw error;
    }
    await logAudit({ tableName: 'daily_accounting', recordId: id, action: 'update', newValue: dbData });
  },
  softDelete: async (id: string, metadata?: { deletedBy?: string }): Promise<void> => {
    const now = new Date().toISOString();
    const { error } = await supabase
      .from('daily_accounting')
      .update({
        isdeleted: true,
        deletedat: now,
        deletedby: metadata?.deletedBy || null,
        updatedat: now,
      })
      .eq('id', id);
    if (error) {
      console.error('Error soft-deleting daily accounting:', error);
      throw error;
    }
    await logAudit({ tableName: 'daily_accounting', recordId: id, action: 'delete', newValue: { isdeleted: true, deletedat: now, deletedby: metadata?.deletedBy } });
  },
  delete: async (id: string): Promise<void> => {
    // Deprecated: kept for type safety, delegates to soft delete
    return dailyAccountingStorage.softDelete(id);
  },
};

// ============================================
// Legacy Helpers
// ============================================
export const sessionStorage = {
  getCurrentUser: (): null => {
    return null;
  },
  setCurrentUser: (_user: { id: string } | null): void => {
    void _user;
  },
  clear: (): void => {
    // No-op
  },
};

export const seedDatabase = async (): Promise<void> => {
  // Database seeding is disabled. Use database-setup.sql instead.
};

export const resetStorage = async (): Promise<void> => {
  // resetStorage is disabled for safety. Use Supabase Dashboard instead.
};

export const clearStorage = async (): Promise<void> => {
  // clearStorage is disabled for safety.
};

export const debugAuth = async (): Promise<void> => {
  // Auth debugging is disabled in production.
  // Use Supabase Dashboard for auth troubleshooting.
};
