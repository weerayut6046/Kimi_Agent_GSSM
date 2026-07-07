import type { Schedule, EmployeeProfile, Shift } from '@/types';

// Check if employee is available for a shift
export const isEmployeeAvailable = (
  employee: EmployeeProfile,
  date: string,
  shift: Shift,
  existingSchedules: Schedule[]
): boolean => {
  // Check if employee already has a schedule on this date
  const existingSchedule = existingSchedules.find(
    s => s.employeeId === employee.id && s.date === date
  );
  
  if (existingSchedule) {
    return false;
  }
  
  // Check if employee has required skills
  const hasRequiredSkills = shift.requiredSkills.every(skillId =>
    employee.skills.some(s => s.id === skillId)
  );
  
  if (!hasRequiredSkills) {
    return false;
  }
  
  // Check for consecutive shifts (night to morning)
  const prevDate = new Date(date);
  prevDate.setDate(prevDate.getDate() - 1);
  const prevDateStr = prevDate.toISOString().split('T')[0];
  
  const prevSchedule = existingSchedules.find(
    s => s.employeeId === employee.id && s.date === prevDateStr
  );
  
  if (prevSchedule && prevSchedule.shift.id === 'shift3' && shift.id === 'shift1') {
    return false; // Cannot work morning after night shift
  }
  
  return true;
};

// Get available employees for a shift
export const getAvailableEmployees = (
  employees: EmployeeProfile[],
  date: string,
  shift: Shift,
  existingSchedules: Schedule[]
): EmployeeProfile[] => {
  return employees.filter(emp =>
    emp.status === 'active' &&
    isEmployeeAvailable(emp, date, shift, existingSchedules)
  );
};

// Count shifts per employee in a date range
export const countEmployeeShifts = (
  employeeId: string,
  schedules: Schedule[],
  startDate?: string,
  endDate?: string
): number => {
  let filteredSchedules = schedules.filter(s => s.employeeId === employeeId);
  
  if (startDate && endDate) {
    filteredSchedules = filteredSchedules.filter(
      s => s.date >= startDate && s.date <= endDate
    );
  }
  
  return filteredSchedules.length;
};

// Get employee workload balance score (lower is better)
export const getWorkloadBalanceScore = (
  employee: EmployeeProfile,
  schedules: Schedule[],
  startDate: string,
  endDate: string
): number => {
  const shiftCount = countEmployeeShifts(employee.id, schedules, startDate, endDate);
  
  // Count night shifts
  const nightShifts = schedules.filter(
    s => s.employeeId === employee.id &&
    s.shift.id === 'shift3' &&
    s.date >= startDate &&
    s.date <= endDate
  ).length;
  
  // Higher score means more workload
  return shiftCount + nightShifts * 1.5;
};

// Sort employees by workload (least worked first)
export const sortByWorkload = (
  employees: EmployeeProfile[],
  schedules: Schedule[],
  startDate: string,
  endDate: string
): EmployeeProfile[] => {
  return [...employees].sort((a, b) => {
    const scoreA = getWorkloadBalanceScore(a, schedules, startDate, endDate);
    const scoreB = getWorkloadBalanceScore(b, schedules, startDate, endDate);
    return scoreA - scoreB;
  });
};

// Check if shift has minimum staff
export const hasMinimumStaff = (
  date: string,
  shift: Shift,
  schedules: Schedule[]
): boolean => {
  const shiftSchedules = schedules.filter(
    s => s.date === date && s.shiftId === shift.id
  );
  return shiftSchedules.length >= shift.minStaff;
};

// Get shift coverage status
export const getShiftCoverage = (
  date: string,
  shift: Shift,
  schedules: Schedule[]
): { current: number; required: number; isCovered: boolean } => {
  const shiftSchedules = schedules.filter(
    s => s.date === date && s.shiftId === shift.id
  );
  
  return {
    current: shiftSchedules.length,
    required: shift.minStaff,
    isCovered: shiftSchedules.length >= shift.minStaff,
  };
};

