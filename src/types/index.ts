// Re-exports from sub-modules
export * from './schedule';
export * from './attendance';
export * from './accounting';
export * from './notification';
export * from './alert';
export * from './audit';
export * from './customer';
export * from './inventory';
export * from './promotion';

import type {
  DailyAccounting,
  FuelPrice,
  FuelMeterReading,
  CashAmountReading,
} from './accounting';
import type {
  Schedule,
  Shift,
  LeaveRequest,
  SwapRequest,
} from './schedule';
import type { Attendance } from './attendance';


// User Role
export type UserRole = 'admin' | 'manager' | 'staff';

// User Status
export type UserStatus = 'active' | 'inactive';

// User Interface
export interface User {
  id: string;
  authUid: string; // Supabase Auth user UID (from auth.users)
  email: string;
  password: string; // Hashed password (for backup/reference)
  role: UserRole;
  profileId: string;
  createdAt: string;
  updatedAt: string;
}

// Position Interface
export interface Position {
  id: string;
  name: string;
  description: string;
}

// Skill Interface
export interface Skill {
  id: string;
  name: string;
  code: string;
}

// Employee Profile Interface
export interface EmployeeProfile {
  id: string;
  userId: string;
  firstName?: string;
  lastName?: string;
  fullName: string;
  phone: string;
  avatar: string;
  positionId: string;
  position: Position;
  skills: Skill[];
  stationId: string;
  status: UserStatus;
  hireDate: string;
}

// Employee with User account info (for create/update operations)
export interface EmployeeWithUser extends Omit<EmployeeProfile, 'id' | 'userId'> {
  email: string;
  password: string;
  role: UserRole;
}

// Station Interface
export interface Station {
  id: string;
  name: string;
  address: string;
  phone: string;
  managerId: string;
}

// Dashboard Stats Interface
export interface DashboardStats {
  totalEmployees: number;
  activeEmployees: number;
  todayShifts: number;
  pendingLeaves: number;
  pendingSwaps: number;
  lateToday: number;
  absentToday: number;
}

// Station Context Type
export interface StationContextType {
  stations: Station[];
  currentStation: Station | null;
  isLoading: boolean;
  fetchStations: () => Promise<Station[]>;
  setCurrentStation: (station: Station | null) => void;
  createStation: (station: Omit<Station, 'id'>) => Promise<void>;
  updateStation: (id: string, data: Partial<Station>) => Promise<void>;
  deleteStation: (id: string) => Promise<void>;
}

// Auth Context Type
export interface AuthContextType {
  user: User | null;
  profile: EmployeeProfile | null;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  updateProfile: (updates: Partial<EmployeeProfile>) => void;
  isAuthenticated: boolean;
  isLoading: boolean;
}

// Employee Context Type
export interface EmployeeContextType {
  employees: EmployeeProfile[];
  filteredEmployees: EmployeeProfile[];
  positions: Position[];
  skills: Skill[];
  users: User[];
  isLoading: boolean;
  addEmployee: (employee: Omit<EmployeeProfile, 'id' | 'firstName' | 'lastName' | 'userId'> & { email: string; password: string; role: UserRole }) => Promise<void>;
  updateEmployee: (id: string, employee: Partial<EmployeeProfile> & { email?: string; password?: string; role?: UserRole }) => Promise<void>;
  deleteEmployee: (id: string) => Promise<void>;
  getEmployeeById: (id: string) => EmployeeProfile | undefined;
  getUserByProfileId: (profileId: string) => User | undefined;
}

// Schedule Context Type
export interface ScheduleContextType {
  schedules: Schedule[];
  shifts: Shift[];
  leaveRequests: LeaveRequest[];
  swapRequests: SwapRequest[];
  isLoading: boolean;
  addSchedule: (schedule: Omit<Schedule, 'id' | 'shift' | 'employee'>) => void;
  updateSchedule: (id: string, schedule: Partial<Schedule>) => void;
  deleteSchedule: (id: string) => void;
  generateSchedule: (startDate: string, endDate: string) => void;
  clearAllSchedules: () => void;
  addShift: (shift: Omit<Shift, 'id' | 'requiredSkills'> & { id?: string }) => Promise<Shift | null>;
  updateShift: (id: string, shift: Partial<Shift>) => Promise<boolean>;
  deleteShift: (id: string) => Promise<boolean>;
  requestLeave: (leave: Omit<LeaveRequest, 'id' | 'employee' | 'status' | 'approvedBy' | 'approvedAt' | 'createdAt' | 'days'>) => void;
  approveLeave: (id: string, approved: boolean) => void;
  requestSwap: (swap: Omit<SwapRequest, 'id' | 'requester' | 'requested' | 'schedule' | 'targetSchedule' | 'status' | 'approvedBy' | 'createdAt'>) => void;
  approveSwap: (id: string, approved: boolean) => void;
  getSchedulesByDate: (date: string) => Schedule[];
  getSchedulesByEmployee: (employeeId: string) => Schedule[];
  getSchedulesByDateRange: (startDate: string, endDate: string) => Schedule[];
}

