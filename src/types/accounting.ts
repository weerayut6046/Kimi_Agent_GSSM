import type { Shift, EmployeeProfile } from './index';

// Fuel Price Interface
export interface FuelPrice {
  id: string;
  '95': number;
  'B7': number;
  'B10': number;
  'Diesel': number;
  effectiveDate: string;
  createdAt: string;
}

// Fuel Dispenser Meter Reading
export interface DispenserMeter {
  nozzle1: { start: number; end: number; fuelType: '95' | 'B7' | 'B10' | 'Diesel' };
  nozzle2: { start: number; end: number; fuelType: '95' | 'B7' | 'B10' | 'Diesel' };
}

// Fuel Meter Reading Interface - แยกตามตู้จ่ายน้ำมัน
export interface FuelMeterReading {
  dispenser1: DispenserMeter; // ตู้ที่ 1: 95 + Diesel
  dispenser2: DispenserMeter; // ตู้ที่ 2: 95 + B7
}

// Cash Amount per Nozzle - ยอดเงินในแต่ละหัวจ่าย (แยกตามประเภทน้ำมัน)
export interface NozzleCashAmount {
  start: number; // ยอดเงินเริ่มต้น
  end: number;   // ยอดเงินสิ้นสุด
}

// Cash Amount per Dispenser - ยอดเงินในแต่ละตู้จ่าย (แยกตามหัว)
export interface DispenserCashAmount {
  nozzle1: NozzleCashAmount; // หัว 1
  nozzle2: NozzleCashAmount; // หัว 2
}

// Cash Amount Reading Interface - ยอดเงินรวมจากทุกตู้จ่าย
export interface CashAmountReading {
  dispenser1: DispenserCashAmount;
  dispenser2: DispenserCashAmount;
}

// Daily Accounting Interface
export interface DailyAccounting {
  id: string;
  date: string;
  shiftId: string;
  shift: Shift;
  employeeId: string;
  employee: EmployeeProfile;
  // ยอดลิตรจากมิเตอร์ (เริ่มต้น - สิ้นสุด)
  fuelMeter: FuelMeterReading;
  // ยอดขายน้ำมัน (ลิตร) - คำนวณจากมิเตอร์
  fuelSales: {
    '95': number;
    'B7': number;
    'B10': number;
    'Diesel': number;
  };
  // ยอดเงินจากการขายน้ำมัน - คำนวณอัตโนมัติ
  fuelAmount: {
    '95': number;
    'B7': number;
    'B10': number;
    'Diesel': number;
  };
  // ยอดเงินรวมจากน้ำมัน
  totalFuelAmount: number;
  // ยอดเงินที่จอ (จากระบบ)
  systemAmount: number;
  // ยอดเงินสดที่นับได้ (รวมจากทุกตู้) - คำนวณจาก dispenserCash
  cashAmount: number;
  // ยอดเงินสดที่นับได้จริง (กรอกเอง)
  actualCashCounted?: number;
  // ยอดเงินในแต่ละตู้จ่าย (เริ่มต้น - สิ้นสุด)
  dispenserCash: CashAmountReading;
  // รายการต่างๆ
  items: {
    twoT: number;            // 2T
    capital: number;         // เงินทุน
    transfer: number;        // เงินโอน
    others: number;          // อื่นๆ
  };
  // สรุป
  totalAmount: number;       // ยอดสุทธิ
  difference: number;        // ยอดขาด/เกิน (บวก = เกิน, ลบ = ขาด)
  note: string;
  createdAt: string;
  updatedAt: string;
  // Soft delete fields
  isDeleted?: boolean;
  deletedAt?: string;
  deletedBy?: string;
}
