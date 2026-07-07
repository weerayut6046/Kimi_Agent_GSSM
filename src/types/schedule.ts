import type { EmployeeProfile } from './index';

// Schedule Status
export type ScheduleStatus = 'scheduled' | 'confirmed' | 'completed' | 'absent';

// Leave Type
export type LeaveType = 'sick' | 'personal' | 'vacation';

// Leave Status
export type LeaveStatus = 'pending' | 'approved' | 'rejected';

// Swap Status
export type SwapStatus = 'pending' | 'approved' | 'rejected';

// Shift Interface
export interface Shift {
  id: string;
  name: string;
  startTime: string;
  endTime: string;
  minStaff: number;
  requiredSkills: string[];
  color: string;
}

// Schedule Interface
export interface Schedule {
  id: string;
  date: string;
  shiftId: string;
  shift: Shift;
  employeeId: string;
  employee: EmployeeProfile;
  stationId: string;
  status: ScheduleStatus;
  note: string;
  createdBy: string;
  createdAt: string;
}

// Leave Request Interface
export interface LeaveRequest {
  id: string;
  employeeId: string;
  employee: EmployeeProfile;
  type: LeaveType;
  startDate: string;
  endDate: string;
  days: number;
  reason: string;
  status: LeaveStatus;
  approvedBy: string | null;
  approvedAt: string | null;
  createdAt: string;
}

// Swap Request Interface
export interface SwapRequest {
  id: string;
  requesterId: string;
  requester: EmployeeProfile;
  requestedId: string;
  requested: EmployeeProfile;
  scheduleId: string;
  schedule: Schedule;
  targetScheduleId: string;
  targetSchedule: Schedule;
  status: SwapStatus;
  approvedBy: string | null;
  createdAt: string;
}
