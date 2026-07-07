/* eslint-disable react-hooks/set-state-in-effect */
import React, { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Plus, Search, Edit2, Trash2, TrendingUp, TrendingDown, DollarSign, Fuel, Droplets, Settings, AlertCircle, FileSpreadsheet } from 'lucide-react';
import Header from '@/components/layout/Header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DatePickerString } from '@/components/ui/date-picker';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useDailyAccounting } from '@/contexts/DailyAccountingContext';
import { useSchedule } from '@/contexts/ScheduleContext';
import { useAuth } from '@/contexts/AuthContext';
import { useEmployee } from '@/contexts/EmployeeContext';
import { formatThaiDate, getDayName, getCurrentDate } from '@/utils/dateUtils';
import { PageLoader } from '@/components/common/LoadingPage';
import type { DailyAccounting, FuelMeterReading } from '@/types';
import { exportDailyAccountingToExcel } from '@/lib/exportUtils';

interface LayoutContext {
  onMenuClick: () => void;
}

const DailyAccountingPage: React.FC = () => {
  const { onMenuClick } = useOutletContext<LayoutContext>();
  // All useState hooks must be called before any conditional returns
  const [searchDate, setSearchDate] = useState('');
  const [isDateLoading, setIsDateLoading] = useState(false);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isPriceDialogOpen, setIsPriceDialogOpen] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<DailyAccounting | null>(null);
  const [error, setError] = useState('');
  const [availableEmployees, setAvailableEmployees] = useState<{id: string, fullName: string}[]>([]);
  const [isStartValuesLocked, setIsStartValuesLocked] = useState(false);

  // State for calculated values
  const [calculatedValues, setCalculatedValues] = useState({
    d1n1Sales: 0, d1n2Sales: 0, d2n1Sales: 0, d2n2Sales: 0,
    d1n1Amount: 0, d1n2Amount: 0, d2n1Amount: 0, d2n2Amount: 0,
    totalFuelAmount: 0,
    d1n1Cash: 0, d1n2Cash: 0, d2n1Cash: 0, d2n2Cash: 0,
    dispenser1Cash: 0, dispenser2Cash: 0, totalDispenserCash: 0,
    totalCashWithOthers: 0,
  });

  // Form state for accounting - 2 dispensers
  const [formData, setFormData] = useState({
    date: getCurrentDate(),
    shiftId: '',
    employeeId: '',
    fuelMeter: {
      dispenser1: {
        nozzle1: { start: 0, end: 0, fuelType: '95' as const },
        nozzle2: { start: 0, end: 0, fuelType: 'Diesel' as const },
      },
      dispenser2: {
        nozzle1: { start: 0, end: 0, fuelType: '95' as const },
        nozzle2: { start: 0, end: 0, fuelType: 'B7' as const },
      },
    } as FuelMeterReading,
    dispenserCash: {
      dispenser1: { nozzle1: { start: 0, end: 0 }, nozzle2: { start: 0, end: 0 } },
      dispenser2: { nozzle1: { start: 0, end: 0 }, nozzle2: { start: 0, end: 0 } },
    },
    cashAmount: 0,
    actualCashCounted: 0,
    items: { twoT: 0, capital: 0, transfer: 0, others: 0 },
    note: '',
  });

  // Form state for fuel prices - ดึงค่าล่าสุดจาก currentFuelPrice
  const [priceForm, setPriceForm] = useState({
    '95': 49.35,
    'B7': 37.45,
    'B10': 36.95,
    'Diesel': 32.99,
    effectiveDate: getCurrentDate(),
  });

  // Context hooks
  const { user, profile, isLoading: isAuthLoading } = useAuth();
  const { employees, isLoading: isEmployeeLoading } = useEmployee();
  const { shifts, schedules, isLoading: isScheduleLoading } = useSchedule();
  const { 
    dailyAccounts, 
    isLoading: isAccountingLoading,
    addDailyAccount, 
    updateDailyAccount, 
    deleteDailyAccount, 
    getTodaySummary,
    currentFuelPrice,
    setFuelPrice,
    getPreviousMeterReading,
    getPreviousDispenserCash,
    loadAccountsByDateRange,
  } = useDailyAccounting();

  // Sync priceForm with currentFuelPrice when loaded
  useEffect(() => {
    if (currentFuelPrice) {
      setPriceForm({
        '95': currentFuelPrice['95'],
        'B7': currentFuelPrice['B7'],
        'B10': currentFuelPrice['B10'],
        'Diesel': currentFuelPrice['Diesel'],
        effectiveDate: currentFuelPrice.effectiveDate || getCurrentDate(),
      });
    }
  }, [currentFuelPrice]);

  // Update formData.employeeId when profile is loaded
  useEffect(() => {
    if (profile?.id) {
      setFormData(prev => ({ ...prev, employeeId: profile.id }));
    }
  }, [profile]);

  // Auto-calculate when form data changes
  useEffect(() => {
    // ดึงค่าด้วย fallback ป้องกัน undefined
    const d1n1Start = formData.dispenserCash?.dispenser1?.nozzle1?.start ?? 0;
    const d1n1End = formData.dispenserCash?.dispenser1?.nozzle1?.end ?? 0;
    const d1n2Start = formData.dispenserCash?.dispenser1?.nozzle2?.start ?? 0;
    const d1n2End = formData.dispenserCash?.dispenser1?.nozzle2?.end ?? 0;
    const d2n1Start = formData.dispenserCash?.dispenser2?.nozzle1?.start ?? 0;
    const d2n1End = formData.dispenserCash?.dispenser2?.nozzle1?.end ?? 0;
    const d2n2Start = formData.dispenserCash?.dispenser2?.nozzle2?.start ?? 0;
    const d2n2End = formData.dispenserCash?.dispenser2?.nozzle2?.end ?? 0;

    // Calculate cash amounts (always calculate, doesn't need fuel price)
    const d1n1Cash = Math.max(0, Math.round((d1n1End - d1n1Start) * 100) / 100);
    const d1n2Cash = Math.max(0, Math.round((d1n2End - d1n2Start) * 100) / 100);
    const d2n1Cash = Math.max(0, Math.round((d2n1End - d2n1Start) * 100) / 100);
    const d2n2Cash = Math.max(0, Math.round((d2n2End - d2n2Start) * 100) / 100);
    
    const totalDispenserCashCalc = d1n1Cash + d1n2Cash + d2n1Cash + d2n2Cash;
    
    // ยอดเงินรวม = เงินสดที่นับได้ + 2T + เงินทุน + เงินโอน + อื่นๆ
    const totalCashWithOthers = formData.actualCashCounted + formData.items.twoT + formData.items.capital + formData.items.transfer + formData.items.others;
    
    // Calculate fuel only if currentFuelPrice exists
    if (!currentFuelPrice) {
      setCalculatedValues(prev => ({
        ...prev,
        d1n1Cash,
        d1n2Cash,
        d2n1Cash,
        d2n2Cash,
        dispenser1Cash: d1n1Cash + d1n2Cash,
        dispenser2Cash: d2n1Cash + d2n2Cash,
        totalDispenserCash: totalDispenserCashCalc,
        totalCashWithOthers,
      }));
      return;
    }
    
    // Calculate fuel sales (liters) with fallback
    const fmD1n1Start = formData.fuelMeter?.dispenser1?.nozzle1?.start ?? 0;
    const fmD1n1End = formData.fuelMeter?.dispenser1?.nozzle1?.end ?? 0;
    const fmD1n2Start = formData.fuelMeter?.dispenser1?.nozzle2?.start ?? 0;
    const fmD1n2End = formData.fuelMeter?.dispenser1?.nozzle2?.end ?? 0;
    const fmD2n1Start = formData.fuelMeter?.dispenser2?.nozzle1?.start ?? 0;
    const fmD2n1End = formData.fuelMeter?.dispenser2?.nozzle1?.end ?? 0;
    const fmD2n2Start = formData.fuelMeter?.dispenser2?.nozzle2?.start ?? 0;
    const fmD2n2End = formData.fuelMeter?.dispenser2?.nozzle2?.end ?? 0;

    const d1n1Sales = Math.max(0, Math.round((fmD1n1End - fmD1n1Start) * 100) / 100);
    const d1n2Sales = Math.max(0, Math.round((fmD1n2End - fmD1n2Start) * 100) / 100);
    const d2n1Sales = Math.max(0, Math.round((fmD2n1End - fmD2n1Start) * 100) / 100);
    const d2n2Sales = Math.max(0, Math.round((fmD2n2End - fmD2n2Start) * 100) / 100);
    
    // Calculate fuel amounts (money)
    const d1n1Amount = Math.max(0, Math.round(d1n1Sales * currentFuelPrice['95'] * 100) / 100);
    const d1n2Amount = Math.max(0, Math.round(d1n2Sales * currentFuelPrice['Diesel'] * 100) / 100);
    const d2n1Amount = Math.max(0, Math.round(d2n1Sales * currentFuelPrice['95'] * 100) / 100);
    const d2n2Amount = Math.max(0, Math.round(d2n2Sales * currentFuelPrice['B7'] * 100) / 100);
    
    setCalculatedValues({
      d1n1Sales,
      d1n2Sales,
      d2n1Sales,
      d2n2Sales,
      d1n1Amount,
      d1n2Amount,
      d2n1Amount,
      d2n2Amount,
      totalFuelAmount: d1n1Amount + d1n2Amount + d2n1Amount + d2n2Amount,
      d1n1Cash,
      d1n2Cash,
      d2n1Cash,
      d2n2Cash,
      dispenser1Cash: d1n1Cash + d1n2Cash,
      dispenser2Cash: d2n1Cash + d2n2Cash,
      totalDispenserCash: totalDispenserCashCalc,
      totalCashWithOthers,
    });
  }, [formData, currentFuelPrice]);

  // Auto-fill start values from latest meter reading when dialog opens
  const hasAutoFilled = React.useRef(false);
  useEffect(() => {
    if (isAddDialogOpen && !hasAutoFilled.current) {
      hasAutoFilled.current = true;
      const latestMeter = getPreviousMeterReading();
      const latestCash = getPreviousDispenserCash();
      if (latestMeter || latestCash) {
        setTimeout(() => {
          setFormData(prev => ({
            ...prev,
            fuelMeter: latestMeter || prev.fuelMeter,
            dispenserCash: latestCash || prev.dispenserCash,
          }));
        }, 0);
        setIsStartValuesLocked(true);
      }
    }
    if (!isAddDialogOpen) {
      hasAutoFilled.current = false;
      setIsStartValuesLocked(false);
    }
  }, [isAddDialogOpen, getPreviousMeterReading, getPreviousDispenserCash]);

  // ดึงพนักงานจากตารางงานเมื่อเลือกกะและวันที่
  useEffect(() => {
    if (formData.date && formData.shiftId) {
      // กรอง schedule ที่ตรงกับวันที่และกะที่เลือก
      const matchedSchedules = schedules.filter(
        s => s.date === formData.date && s.shiftId === formData.shiftId
      );
      
      // ดึงข้อมูลพนักงานจาก schedules (ใช้ employeeId แล้วหาจาก employees แทน)
      const employeeIdsInSchedule = matchedSchedules.map(s => s.employeeId).filter(Boolean);
      const employeesInSchedule = employees
        .filter(e => employeeIdsInSchedule.includes(e.id))
        .map(e => ({ id: e.id, fullName: e.fullName }));
      
      // ถ้ามีพนักงานในกะ ให้ใช้รายชื่อนั้น ถ้าไม่มีให้ใช้ทั้งหมด
      if (employeesInSchedule.length > 0) {
        setAvailableEmployees(employeesInSchedule);
        // รีเซ็ต employeeId ถ้าค่าเดิมไม่อยู่ในรายชื่อใหม่
        const currentEmployeeInList = employeesInSchedule.find(e => e.id === formData.employeeId);
        if (!currentEmployeeInList) {
          // เลือกคนแรกอัตโนมัติเสมอเมื่อมีพนักงานในกะ
          setFormData(prev => ({ 
            ...prev, 
            employeeId: employeesInSchedule[0].id 
          }));
        }
      } else {
        // ถ้าไม่มีตารางงาน ให้แสดงทั้งหมด
        setAvailableEmployees(employees.map(e => ({ id: e.id, fullName: e.fullName })));
        // รีเซ็ต employeeId
        setFormData(prev => ({ ...prev, employeeId: '' }));
      }
    } else {
      // ถ้ายังไม่เลือกกะ ให้แสดงทั้งหมด
      setAvailableEmployees(employees.map(e => ({ id: e.id, fullName: e.fullName })));
    }
  }, [formData.date, formData.shiftId, schedules, employees, formData.employeeId]);

  // เมื่อผู้ใช้เลือกวันที่ค้นหา ให้โหลดข้อมูลช่วงวันที่นั้นจากฐานข้อมูลใหม่
  // เพื่อให้แน่ใจว่าข้อมูลไม่หายเพราะถูกตัดด้วย limit ของการโหลดครั้งแรก
  useEffect(() => {
    if (!searchDate) return;
    setIsDateLoading(true);
    loadAccountsByDateRange(searchDate, searchDate)
      .catch(err => console.error('Error loading accounts by date:', err))
      .finally(() => setIsDateLoading(false));
  }, [searchDate, loadAccountsByDateRange]);

  // Loading check after all hooks
  if (isAuthLoading || isEmployeeLoading || isScheduleLoading || isAccountingLoading) {
    return <PageLoader />;
  }

  const todaySummary = getTodaySummary();

  // Filter accounts - ถ้าไม่ได้ค้นหา ให้แสดงข้อมูลทั้งหมด
  const filteredAccounts = searchDate
    ? dailyAccounts.filter(a => a.date === searchDate)
    : dailyAccounts;

  // Sort by date desc
  const sortedAccounts = [...filteredAccounts].sort((a, b) => 
    new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  // ตรวจสอบค่ามิเตอร์และเงินสดว่ากรอกถูกต้องหรือไม่
  const validateMeterAndCash = (): string | null => {
    const hasMeterEnd = Object.values(formData.fuelMeter).some(dispenser =>
      Object.values(dispenser).some((nozzle: { end: number }) => nozzle.end > 0)
    );
    if (!hasMeterEnd) return 'กรุณากรอกค่ามิเตอร์สิ้นสุดอย่างน้อย 1 หัวจ่าย';

    const hasInvalidMeter = Object.values(formData.fuelMeter).some(dispenser =>
      Object.values(dispenser).some((nozzle: { start: number; end: number }) => nozzle.end < nozzle.start)
    );
    if (hasInvalidMeter) return 'ค่ามิเตอร์สิ้นสุดต้องไม่น้อยกว่าค่าเริ่มต้น';

    const hasCashEnd = Object.values(formData.dispenserCash).some(dispenser =>
      Object.values(dispenser).some((nozzle: { end: number }) => nozzle.end > 0)
    );
    if (!hasCashEnd) return 'กรุณากรอกยอดเงินสิ้นสุดอย่างน้อย 1 หัวจ่าย';

    const hasInvalidCash = Object.values(formData.dispenserCash).some(dispenser =>
      Object.values(dispenser).some((nozzle: { start: number; end: number }) => nozzle.end < nozzle.start)
    );
    if (hasInvalidCash) return 'ยอดเงินสิ้นสุดต้องไม่น้อยกว่ายอดเงินเริ่มต้น';

    return null;
  };

  const handleAdd = async () => {
    setError('');
    
    // Validation
    if (!formData.shiftId) {
      setError('กรุณาเลือกกะ');
      return;
    }
    if (!formData.employeeId) {
      setError('กรุณาเลือกพนักงาน');
      return;
    }
    if (!currentFuelPrice) {
      setError('กรุณาตั้งราคาน้ำมันก่อนบันทึก');
      return;
    }

    const validationError = validateMeterAndCash();
    if (validationError) {
      setError(validationError);
      return;
    }

    try {
      // ตรวจสอบและเตรียมข้อมูล dispenserCash ให้ครบถ้วน
      const safeDispenserCash = {
        dispenser1: {
          nozzle1: {
            start: formData.dispenserCash?.dispenser1?.nozzle1?.start ?? 0,
            end: formData.dispenserCash?.dispenser1?.nozzle1?.end ?? 0,
          },
          nozzle2: {
            start: formData.dispenserCash?.dispenser1?.nozzle2?.start ?? 0,
            end: formData.dispenserCash?.dispenser1?.nozzle2?.end ?? 0,
          },
        },
        dispenser2: {
          nozzle1: {
            start: formData.dispenserCash?.dispenser2?.nozzle1?.start ?? 0,
            end: formData.dispenserCash?.dispenser2?.nozzle1?.end ?? 0,
          },
          nozzle2: {
            start: formData.dispenserCash?.dispenser2?.nozzle2?.start ?? 0,
            end: formData.dispenserCash?.dispenser2?.nozzle2?.end ?? 0,
          },
        },
      };

      await addDailyAccount({
        date: formData.date,
        shiftId: formData.shiftId,
        employeeId: formData.employeeId,
        fuelMeter: formData.fuelMeter,
        systemAmount: totalFuelAmount,
        cashAmount: totalDispenserCash,
        actualCashCounted: formData.actualCashCounted,
        dispenserCash: safeDispenserCash,
        items: formData.items,
        note: formData.note,
      });

      setIsAddDialogOpen(false);
      resetForm();
    } catch (err) {
      console.error('Error saving daily account:', err);
      setError('เกิดข้อผิดพลาดในการบันทึก กรุณาลองใหม่อีกครั้ง');
    }
  };

  const handleEdit = async () => {
    if (!selectedAccount) return;

    const validationError = validateMeterAndCash();
    if (validationError) {
      setError(validationError);
      return;
    }

    try {
      // ตรวจสอบและเตรียมข้อมูล dispenserCash ให้ครบถ้วน
      const safeDispenserCash = {
        dispenser1: {
          nozzle1: {
            start: formData.dispenserCash?.dispenser1?.nozzle1?.start ?? 0,
            end: formData.dispenserCash?.dispenser1?.nozzle1?.end ?? 0,
          },
          nozzle2: {
            start: formData.dispenserCash?.dispenser1?.nozzle2?.start ?? 0,
            end: formData.dispenserCash?.dispenser1?.nozzle2?.end ?? 0,
          },
        },
        dispenser2: {
          nozzle1: {
            start: formData.dispenserCash?.dispenser2?.nozzle1?.start ?? 0,
            end: formData.dispenserCash?.dispenser2?.nozzle1?.end ?? 0,
          },
          nozzle2: {
            start: formData.dispenserCash?.dispenser2?.nozzle2?.start ?? 0,
            end: formData.dispenserCash?.dispenser2?.nozzle2?.end ?? 0,
          },
        },
      };

      await updateDailyAccount(selectedAccount.id, {
        date: formData.date,
        shiftId: formData.shiftId,
        employeeId: formData.employeeId,
        fuelMeter: formData.fuelMeter,
        systemAmount: totalFuelAmount,
        cashAmount: totalDispenserCash,
        actualCashCounted: formData.actualCashCounted,
        dispenserCash: safeDispenserCash,
        items: formData.items,
        note: formData.note,
      });

      setIsEditDialogOpen(false);
      setSelectedAccount(null);
      resetForm();
    } catch (err) {
      console.error('Error updating daily account:', err);
      setError('เกิดข้อผิดพลาดในการแก้ไข กรุณาลองใหม่อีกครั้ง');
    }
  };

  const handleDelete = () => {
    if (selectedAccount) {
      deleteDailyAccount(selectedAccount.id);
      setIsDeleteDialogOpen(false);
      setSelectedAccount(null);
    }
  };

  const handleSetPrice = () => {
    setFuelPrice({
      '95': priceForm['95'],
      'B7': priceForm['B7'],
      'B10': priceForm['B10'],
      'Diesel': priceForm['Diesel'],
      effectiveDate: priceForm.effectiveDate,
    });
    setIsPriceDialogOpen(false);
  };

  const openEditDialog = (account: DailyAccounting) => {
    setSelectedAccount(account);
    // รองรับข้อมูลเก่าที่อาจไม่มี dispenser2 หรือ nozzle1/nozzle2
    const safeDispenserCash = {
      dispenser1: {
        nozzle1: { 
          start: account.dispenserCash?.dispenser1?.nozzle1?.start ?? 0, 
          end: account.dispenserCash?.dispenser1?.nozzle1?.end ?? 0 
        },
        nozzle2: { 
          start: account.dispenserCash?.dispenser1?.nozzle2?.start ?? 0, 
          end: account.dispenserCash?.dispenser1?.nozzle2?.end ?? 0 
        }
      },
      dispenser2: {
        nozzle1: { 
          start: account.dispenserCash?.dispenser2?.nozzle1?.start ?? 0, 
          end: account.dispenserCash?.dispenser2?.nozzle1?.end ?? 0 
        },
        nozzle2: { 
          start: account.dispenserCash?.dispenser2?.nozzle2?.start ?? 0, 
          end: account.dispenserCash?.dispenser2?.nozzle2?.end ?? 0 
        }
      }
    };
    setFormData({
      date: account.date,
      shiftId: account.shiftId,
      employeeId: account.employeeId,
      fuelMeter: account.fuelMeter,
      dispenserCash: safeDispenserCash,
      cashAmount: account.cashAmount,
      actualCashCounted: (account as DailyAccounting & { actualCashCounted?: number }).actualCashCounted || 0,
      items: account.items,
      note: account.note,
    });
    setIsEditDialogOpen(true);
  };

  const openDeleteDialog = (account: DailyAccounting) => {
    setSelectedAccount(account);
    setIsDeleteDialogOpen(true);
  };

  const resetForm = () => {
    setFormData({
      date: getCurrentDate(),
      shiftId: '',
      employeeId: profile?.id || '',
      fuelMeter: {
        dispenser1: {
          nozzle1: { start: 0, end: 0, fuelType: '95' as const },
          nozzle2: { start: 0, end: 0, fuelType: 'Diesel' as const },
        },
        dispenser2: {
          nozzle1: { start: 0, end: 0, fuelType: '95' as const },
          nozzle2: { start: 0, end: 0, fuelType: 'B7' as const },
        },
      },
      dispenserCash: {
        dispenser1: {
          nozzle1: { start: 0, end: 0 },
          nozzle2: { start: 0, end: 0 }
        },
        dispenser2: {
          nozzle1: { start: 0, end: 0 },
          nozzle2: { start: 0, end: 0 }
        },
      },
      cashAmount: 0,
      actualCashCounted: 0,
      items: { twoT: 0, capital: 0, transfer: 0, others: 0 },
      note: '',
    });
  };

  const formatNumber = (num: number | undefined | null) => (num ?? 0).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const formatInt = (num: number | undefined | null) => (num ?? 0).toLocaleString('th-TH');

  // Use calculated values from state
  const { 
    d1n1Sales, d1n2Sales, d2n1Sales, d2n2Sales,
    totalFuelAmount,
    d1n1Cash, d1n2Cash, d2n1Cash, d2n2Cash,
    dispenser1Cash, dispenser2Cash, totalDispenserCash,
    totalCashWithOthers
  } = calculatedValues;

  return (
    <div>
      <Header
        title="บัญชีรายวัน"
        subtitle="บันทึกยอดขายและรายรับ-รายจ่ายประจำวัน"
        onMenuClick={onMenuClick}
        actions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setIsPriceDialogOpen(true)}>
              <Settings className="w-4 h-4 mr-2" />
              ตั้งราคาน้ำมัน
            </Button>
            <Button
              variant="outline"
              onClick={() => exportDailyAccountingToExcel(sortedAccounts, `บัญชีรายวัน_${searchDate || 'ทั้งหมด'}`)}
            >
              <FileSpreadsheet className="w-4 h-4 mr-2" />
              Export Excel
            </Button>
            <Dialog open={isAddDialogOpen} onOpenChange={(open) => {
              setIsAddDialogOpen(open);
              if (!open) setError('');
            }}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  บันทึกบัญชี
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>บันทึกบัญชีรายวัน</DialogTitle>
                  <DialogDescription>
                    บันทึกยอดมิเตอร์น้ำมัน ระบบจะคำนวณยอดเงินอัตโนมัติ
                  </DialogDescription>
                </DialogHeader>
                
                {error && (
                  <Alert variant="destructive" className="mt-2">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}
                
                <div className="space-y-4 py-4">
                  {/* Date & Shift */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>วันที่</Label>
                      <DatePickerString
                        value={formData.date}
                        onChange={(date) => setFormData({ ...formData, date })}
                        placeholder="เลือกวันที่"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>กะ</Label>
                      <Select value={formData.shiftId} onValueChange={(v) => setFormData({ ...formData, shiftId: v })}>
                        <SelectTrigger>
                          <SelectValue placeholder="เลือกกะ" />
                        </SelectTrigger>
                        <SelectContent>
                          {shifts.map((shift) => (
                            <SelectItem key={shift.id} value={shift.id}>
                              {shift.name} ({shift.startTime} - {shift.endTime})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Employee Selection - ดึงจากตารางงาน */}
                  <div className="space-y-2">
                    <Label>พนักงาน{availableEmployees.length > 0 && availableEmployees.length !== employees.length && ' (จากตารางงาน)'}</Label>
                    <Select value={formData.employeeId} onValueChange={(v) => setFormData({ ...formData, employeeId: v })}>
                      <SelectTrigger>
                        <SelectValue placeholder={availableEmployees.length > 0 ? "เลือกพนักงาน" : "กรุณาเลือกกะก่อน"} />
                      </SelectTrigger>
                      <SelectContent>
                        {availableEmployees.length > 0 ? (
                          availableEmployees.map((emp) => (
                            <SelectItem key={emp.id} value={emp.id}>
                              {emp.fullName}
                            </SelectItem>
                          ))
                        ) : (
                          <SelectItem value="" disabled>
                            ไม่พบพนักงานในกะนี้
                          </SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                    {availableEmployees.length === 0 && formData.shiftId && (
                      <p className="text-xs text-amber-600">* ไม่พบพนักงานในกะนี้ กรุณาตรวจสอบตารางงาน</p>
                    )}
                  </div>

                  {/* Current Fuel Prices Display */}
                  {currentFuelPrice && (
                    <div className="bg-slate-50 p-3 rounded-lg">
                      <p className="text-sm text-slate-500 mb-2">ราคาน้ำมันปัจจุบัน (บาท/ลิตร)</p>
                      <div className="grid grid-cols-4 gap-2 text-center">
                        <div><span className="text-xs text-slate-400">95</span><p className="font-medium">{currentFuelPrice['95']}</p></div>
                        <div><span className="text-xs text-slate-400">B7</span><p className="font-medium">{currentFuelPrice['B7']}</p></div>
                        <div><span className="text-xs text-slate-400">B10</span><p className="font-medium">{currentFuelPrice['B10']}</p></div>
                        <div><span className="text-xs text-slate-400">Diesel</span><p className="font-medium">{currentFuelPrice['Diesel']}</p></div>
                      </div>
                    </div>
                  )}

                  {/* Cash Amount per Nozzle - แยกตามประเภทน้ำมัน */}
                  <div className="space-y-4">
                    <Label className="flex items-center gap-2">
                      <DollarSign className="w-4 h-4" />
                      ยอดเงินแยกตามประเภทน้ำมัน (บาท)
                    </Label>
                    
                    {/* Dispenser 1: 95 + Diesel */}
                    <div className="border border-blue-200 rounded-lg p-4 bg-blue-50/50">
                      <h4 className="font-medium text-blue-700 mb-3">ตู้ที่ 1</h4>
                      <div className="space-y-3">
                        {/* Nozzle 1: 95 */}
                        <div className="grid grid-cols-12 gap-2 items-center bg-white p-3 rounded-lg">
                          <div className="col-span-2 font-medium text-center text-red-600">95</div>
                          <div className="col-span-3">
<Label htmlFor="field-1" className="text-xs text-slate-400">ยอดเงินเริ่มต้น</Label>
                            <Input id="field-1"
                              type="number"
                              step="0.01"
                              disabled={isStartValuesLocked}
                              value={formData.dispenserCash?.dispenser1?.nozzle1?.start ?? 0}
                              onChange={(e) => setFormData({
                                ...formData,
                                dispenserCash: {
                                  ...formData.dispenserCash,
                                  dispenser1: {
                                    ...formData.dispenserCash.dispenser1,
                                    nozzle1: { ...formData.dispenserCash.dispenser1.nozzle1, start: Number(e.target.value) }
                                  }
                                }
                              })}
                            />
                          </div>
                          <div className="col-span-3">
<Label htmlFor="field-2" className="text-xs text-slate-400">ยอดเงินสิ้นสุด</Label>
                            <Input id="field-2"
                              type="number"
                              step="0.01"
                              value={formData.dispenserCash?.dispenser1?.nozzle1?.end ?? 0}
                              onChange={(e) => setFormData({
                                ...formData,
                                dispenserCash: {
                                  ...formData.dispenserCash,
                                  dispenser1: {
                                    ...formData.dispenserCash.dispenser1,
                                    nozzle1: { ...formData.dispenserCash.dispenser1.nozzle1, end: Number(e.target.value) }
                                  }
                                }
                              })}
                            />
                          </div>
                          <div className="col-span-4 text-center">
                            <Label className="text-xs text-slate-400">ยอดเงินจริง (สิ้นสุด - เริ่มต้น)</Label>
                            <p className="font-medium text-green-600">
                              {formatNumber(d1n1Cash)}
                            </p>
                          </div>
                        </div>
                        
                        {/* Nozzle 2: Diesel */}
                        <div className="grid grid-cols-12 gap-2 items-center bg-white p-3 rounded-lg">
                          <div className="col-span-2 font-medium text-center text-slate-600">Diesel</div>
                          <div className="col-span-3">
<Label htmlFor="field-3" className="text-xs text-slate-400">ยอดเงินเริ่มต้น</Label>
                            <Input id="field-3"
                              type="number"
                              step="0.01"
                              disabled={isStartValuesLocked}
                              value={formData.dispenserCash?.dispenser1?.nozzle2?.start ?? 0}
                              onChange={(e) => setFormData({
                                ...formData,
                                dispenserCash: {
                                  ...formData.dispenserCash,
                                  dispenser1: {
                                    ...formData.dispenserCash.dispenser1,
                                    nozzle2: { ...formData.dispenserCash.dispenser1.nozzle2, start: Number(e.target.value) }
                                  }
                                }
                              })}
                            />
                          </div>
                          <div className="col-span-3">
<Label htmlFor="field-4" className="text-xs text-slate-400">ยอดเงินสิ้นสุด</Label>
                            <Input id="field-4"
                              type="number"
                              step="0.01"
                              value={formData.dispenserCash?.dispenser1?.nozzle2?.end ?? 0}
                              onChange={(e) => setFormData({
                                ...formData,
                                dispenserCash: {
                                  ...formData.dispenserCash,
                                  dispenser1: {
                                    ...formData.dispenserCash.dispenser1,
                                    nozzle2: { ...formData.dispenserCash.dispenser1.nozzle2, end: Number(e.target.value) }
                                  }
                                }
                              })}
                            />
                          </div>
                          <div className="col-span-4 text-center">
                            <Label className="text-xs text-slate-400">ยอดเงินจริง (สิ้นสุด - เริ่มต้น)</Label>
                            <p className="font-medium text-green-600">
                              {formatNumber(d1n2Cash)}
                            </p>
                          </div>
                        </div>
                        
                        {/* Dispenser 1 Total */}
                        <div className="bg-blue-100/70 p-2 rounded-lg">
                          <div className="flex justify-between items-center">
                            <span className="text-blue-700 font-medium text-sm">รวมตู้ที่ 1:</span>
                            <span className="font-bold text-blue-700">
                              {formatNumber(dispenser1Cash)} บาท
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    {/* Dispenser 2: 95 + B7 */}
                    <div className="border border-green-200 rounded-lg p-4 bg-green-50/50">
                      <h4 className="font-medium text-green-700 mb-3">ตู้ที่ 2</h4>
                      <div className="space-y-3">
                        {/* Nozzle 1: 95 */}
                        <div className="grid grid-cols-12 gap-2 items-center bg-white p-3 rounded-lg">
                          <div className="col-span-2 font-medium text-center text-red-600">95</div>
                          <div className="col-span-3">
<Label htmlFor="field-5" className="text-xs text-slate-400">ยอดเงินเริ่มต้น</Label>
                            <Input id="field-5"
                              type="number"
                              step="0.01"
                              disabled={isStartValuesLocked}
                              value={formData.dispenserCash?.dispenser2?.nozzle1?.start ?? 0}
                              onChange={(e) => setFormData({
                                ...formData,
                                dispenserCash: {
                                  ...formData.dispenserCash,
                                  dispenser2: {
                                    nozzle1: { 
                                      start: Number(e.target.value),
                                      end: formData.dispenserCash?.dispenser2?.nozzle1?.end ?? 0
                                    },
                                    nozzle2: {
                                      start: formData.dispenserCash?.dispenser2?.nozzle2?.start ?? 0,
                                      end: formData.dispenserCash?.dispenser2?.nozzle2?.end ?? 0
                                    }
                                  }
                                }
                              })}
                            />
                          </div>
                          <div className="col-span-3">
<Label htmlFor="field-6" className="text-xs text-slate-400">ยอดเงินสิ้นสุด</Label>
                            <Input id="field-6"
                              type="number"
                              step="0.01"
                              value={formData.dispenserCash?.dispenser2?.nozzle1?.end ?? 0}
                              onChange={(e) => setFormData({
                                ...formData,
                                dispenserCash: {
                                  ...formData.dispenserCash,
                                  dispenser2: {
                                    nozzle1: { 
                                      start: formData.dispenserCash?.dispenser2?.nozzle1?.start ?? 0,
                                      end: Number(e.target.value)
                                    },
                                    nozzle2: {
                                      start: formData.dispenserCash?.dispenser2?.nozzle2?.start ?? 0,
                                      end: formData.dispenserCash?.dispenser2?.nozzle2?.end ?? 0
                                    }
                                  }
                                }
                              })}
                            />
                          </div>
                          <div className="col-span-4 text-center">
                            <Label className="text-xs text-slate-400">ยอดเงินจริง (สิ้นสุด - เริ่มต้น)</Label>
                            <p className="font-medium text-green-600">
                              {formatNumber(d2n1Cash)}
                            </p>
                          </div>
                        </div>
                        
                        {/* Nozzle 2: B7 */}
                        <div className="grid grid-cols-12 gap-2 items-center bg-white p-3 rounded-lg">
                          <div className="col-span-2 font-medium text-center text-yellow-600">B7</div>
                          <div className="col-span-3">
<Label htmlFor="field-7" className="text-xs text-slate-400">ยอดเงินเริ่มต้น</Label>
                            <Input id="field-7"
                              type="number"
                              step="0.01"
                              disabled={isStartValuesLocked}
                              value={formData.dispenserCash?.dispenser2?.nozzle2?.start ?? 0}
                              onChange={(e) => setFormData({
                                ...formData,
                                dispenserCash: {
                                  ...formData.dispenserCash,
                                  dispenser2: {
                                    nozzle1: { 
                                      start: formData.dispenserCash?.dispenser2?.nozzle1?.start ?? 0,
                                      end: formData.dispenserCash?.dispenser2?.nozzle1?.end ?? 0
                                    },
                                    nozzle2: {
                                      start: Number(e.target.value),
                                      end: formData.dispenserCash?.dispenser2?.nozzle2?.end ?? 0
                                    }
                                  }
                                }
                              })}
                            />
                          </div>
                          <div className="col-span-3">
<Label htmlFor="field-8" className="text-xs text-slate-400">ยอดเงินสิ้นสุด</Label>
                            <Input id="field-8"
                              type="number"
                              step="0.01"
                              value={formData.dispenserCash?.dispenser2?.nozzle2?.end ?? 0}
                              onChange={(e) => setFormData({
                                ...formData,
                                dispenserCash: {
                                  ...formData.dispenserCash,
                                  dispenser2: {
                                    nozzle1: { 
                                      start: formData.dispenserCash?.dispenser2?.nozzle1?.start ?? 0,
                                      end: formData.dispenserCash?.dispenser2?.nozzle1?.end ?? 0
                                    },
                                    nozzle2: {
                                      start: formData.dispenserCash?.dispenser2?.nozzle2?.start ?? 0,
                                      end: Number(e.target.value)
                                    }
                                  }
                                }
                              })}
                            />
                          </div>
                          <div className="col-span-4 text-center">
                            <Label className="text-xs text-slate-400">ยอดเงินจริง (สิ้นสุด - เริ่มต้น)</Label>
                            <p className="font-medium text-green-600">
                              {formatNumber(d2n2Cash)}
                            </p>
                          </div>
                        </div>
                        
                        {/* Dispenser 2 Total */}
                        <div className="bg-green-100/70 p-2 rounded-lg">
                          <div className="flex justify-between items-center">
                            <span className="text-green-700 font-medium text-sm">รวมตู้ที่ 2:</span>
                            <span className="font-bold text-green-700">
                              {formatNumber(dispenser2Cash)} บาท
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    {/* Total Cash from All Nozzles */}
                    <div className="bg-green-50 p-4 rounded-lg">
                      <div className="flex justify-between items-center">
                        <span className="text-green-700 font-medium">ยอดเงินสดรวมทั้งหมด (ตามตู้):</span>
                        <span className="text-2xl font-bold text-green-700">{formatNumber(totalDispenserCash)} บาท</span>
                      </div>
                    </div>
                  </div>

                  {/* Fuel Meter Readings - 2 Dispensers */}
                  <div className="space-y-4">
                    <Label className="flex items-center gap-2">
                      <Fuel className="w-4 h-4" />
                      ยอดลิตรจากมิเตอร์ (2 ตู้จ่าย)
                    </Label>
                    
                    {/* Dispenser 1: 95 + Diesel */}
                    <div className="border border-blue-200 rounded-lg p-4 bg-blue-50/50">
                      <h4 className="font-medium text-blue-700 mb-3">ตู้ที่ 1</h4>
                      <div className="space-y-3">
                        {/* Nozzle 1: 95 */}
                        <div className="grid grid-cols-12 gap-2 items-center bg-white p-3 rounded-lg">
                          <div className="col-span-2 font-medium text-center text-red-600">95<br/><span className="text-xs text-slate-400">หัว 1</span></div>
                          <div className="col-span-3">
<Label htmlFor="field-9" className="text-xs text-slate-400">เริ่มต้น</Label>
                            <Input id="field-9"
                              type="number"
                              step="0.01"
                              disabled={isStartValuesLocked}
                              value={formData.fuelMeter.dispenser1.nozzle1.start}
                              onChange={(e) => setFormData({
                                ...formData,
                                fuelMeter: {
                                  ...formData.fuelMeter,
                                  dispenser1: {
                                    ...formData.fuelMeter.dispenser1,
                                    nozzle1: { ...formData.fuelMeter.dispenser1.nozzle1, start: Number(e.target.value) }
                                  }
                                }
                              })}
                            />
                          </div>
                          <div className="col-span-3">
<Label htmlFor="field-10" className="text-xs text-slate-400">สิ้นสุด</Label>
                            <Input id="field-10"
                              type="number"
                              step="0.01"
                              value={formData.fuelMeter.dispenser1.nozzle1.end}
                              onChange={(e) => setFormData({
                                ...formData,
                                fuelMeter: {
                                  ...formData.fuelMeter,
                                  dispenser1: {
                                    ...formData.fuelMeter.dispenser1,
                                    nozzle1: { ...formData.fuelMeter.dispenser1.nozzle1, end: Number(e.target.value) }
                                  }
                                }
                              })}
                            />
                          </div>
                          <div className="col-span-4 text-center">
                            <Label className="text-xs text-slate-400">ขาย (ลิตร)</Label>
                            <p className="font-medium text-blue-600">
                              {formatNumber(d1n1Sales)}
                            </p>
                          </div>
                        </div>
                        
                        {/* Nozzle 2: Diesel */}
                        <div className="grid grid-cols-12 gap-2 items-center bg-white p-3 rounded-lg">
                          <div className="col-span-2 font-medium text-center text-slate-600">Diesel<br/><span className="text-xs text-slate-400">หัว 2</span></div>
                          <div className="col-span-3">
<Label htmlFor="field-11" className="text-xs text-slate-400">เริ่มต้น</Label>
                            <Input id="field-11"
                              type="number"
                              step="0.01"
                              disabled={isStartValuesLocked}
                              value={formData.fuelMeter.dispenser1.nozzle2.start}
                              onChange={(e) => setFormData({
                                ...formData,
                                fuelMeter: {
                                  ...formData.fuelMeter,
                                  dispenser1: {
                                    ...formData.fuelMeter.dispenser1,
                                    nozzle2: { ...formData.fuelMeter.dispenser1.nozzle2, start: Number(e.target.value) }
                                  }
                                }
                              })}
                            />
                          </div>
                          <div className="col-span-3">
<Label htmlFor="field-12" className="text-xs text-slate-400">สิ้นสุด</Label>
                            <Input id="field-12"
                              type="number"
                              step="0.01"
                              value={formData.fuelMeter.dispenser1.nozzle2.end}
                              onChange={(e) => setFormData({
                                ...formData,
                                fuelMeter: {
                                  ...formData.fuelMeter,
                                  dispenser1: {
                                    ...formData.fuelMeter.dispenser1,
                                    nozzle2: { ...formData.fuelMeter.dispenser1.nozzle2, end: Number(e.target.value) }
                                  }
                                }
                              })}
                            />
                          </div>
                          <div className="col-span-4 text-center">
                            <Label className="text-xs text-slate-400">ขาย (ลิตร)</Label>
                            <p className="font-medium text-blue-600">
                              {formatNumber(d1n2Sales)}
                            </p>
                          </div>
                        </div>
                        
                        {/* Dispenser 1 Summary - ลิตร */}
                        <div className="bg-blue-100/50 p-3 rounded-lg mt-2">
                          <p className="text-xs text-blue-700 font-medium mb-1">สรุปยอดลิตรตู้ที่ 1</p>
                          <div className="grid grid-cols-2 gap-2 text-sm">
                            <div className="flex justify-between">
                              <span className="text-red-600">95:</span>
                              <span className="font-medium">{formatNumber(d1n1Sales)} ลิตร</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-slate-600">Diesel:</span>
                              <span className="font-medium">{formatNumber(d1n2Sales)} ลิตร</span>
                            </div>
                            <div className="col-span-2 border-t border-blue-200 pt-1 mt-1">
                              <div className="flex justify-between">
                                <span className="text-blue-700 font-medium">รวมตู้ที่ 1:</span>
                                <span className="font-bold text-blue-700">{formatNumber(d1n1Sales + d1n2Sales)} ลิตร</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    {/* Dispenser 2: 95 + B7 */}
                    <div className="border border-green-200 rounded-lg p-4 bg-green-50/50">
                      <h4 className="font-medium text-green-700 mb-3">ตู้ที่ 2</h4>
                      <div className="space-y-3">
                        {/* Nozzle 1: 95 */}
                        <div className="grid grid-cols-12 gap-2 items-center bg-white p-3 rounded-lg">
                          <div className="col-span-2 font-medium text-center text-red-600">95<br/><span className="text-xs text-slate-400">หัว 1</span></div>
                          <div className="col-span-3">
<Label htmlFor="field-13" className="text-xs text-slate-400">เริ่มต้น</Label>
                            <Input id="field-13"
                              type="number"
                              step="0.01"
                              disabled={isStartValuesLocked}
                              value={formData.fuelMeter.dispenser2.nozzle1.start}
                              onChange={(e) => setFormData({
                                ...formData,
                                fuelMeter: {
                                  ...formData.fuelMeter,
                                  dispenser2: {
                                    ...formData.fuelMeter.dispenser2,
                                    nozzle1: { ...formData.fuelMeter.dispenser2.nozzle1, start: Number(e.target.value) }
                                  }
                                }
                              })}
                            />
                          </div>
                          <div className="col-span-3">
<Label htmlFor="field-14" className="text-xs text-slate-400">สิ้นสุด</Label>
                            <Input id="field-14"
                              type="number"
                              step="0.01"
                              value={formData.fuelMeter.dispenser2.nozzle1.end}
                              onChange={(e) => setFormData({
                                ...formData,
                                fuelMeter: {
                                  ...formData.fuelMeter,
                                  dispenser2: {
                                    ...formData.fuelMeter.dispenser2,
                                    nozzle1: { ...formData.fuelMeter.dispenser2.nozzle1, end: Number(e.target.value) }
                                  }
                                }
                              })}
                            />
                          </div>
                          <div className="col-span-4 text-center">
                            <Label className="text-xs text-slate-400">ขาย (ลิตร)</Label>
                            <p className="font-medium text-blue-600">
                              {formatNumber(d2n1Sales)}
                            </p>
                          </div>
                        </div>
                        
                        {/* Nozzle 2: B7 */}
                        <div className="grid grid-cols-12 gap-2 items-center bg-white p-3 rounded-lg">
                          <div className="col-span-2 font-medium text-center text-yellow-600">B7<br/><span className="text-xs text-slate-400">หัว 2</span></div>
                          <div className="col-span-3">
<Label htmlFor="field-15" className="text-xs text-slate-400">เริ่มต้น</Label>
                            <Input id="field-15"
                              type="number"
                              step="0.01"
                              disabled={isStartValuesLocked}
                              value={formData.fuelMeter.dispenser2.nozzle2.start}
                              onChange={(e) => setFormData({
                                ...formData,
                                fuelMeter: {
                                  ...formData.fuelMeter,
                                  dispenser2: {
                                    ...formData.fuelMeter.dispenser2,
                                    nozzle2: { ...formData.fuelMeter.dispenser2.nozzle2, start: Number(e.target.value) }
                                  }
                                }
                              })}
                            />
                          </div>
                          <div className="col-span-3">
<Label htmlFor="field-16" className="text-xs text-slate-400">สิ้นสุด</Label>
                            <Input id="field-16"
                              type="number"
                              step="0.01"
                              value={formData.fuelMeter.dispenser2.nozzle2.end}
                              onChange={(e) => setFormData({
                                ...formData,
                                fuelMeter: {
                                  ...formData.fuelMeter,
                                  dispenser2: {
                                    ...formData.fuelMeter.dispenser2,
                                    nozzle2: { ...formData.fuelMeter.dispenser2.nozzle2, end: Number(e.target.value) }
                                  }
                                }
                              })}
                            />
                          </div>
                          <div className="col-span-4 text-center">
                            <Label className="text-xs text-slate-400">ขาย (ลิตร)</Label>
                            <p className="font-medium text-blue-600">
                              {formatNumber(d2n2Sales)}
                            </p>
                          </div>
                        </div>
                        
                        {/* Dispenser 2 Summary - ลิตร */}
                        <div className="bg-green-100/50 p-3 rounded-lg mt-2">
                          <p className="text-xs text-green-700 font-medium mb-1">สรุปยอดลิตรตู้ที่ 2</p>
                          <div className="grid grid-cols-2 gap-2 text-sm">
                            <div className="flex justify-between">
                              <span className="text-red-600">95:</span>
                              <span className="font-medium">{formatNumber(d2n1Sales)} ลิตร</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-yellow-600">B7:</span>
                              <span className="font-medium">{formatNumber(d2n2Sales)} ลิตร</span>
                            </div>
                            <div className="col-span-2 border-t border-green-200 pt-1 mt-1">
                              <div className="flex justify-between">
                                <span className="text-green-700 font-medium">รวมตู้ที่ 2:</span>
                                <span className="font-bold text-green-700">{formatNumber(d2n1Sales + d2n2Sales)} ลิตร</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Total Fuel Liters */}
                  <div className="bg-green-50 p-4 rounded-lg">
                    <div className="flex justify-between items-center">
                      <span className="text-green-700 font-medium">ยอดลิตรรวมทั้งหมด:</span>
                      <span className="text-2xl font-bold text-green-700">{formatNumber(d1n1Sales + d1n2Sales + d2n1Sales + d2n2Sales)} ลิตร</span>
                    </div>
                  </div>

                  {/* Actual Cash Counted */}
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2 text-blue-700">
                      <DollarSign className="w-4 h-4" />
                      ยอดเงินสดที่นับได้ (รวม)
                    </Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={formData.actualCashCounted}
                      onChange={(e) => setFormData({ 
                        ...formData, 
                        actualCashCounted: Number(e.target.value)
                      })}
                      className="text-lg font-medium"
                      placeholder="กรอกยอดเงินสดที่นับได้"
                    />
                    <p className="text-xs text-slate-500">กรอกยอดเงินสดที่นับได้จริงจากการนับเงิน (ไม่รวมเงินโอนและอื่นๆ)</p>
                  </div>

                  {/* Other Items */}
                  <div className="space-y-2">
                    <Label>รายการอื่นๆ (บาท)</Label>
                    <div className="grid grid-cols-4 gap-2">
                      <div>
<Label htmlFor="field-17" className="text-xs">2T</Label>
                        <Input id="field-17"
                          type="number"
                          value={formData.items.twoT}
                          onChange={(e) => setFormData({ 
                            ...formData, 
                            items: { ...formData.items, twoT: Number(e.target.value) }
                          })}
                        />
                      </div>
                      <div>
<Label htmlFor="field-18" className="text-xs">เงินทุน</Label>
                        <Input id="field-18"
                          type="number"
                          value={formData.items.capital}
                          onChange={(e) => setFormData({ 
                            ...formData, 
                            items: { ...formData.items, capital: Number(e.target.value) }
                          })}
                        />
                      </div>
                      <div>
<Label htmlFor="field-19" className="text-xs">เงินโอน</Label>
                        <Input id="field-19"
                          type="number"
                          value={formData.items.transfer}
                          onChange={(e) => setFormData({ 
                            ...formData, 
                            items: { ...formData.items, transfer: Number(e.target.value) }
                          })}
                        />
                      </div>
                      <div>
<Label htmlFor="field-20" className="text-xs">อื่นๆ</Label>
                        <Input id="field-20"
                          type="number"
                          value={formData.items.others}
                          onChange={(e) => setFormData({ 
                            ...formData, 
                            items: { ...formData.items, others: Number(e.target.value) }
                          })}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Calculation Summary */}
                  <div className="bg-slate-100 p-4 rounded-lg space-y-3">
                    <p className="font-medium text-slate-700">สรุปยอดเงิน</p>
                    
                    {/* สรุปตามที่นับได้ */}
                    <div className="bg-blue-50 p-3 rounded-lg">
                      <p className="text-xs text-blue-700 font-medium mb-2">คำนวณจากยอดที่นับได้</p>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-blue-600 font-medium">ยอดเงินสดที่นับได้:</span>
                          <span className="font-medium">{formatNumber(formData.actualCashCounted)} บาท</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">2T:</span>
                          <span>+ {formatNumber(formData.items.twoT)} บาท</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">เงินทุน:</span>
                          <span>+ {formatNumber(formData.items.capital)} บาท</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">เงินโอน:</span>
                          <span>+ {formatNumber(formData.items.transfer)} บาท</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">อื่นๆ:</span>
                          <span>+ {formatNumber(formData.items.others)} บาท</span>
                        </div>
                        <div className="flex justify-between col-span-2 border-t-2 border-blue-200 pt-2 bg-white p-2 rounded">
                          <span className="text-blue-700 font-bold">ยอดรวมทั้งหมด:</span>
                          <span className="font-bold text-blue-700">{formatNumber(totalCashWithOthers)} บาท</span>
                        </div>
                        <div className="flex justify-between col-span-2 border-t pt-2">
                          <span className="text-slate-700 font-medium">เงินขาด/เกิน (เทียบกับตู้):</span>
                          <span className={`font-bold ${(totalCashWithOthers - totalDispenserCash) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {(totalCashWithOthers - totalDispenserCash) >= 0 ? '+' : ''}
                            {formatNumber(totalCashWithOthers - totalDispenserCash)} บาท
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Note */}
                  <div className="space-y-2">
<Label htmlFor="field-21">หมายเหตุ</Label>
                    <Input id="field-21"
                      value={formData.note}
                      onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                      placeholder="เพิ่มหมายเหตุ..."
                    />
                  </div>
                </div>
                
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                    ยกเลิก
                  </Button>
                  <Button onClick={handleAdd}>บันทึก</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        }
      />

      <div className="p-6 space-y-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Fuel className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-slate-500">ยอดขายวันนี้ (บาท)</p>
                  <p className="text-2xl font-bold">{formatNumber(todaySummary.totalSales)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                  <DollarSign className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-slate-500">เงินสดวันนี้ (บาท)</p>
                  <p className="text-2xl font-bold">{formatNumber(todaySummary.totalCash)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${todaySummary.totalDifference >= 0 ? 'bg-green-100' : 'bg-red-100'}`}>
                  {todaySummary.totalDifference >= 0 ? 
                    <TrendingUp className="w-6 h-6 text-green-600" /> : 
                    <TrendingDown className="w-6 h-6 text-red-600" />
                  }
                </div>
                <div>
                  <p className="text-sm text-slate-500">ยอดขาด/เกินวันนี้</p>
                  <p className={`text-2xl font-bold ${todaySummary.totalDifference >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {todaySummary.totalDifference >= 0 ? '+' : ''}{formatNumber(todaySummary.totalDifference)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Fuel Sales Breakdown */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
          <Card className="bg-gradient-to-br from-red-50 to-red-100 border-red-200">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-red-500 rounded-lg flex items-center justify-center">
                  <Droplets className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="text-sm text-red-700 font-medium">95</p>
                  <p className="text-xl font-bold text-red-800">
                    {formatInt(dailyAccounts
                      .filter(a => a.date === new Date().toISOString().split('T')[0])
                      .reduce((sum, a) => sum + (a.fuelSales?.['95'] ?? 0), 0)
                    )} <span className="text-sm font-normal">ลิตร</span>
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-yellow-50 to-yellow-100 border-yellow-200">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-yellow-500 rounded-lg flex items-center justify-center">
                  <Droplets className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="text-sm text-yellow-700 font-medium">B7</p>
                  <p className="text-xl font-bold text-yellow-800">
                    {formatInt(dailyAccounts
                      .filter(a => a.date === new Date().toISOString().split('T')[0])
                      .reduce((sum, a) => sum + (a.fuelSales?.['B7'] ?? 0), 0)
                    )} <span className="text-sm font-normal">ลิตร</span>
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-green-500 rounded-lg flex items-center justify-center">
                  <Droplets className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="text-sm text-green-700 font-medium">B10</p>
                  <p className="text-xl font-bold text-green-800">
                    {formatInt(dailyAccounts
                      .filter(a => a.date === new Date().toISOString().split('T')[0])
                      .reduce((sum, a) => sum + (a.fuelSales?.['B10'] ?? 0), 0)
                    )} <span className="text-sm font-normal">ลิตร</span>
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-slate-50 to-slate-100 border-slate-200">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-slate-600 rounded-lg flex items-center justify-center">
                  <Droplets className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="text-sm text-slate-700 font-medium">Diesel</p>
                  <p className="text-xl font-bold text-slate-800">
                    {formatInt(dailyAccounts
                      .filter(a => a.date === new Date().toISOString().split('T')[0])
                      .reduce((sum, a) => sum + (a.fuelSales?.['Diesel'] ?? 0), 0)
                    )} <span className="text-sm font-normal">ลิตร</span>
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <div className="relative flex-1 max-w-xs">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <DatePickerString
                  value={searchDate}
                  onChange={setSearchDate}
                  placeholder="ค้นหาตามวันที่"
                  className="pl-10"
                />
              </div>
              {searchDate && (
                <Button variant="outline" onClick={() => setSearchDate('')}>
                  ล้าง
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Accounts Table Desktop */}
        <Card className="hidden md:block">
          <CardContent className="p-0 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead rowSpan={2} className="align-middle">วันที่</TableHead>
                  <TableHead rowSpan={2} className="align-middle">กะ</TableHead>
                  <TableHead rowSpan={2} className="align-middle">พนักงาน</TableHead>
                  <TableHead colSpan={4} className="text-center bg-blue-50">ยอดขายน้ำมัน (ลิตร)</TableHead>
                  <TableHead rowSpan={2} className="text-right align-middle">ยอดเงินน้ำมัน</TableHead>
                  <TableHead rowSpan={2} className="text-right align-middle">เงินสด</TableHead>
                  <TableHead rowSpan={2} className="text-right align-middle">ขาด/เกิน</TableHead>
                  <TableHead rowSpan={2} className="w-16 align-middle"></TableHead>
                </TableRow>
                <TableRow>
                  <TableHead className="text-right bg-red-50 text-red-700">95</TableHead>
                  <TableHead className="text-right bg-yellow-50 text-yellow-700">B7</TableHead>
                  <TableHead className="text-right bg-green-50 text-green-700">B10</TableHead>
                  <TableHead className="text-right bg-slate-50 text-slate-700">Diesel</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isDateLoading ? (
                  <TableRow>
                    <TableCell colSpan={11} className="text-center py-8 text-slate-500">
                      กำลังโหลดข้อมูล...
                    </TableCell>
                  </TableRow>
                ) : sortedAccounts.length > 0 ? (
                  sortedAccounts.map((account) => (
                      <TableRow key={account.id}>
                        <TableCell>
                          {getDayName(account.date)} {formatThaiDate(account.date)}
                        </TableCell>
                        <TableCell>{account.shift?.name || '-'}</TableCell>
                        <TableCell>{account.employee?.fullName || '-'}</TableCell>
                        <TableCell className="text-right bg-red-50/50">{formatNumber(account.fuelSales?.['95'] ?? 0)}</TableCell>
                        <TableCell className="text-right bg-yellow-50/50">{formatNumber(account.fuelSales?.['B7'] ?? 0)}</TableCell>
                        <TableCell className="text-right bg-green-50/50">{formatNumber(account.fuelSales?.['B10'] ?? 0)}</TableCell>
                        <TableCell className="text-right bg-slate-50/50">{formatNumber(account.fuelSales?.['Diesel'] ?? 0)}</TableCell>
                        <TableCell className="text-right font-medium">{formatNumber(account.totalFuelAmount)}</TableCell>
                        <TableCell className="text-right">{formatNumber(account.cashAmount)}</TableCell>
                        <TableCell className="text-right">
                          <Badge variant={account.difference >= 0 ? 'default' : 'destructive'}>
                            {account.difference >= 0 ? '+' : ''}{formatNumber(account.difference)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button variant="ghost" size="icon" onClick={() => openEditDialog(account)}>
                              <Edit2 className="w-4 h-4" />
                            </Button>
                            {(user?.role === 'admin' || user?.role === 'manager') && (
                              <Button variant="ghost" size="icon" className="text-red-500" onClick={() => openDeleteDialog(account)}>
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={11} className="text-center py-8 text-slate-500">
                      ไม่พบข้อมูลบัญชี
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Accounts Cards Mobile */}
        <div className="md:hidden space-y-3">
          {isDateLoading ? (
            <p className="text-center py-8 text-slate-500">กำลังโหลดข้อมูล...</p>
          ) : sortedAccounts.length > 0 ? (
            sortedAccounts.map((account) => (
              <Card key={account.id}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-medium">{getDayName(account.date)} {formatThaiDate(account.date)}</p>
                      <p className="text-sm text-slate-500">{account.shift?.name || '-'} · {account.employee?.fullName || '-'}</p>
                    </div>
                    <Badge variant={account.difference >= 0 ? 'default' : 'destructive'}>
                      {account.difference >= 0 ? '+' : ''}{formatNumber(account.difference)}
                    </Badge>
                  </div>
                  <div className="grid grid-cols-4 gap-2 mt-3 text-center text-sm bg-slate-50 rounded-lg p-2">
                    <div><span className="text-xs text-red-600">95</span><p className="font-medium">{formatNumber(account.fuelSales?.['95'] ?? 0)}</p></div>
                    <div><span className="text-xs text-yellow-600">B7</span><p className="font-medium">{formatNumber(account.fuelSales?.['B7'] ?? 0)}</p></div>
                    <div><span className="text-xs text-green-600">B10</span><p className="font-medium">{formatNumber(account.fuelSales?.['B10'] ?? 0)}</p></div>
                    <div><span className="text-xs text-slate-600">Diesel</span><p className="font-medium">{formatNumber(account.fuelSales?.['Diesel'] ?? 0)}</p></div>
                  </div>
                  <div className="flex items-center justify-between mt-3">
                    <div className="text-sm">
                      <span className="text-slate-500">เงินน้ำมัน:</span> <span className="font-medium">{formatNumber(account.totalFuelAmount)}</span>
                    </div>
                    <div className="text-sm">
                      <span className="text-slate-500">เงินสด:</span> <span className="font-medium">{formatNumber(account.cashAmount)}</span>
                    </div>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" className="min-w-[44px] min-h-[44px]" onClick={() => openEditDialog(account)}>
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      {(user?.role === 'admin' || user?.role === 'manager') && (
                        <Button variant="ghost" size="icon" className="text-red-500 min-w-[44px] min-h-[44px]" onClick={() => openDeleteDialog(account)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <p className="text-center py-8 text-slate-500">ไม่พบข้อมูลบัญชี</p>
          )}
        </div>
      </div>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>แก้ไขบัญชีรายวัน</DialogTitle>
            <DialogDescription>
              แก้ไขข้อมูลบัญชีรายวันด้านล่าง
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>วันที่</Label>
                <DatePickerString
                  value={formData.date}
                  onChange={(date) => setFormData({ ...formData, date })}
                  placeholder="เลือกวันที่"
                />
              </div>
              <div className="space-y-2">
                <Label>กะ</Label>
                <Select value={formData.shiftId} onValueChange={(v) => setFormData({ ...formData, shiftId: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {shifts.map((shift) => (
                      <SelectItem key={shift.id} value={shift.id}>{shift.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            {/* Cash Amount per Nozzle - Edit Mode - แยกตามประเภทน้ำมัน */}
            <div className="space-y-4">
              <Label className="flex items-center gap-2">
                <DollarSign className="w-4 h-4" />
                ยอดเงินแยกตามประเภทน้ำมัน (บาท)
              </Label>
              
              {/* Dispenser 1: 95 + Diesel */}
              <div className="border border-blue-200 rounded-lg p-3 bg-blue-50/50">
                <h4 className="font-medium text-blue-700 mb-2">ตู้ที่ 1</h4>
                <div className="space-y-2">
                  {/* Nozzle 1: 95 */}
                  <div className="grid grid-cols-12 gap-2 items-center bg-white p-2 rounded-lg">
                    <div className="col-span-2 font-medium text-center text-red-600 text-sm">95</div>
                    <div className="col-span-4">
<Label htmlFor="field-22" className="text-xs text-slate-400">ยอดเงินเริ่มต้น</Label>
                      <Input disabled id="field-22"
                        type="number"
                        step="0.01"
                        value={formData.dispenserCash?.dispenser1?.nozzle1?.start ?? 0}
                        onChange={(e) => setFormData({
                          ...formData,
                          dispenserCash: {
                            ...formData.dispenserCash,
                            dispenser1: {
                              nozzle1: { 
                                start: Number(e.target.value),
                                end: formData.dispenserCash?.dispenser1?.nozzle1?.end ?? 0
                              },
                              nozzle2: {
                                start: formData.dispenserCash?.dispenser1?.nozzle2?.start ?? 0,
                                end: formData.dispenserCash?.dispenser1?.nozzle2?.end ?? 0
                              }
                            }
                          }
                        })}
                      />
                    </div>
                    <div className="col-span-4">
<Label htmlFor="field-23" className="text-xs text-slate-400">ยอดเงินสิ้นสุด</Label>
                      <Input id="field-23"
                        type="number"
                        step="0.01"
                        value={formData.dispenserCash?.dispenser1?.nozzle1?.end ?? 0}
                        onChange={(e) => setFormData({
                          ...formData,
                          dispenserCash: {
                            ...formData.dispenserCash,
                            dispenser1: {
                              nozzle1: { 
                                start: formData.dispenserCash?.dispenser1?.nozzle1?.start ?? 0,
                                end: Number(e.target.value)
                              },
                              nozzle2: {
                                start: formData.dispenserCash?.dispenser1?.nozzle2?.start ?? 0,
                                end: formData.dispenserCash?.dispenser1?.nozzle2?.end ?? 0
                              }
                            }
                          }
                        })}
                      />
                    </div>
                    <div className="col-span-2 text-center">
                      <Label className="text-xs text-slate-400">จริง</Label>
                      <p className="font-medium text-green-600 text-sm">
                        {formatNumber(d1n1Cash)}
                      </p>
                    </div>
                  </div>
                  
                  {/* Nozzle 2: Diesel */}
                  <div className="grid grid-cols-12 gap-2 items-center bg-white p-2 rounded-lg">
                    <div className="col-span-2 font-medium text-center text-slate-600 text-sm">Diesel</div>
                    <div className="col-span-4">
<Label htmlFor="field-24" className="text-xs text-slate-400">ยอดเงินเริ่มต้น</Label>
                      <Input disabled id="field-24"
                        type="number"
                        step="0.01"
                        value={formData.dispenserCash?.dispenser1?.nozzle2?.start ?? 0}
                        onChange={(e) => setFormData({
                          ...formData,
                          dispenserCash: {
                            ...formData.dispenserCash,
                            dispenser1: {
                              nozzle1: { 
                                start: formData.dispenserCash?.dispenser1?.nozzle1?.start ?? 0,
                                end: formData.dispenserCash?.dispenser1?.nozzle1?.end ?? 0
                              },
                              nozzle2: {
                                start: Number(e.target.value),
                                end: formData.dispenserCash?.dispenser1?.nozzle2?.end ?? 0
                              }
                            }
                          }
                        })}
                      />
                    </div>
                    <div className="col-span-4">
<Label htmlFor="field-25" className="text-xs text-slate-400">ยอดเงินสิ้นสุด</Label>
                      <Input id="field-25"
                        type="number"
                        step="0.01"
                        value={formData.dispenserCash?.dispenser1?.nozzle2?.end ?? 0}
                        onChange={(e) => setFormData({
                          ...formData,
                          dispenserCash: {
                            ...formData.dispenserCash,
                            dispenser1: {
                              nozzle1: { 
                                start: formData.dispenserCash?.dispenser1?.nozzle1?.start ?? 0,
                                end: formData.dispenserCash?.dispenser1?.nozzle1?.end ?? 0
                              },
                              nozzle2: {
                                start: formData.dispenserCash?.dispenser1?.nozzle2?.start ?? 0,
                                end: Number(e.target.value)
                              }
                            }
                          }
                        })}
                      />
                    </div>
                    <div className="col-span-2 text-center">
                      <Label className="text-xs text-slate-400">จริง</Label>
                      <p className="font-medium text-green-600 text-sm">
                        {formatNumber(d1n2Cash)}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Dispenser 2: 95 + B7 */}
              <div className="border border-green-200 rounded-lg p-3 bg-green-50/50">
                <h4 className="font-medium text-green-700 mb-2">ตู้ที่ 2</h4>
                <div className="space-y-2">
                  {/* Nozzle 1: 95 */}
                  <div className="grid grid-cols-12 gap-2 items-center bg-white p-2 rounded-lg">
                    <div className="col-span-2 font-medium text-center text-red-600 text-sm">95</div>
                    <div className="col-span-4">
<Label htmlFor="field-26" className="text-xs text-slate-400">ยอดเงินเริ่มต้น</Label>
                      <Input disabled id="field-26"
                        type="number"
                        step="0.01"
                        value={formData.dispenserCash?.dispenser2?.nozzle1?.start ?? 0}
                        onChange={(e) => setFormData({
                          ...formData,
                          dispenserCash: {
                            ...formData.dispenserCash,
                            dispenser2: {
                              ...formData.dispenserCash.dispenser2,
                              nozzle1: { ...formData.dispenserCash.dispenser2.nozzle1, start: Number(e.target.value) }
                            }
                          }
                        })}
                      />
                    </div>
                    <div className="col-span-4">
<Label htmlFor="field-27" className="text-xs text-slate-400">ยอดเงินสิ้นสุด</Label>
                      <Input id="field-27"
                        type="number"
                        step="0.01"
                        value={formData.dispenserCash.dispenser2.nozzle1.end}
                        onChange={(e) => setFormData({
                          ...formData,
                          dispenserCash: {
                            ...formData.dispenserCash,
                            dispenser2: {
                              ...formData.dispenserCash.dispenser2,
                              nozzle1: { ...formData.dispenserCash.dispenser2.nozzle1, end: Number(e.target.value) }
                            }
                          }
                        })}
                      />
                    </div>
                    <div className="col-span-2 text-center">
                      <Label className="text-xs text-slate-400">จริง</Label>
                      <p className="font-medium text-green-600 text-sm">
                        {formatNumber(d2n1Cash)}
                      </p>
                    </div>
                  </div>
                  
                  {/* Nozzle 2: B7 */}
                  <div className="grid grid-cols-12 gap-2 items-center bg-white p-2 rounded-lg">
                    <div className="col-span-2 font-medium text-center text-yellow-600 text-sm">B7</div>
                    <div className="col-span-4">
<Label htmlFor="field-28" className="text-xs text-slate-400">ยอดเงินเริ่มต้น</Label>
                      <Input disabled id="field-28"
                        type="number"
                        step="0.01"
                        value={formData.dispenserCash.dispenser2.nozzle2.start}
                        onChange={(e) => setFormData({
                          ...formData,
                          dispenserCash: {
                            ...formData.dispenserCash,
                            dispenser2: {
                              ...formData.dispenserCash.dispenser2,
                              nozzle2: { ...formData.dispenserCash.dispenser2.nozzle2, start: Number(e.target.value) }
                            }
                          }
                        })}
                      />
                    </div>
                    <div className="col-span-4">
<Label htmlFor="field-29" className="text-xs text-slate-400">ยอดเงินสิ้นสุด</Label>
                      <Input id="field-29"
                        type="number"
                        step="0.01"
                        value={formData.dispenserCash.dispenser2.nozzle2.end}
                        onChange={(e) => setFormData({
                          ...formData,
                          dispenserCash: {
                            ...formData.dispenserCash,
                            dispenser2: {
                              ...formData.dispenserCash.dispenser2,
                              nozzle2: { ...formData.dispenserCash.dispenser2.nozzle2, end: Number(e.target.value) }
                            }
                          }
                        })}
                      />
                    </div>
                    <div className="col-span-2 text-center">
                      <Label className="text-xs text-slate-400">จริง</Label>
                      <p className="font-medium text-green-600 text-sm">
                        {formatNumber(d2n2Cash)}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Fuel Meter - 2 Dispensers */}
            <div className="space-y-4">
              <Label>ยอดลิตรจากมิเตอร์ (2 ตู้จ่าย)</Label>
              
              {/* Dispenser 1: 95 + Diesel */}
              <div className="border border-blue-200 rounded-lg p-3 bg-blue-50/50">
                <h4 className="font-medium text-blue-700 mb-2">ตู้ที่ 1</h4>
                {/* Nozzle 1: 95 */}
                <div className="grid grid-cols-12 gap-2 items-center bg-white p-2 rounded-lg mb-2">
                  <div className="col-span-2 font-medium text-center text-red-600">95</div>
                  <div className="col-span-4">
<Label htmlFor="field-30" className="text-xs text-slate-400">เริ่มต้น</Label>
                    <Input disabled id="field-30" type="number" step="0.01" value={formData.fuelMeter.dispenser1.nozzle1.start} onChange={(e) => setFormData({ ...formData, fuelMeter: { ...formData.fuelMeter, dispenser1: { ...formData.fuelMeter.dispenser1, nozzle1: { ...formData.fuelMeter.dispenser1.nozzle1, start: Number(e.target.value) }}}} )} />
                  </div>
                  <div className="col-span-4">
<Label htmlFor="field-31" className="text-xs text-slate-400">สิ้นสุด</Label>
                    <Input id="field-31" type="number" step="0.01" value={formData.fuelMeter.dispenser1.nozzle1.end} onChange={(e) => setFormData({ ...formData, fuelMeter: { ...formData.fuelMeter, dispenser1: { ...formData.fuelMeter.dispenser1, nozzle1: { ...formData.fuelMeter.dispenser1.nozzle1, end: Number(e.target.value) }}}} )} />
                  </div>
                  <div className="col-span-2 text-center">
                    <Label className="text-xs text-slate-400">ขาย</Label>
                    <p className="font-medium text-blue-600">{formatNumber(d1n1Sales)}</p>
                  </div>
                </div>
                {/* Nozzle 2: Diesel */}
                <div className="grid grid-cols-12 gap-2 items-center bg-white p-2 rounded-lg">
                  <div className="col-span-2 font-medium text-center text-slate-600">Diesel</div>
                  <div className="col-span-4">
<Label htmlFor="field-32" className="text-xs text-slate-400">เริ่มต้น</Label>
                    <Input disabled id="field-32" type="number" step="0.01" value={formData.fuelMeter.dispenser1.nozzle2.start} onChange={(e) => setFormData({ ...formData, fuelMeter: { ...formData.fuelMeter, dispenser1: { ...formData.fuelMeter.dispenser1, nozzle2: { ...formData.fuelMeter.dispenser1.nozzle2, start: Number(e.target.value) }}}} )} />
                  </div>
                  <div className="col-span-4">
<Label htmlFor="field-33" className="text-xs text-slate-400">สิ้นสุด</Label>
                    <Input id="field-33" type="number" step="0.01" value={formData.fuelMeter.dispenser1.nozzle2.end} onChange={(e) => setFormData({ ...formData, fuelMeter: { ...formData.fuelMeter, dispenser1: { ...formData.fuelMeter.dispenser1, nozzle2: { ...formData.fuelMeter.dispenser1.nozzle2, end: Number(e.target.value) }}}} )} />
                  </div>
                  <div className="col-span-2 text-center">
                    <Label className="text-xs text-slate-400">ขาย</Label>
                    <p className="font-medium text-blue-600">{formatNumber(d1n2Sales)}</p>
                  </div>
                </div>
                
                {/* Dispenser 1 Summary - ลิตร */}
                <div className="bg-blue-100/50 p-2 rounded-lg mt-2">
                  <p className="text-xs text-blue-700 font-medium mb-1">สรุปยอดลิตรตู้ที่ 1</p>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-red-600">95:</span>
                      <span className="font-medium">{formatNumber(d1n1Sales)} ลิตร</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600">Diesel:</span>
                      <span className="font-medium">{formatNumber(d1n2Sales)} ลิตร</span>
                    </div>
                    <div className="col-span-2 border-t border-blue-200 pt-1 mt-1">
                      <div className="flex justify-between">
                        <span className="text-blue-700 font-medium">รวมตู้ที่ 1:</span>
                        <span className="font-bold text-blue-700">{formatNumber(d1n1Sales + d1n2Sales)} ลิตร</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Dispenser 2: 95 + B7 */}
              <div className="border border-green-200 rounded-lg p-3 bg-green-50/50">
                <h4 className="font-medium text-green-700 mb-2">ตู้ที่ 2</h4>
                {/* Nozzle 1: 95 */}
                <div className="grid grid-cols-12 gap-2 items-center bg-white p-2 rounded-lg mb-2">
                  <div className="col-span-2 font-medium text-center text-red-600">95</div>
                  <div className="col-span-4">
<Label htmlFor="field-34" className="text-xs text-slate-400">เริ่มต้น</Label>
                    <Input disabled id="field-34" type="number" step="0.01" value={formData.fuelMeter.dispenser2.nozzle1.start} onChange={(e) => setFormData({ ...formData, fuelMeter: { ...formData.fuelMeter, dispenser2: { ...formData.fuelMeter.dispenser2, nozzle1: { ...formData.fuelMeter.dispenser2.nozzle1, start: Number(e.target.value) }}}} )} />
                  </div>
                  <div className="col-span-4">
<Label htmlFor="field-35" className="text-xs text-slate-400">สิ้นสุด</Label>
                    <Input id="field-35" type="number" step="0.01" value={formData.fuelMeter.dispenser2.nozzle1.end} onChange={(e) => setFormData({ ...formData, fuelMeter: { ...formData.fuelMeter, dispenser2: { ...formData.fuelMeter.dispenser2, nozzle1: { ...formData.fuelMeter.dispenser2.nozzle1, end: Number(e.target.value) }}}} )} />
                  </div>
                  <div className="col-span-2 text-center">
                    <Label className="text-xs text-slate-400">ขาย</Label>
                    <p className="font-medium text-blue-600">{formatNumber(d2n1Sales)}</p>
                  </div>
                </div>
                {/* Nozzle 2: B7 */}
                <div className="grid grid-cols-12 gap-2 items-center bg-white p-2 rounded-lg">
                  <div className="col-span-2 font-medium text-center text-yellow-600">B7</div>
                  <div className="col-span-4">
<Label htmlFor="field-36" className="text-xs text-slate-400">เริ่มต้น</Label>
                    <Input disabled id="field-36" type="number" step="0.01" value={formData.fuelMeter.dispenser2.nozzle2.start} onChange={(e) => setFormData({ ...formData, fuelMeter: { ...formData.fuelMeter, dispenser2: { ...formData.fuelMeter.dispenser2, nozzle2: { ...formData.fuelMeter.dispenser2.nozzle2, start: Number(e.target.value) }}}} )} />
                  </div>
                  <div className="col-span-4">
<Label htmlFor="field-37" className="text-xs text-slate-400">สิ้นสุด</Label>
                    <Input id="field-37" type="number" step="0.01" value={formData.fuelMeter.dispenser2.nozzle2.end} onChange={(e) => setFormData({ ...formData, fuelMeter: { ...formData.fuelMeter, dispenser2: { ...formData.fuelMeter.dispenser2, nozzle2: { ...formData.fuelMeter.dispenser2.nozzle2, end: Number(e.target.value) }}}} )} />
                  </div>
                  <div className="col-span-2 text-center">
                    <Label className="text-xs text-slate-400">ขาย</Label>
                    <p className="font-medium text-blue-600">{formatNumber(d2n2Sales)}</p>
                  </div>
                </div>
                
                {/* Dispenser 2 Summary - ลิตร */}
                <div className="bg-green-100/50 p-2 rounded-lg mt-2">
                  <p className="text-xs text-green-700 font-medium mb-1">สรุปยอดลิตรตู้ที่ 2</p>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-red-600">95:</span>
                      <span className="font-medium">{formatNumber(d2n1Sales)} ลิตร</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-yellow-600">B7:</span>
                      <span className="font-medium">{formatNumber(d2n2Sales)} ลิตร</span>
                    </div>
                    <div className="col-span-2 border-t border-green-200 pt-1 mt-1">
                      <div className="flex justify-between">
                        <span className="text-green-700 font-medium">รวมตู้ที่ 2:</span>
                        <span className="font-bold text-green-700">{formatNumber(d2n1Sales + d2n2Sales)} ลิตร</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Actual Cash Counted */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2 text-blue-700">
                <DollarSign className="w-4 h-4" />
                ยอดเงินสดที่นับได้ (รวม)
              </Label>
              <Input
                type="number"
                step="0.01"
                value={formData.actualCashCounted}
                onChange={(e) => setFormData({ 
                  ...formData, 
                  actualCashCounted: Number(e.target.value)
                })}
                className="text-lg font-medium"
                placeholder="กรอกยอดเงินสดที่นับได้"
              />
              <p className="text-xs text-slate-500">กรอกยอดเงินสดที่นับได้จริงจากการนับเงิน (ไม่รวมเงินโอนและอื่นๆ)</p>
            </div>

            {/* Other Items */}
            <div className="space-y-2">
              <Label>รายการอื่นๆ (บาท)</Label>
              <div className="grid grid-cols-4 gap-2">
                <div>
<Label htmlFor="field-38" className="text-xs">2T</Label>
                  <Input id="field-38"
                    type="number"
                    value={formData.items.twoT}
                    onChange={(e) => setFormData({ 
                      ...formData, 
                      items: { ...formData.items, twoT: Number(e.target.value) }
                    })}
                  />
                </div>
                <div>
<Label htmlFor="field-39" className="text-xs">เงินทุน</Label>
                  <Input id="field-39"
                    type="number"
                    value={formData.items.capital}
                    onChange={(e) => setFormData({ 
                      ...formData, 
                      items: { ...formData.items, capital: Number(e.target.value) }
                    })}
                  />
                </div>
                <div>
<Label htmlFor="field-40" className="text-xs">เงินโอน</Label>
                  <Input id="field-40"
                    type="number"
                    value={formData.items.transfer}
                    onChange={(e) => setFormData({ 
                      ...formData, 
                      items: { ...formData.items, transfer: Number(e.target.value) }
                    })}
                  />
                </div>
                <div>
<Label htmlFor="field-41" className="text-xs">อื่นๆ</Label>
                  <Input id="field-41"
                    type="number"
                    value={formData.items.others}
                    onChange={(e) => setFormData({ 
                      ...formData, 
                      items: { ...formData.items, others: Number(e.target.value) }
                    })}
                  />
                </div>
              </div>
            </div>

            {/* Calculation Summary */}
            <div className="bg-slate-100 p-4 rounded-lg space-y-3">
              <p className="font-medium text-slate-700">สรุปยอดเงิน</p>
              <div className="bg-blue-50 p-3 rounded-lg">
                <p className="text-xs text-blue-700 font-medium mb-2">คำนวณจากยอดที่นับได้</p>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-blue-600 font-medium">ยอดเงินสดที่นับได้:</span>
                    <span className="font-medium">{formatNumber(formData.actualCashCounted)} บาท</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">2T:</span>
                    <span>+ {formatNumber(formData.items.twoT)} บาท</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">เงินโอน:</span>
                    <span>+ {formatNumber(formData.items.transfer)} บาท</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">อื่นๆ:</span>
                    <span>+ {formatNumber(formData.items.others)} บาท</span>
                  </div>
                  <div className="flex justify-between col-span-2 border-t-2 border-blue-200 pt-2 bg-white p-2 rounded">
                    <span className="text-blue-700 font-bold">ยอดรวมทั้งหมด:</span>
                    <span className="font-bold text-blue-700">{formatNumber(totalCashWithOthers)} บาท</span>
                  </div>
                  <div className="flex justify-between col-span-2 border-t pt-2">
                    <span className="text-slate-700 font-medium">เงินขาด/เกิน (ตามที่นับ):</span>
                    <span className={`font-bold ${(totalCashWithOthers - totalFuelAmount) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {(totalCashWithOthers - totalFuelAmount) >= 0 ? '+' : ''}
                      {formatNumber(totalCashWithOthers - totalFuelAmount)} บาท
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Note */}
            <div className="space-y-2">
<Label htmlFor="field-42">หมายเหตุ</Label>
              <Input id="field-42"
                value={formData.note}
                onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                placeholder="เพิ่มหมายเหตุ..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>ยกเลิก</Button>
            <Button onClick={handleEdit}>บันทึก</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>ยืนยันการลบ</DialogTitle>
            <DialogDescription>
              คุณแน่ใจหรือไม่ที่จะลบบัญชีวันที่ {selectedAccount && formatThaiDate(selectedAccount.date)}?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>ยกเลิก</Button>
            <Button variant="destructive" onClick={handleDelete}>ลบ</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Fuel Price Dialog */}
      <Dialog open={isPriceDialogOpen} onOpenChange={setIsPriceDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>ตั้งราคาน้ำมัน</DialogTitle>
            <DialogDescription>
              กำหนดราคาน้ำมันสำหรับคำนวณยอดเงินอัตโนมัติ
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
<Label htmlFor="field-43">95 (บาท/ลิตร)</Label>
                <Input id="field-43"
                  type="number"
                  step="0.01"
                  value={priceForm['95']}
                  onChange={(e) => setPriceForm({ ...priceForm, '95': Number(e.target.value) })}
                />
              </div>
              <div className="space-y-2">
<Label htmlFor="field-44">B7 (บาท/ลิตร)</Label>
                <Input id="field-44"
                  type="number"
                  step="0.01"
                  value={priceForm['B7']}
                  onChange={(e) => setPriceForm({ ...priceForm, 'B7': Number(e.target.value) })}
                />
              </div>
              <div className="space-y-2">
<Label htmlFor="field-45">B10 (บาท/ลิตร)</Label>
                <Input id="field-45"
                  type="number"
                  step="0.01"
                  value={priceForm['B10']}
                  onChange={(e) => setPriceForm({ ...priceForm, 'B10': Number(e.target.value) })}
                />
              </div>
              <div className="space-y-2">
<Label htmlFor="field-46">Diesel (บาท/ลิตร)</Label>
                <Input id="field-46"
                  type="number"
                  step="0.01"
                  value={priceForm['Diesel']}
                  onChange={(e) => setPriceForm({ ...priceForm, 'Diesel': Number(e.target.value) })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>วันที่มีผล</Label>
              <DatePickerString
                value={priceForm.effectiveDate}
                onChange={(date) => setPriceForm({ ...priceForm, effectiveDate: date })}
                placeholder="เลือกวันที่มีผล"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsPriceDialogOpen(false)}>ยกเลิก</Button>
            <Button onClick={handleSetPrice}>บันทึกราคา</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DailyAccountingPage;
