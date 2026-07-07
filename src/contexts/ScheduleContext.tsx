import React, { createContext, useContext, useState, useEffect, useRef, useMemo, useCallback, type ReactNode } from 'react';
import type { Schedule, Shift, LeaveRequest, SwapRequest, ScheduleContextType } from '@/types';
import { scheduleStorage, shiftStorage, leaveRequestStorage, swapRequestStorage } from '@/data/storage';
import { getCache, setCache, clearCache } from '@/lib/cache';
import { useEmployee } from './EmployeeContext';
import { useNotifications } from './NotificationContext';
import { useAuth } from './AuthContext';
import { useStations } from './StationContext';
import { subscribeToTables } from '@/lib/realtime';

const SCHEDULES_CACHE = 'schedules';
const SHIFTS_CACHE = 'shifts';
const LEAVES_CACHE = 'leave_requests';
const SWAPS_CACHE = 'swap_requests';

const ScheduleContext = createContext<ScheduleContextType | undefined>(undefined);

export const ScheduleProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [swapRequests, setSwapRequests] = useState<SwapRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const { employees, isLoading: isEmployeeLoading, users } = useEmployee();
  const { user, profile } = useAuth();
  const { currentStation } = useStations();
  const { addNotification } = useNotifications();
  const isInitialized = useRef(false);
  const [rawSchedules, setRawSchedules] = useState<Schedule[]>([]);
  const [rawLeaveRequests, setRawLeaveRequests] = useState<LeaveRequest[]>([]);
  const [rawSwapRequests, setRawSwapRequests] = useState<SwapRequest[]>([]);
  const loadedShiftsRef = useRef<Shift[]>([]);
  const realtimeDebounceRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  const notifyManagers = useCallback(async (title: string, message: string, type: 'info' | 'warning' | 'error' | 'success' = 'info') => {
    const managers = users.filter(u => u.role === 'admin' || u.role === 'manager');
    await Promise.all(managers.map(m => addNotification({ userId: m.id, title, message, type, read: false })));
  }, [users, addNotification]);

  const notifyUserByProfileId = useCallback(async (profileId: string, title: string, message: string, type: 'info' | 'warning' | 'error' | 'success' = 'info') => {
    const user = users.find(u => u.profileId === profileId);
    if (user) await addNotification({ userId: user.id, title, message, type, read: false });
  }, [users, addNotification]);

  const debouncedRealtimeReload = useCallback((key: string, reloadFn: () => Promise<void>) => {
    if (realtimeDebounceRef.current[key]) {
      clearTimeout(realtimeDebounceRef.current[key]);
    }
    realtimeDebounceRef.current[key] = setTimeout(() => {
      reloadFn().catch(console.error);
    }, 800);
  }, []);

  useEffect(() => {
    if (isInitialized.current) return;
    isInitialized.current = true;

    const loadData = async () => {
      setIsLoading(true);
      
      // Try cache first (2 min for schedules, 30 min for shifts)
      const cachedShifts = getCache<Shift[]>(SHIFTS_CACHE, 30);
      const cachedSchedules = getCache<Schedule[]>(SCHEDULES_CACHE, 2);
      const cachedLeaves = getCache<LeaveRequest[]>(LEAVES_CACHE, 2);
      const cachedSwaps = getCache<SwapRequest[]>(SWAPS_CACHE, 2);

      try {
        const loadedShifts = cachedShifts || await shiftStorage.getAll();
        loadedShiftsRef.current = loadedShifts;
        setShifts(loadedShifts);
        setCache(SHIFTS_CACHE, loadedShifts);

        const loadedSchedules = cachedSchedules || await scheduleStorage.getRecent(100);
        setRawSchedules(loadedSchedules);
        setCache(SCHEDULES_CACHE, loadedSchedules);

        const loadedLeaveRequests = cachedLeaves || await leaveRequestStorage.getRecent(50);
        setRawLeaveRequests(loadedLeaveRequests);
        setCache(LEAVES_CACHE, loadedLeaveRequests);

        const loadedSwapRequests = cachedSwaps || await swapRequestStorage.getRecent(50);
        setRawSwapRequests(loadedSwapRequests);
        setCache(SWAPS_CACHE, loadedSwapRequests);
      } catch (error) {
        console.error('Error loading schedule data:', error);
      }
    };

    loadData();
  }, []);

  // Realtime subscriptions
  useEffect(() => {
    const stationId = currentStation?.id || profile?.stationId;
    const unsubscribes = subscribeToTables([
      {
        table: 'schedules',
        onEvent: () => {
          debouncedRealtimeReload('schedules', async () => {
            clearCache(SCHEDULES_CACHE);
            const loaded = await scheduleStorage.getRecent(100);
            setRawSchedules(loaded);
            setCache(SCHEDULES_CACHE, loaded);
          });
        },
      },
      {
        table: 'shifts',
        onEvent: () => {
          debouncedRealtimeReload('shifts', async () => {
            clearCache(SHIFTS_CACHE);
            const loaded = await shiftStorage.getAll();
            loadedShiftsRef.current = loaded;
            setShifts(loaded);
            setCache(SHIFTS_CACHE, loaded);
          });
        },
      },
      {
        table: 'leave_requests',
        onEvent: (payload) => {
          debouncedRealtimeReload('leave_requests', async () => {
            clearCache(LEAVES_CACHE);
            const loaded = await leaveRequestStorage.getRecent(50);
            setRawLeaveRequests(loaded);
            setCache(LEAVES_CACHE, loaded);
          });
          if (payload.eventType === 'INSERT') {
            const record = payload.new as Record<string, unknown>;
            const empId = record.employeeid as string;
            const employee = employees.find(e => e.id === empId);
            if (employee && (!stationId || employee.stationId === stationId || user?.role === 'admin')) {
              // Notification will be handled by the create flow, so we just toast here
            }
          }
        },
      },
      {
        table: 'swap_requests',
        onEvent: () => {
          debouncedRealtimeReload('swap_requests', async () => {
            clearCache(SWAPS_CACHE);
            const loaded = await swapRequestStorage.getRecent(50);
            setRawSwapRequests(loaded);
            setCache(SWAPS_CACHE, loaded);
          });
        },
      },
    ]);

    return unsubscribes;
  }, [currentStation, profile, employees, user, debouncedRealtimeReload]);

  useEffect(() => {
    if (isEmployeeLoading) return;

    if (employees.length === 0 && rawSchedules.length === 0 && rawLeaveRequests.length === 0 && rawSwapRequests.length === 0) {
      setIsLoading(false);
      return;
    }

    if (employees.length === 0) {
      setIsLoading(false);
      return;
    }

    if (rawSchedules.length === 0 && rawLeaveRequests.length === 0 && rawSwapRequests.length === 0) {
      setIsLoading(false);
      return;
    }

    const enrichedSchedules = rawSchedules.map(s => ({
      ...s,
      shift: loadedShiftsRef.current.find(ls => ls.id === s.shiftId) || s.shift,
      employee: employees.find(e => e.id === s.employeeId) || s.employee,
    }));

    const enrichedLeaveRequests = rawLeaveRequests.map(r => ({
      ...r,
      employee: employees.find(e => e.id === r.employeeId) || r.employee,
    }));

    const enrichedSwapRequests = rawSwapRequests.map(r => ({
      ...r,
      requester: employees.find(e => e.id === r.requesterId) || r.requester,
      requested: employees.find(e => e.id === r.requestedId) || r.requested,
      schedule: enrichedSchedules.find(s => s.id === r.scheduleId) || r.schedule,
      targetSchedule: enrichedSchedules.find(s => s.id === r.targetScheduleId) || r.targetSchedule,
    }));

    // Filter by station
    const stationId = currentStation?.id || profile?.stationId;
    const filterByStation = (s: Schedule) => {
      if (!stationId) return true;
      if (user?.role === 'admin' && !currentStation) return true;
      return s.stationId === stationId;
    };
    const filterLeaveByStation = (r: LeaveRequest) => {
      if (!stationId) return true;
      if (user?.role === 'admin' && !currentStation) return true;
      return r.employee?.stationId === stationId;
    };
    const filterSwapByStation = (r: SwapRequest) => {
      if (!stationId) return true;
      if (user?.role === 'admin' && !currentStation) return true;
      return r.requester?.stationId === stationId;
    };

    setSchedules(enrichedSchedules.filter(filterByStation));
    setLeaveRequests(enrichedLeaveRequests.filter(filterLeaveByStation));
    setSwapRequests(enrichedSwapRequests.filter(filterSwapByStation));
    setIsLoading(false);
  }, [employees, rawSchedules, rawLeaveRequests, rawSwapRequests, isEmployeeLoading, currentStation, profile?.stationId, user?.role]);

  const addSchedule = useCallback(async (schedule: Omit<Schedule, 'id' | 'shift' | 'employee'>) => {
    const shift = shifts.find(s => s.id === schedule.shiftId);
    const employee = employees.find(e => e.id === schedule.employeeId);
    if (!shift || !employee) return;
    const newSchedule: Schedule = { ...schedule, id: `sched-${Date.now()}`, shift, employee };
    await scheduleStorage.create(newSchedule);
    setRawSchedules(prev => [...prev, newSchedule]);
    await notifyUserByProfileId(employee.id, 'ตารางกะใหม่', `คุณถูกจัดกะ ${shift.name} ในวันที่ ${newSchedule.date}`, 'info');
  }, [shifts, employees, notifyUserByProfileId]);

  const updateSchedule = useCallback(async (id: string, updates: Partial<Schedule>) => {
    const currentSchedule = schedules.find(s => s.id === id);
    if (!currentSchedule) return;
    const updatedSchedule = { ...currentSchedule, ...updates };
    if (updates.shiftId) { const shift = shifts.find(s => s.id === updates.shiftId); if (shift) updatedSchedule.shift = shift; }
    if (updates.employeeId) { const employee = employees.find(e => e.id === updates.employeeId); if (employee) updatedSchedule.employee = employee; }
    await scheduleStorage.update(id, updatedSchedule);
    setRawSchedules(prev => prev.map(s => s.id === id ? updatedSchedule : s));
  }, [schedules, shifts, employees]);

  const deleteSchedule = useCallback(async (id: string) => {
    await scheduleStorage.delete(id);
    setRawSchedules(prev => prev.filter(s => s.id !== id));
  }, []);

  const addShift = useCallback(async (shift: Omit<Shift, 'id' | 'requiredSkills'> & { id?: string }): Promise<Shift | null> => {
    const newShift: Shift = { ...shift, id: shift.id || `shift-${Date.now()}`, requiredSkills: [] };
    const success = await shiftStorage.create(newShift);
    if (success) { setShifts(prev => [...prev, newShift]); setCache(SHIFTS_CACHE, [...shifts, newShift]); return newShift; }
    return null;
  }, [shifts]);

  const updateShift = useCallback(async (id: string, updates: Partial<Shift>): Promise<boolean> => {
    const currentShift = shifts.find(s => s.id === id);
    if (!currentShift) return false;
    const updatedShift = { ...currentShift, ...updates };
    const success = await shiftStorage.update(id, updatedShift);
    if (success) { setShifts(prev => prev.map(s => s.id === id ? updatedShift : s)); setCache(SHIFTS_CACHE, shifts.map(s => s.id === id ? updatedShift : s)); }
    return success;
  }, [shifts]);

  const deleteShift = useCallback(async (id: string): Promise<boolean> => {
    const success = await shiftStorage.delete(id);
    if (success) { setShifts(prev => prev.filter(s => s.id !== id)); setCache(SHIFTS_CACHE, shifts.filter(s => s.id !== id)); }
    return success;
  }, [shifts]);

  const clearAllSchedules = useCallback(async () => {
    await scheduleStorage.clearAll();
    setRawSchedules([]);
    setCache(SCHEDULES_CACHE, []);
  }, []);

  const generateSchedule = useCallback(async (startDate: string, endDate: string) => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const activeEmployees = employees.filter(e => e.status === 'active' && e.position.name !== 'ผู้จัดการสาขา');
    const shiftPattern = [
      ['shift1', 'shift1', 'shift2', 'shift2', 'shift3', null, null],
      ['shift2', 'shift2', 'shift1', 'shift1', 'shift1', 'shift3', null],
      ['shift3', 'shift3', 'shift3', null, null, 'shift1', 'shift1'],
      ['shift1', 'shift2', 'shift2', 'shift3', null, null, 'shift1'],
      [null, 'shift1', 'shift1', 'shift1', 'shift2', 'shift2', 'shift3'],
    ];
    await scheduleStorage.deleteByDateRange(startDate, endDate);
    const newSchedules: Schedule[] = [];
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().split('T')[0];
      const dayOfWeek = d.getDay();
      activeEmployees.forEach((emp, empIndex) => {
        const pattern = shiftPattern[empIndex % shiftPattern.length];
        const shiftId = pattern[dayOfWeek];
        if (shiftId) {
          const shift = shifts.find(s => s.id === shiftId);
          if (shift) newSchedules.push({ id: `sched-${emp.id}-${dateStr}`, date: dateStr, shiftId, shift, employeeId: emp.id, employee: emp, stationId: currentStation?.id || profile?.stationId || 'station1', status: 'scheduled', note: '', createdBy: 'system', createdAt: new Date().toISOString() });
        }
      });
    }
    await scheduleStorage.createMany(newSchedules);
    setRawSchedules(prev => [...prev.filter(s => s.date < startDate || s.date > endDate), ...newSchedules]);
    setCache(SCHEDULES_CACHE, [...rawSchedules.filter(s => s.date < startDate || s.date > endDate), ...newSchedules]);
    await Promise.all(newSchedules.map(s => notifyUserByProfileId(s.employeeId, 'ตารางกะอัปเดต', `ตารางกะ ${s.shift.name} ในวันที่ ${s.date} ได้รับการจัดแล้ว`, 'info')));
  }, [employees, shifts, rawSchedules, notifyUserByProfileId, currentStation?.id, profile?.stationId]);

  const requestLeave = useCallback(async (leave: Omit<LeaveRequest, 'id' | 'employee' | 'status' | 'approvedBy' | 'approvedAt' | 'createdAt' | 'days'>) => {
    const employee = employees.find(e => e.id === leave.employeeId);
    if (!employee) return;
    const start = new Date(leave.startDate);
    const end = new Date(leave.endDate);
    const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    const newLeave: LeaveRequest = { ...leave, id: `leave-${Date.now()}`, employee, days, status: 'pending', approvedBy: null, approvedAt: null, createdAt: new Date().toISOString() };
    await leaveRequestStorage.create(newLeave);
    setRawLeaveRequests(prev => [...prev, newLeave]);
    setCache(LEAVES_CACHE, [...rawLeaveRequests, newLeave]);
    await notifyManagers('คำขอลาใหม่', `${employee.fullName} ขอลา ${days} วัน`, 'warning');
  }, [employees, rawLeaveRequests, notifyManagers]);

  const approveLeave = useCallback(async (id: string, approved: boolean) => {
    const leave = leaveRequests.find(l => l.id === id);
    if (!leave) return;
    const updatedLeave = { ...leave, status: (approved ? 'approved' : 'rejected') as LeaveRequest['status'], approvedBy: approved ? 'emp3' : null, approvedAt: approved ? new Date().toISOString() : null };
    await leaveRequestStorage.update(id, updatedLeave);
    setRawLeaveRequests(prev => prev.map(l => l.id === id ? updatedLeave : l));
    setCache(LEAVES_CACHE, rawLeaveRequests.map(l => l.id === id ? updatedLeave : l));
    await notifyUserByProfileId(leave.employeeId, approved ? 'คำขอลาอนุมัติแล้ว' : 'คำขอลาไม่ได้รับอนุมัติ', approved ? `คำขอลาของคุณได้รับอนุมัติแล้ว (${leave.days} วัน)` : `คำขอลาของคุณไม่ได้รับอนุมัติ (${leave.days} วัน)`, approved ? 'success' : 'error');
    if (approved) {
      const start = new Date(leave.startDate);
      const end = new Date(leave.endDate);
      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        const dateStr = d.toISOString().split('T')[0];
        const schedule = schedules.find(s => s.employeeId === leave.employeeId && s.date === dateStr);
        if (schedule) await deleteSchedule(schedule.id);
      }
    }
  }, [leaveRequests, schedules, deleteSchedule, notifyUserByProfileId, rawLeaveRequests]);

  const requestSwap = useCallback(async (swap: Omit<SwapRequest, 'id' | 'requester' | 'requested' | 'schedule' | 'targetSchedule' | 'status' | 'approvedBy' | 'createdAt'>) => {
    const requester = employees.find(e => e.id === swap.requesterId);
    const requested = employees.find(e => e.id === swap.requestedId);
    const schedule = schedules.find(s => s.id === swap.scheduleId);
    const targetSchedule = schedules.find(s => s.id === swap.targetScheduleId);
    if (!requester || !requested || !schedule || !targetSchedule) return;
    const newSwap: SwapRequest = { ...swap, id: `swap-${Date.now()}`, requester, requested, schedule, targetSchedule, status: 'pending', approvedBy: null, createdAt: new Date().toISOString() };
    await swapRequestStorage.create(newSwap);
    setRawSwapRequests(prev => [...prev, newSwap]);
    setCache(SWAPS_CACHE, [...rawSwapRequests, newSwap]);
    await notifyManagers('คำขอสลับกะใหม่', `${requester.fullName} ขอสลับกะกับ ${requested.fullName}`, 'warning');
    await notifyUserByProfileId(requested.id, 'คำขอสลับกะ', `${requester.fullName} ขอสลับกะกับคุณ (${schedule.shift.name} ${schedule.date})`, 'warning');
  }, [employees, schedules, rawSwapRequests, notifyManagers, notifyUserByProfileId]);

  const approveSwap = useCallback(async (id: string, approved: boolean) => {
    const swap = swapRequests.find(s => s.id === id);
    if (!swap) return;
    const updatedSwap = { ...swap, status: (approved ? 'approved' : 'rejected') as SwapRequest['status'], approvedBy: approved ? 'emp3' : null };
    await swapRequestStorage.update(id, updatedSwap);
    setRawSwapRequests(prev => prev.map(s => s.id === id ? updatedSwap : s));
    setCache(SWAPS_CACHE, rawSwapRequests.map(s => s.id === id ? updatedSwap : s));
    await notifyUserByProfileId(swap.requesterId, approved ? 'คำขอสลับกะอนุมัติแล้ว' : 'คำขอสลับกะไม่ได้รับอนุมัติ', approved ? `คำขอสลับกะของคุณกับ ${swap.requested.fullName} ได้รับอนุมัติแล้ว` : `คำขอสลับกะของคุณกับ ${swap.requested.fullName} ไม่ได้รับอนุมัติ`, approved ? 'success' : 'error');
    await notifyUserByProfileId(swap.requestedId, approved ? 'คำขอสลับกะอนุมัติแล้ว' : 'คำขอสลับกะไม่ได้รับอนุมัติ', approved ? `คำขอสลับกะกับ ${swap.requester.fullName} ได้รับอนุมัติแล้ว` : `คำขอสลับกะกับ ${swap.requester.fullName} ไม่ได้รับอนุมัติ`, approved ? 'success' : 'error');
    if (approved) { await updateSchedule(swap.scheduleId, { employeeId: swap.requestedId }); await updateSchedule(swap.targetScheduleId, { employeeId: swap.requesterId }); }
  }, [swapRequests, rawSwapRequests, updateSchedule, notifyUserByProfileId]);

  const getSchedulesByDate = useCallback((date: string): Schedule[] => schedules.filter(s => s.date === date), [schedules]);
  const getSchedulesByEmployee = useCallback((employeeId: string): Schedule[] => schedules.filter(s => s.employeeId === employeeId), [schedules]);
  const getSchedulesByDateRange = useCallback((startDate: string, endDate: string): Schedule[] => schedules.filter(s => s.date >= startDate && s.date <= endDate), [schedules]);

  const value = useMemo<ScheduleContextType>(() => ({
    schedules, shifts, leaveRequests, swapRequests, isLoading,
    addSchedule, updateSchedule, deleteSchedule, generateSchedule, clearAllSchedules,
    addShift, updateShift, deleteShift,
    requestLeave, approveLeave, requestSwap, approveSwap,
    getSchedulesByDate, getSchedulesByEmployee, getSchedulesByDateRange,
  }), [schedules, shifts, leaveRequests, swapRequests, isLoading, addSchedule, updateSchedule, deleteSchedule, generateSchedule, clearAllSchedules, addShift, updateShift, deleteShift, requestLeave, approveLeave, requestSwap, approveSwap, getSchedulesByDate, getSchedulesByEmployee, getSchedulesByDateRange]);

  return <ScheduleContext.Provider value={value}>{children}</ScheduleContext.Provider>;
};

// eslint-disable-next-line react-refresh/only-export-components
export const useSchedule = (): ScheduleContextType => {
  const context = useContext(ScheduleContext);
  if (context === undefined) throw new Error('useSchedule must be used within a ScheduleProvider');
  return context;
};