// Attendance Context Type
export interface AttendanceContextType {
  attendances: Attendance[];
  isLoading: boolean;
  checkIn: (employeeId: string, scheduleId: string, location?: string) => void;
  checkOut: (employeeId: string, scheduleId: string, location?: string) => void;
  addAttendance: (attendance: Omit<Attendance, 'id' | 'employee' | 'schedule'>) => Promise<void>;
  updateAttendance: (id: string, updates: Partial<Attendance>) => Promise<void>;
  deleteAttendance: (id: string) => Promise<void>;
  getAttendanceByEmployee: (employeeId: string) => Attendance[];
  getAttendanceByDate: (date: string) => Attendance[];
  getTodayAttendance: () => Attendance[];
}

// Daily Accounting Context Type
export interface DailyAccountingContextType {
  dailyAccounts: DailyAccounting[];
  fuelPrices: FuelPrice[];
  currentFuelPrice: FuelPrice | null;
  isLoading: boolean;
  addDailyAccount: (account: Omit<DailyAccounting, 'id' | 'shift' | 'employee' | 'fuelSales' | 'fuelAmount' | 'totalFuelAmount' | 'totalAmount' | 'difference' | 'createdAt' | 'updatedAt'>) => void;
  updateDailyAccount: (id: string, account: Partial<DailyAccounting>) => void;
  deleteDailyAccount: (id: string) => void;
  getDailyAccountByDate: (date: string) => DailyAccounting[];
  getDailyAccountByDateRange: (startDate: string, endDate: string) => DailyAccounting[];
  getDailyAccountByShift: (shiftId: string) => DailyAccounting[];
  getTodaySummary: () => { totalSales: number; totalCash: number; totalDifference: number };
  loadAccountsByDateRange: (startDate: string, endDate: string) => Promise<DailyAccounting[]>;
  // Fuel Price Management
  setFuelPrice: (prices: Omit<FuelPrice, 'id' | 'createdAt'>) => void;
  updateFuelPrice: (id: string, prices: Partial<FuelPrice>) => void;
  getCurrentFuelPrice: () => FuelPrice | null;
  calculateFuelAmount: (fuelType: '95' | 'B7' | 'B10' | 'Diesel', liters: number) => number;
  // Get latest meter reading for auto-fill
  getPreviousMeterReading: () => FuelMeterReading | null;
  // Get latest dispenser cash for auto-fill
  getPreviousDispenserCash: () => CashAmountReading | null;
}

// Payroll Period Interface
export interface PayrollPeriod {
  id: string;
  year: number;
  month: number;
  startDate: string;
  endDate: string;
  payDate?: string;
  status: 'open' | 'processing' | 'closed';
}

// Payroll Record Interface
export interface PayrollRecord {
  id: string;
  periodId: string;
  employeeId: string;
  employee?: EmployeeProfile;
  baseSalary: number;
  shiftCount: number;
  shiftRate: number;
  overtimeHours: number;
  overtimeRate: number;
  totalIncome: number;
  taxDeduction: number;
  socialSecurity: number;
  otherDeductions: number;
  netSalary: number;
  status: 'draft' | 'approved' | 'paid';
}

// Payroll Context Type
export interface PayrollContextType {
  periods: PayrollPeriod[];
  records: PayrollRecord[];
  currentPeriod: PayrollPeriod | null;
  setCurrentPeriod: (period: PayrollPeriod | null) => void;
  isLoading: boolean;
  fetchPeriods: () => Promise<void>;
  createPeriod: (period: Omit<PayrollPeriod, 'id'>) => Promise<void>;
  closePeriod: (id: string) => Promise<void>;
  calculatePayroll: (periodId: string, shiftRate: number, overtimeRate: number) => Promise<void>;
  approveRecord: (id: string) => Promise<void>;
  payRecord: (id: string) => Promise<void>;
  exportPayslip: (record: PayrollRecord) => void;
}

// Re-export from submodules
export * from './accounting';
export * from './schedule';
export * from './attendance';
export * from './notification';

// Re-export inventory types
export type {
  FuelInventory,
  FuelDelivery,
  Product,
  ProductTransaction,
  Supplier,
} from './inventory';

// Re-export alert types
export type { Alert, AlertSeverity } from './alert';

// Re-export promotion types
export type {
  Promotion,
  PromotionType,
  PromotionDiscountType,
  PromotionFuelType,
  PromotionFilter,
} from './promotion';
