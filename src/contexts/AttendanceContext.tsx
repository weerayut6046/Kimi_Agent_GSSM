import React, { createContext, useContext, useState, useEffect, useRef, useMemo, useCallback, type ReactNode } from 'react';
import type { Attendance, AttendanceContextType, AttendanceStatus } from '@/types';
import { attendanceStorage } from '@/data/storage';
import { getCache, setCache, clearCache } from '@/lib/cache';
import { useAuth } from './AuthContext';
import { useStations } from './StationContext';
import { useEmployee } from './EmployeeContext';
import { subscribeToTable } from '@/lib/realtime';

const ATTENDANCE_CACHE = 'attendances';

const AttendanceContext = createContext<AttendanceContextType | undefined>(undefined);

export const AttendanceProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { user, profile } = useAuth();
  const { currentStation } = useStations();
  const { employees } = useEmployee();

  const [attendances, setAttendances] = useState<Attendance[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const isInitialized = useRef(false);
  const realtimeDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (isInitialized.current) return;
    isInitialized.current = true;

    const loadData = async () => {
      setIsLoading(true);
      
      // Try cache first (2 min TTL)
      const cached = getCache<Attendance[]>(ATTENDANCE_CACHE, 2);
      if (cached) {
        const filtered = filterAttendancesByStation(cached);
        setAttendances(filtered);
        setIsLoading(false);
        return;
      }

      try {
        const loaded = await attendanceStorage.getRecent(100);
        const filtered = filterAttendancesByStation(loaded);
        setAttendances(filtered);
        setCache(ATTENDANCE_CACHE, loaded);
      } catch (error) {
        console.error('Error loading attendance data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    const filterAttendancesByStation = (data: Attendance[]): Attendance[] => {
      const stationId = currentStation?.id || profile?.stationId;
      if (!stationId) return data;
      if (user?.role === 'admin' && !currentStation) return data;
      return data.filter(a => {
        const employee = employees.find(e => e.id === a.employeeId);
        return employee?.stationId === stationId;
      });
    };

    loadData();
  }, []);

  // Realtime subscription
  useEffect(() => {
    const unsubscribe = subscribeToTable({
      table: 'attendances',
      onEvent: () => {
        if (realtimeDebounceRef.current) clearTimeout(realtimeDebounceRef.current);
        realtimeDebounceRef.current = setTimeout(async () => {
          clearCache(ATTENDANCE_CACHE);
          try {
            const loaded = await attendanceStorage.getRecent(100);
            const stationId = currentStation?.id || profile?.stationId;
            const filtered = stationId && !(user?.role === 'admin' && !currentStation)
              ? loaded.filter((a: Attendance) => {
                  const employee = employees.find(e => e.id === a.employeeId);
                  return employee?.stationId === stationId;
                })
              : loaded;
            setAttendances(filtered);
            setCache(ATTENDANCE_CACHE, loaded);
          } catch (error) {
            console.error('Error reloading attendance from realtime:', error);
          }
        }, 800);
      },
    });
    return unsubscribe;
  }, [currentStation, profile, user, employees]);

  const addAttendance = useCallback(async (attendance: Omit<Attendance, 'id' | 'employee' | 'schedule'>) => {
    const newId = `att${Date.now()}`;
    const newAttendance: Attendance = { 
      ...attendance, 
      id: newId,
      employee: {} as Attendance['employee'],
      schedule: {} as Attendance['schedule'],
    };
    await attendanceStorage.create(newAttendance);
    setAttendances(prev => [newAttendance, ...prev]);
    setCache(ATTENDANCE_CACHE, [newAttendance, ...attendances]);
  }, [attendances]);

  const checkIn = useCallback((employeeId: string, scheduleId: string, location?: string) => {
    const newId = `att${Date.now()}`;
    const now = new Date().toISOString();
    const newAttendance: Attendance = {
      id: newId,
      employeeId,
      employee: {} as Attendance['employee'],
      scheduleId,
      schedule: {} as Attendance['schedule'],
      checkIn: now,
      checkOut: null,
      checkInLocation: location || '',
      checkOutLocation: '',
      note: '',
      status: 'normal' as AttendanceStatus,
    };
    attendanceStorage.create(newAttendance).catch(console.error);
    setAttendances(prev => [newAttendance, ...prev]);
    setCache(ATTENDANCE_CACHE, [newAttendance, ...attendances]);
  }, [attendances]);

  const checkOut = useCallback((employeeId: string, _scheduleId: string, location?: string) => {
    const attendance = attendances.find(a => a.employeeId === employeeId && !a.checkOut);
    if (!attendance) return;
    const updatedAttendance = { 
      ...attendance, 
      checkOut: new Date().toISOString(),
      checkOutLocation: location || '',
    };
    attendanceStorage.update(attendance.id, updatedAttendance).catch(console.error);
    setAttendances(prev => prev.map(a => a.id === attendance.id ? updatedAttendance : a));
    setCache(ATTENDANCE_CACHE, attendances.map(a => a.id === attendance.id ? updatedAttendance : a));
  }, [attendances]);

  const updateAttendance = useCallback(async (id: string, updates: Partial<Attendance>) => {
    const currentAttendance = attendances.find(a => a.id === id);
    if (!currentAttendance) return;
    const updatedAttendance = { ...currentAttendance, ...updates };
    await attendanceStorage.update(id, updatedAttendance);
    setAttendances(prev => prev.map(a => a.id === id ? updatedAttendance : a));
    setCache(ATTENDANCE_CACHE, attendances.map(a => a.id === id ? updatedAttendance : a));
  }, [attendances]);

  const deleteAttendance = useCallback(async (id: string) => {
    await attendanceStorage.delete(id);
    setAttendances(prev => prev.filter(a => a.id !== id));
    setCache(ATTENDANCE_CACHE, attendances.filter(a => a.id !== id));
  }, [attendances]);

  const getAttendanceByDate = useCallback((date: string): Attendance[] => {
    return attendances.filter(a => {
      const checkInDate = a.checkIn ? a.checkIn.split('T')[0] : '';
      return checkInDate === date;
    });
  }, [attendances]);

  const getAttendanceByEmployee = useCallback((employeeId: string): Attendance[] => attendances.filter(a => a.employeeId === employeeId), [attendances]);
  
  const getTodayAttendance = useCallback((): Attendance[] => {
    const today = new Date().toISOString().split('T')[0];
    return attendances.filter(a => {
      const checkInDate = a.checkIn ? a.checkIn.split('T')[0] : '';
      return checkInDate === today;
    });
  }, [attendances]);

  const value = useMemo<AttendanceContextType>(() => ({
    attendances, isLoading,
    checkIn, checkOut, addAttendance, updateAttendance, deleteAttendance,
    getAttendanceByDate, getAttendanceByEmployee, getTodayAttendance,
  }), [attendances, isLoading, checkIn, checkOut, addAttendance, updateAttendance, deleteAttendance, getAttendanceByDate, getAttendanceByEmployee, getTodayAttendance]);

  return <AttendanceContext.Provider value={value}>{children}</AttendanceContext.Provider>;
};

// eslint-disable-next-line react-refresh/only-export-components
export const useAttendance = (): AttendanceContextType => {
  const context = useContext(AttendanceContext);
  if (context === undefined) throw new Error('useAttendance must be used within an AttendanceProvider');
  return context;
};