// Validate schedule for conflicts
export const validateSchedule = (
  schedule: Schedule,
  existingSchedules: Schedule[]
): { valid: boolean; errors: string[] } => {
  const errors: string[] = [];
  
  // Check for double booking
  const doubleBooking = existingSchedules.find(
    s => s.employeeId === schedule.employeeId &&
    s.date === schedule.date &&
    s.id !== schedule.id
  );
  
  if (doubleBooking) {
    errors.push('พนักงานมีกะทำงานในวันนี้อยู่แล้ว');
  }
  
  // Check for night to morning conflict
  const prevDate = new Date(schedule.date);
  prevDate.setDate(prevDate.getDate() - 1);
  const prevDateStr = prevDate.toISOString().split('T')[0];
  
  const prevSchedule = existingSchedules.find(
    s => s.employeeId === schedule.employeeId &&
    s.date === prevDateStr
  );
  
  if (prevSchedule && prevSchedule.shift.id === 'shift3' && schedule.shift.id === 'shift1') {
    errors.push('พนักงานทำกะดึกเมื่อวาน ไม่สามารถทำกะเช้าได้');
  }
  
  // Check for required skills
  const hasRequiredSkills = schedule.shift.requiredSkills.every(skillId =>
    schedule.employee.skills.some(s => s.id === skillId)
  );
  
  if (!hasRequiredSkills) {
    errors.push('พนักงานไม่มีทักษะที่ต้องการสำหรับกะนี้');
  }
  
  return {
    valid: errors.length === 0,
    errors,
  };
};

// Get consecutive work days for employee
export const getConsecutiveWorkDays = (
  employeeId: string,
  schedules: Schedule[],
  upToDate: string
): number => {
  const sortedSchedules = schedules
    .filter(s => s.employeeId === employeeId && s.date <= upToDate)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  
  if (sortedSchedules.length === 0) return 0;
  
  let consecutiveDays = 1;
  const latestDate = new Date(sortedSchedules[0].date);
  
  for (let i = 1; i < sortedSchedules.length; i++) {
    const currentDate = new Date(sortedSchedules[i].date);
    const expectedDate = new Date(latestDate);
    expectedDate.setDate(expectedDate.getDate() - i);
    
    if (currentDate.toISOString().split('T')[0] === expectedDate.toISOString().split('T')[0]) {
      consecutiveDays++;
    } else {
      break;
    }
  }
  
  return consecutiveDays;
};

// Check if employee needs rest
export const needsRest = (
  employeeId: string,
  schedules: Schedule[],
  date: string
): boolean => {
  const consecutiveDays = getConsecutiveWorkDays(employeeId, schedules, date);
  return consecutiveDays >= 6;
};

// Get shift statistics
export const getShiftStatistics = (
  schedules: Schedule[],
  startDate: string,
  endDate: string
): {
  totalShifts: number;
  shiftsByType: Record<string, number>;
  shiftsByEmployee: Record<string, number>;
} => {
  const filteredSchedules = schedules.filter(
    s => s.date >= startDate && s.date <= endDate
  );
  
  const shiftsByType: Record<string, number> = {};
  const shiftsByEmployee: Record<string, number> = {};
  
  filteredSchedules.forEach(schedule => {
    // Count by shift type
    if (schedule.shift?.name) {
      shiftsByType[schedule.shift.name] = (shiftsByType[schedule.shift.name] || 0) + 1;
    }
    
    // Count by employee
    if (schedule.employee?.fullName) {
      shiftsByEmployee[schedule.employee.fullName] = (shiftsByEmployee[schedule.employee.fullName] || 0) + 1;
    }
  });
  
  return {
    totalShifts: filteredSchedules.length,
    shiftsByType,
    shiftsByEmployee,
  };
};

// Export schedule to CSV format
export const exportToCSV = (schedules: Schedule[]): string => {
  const headers = ['วันที่', 'วัน', 'กะ', 'เวลา', 'พนักงาน', 'ตำแหน่ง', 'สถานะ'];
  
  const rows = schedules.map(s => [
    s.date,
    new Date(s.date).toLocaleDateString('th-TH', { weekday: 'long' }),
    s.shift?.name || '',
    `${s.shift?.startTime || ''} - ${s.shift?.endTime || ''}`,
    s.employee?.fullName || '',
    s.employee?.position?.name || '',
    s.status === 'scheduled' ? 'กำหนดการ' :
    s.status === 'confirmed' ? 'ยืนยันแล้ว' :
    s.status === 'completed' ? 'เสร็จสิ้น' : 'ขาดงาน',
  ]);
  
  return [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
};
