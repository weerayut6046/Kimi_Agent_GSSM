import type { Shift, Schedule, LeaveRequest, SwapRequest, Attendance, EmployeeProfile } from '@/types';
import { supabase } from '@/lib/supabase';
import { logAudit } from './coreStorage';

// Shift Storage - Helper to map camelCase to lowercase for PostgreSQL
export const mapShiftToDb = (shift: Shift | Partial<Shift>): Record<string, unknown> => ({
  id: shift.id,
  name: shift.name,
  starttime: shift.startTime,
  endtime: shift.endTime,
  minstaff: shift.minStaff,
  requiredskills: shift.requiredSkills || [],
  color: shift.color,
});

export const mapShiftFromDb = (row: Record<string, unknown>): Shift => ({
  id: row.id as string,
  name: row.name as string,
  startTime: row.starttime as string,
  endTime: row.endtime as string,
  minStaff: row.minstaff as number,
  requiredSkills: (row.requiredskills as string[]) || [],
  color: row.color as string,
});

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
  create: async (shift: Shift): Promise<boolean> => {
    const dbShift = mapShiftToDb(shift);
    const { error } = await supabase.from('shifts').insert(dbShift);
    if (error) {
      console.error('Error creating shift:', error);
      return false;
    }
    await logAudit({ tableName: 'shifts', recordId: shift.id, action: 'create', newValue: dbShift });
    return true;
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

// Helper functions for Schedule mapping
export const mapScheduleToDb = (schedule: Schedule | Partial<Schedule>): Record<string, unknown> => ({
  id: schedule.id,
  date: schedule.date,
  shiftid: schedule.shiftId,
  employeeid: schedule.employeeId,
  stationid: schedule.stationId,
  status: schedule.status,
  note: schedule.note,
  createdby: schedule.createdBy,
  createdat: schedule.createdAt,
});

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
  create: async (schedule: Schedule): Promise<void> => {
    const dbSchedule = mapScheduleToDb(schedule);
    const { error } = await supabase.from('schedules').insert(dbSchedule);
    if (error) console.error(error);
    else await logAudit({ tableName: 'schedules', recordId: schedule.id, action: 'create', newValue: dbSchedule });
  },
  createMany: async (newSchedules: Schedule[]): Promise<void> => {
    const schedulesData = newSchedules.map(mapScheduleToDb);
    const { error } = await supabase.from('schedules').insert(schedulesData);
    if (error) console.error(error);
    else {
      for (const schedule of newSchedules) {
        await logAudit({ tableName: 'schedules', recordId: schedule.id, action: 'create', newValue: mapScheduleToDb(schedule) });
      }
    }
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
    if (attendanceError) {
      console.error('Error deleting attendances:', attendanceError);
    }

    const { error: swapError } = await supabase.from('swap_requests').delete().neq('id', '');
    if (swapError) {
      console.error('Error deleting swap_requests:', swapError);
    }

    const { error } = await supabase.from('schedules').delete().neq('id', '');
    if (error) console.error(error);
  },
};

// Leave Request mapping helpers
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
  create: async (request: LeaveRequest): Promise<void> => {
    const requestData = { ...request };
    delete (requestData as { employee?: unknown }).employee;
    const dbData = mapLeaveRequestToDb(requestData);
    const { error } = await supabase.from('leave_requests').insert(dbData);
    if (error) console.error(error);
    else await logAudit({ tableName: 'leave_requests', recordId: request.id, action: 'create', newValue: dbData });
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

// Swap Request mapping helpers
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
  create: async (request: SwapRequest): Promise<void> => {
    const requestData = { ...request };
    delete (requestData as { requester?: unknown }).requester;
    delete (requestData as { requested?: unknown }).requested;
    delete (requestData as { schedule?: unknown }).schedule;
    delete (requestData as { targetSchedule?: unknown }).targetSchedule;
    const dbData = mapSwapRequestToDb(requestData);
    const { error } = await supabase.from('swap_requests').insert(dbData);
    if (error) console.error(error);
    else await logAudit({ tableName: 'swap_requests', recordId: request.id, action: 'create', newValue: dbData });
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

// Attendance mapping helpers
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
  create: async (attendance: Attendance): Promise<void> => {
    const attendanceData = { ...attendance };
    delete (attendanceData as { employee?: unknown }).employee;
    delete (attendanceData as { schedule?: unknown }).schedule;
    const dbData = mapAttendanceToDb(attendanceData);
    const { error } = await supabase.from('attendances').insert(dbData);
    if (error) console.error(error);
    else await logAudit({ tableName: 'attendances', recordId: attendance.id, action: 'create', newValue: dbData });
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
