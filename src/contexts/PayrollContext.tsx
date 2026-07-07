import React, { createContext, useContext, useState, useEffect, useRef, useMemo, useCallback, type ReactNode } from 'react';
import type { PayrollPeriod, PayrollRecord, PayrollContextType } from '@/types';
import { payrollPeriodStorage, payrollRecordStorage } from '@/data/payrollStorage';
import { scheduleStorage, attendanceStorage, shiftStorage, leaveRequestStorage } from '@/data/storage';
import { useEmployee } from './EmployeeContext';
import { toast } from 'sonner';
import { subscribeToTables } from '@/lib/realtime';

const PayrollContext = createContext<PayrollContextType | undefined>(undefined);

// Simplified Thai personal income tax calculation (progressive)
const calculateThaiTax = (income: number): number => {
  const brackets = [
    { limit: 150000, rate: 0 },
    { limit: 300000, rate: 0.05 },
    { limit: 500000, rate: 0.10 },
    { limit: 750000, rate: 0.15 },
    { limit: 1000000, rate: 0.20 },
    { limit: 2000000, rate: 0.25 },
    { limit: 5000000, rate: 0.30 },
    { limit: Infinity, rate: 0.35 },
  ];

  let tax = 0;
  let previousLimit = 0;

  for (const bracket of brackets) {
    if (income > previousLimit) {
      const taxableAtBracket = Math.min(income, bracket.limit) - previousLimit;
      tax += taxableAtBracket * bracket.rate;
      previousLimit = bracket.limit;
    } else {
      break;
    }
  }

  return Math.max(0, Math.round(tax));
};

// Parse ISO datetime string to get time in minutes
const getTimeMinutesFromDateTime = (dateTimeStr: string | null): number | null => {
  if (!dateTimeStr) return null;
  try {
    const date = new Date(dateTimeStr);
    if (isNaN(date.getTime())) return null;
    return date.getHours() * 60 + date.getMinutes();
  } catch {
    return null;
  }
};

// Parse time string (HH:mm) to minutes
const timeToMinutes = (timeStr: string): number => {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours * 60 + minutes;
};

