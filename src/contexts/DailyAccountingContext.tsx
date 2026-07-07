import React, { createContext, useContext, useState, useEffect, useRef, useMemo, useCallback, type ReactNode } from 'react';
import type { DailyAccounting, FuelPrice, DailyAccountingContextType, FuelMeterReading, CashAmountReading } from '@/types';
import { dailyAccountingStorage, fuelPriceStorage } from '@/data/storage';
import { getCache, setCache, clearCache } from '@/lib/cache';
import { useAuth } from './AuthContext';
import { useStations } from './StationContext';
import { useEmployee } from './EmployeeContext';
import { useSchedule } from './ScheduleContext';
import { subscribeToTables } from '@/lib/realtime';

const ACCOUNTING_CACHE = 'daily_accounting_v2';
const FUEL_PRICES_CACHE = 'fuel_prices';

const DailyAccountingContext = createContext<DailyAccountingContextType | undefined>(undefined);

export const DailyAccountingProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { user, profile } = useAuth();
  const { currentStation } = useStations();
  const { employees } = useEmployee();
  const { shifts } = useSchedule();

  // Store raw unfiltered data from the server. Filtering by station/deleted is done via useMemo.
  const [allDailyAccounts, setAllDailyAccounts] = useState<DailyAccounting[]>([]);
  const [fuelPrices, setFuelPrices] = useState<FuelPrice[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const isInitialized = useRef(false);
  const realtimeDebounceRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  const currentFuelPrice = useMemo(() => {
    if (fuelPrices.length === 0) return null;
    return fuelPrices.sort((a, b) => new Date(b.effectiveDate).getTime() - new Date(a.effectiveDate).getTime())[0];
  }, [fuelPrices]);

  const stationId = useMemo(() => currentStation?.id || profile?.stationId, [currentStation, profile]);

  const filterByStation = useCallback((data: DailyAccounting[]): DailyAccounting[] => {
    // ถ้าไม่มี stationId เลย (ไม่ได้เลือกสถานีและโปรไฟล์ไม่มีสถานี) แสดงทั้งหมดที่ไม่ถูกลบ
    if (!stationId) return data.filter(a => !a.isDeleted);
    // admin ที่ยังไม่ได้เลือกสถานีเฉพาะให้เห็นข้อมูลทั้งหมด
    if (user?.role === 'admin' && !currentStation) return data.filter(a => !a.isDeleted);
    // ถ้า employees ยังโหลดไม่เสร็จ ให้แสดงข้อมูลทั้งหมดก่อน แล้วค่อยกรองเมื่อ employees มา
    if (employees.length === 0) return data.filter(a => !a.isDeleted);
    return data.filter(a => {
      if (a.isDeleted) return false;
      const employee = employees.find(e => e.id === a.employeeId);
      // ถ้าหาพนักงานไม่เจอ แสดงข้อมูลไว้ก่อนเพื่อความปลอดภัย (อาจเป็น legacy data หรือข้อมูลระหว่างโหลด)
      if (!employee) return true;
      return employee.stationId === stationId;
    });
  }, [stationId, user, currentStation, employees]);

  // Enrich raw records with shift/employee objects and filter by station
  const dailyAccounts = useMemo(() => {
    const enriched = allDailyAccounts.map(account => ({
      ...account,
      shift: shifts.find(s => s.id === account.shiftId) ?? ({} as DailyAccounting['shift']),
      employee: employees.find(e => e.id === account.employeeId) ?? ({} as DailyAccounting['employee']),
    }));
    return filterByStation(enriched);
  }, [allDailyAccounts, shifts, employees, filterByStation]);

  useEffect(() => {
    if (isInitialized.current) return;
    isInitialized.current = true;

    const loadData = async () => {
      setIsLoading(true);

      try {
        // ลบ cache รูปแบบเก่าที่อาจเก็บข้อมูลที่กรองแล้ว
        clearCache('daily_accounting');

        const cachedFuelPrices = getCache<FuelPrice[]>(FUEL_PRICES_CACHE, 30);
        if (cachedFuelPrices) setFuelPrices(cachedFuelPrices);

        const cachedAccounting = getCache<DailyAccounting[]>(ACCOUNTING_CACHE, 5);
        if (cachedAccounting) setAllDailyAccounts(cachedAccounting);

        // ดึงข้อมูลใหม่จาก server เสมอ เพื่อให้แน่ใจว่าไม่ใช่ cache ว่าง/เก่า
        const loadedFuelPrices = await fuelPriceStorage.getAll();
        setFuelPrices(loadedFuelPrices);
        setCache(FUEL_PRICES_CACHE, loadedFuelPrices);

        // โหลดข้อมูลบัญชีรายวันทั้งหมดแทนการจำกัดแค่ 50 รายการล่าสุด
        // เพื่อป้องกันข้อมูลวันก่อนหน้าหายไปเมื่อมีจำนวนรายการมาก
        const loadedAccounting = await dailyAccountingStorage.getAll();
        setAllDailyAccounts(loadedAccounting);
        setCache(ACCOUNTING_CACHE, loadedAccounting);
      } catch (error) {
        console.error('Error loading accounting data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, []);

  // Realtime subscriptions
  useEffect(() => {
    const unsubscribes = subscribeToTables([
      {
        table: 'daily_accounting',
        onEvent: () => {
          if (realtimeDebounceRef.current['daily_accounting']) clearTimeout(realtimeDebounceRef.current['daily_accounting']);
          realtimeDebounceRef.current['daily_accounting'] = setTimeout(async () => {
            clearCache(ACCOUNTING_CACHE);
            try {
              const loaded = await dailyAccountingStorage.getAll();
              setAllDailyAccounts(loaded);
              setCache(ACCOUNTING_CACHE, loaded);
            } catch (error) {
              console.error('Error reloading daily accounting from realtime:', error);
            }
          }, 800);
        },
      },
      {
        table: 'fuel_prices',
        onEvent: () => {
          if (realtimeDebounceRef.current['fuel_prices']) clearTimeout(realtimeDebounceRef.current['fuel_prices']);
          realtimeDebounceRef.current['fuel_prices'] = setTimeout(async () => {
            clearCache(FUEL_PRICES_CACHE);
            try {
              const loaded = await fuelPriceStorage.getAll();
              setFuelPrices(loaded);
              setCache(FUEL_PRICES_CACHE, loaded);
            } catch (error) {
              console.error('Error reloading fuel prices from realtime:', error);
            }
          }, 800);
        },
      },
    ]);
    return unsubscribes;
  }, []);

  // Helper: คำนวณยอดเงินสดรวมจาก dispenserCash โดยตรง
  const calcCashAmountFromDispenser = useCallback((dc: CashAmountReading | undefined): number => {
    if (!dc) return 0;
    const d1n1 = Math.max(0, Math.round((dc.dispenser1.nozzle1.end - dc.dispenser1.nozzle1.start) * 100) / 100);
    const d1n2 = Math.max(0, Math.round((dc.dispenser1.nozzle2.end - dc.dispenser1.nozzle2.start) * 100) / 100);
    const d2n1 = Math.max(0, Math.round((dc.dispenser2.nozzle1.end - dc.dispenser2.nozzle1.start) * 100) / 100);
    const d2n2 = Math.max(0, Math.round((dc.dispenser2.nozzle2.end - dc.dispenser2.nozzle2.start) * 100) / 100);
    return d1n1 + d1n2 + d2n1 + d2n2;
  }, []);

  const addDailyAccount = useCallback((account: Omit<DailyAccounting, 'id' | 'shift' | 'employee' | 'fuelSales' | 'fuelAmount' | 'totalFuelAmount' | 'totalAmount' | 'difference' | 'createdAt' | 'updatedAt'>) => {
    const newId = `acc${Date.now()}`;
    const now = new Date().toISOString();

    // Calculate fuel sales and amounts from meter readings
    const fuelSales = {
      '95': 0, 'B7': 0, 'B10': 0, 'Diesel': 0,
    };
    const fuelAmount = {
      '95': 0, 'B7': 0, 'B10': 0, 'Diesel': 0,
    };

    if (account.fuelMeter) {
      const d1n1 = Math.max(0, account.fuelMeter.dispenser1.nozzle1.end - account.fuelMeter.dispenser1.nozzle1.start);
      const d1n2 = Math.max(0, account.fuelMeter.dispenser1.nozzle2.end - account.fuelMeter.dispenser1.nozzle2.start);
      const d2n1 = Math.max(0, account.fuelMeter.dispenser2.nozzle1.end - account.fuelMeter.dispenser2.nozzle1.start);
      const d2n2 = Math.max(0, account.fuelMeter.dispenser2.nozzle2.end - account.fuelMeter.dispenser2.nozzle2.start);

      fuelSales['95'] = d1n1 + d2n1;
      fuelSales['Diesel'] = d1n2;
      fuelSales['B7'] = d2n2;

      if (currentFuelPrice) {
        fuelAmount['95'] = Math.round(fuelSales['95'] * currentFuelPrice['95'] * 100) / 100;
        fuelAmount['B7'] = Math.round(fuelSales['B7'] * currentFuelPrice['B7'] * 100) / 100;
        fuelAmount['B10'] = Math.round(fuelSales['B10'] * currentFuelPrice['B10'] * 100) / 100;
        fuelAmount['Diesel'] = Math.round(fuelSales['Diesel'] * currentFuelPrice['Diesel'] * 100) / 100;
      }
    }

    const totalFuelAmount = Object.values(fuelAmount).reduce((a, b) => a + b, 0);
    // คำนวณ cashAmount จาก dispenserCash โดยตรง ไม่ใช้ค่าที่ส่งมา
    const cashAmount = calcCashAmountFromDispenser(account.dispenserCash);
    const itemsTotal = (account.items?.twoT ?? 0) + (account.items?.capital ?? 0) + (account.items?.transfer ?? 0) + (account.items?.others ?? 0);
    const totalCashWithOthers = (account.actualCashCounted ?? 0) + itemsTotal;
    const totalAmount = totalCashWithOthers;
    const difference = totalCashWithOthers - cashAmount;

    const newAccount: DailyAccounting = {
      ...account,
      id: newId,
      shift: {} as DailyAccounting['shift'],
      employee: {} as DailyAccounting['employee'],
      fuelSales,
      fuelAmount,
      totalFuelAmount,
      totalAmount,
      difference,
      isDeleted: false,
      createdAt: now,
      updatedAt: now,
    };

    dailyAccountingStorage.create(newAccount).catch(console.error);
    setAllDailyAccounts(prev => {
      const updated = [newAccount, ...prev];
      setCache(ACCOUNTING_CACHE, updated);
      return updated;
    });
  }, [currentFuelPrice, calcCashAmountFromDispenser]);

  const updateDailyAccount = useCallback((id: string, updates: Partial<DailyAccounting>) => {
    const currentAccount = dailyAccounts.find(r => r.id === id);
    if (!currentAccount) return;

    // Merge old and new data
    const merged = { ...currentAccount, ...updates };

    // Recalculate if relevant fields changed
    if (updates.fuelMeter || updates.dispenserCash || updates.actualCashCounted !== undefined || updates.items || updates.cashAmount !== undefined) {
      let fuelSales = { ...currentAccount.fuelSales };
      let fuelAmount = { ...currentAccount.fuelAmount };
      let totalFuelAmount = currentAccount.totalFuelAmount;

      if (merged.fuelMeter && currentFuelPrice) {
        const d1n1 = Math.max(0, merged.fuelMeter.dispenser1.nozzle1.end - merged.fuelMeter.dispenser1.nozzle1.start);
        const d1n2 = Math.max(0, merged.fuelMeter.dispenser1.nozzle2.end - merged.fuelMeter.dispenser1.nozzle2.start);
        const d2n1 = Math.max(0, merged.fuelMeter.dispenser2.nozzle1.end - merged.fuelMeter.dispenser2.nozzle1.start);
        const d2n2 = Math.max(0, merged.fuelMeter.dispenser2.nozzle2.end - merged.fuelMeter.dispenser2.nozzle2.start);

        fuelSales = {
          '95': d1n1 + d2n1,
          'Diesel': d1n2,
          'B7': d2n2,
          'B10': 0,
        };

        fuelAmount = {
          '95': Math.round(fuelSales['95'] * currentFuelPrice['95'] * 100) / 100,
          'B7': Math.round(fuelSales['B7'] * currentFuelPrice['B7'] * 100) / 100,
          'B10': 0,
          'Diesel': Math.round(fuelSales['Diesel'] * currentFuelPrice['Diesel'] * 100) / 100,
        };

        totalFuelAmount = Object.values(fuelAmount).reduce((a, b) => a + b, 0);
      }

      // คำนวณ cashAmount จาก dispenserCash โดยตรง ถ้ามีการเปลี่ยนแปลง
      const cashAmount = merged.dispenserCash
        ? calcCashAmountFromDispenser(merged.dispenserCash)
        : (merged.cashAmount ?? currentAccount.cashAmount ?? 0);
      const itemsTotal = (merged.items?.twoT ?? currentAccount.items?.twoT ?? 0)
        + (merged.items?.capital ?? currentAccount.items?.capital ?? 0)
        + (merged.items?.transfer ?? currentAccount.items?.transfer ?? 0)
        + (merged.items?.others ?? currentAccount.items?.others ?? 0);
      const actualCashCounted = merged.actualCashCounted ?? currentAccount.actualCashCounted ?? 0;
      const totalCashWithOthers = actualCashCounted + itemsTotal;
      const totalAmount = totalCashWithOthers;
      const difference = totalCashWithOthers - cashAmount;

      updates = {
        ...updates,
        fuelSales,
        fuelAmount,
        totalFuelAmount,
        cashAmount,
        totalAmount,
        difference,
      };
    }

    const updatedAccount = { ...currentAccount, ...updates, updatedAt: new Date().toISOString() };
    dailyAccountingStorage.update(id, updatedAccount).catch(console.error);
    setAllDailyAccounts(prev => {
      const updated = prev.map(r => r.id === id ? updatedAccount : r);
      setCache(ACCOUNTING_CACHE, updated);
      return updated;
    });
  }, [dailyAccounts, currentFuelPrice, calcCashAmountFromDispenser]);

  const deleteDailyAccount = useCallback((id: string) => {
    const deletedBy = user?.email || profile?.fullName || 'unknown';
    dailyAccountingStorage.softDelete(id, { deletedBy }).catch(console.error);
    setAllDailyAccounts(prev => {
      const updated = prev.filter(r => r.id !== id);
      setCache(ACCOUNTING_CACHE, updated);
      return updated;
    });
  }, [user, profile]);

  const getDailyAccountByDate = useCallback((date: string): DailyAccounting[] => dailyAccounts.filter(r => r.date === date), [dailyAccounts]);
  const getDailyAccountByDateRange = useCallback((startDate: string, endDate: string): DailyAccounting[] => dailyAccounts.filter(r => r.date >= startDate && r.date <= endDate), [dailyAccounts]);
  const getDailyAccountByShift = useCallback((shiftId: string): DailyAccounting[] => dailyAccounts.filter(r => r.shiftId === shiftId), [dailyAccounts]);

  const getTodaySummary = useCallback(() => {
    const today = new Date().toISOString().split('T')[0];
    const todayAccounts = dailyAccounts.filter(r => r.date === today);
    return {
      totalSales: todayAccounts.reduce((sum, r) => sum + r.cashAmount, 0),
      totalCash: todayAccounts.reduce((sum, r) => sum + (r.actualCashCounted || 0), 0),
      totalDifference: todayAccounts.reduce((sum, r) => sum + r.difference, 0),
    };
  }, [dailyAccounts]);

  const loadAccountsByDateRange = useCallback(async (startDate: string, endDate: string): Promise<DailyAccounting[]> => {
    // ดึงข้อมูลช่วงวันที่จาก server ใหม่เสมอ เพื่อให้แน่ใจว่าได้ข้อมูลล่าสุด
    try {
      const loaded = await dailyAccountingStorage.getByDateRange(startDate, endDate);
      setAllDailyAccounts(prev => {
        const existingIds = new Set(prev.map(a => a.id));
        const newAccounts = loaded.filter(a => !existingIds.has(a.id));
        const updated = [...newAccounts, ...prev];
        setCache(ACCOUNTING_CACHE, updated);
        return updated;
      });
      // กรองตามสถานีก่อนคืนค่าให้หน้าจอ
      return filterByStation(loaded);
    } catch (error) {
      console.error('Error loading accounts by date range:', error);
      // fallback ใช้ข้อมูลที่มีใน memory
      return dailyAccounts.filter(r => r.date >= startDate && r.date <= endDate);
    }
  }, [dailyAccounts, filterByStation]);

  const setFuelPrice = useCallback((prices: Omit<FuelPrice, 'id' | 'createdAt'>) => {
    const newId = `fp${Date.now()}`;
    const newPrice: FuelPrice = { ...prices, id: newId, createdAt: new Date().toISOString() };
    fuelPriceStorage.create(newPrice).catch(console.error);
    setFuelPrices(prev => {
      const updated = [newPrice, ...prev];
      setCache(FUEL_PRICES_CACHE, updated);
      return updated;
    });
  }, []);

  const updateFuelPrice = useCallback((id: string, updates: Partial<FuelPrice>) => {
    const currentPrice = fuelPrices.find(p => p.id === id);
    if (!currentPrice) return;
    const updatedPrice = { ...currentPrice, ...updates };
    fuelPriceStorage.update(id, updatedPrice).catch(console.error);
    setFuelPrices(prev => {
      const updated = prev.map(p => p.id === id ? updatedPrice : p);
      setCache(FUEL_PRICES_CACHE, updated);
      return updated;
    });
  }, [fuelPrices]);

  const getCurrentFuelPrice = useCallback((): FuelPrice | null => currentFuelPrice, [currentFuelPrice]);

  const calculateFuelAmount = useCallback((fuelType: '95' | 'B7' | 'B10' | 'Diesel', liters: number): number => {
    if (!currentFuelPrice) return 0;
    return liters * currentFuelPrice[fuelType];
  }, [currentFuelPrice]);

  const getPreviousMeterReading = useCallback((): FuelMeterReading | null => {
    if (dailyAccounts.length === 0) return null;
    const sorted = [...dailyAccounts].sort((a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    const latest = sorted[0];
    if (!latest?.fuelMeter) return null;
    // ใช้ค่า end ของรายการก่อนหน้าเป็น start ของรายการใหม่
    // กำหนด end = 0 เพื่อบังคับให้ผู้ใช้ต้องกรอกค่าสิ้นสุดใหม่
    // ป้องกันการบันทึกโดยไม่ได้กรอกค่า end ทำให้ยอดขายเป็น 0
    return {
      dispenser1: {
        nozzle1: {
          start: latest.fuelMeter.dispenser1.nozzle1.end,
          end: 0,
          fuelType: latest.fuelMeter.dispenser1.nozzle1.fuelType,
        },
        nozzle2: {
          start: latest.fuelMeter.dispenser1.nozzle2.end,
          end: 0,
          fuelType: latest.fuelMeter.dispenser1.nozzle2.fuelType,
        },
      },
      dispenser2: {
        nozzle1: {
          start: latest.fuelMeter.dispenser2.nozzle1.end,
          end: 0,
          fuelType: latest.fuelMeter.dispenser2.nozzle1.fuelType,
        },
        nozzle2: {
          start: latest.fuelMeter.dispenser2.nozzle2.end,
          end: 0,
          fuelType: latest.fuelMeter.dispenser2.nozzle2.fuelType,
        },
      },
    };
  }, [dailyAccounts]);

  const getPreviousDispenserCash = useCallback((): CashAmountReading | null => {
    if (dailyAccounts.length === 0) return null;
    const sorted = [...dailyAccounts].sort((a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    const latest = sorted[0];
    if (!latest?.dispenserCash) return null;
    // ใช้ค่า end ของรายการก่อนหน้าเป็น start ของรายการใหม่
    // กำหนด end = 0 เพื่อบังคับให้ผู้ใช้ต้องกรอกค่าสิ้นสุดใหม่
    return {
      dispenser1: {
        nozzle1: {
          start: latest.dispenserCash.dispenser1.nozzle1.end,
          end: 0,
        },
        nozzle2: {
          start: latest.dispenserCash.dispenser1.nozzle2.end,
          end: 0,
        },
      },
      dispenser2: {
        nozzle1: {
          start: latest.dispenserCash.dispenser2.nozzle1.end,
          end: 0,
        },
        nozzle2: {
          start: latest.dispenserCash.dispenser2.nozzle2.end,
          end: 0,
        },
      },
    };
  }, [dailyAccounts]);

  const value = useMemo<DailyAccountingContextType>(() => ({
    dailyAccounts,
    fuelPrices,
    currentFuelPrice,
    isLoading,
    addDailyAccount,
    updateDailyAccount,
    deleteDailyAccount,
    getDailyAccountByDate,
    getDailyAccountByDateRange,
    getDailyAccountByShift,
    getTodaySummary,
    loadAccountsByDateRange,
    setFuelPrice,
    updateFuelPrice,
    getCurrentFuelPrice,
    calculateFuelAmount,
    getPreviousMeterReading,
    getPreviousDispenserCash,
  }), [dailyAccounts, fuelPrices, currentFuelPrice, isLoading, addDailyAccount, updateDailyAccount, deleteDailyAccount, getDailyAccountByDate, getDailyAccountByDateRange, getDailyAccountByShift, getTodaySummary, loadAccountsByDateRange, setFuelPrice, updateFuelPrice, getCurrentFuelPrice, calculateFuelAmount, getPreviousMeterReading, getPreviousDispenserCash]);

  return <DailyAccountingContext.Provider value={value}>{children}</DailyAccountingContext.Provider>;
};

// eslint-disable-next-line react-refresh/only-export-components
export const useDailyAccounting = (): DailyAccountingContextType => {
  const context = useContext(DailyAccountingContext);
  if (context === undefined) throw new Error('useDailyAccounting must be used within a DailyAccountingProvider');
  return context;
};
