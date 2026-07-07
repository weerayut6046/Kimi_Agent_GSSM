import type { EmployeeProfile, Schedule } from './index';

// Attendance Status
export type AttendanceStatus = 'normal' | 'late' | 'early_leave' | 'absent';

// Attendance Interface
export interface Attendance {
  id: string;
  employeeId: string;
  employee: EmployeeProfile;
  scheduleId: string;
  schedule: Schedule;
  checkIn: string | null;
  checkOut: string | null;
  checkInLocation: string;
  checkOutLocation: string;
  note: string;
  status: AttendanceStatus;
}