export const PayrollProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [periods, setPeriods] = useState<PayrollPeriod[]>([]);
  const [records, setRecords] = useState<PayrollRecord[]>([]);
  const [currentPeriod, setCurrentPeriod] = useState<PayrollPeriod | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { employees, isLoading: isEmployeeLoading } = useEmployee();
  const isInitialized = useRef(false);
  const realtimeDebounceRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  // Load periods on mount
  const fetchPeriods = useCallback(async () => {
    setIsLoading(true);
    try {
      const loadedPeriods = await payrollPeriodStorage.getAll();
      setPeriods(loadedPeriods);

      // Set current period (latest open or processing)
      const activePeriod = loadedPeriods.find(p => p.status === 'open' || p.status === 'processing');
      setCurrentPeriod(activePeriod || loadedPeriods[0] || null);
    } catch (error) {
      console.error('Error loading payroll periods:', error);
      toast.error('ไม่สามารถโหลดข้อมูลงวดเงินเดือนได้');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isInitialized.current) return;
    isInitialized.current = true;
    fetchPeriods();
  }, [fetchPeriods]);

  // Realtime subscriptions
  useEffect(() => {
    const unsubscribes = subscribeToTables([
      {
        table: 'payroll_periods',
        onEvent: () => {
          if (realtimeDebounceRef.current['payroll_periods']) clearTimeout(realtimeDebounceRef.current['payroll_periods']);
          realtimeDebounceRef.current['payroll_periods'] = setTimeout(() => {
            fetchPeriods().catch(console.error);
          }, 800);
        },
      },
      {
        table: 'payroll_records',
        onEvent: () => {
          if (realtimeDebounceRef.current['payroll_records']) clearTimeout(realtimeDebounceRef.current['payroll_records']);
          realtimeDebounceRef.current['payroll_records'] = setTimeout(async () => {
            if (!currentPeriod) return;
            try {
              const loadedRecords = await payrollRecordStorage.getByPeriod(currentPeriod.id);
              const enrichedRecords = loadedRecords.map(record => ({
                ...record,
                employee: employees.find(e => e.id === record.employeeId),
              }));
              setRecords(enrichedRecords);
            } catch (error) {
              console.error('Error reloading payroll records from realtime:', error);
            }
          }, 800);
        },
      },
    ]);
    return unsubscribes;
  }, [fetchPeriods, currentPeriod, employees]);

  // Load records when current period changes
  useEffect(() => {
    if (!currentPeriod) {
      setRecords([]);
      return;
    }

    const loadRecords = async () => {
      try {
        const loadedRecords = await payrollRecordStorage.getByPeriod(currentPeriod.id);
        // Enrich with employee data
        const enrichedRecords = loadedRecords.map(record => ({
          ...record,
          employee: employees.find(e => e.id === record.employeeId),
        }));
        setRecords(enrichedRecords);
      } catch (error) {
        console.error('Error loading payroll records:', error);
      }
    };

    loadRecords();
  }, [currentPeriod, employees]);

  const createPeriod = useCallback(async (period: Omit<PayrollPeriod, 'id'>) => {
    try {
      // Check if period already exists
      const existing = await payrollPeriodStorage.getByYearMonth(period.year, period.month);
      if (existing) {
        toast.error(`งวดเงินเดือน ${period.month}/${period.year} มีอยู่แล้ว`);
        return;
      }

      const newPeriod: PayrollPeriod = {
        ...period,
        id: `period-${Date.now()}`,
      };

      const success = await payrollPeriodStorage.create(newPeriod);
      if (success) {
        setPeriods(prev => [newPeriod, ...prev]);
        setCurrentPeriod(newPeriod);
        toast.success('สร้างงวดเงินเดือนสำเร็จ');
      } else {
        toast.error('ไม่สามารถสร้างงวดเงินเดือนได้');
      }
    } catch (error) {
      console.error('Error creating payroll period:', error);
      toast.error('เกิดข้อผิดพลาดในการสร้างงวดเงินเดือน');
    }
  }, []);

  const closePeriod = useCallback(async (id: string) => {
    try {
      const success = await payrollPeriodStorage.update(id, { status: 'closed' });
      if (success) {
        setPeriods(prev => prev.map(p => p.id === id ? { ...p, status: 'closed' as const } : p));
        if (currentPeriod?.id === id) {
          setCurrentPeriod(prev => prev ? { ...prev, status: 'closed' as const } : null);
        }
        toast.success('ปิดงวดเงินเดือนสำเร็จ');
      } else {
        toast.error('ไม่สามารถปิดงวดเงินเดือนได้');
      }
    } catch (error) {
      console.error('Error closing payroll period:', error);
      toast.error('เกิดข้อผิดพลาดในการปิดงวดเงินเดือน');
    }
  }, [currentPeriod]);

  const calculatePayroll = useCallback(async (periodId: string, shiftRate: number, overtimeRate: number) => {
    try {
      const period = periods.find(p => p.id === periodId);
      if (!period) {
        toast.error('ไม่พบงวดเงินเดือน');
        return;
      }

      // Update period status to processing
      await payrollPeriodStorage.update(periodId, { status: 'processing' });
      setPeriods(prev => prev.map(p => p.id === periodId ? { ...p, status: 'processing' as const } : p));

      // Load required data
      const [schedules, attendances, shifts, leaveRequests] = await Promise.all([
        scheduleStorage.getByDateRange(period.startDate, period.endDate),
        attendanceStorage.getAll(),
        shiftStorage.getAll(),
        leaveRequestStorage.getAll(),
      ]);

      // Filter schedules that are not absent
      const validSchedules = schedules.filter(s => s.status !== 'absent');

      // Count shifts per employee
      const shiftCountByEmployee = new Map<string, number>();
      for (const schedule of validSchedules) {
        const count = shiftCountByEmployee.get(schedule.employeeId) || 0;
        shiftCountByEmployee.set(schedule.employeeId, count + 1);
      }

      // Build schedule -> shift mapping
      const scheduleShiftMap = new Map<string, string>();
      for (const schedule of schedules) {
        scheduleShiftMap.set(schedule.id, schedule.shiftId);
      }

      // Build shift end time map
      const shiftEndTimeMap = new Map<string, string>();
      for (const shift of shifts) {
        shiftEndTimeMap.set(shift.id, shift.endTime);
      }

      // Calculate overtime per employee
      const overtimeHoursByEmployee = new Map<string, number>();
      for (const attendance of attendances) {
        if (!attendance.checkOut || !attendance.scheduleId) continue;

        const shiftId = scheduleShiftMap.get(attendance.scheduleId);
        if (!shiftId) continue;

        const shiftEndTime = shiftEndTimeMap.get(shiftId);
        if (!shiftEndTime) continue;

        const checkOutMinutes = getTimeMinutesFromDateTime(attendance.checkOut);
        const shiftEndMinutes = timeToMinutes(shiftEndTime);

        if (checkOutMinutes !== null && checkOutMinutes > shiftEndMinutes) {
          const otMinutes = checkOutMinutes - shiftEndMinutes;
          const otHours = Math.round((otMinutes / 60) * 100) / 100; // Round to 2 decimals
          const current = overtimeHoursByEmployee.get(attendance.employeeId) || 0;
          overtimeHoursByEmployee.set(attendance.employeeId, current + otHours);
        }
      }

      // Count approved leave days per employee (informational)
      const leaveDaysByEmployee = new Map<string, number>();
      for (const leave of leaveRequests) {
        if (leave.status !== 'approved') continue;

        // Check if leave overlaps with period
        const leaveStart = leave.startDate;
        const leaveEnd = leave.endDate;
        if (leaveEnd < period.startDate || leaveStart > period.endDate) continue;

        const current = leaveDaysByEmployee.get(leave.employeeId) || 0;
        leaveDaysByEmployee.set(leave.employeeId, current + (leave.days || 0));
      }

      // Delete existing records for this period
      await payrollRecordStorage.deleteByPeriod(periodId);

      // Create new payroll records for all active employees
      const newRecords: PayrollRecord[] = [];
      for (const employee of employees.filter(e => e.status === 'active')) {
        const shiftCount = shiftCountByEmployee.get(employee.id) || 0;
        const overtimeHours = overtimeHoursByEmployee.get(employee.id) || 0;
        const baseSalary = shiftCount * shiftRate;
        const overtimePay = overtimeHours * overtimeRate;
        const totalIncome = baseSalary + overtimePay;
        const socialSecurity = Math.min(Math.round(totalIncome * 0.05), 750);
        const taxDeduction = calculateThaiTax(totalIncome);
        const otherDeductions = 0;
        const netSalary = totalIncome - taxDeduction - socialSecurity - otherDeductions;

        const record: PayrollRecord = {
          id: `payroll-${periodId}-${employee.id}-${Date.now()}`,
          periodId,
          employeeId: employee.id,
          baseSalary,
          shiftCount,
          shiftRate,
          overtimeHours,
          overtimeRate,
          totalIncome,
          taxDeduction,
          socialSecurity,
          otherDeductions,
          netSalary,
          status: 'draft',
        };

        newRecords.push(record);
      }

      // Bulk create records
      if (newRecords.length > 0) {
        const success = await payrollRecordStorage.bulkCreate(newRecords);
        if (success) {
          const enrichedRecords = newRecords.map(record => ({
            ...record,
            employee: employees.find(e => e.id === record.employeeId),
          }));
          setRecords(enrichedRecords);
          toast.success(`คำนวณเงินเดือนสำเร็จ (${newRecords.length} รายการ)`);
        } else {
          toast.error('ไม่สามารถบันทึกข้อมูลเงินเดือนได้');
        }
      } else {
        setRecords([]);
        toast.success('คำนวณเงินเดือนเสร็จสิ้น (ไม่พบข้อมูลพนักงานที่ต้องจ่าย)');
      }
    } catch (error) {
      console.error('Error calculating payroll:', error);
      toast.error('เกิดข้อผิดพลาดในการคำนวณเงินเดือน');
    }
  }, [periods, employees]);

  const approveRecord = useCallback(async (id: string) => {
    try {
      const success = await payrollRecordStorage.update(id, { status: 'approved' });
      if (success) {
        setRecords(prev => prev.map(r => r.id === id ? { ...r, status: 'approved' as const } : r));
        toast.success('อนุมัติรายการจ่ายสำเร็จ');
      } else {
        toast.error('ไม่สามารถอนุมัติรายการจ่ายได้');
      }
    } catch (error) {
      console.error('Error approving payroll record:', error);
      toast.error('เกิดข้อผิดพลาดในการอนุมัติรายการจ่าย');
    }
  }, []);

  const payRecord = useCallback(async (id: string) => {
    try {
      const success = await payrollRecordStorage.update(id, { status: 'paid' });
      if (success) {
        setRecords(prev => prev.map(r => r.id === id ? { ...r, status: 'paid' as const } : r));
        toast.success('บันทึกการจ่ายเงินสำเร็จ');
      } else {
        toast.error('ไม่สามารถบันทึกการจ่ายเงินได้');
      }
    } catch (error) {
      console.error('Error paying payroll record:', error);
      toast.error('เกิดข้อผิดพลาดในการบันทึกการจ่ายเงิน');
    }
  }, []);

  const exportPayslip = useCallback((record: PayrollRecord) => {
    try {
      const employee = record.employee;
      const period = periods.find(p => p.id === record.periodId);

      const payslipContent = `
=====================================
        สลิปเงินเดือน
=====================================
งวด: ${period?.month ?? '-'}/${period?.year ?? '-'}
พนักงาน: ${employee?.fullName ?? '-'}
ตำแหน่ง: ${employee?.position?.name ?? '-'}
-------------------------------------
รายได้
  ค่ากะ (${record.shiftCount} กะ × ${record.shiftRate.toLocaleString('th-TH')} บ.)  ${record.baseSalary.toLocaleString('th-TH')} บ.
  ค่าล่วงเวลา (${record.overtimeHours} ชม. × ${record.overtimeRate.toLocaleString('th-TH')} บ.)  ${(record.overtimeHours * record.overtimeRate).toLocaleString('th-TH')} บ.
  รายได้รวม                                          ${record.totalIncome.toLocaleString('th-TH')} บ.
-------------------------------------
รายการหัก
  ภาษีเงินได้                                       ${record.taxDeduction.toLocaleString('th-TH')} บ.
  ประกันสังคม                                       ${record.socialSecurity.toLocaleString('th-TH')} บ.
  หักอื่นๆ                                          ${record.otherDeductions.toLocaleString('th-TH')} บ.
-------------------------------------
เงินได้สุทธิ                                        ${record.netSalary.toLocaleString('th-TH')} บ.
=====================================
สถานะ: ${record.status === 'paid' ? 'จ่ายแล้ว' : record.status === 'approved' ? 'อนุมัติแล้ว' : 'ร่าง'}
=====================================
      `;

      // Open print dialog with formatted content
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(`
          <html>
            <head>
              <title>สลิปเงินเดือน - ${employee?.fullName ?? ''}</title>
              <style>
                body { font-family: monospace; white-space: pre; padding: 20px; }
              </style>
            </head>
            <body>${payslipContent}</body>
          </html>
        `);
        printWindow.document.close();
        printWindow.print();
        toast.success('เปิดหน้าพิมพ์สลิปเงินเดือน');
      } else {
        // Fallback: copy to clipboard or alert
        alert(payslipContent);
      }
    } catch (error) {
      console.error('Error exporting payslip:', error);
      toast.error('เกิดข้อผิดพลาดในการพิมพ์สลิป');
    }
  }, [periods]);

  const value = useMemo<PayrollContextType>(() => ({
    periods,
    records,
    currentPeriod,
    setCurrentPeriod,
    isLoading: isLoading || isEmployeeLoading,
    fetchPeriods,
    createPeriod,
    closePeriod,
    calculatePayroll,
    approveRecord,
    payRecord,
    exportPayslip,
  }), [periods, records, currentPeriod, setCurrentPeriod, isLoading, isEmployeeLoading, fetchPeriods, createPeriod, closePeriod, calculatePayroll, approveRecord, payRecord, exportPayslip]);

  return <PayrollContext.Provider value={value}>{children}</PayrollContext.Provider>;
};

// eslint-disable-next-line react-refresh/only-export-components
export const usePayroll = (): PayrollContextType => {
  const context = useContext(PayrollContext);
  if (context === undefined) {
    throw new Error('usePayroll must be used within a PayrollProvider');
  }
  return context;
};
