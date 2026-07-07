/**
 * Accounting Domain Types
 * Types specific to daily accounting, fuel prices, and meter readings
 */

// Re-export from main types for convenience
export type {
  DailyAccounting,
  FuelPrice,
  FuelType,
  DailyAccountingContextType,
} from '@/types';

// Local domain types
export interface FuelMeterReading {
  dispenser1: {
    nozzle1: { start: number; end: number };
    nozzle2: { start: number; end: number };
  };
  dispenser2: {
    nozzle1: { start: number; end: number };
    nozzle2: { start: number; end: number };
  };
}

export interface CashAmountReading {
  dispenser1: {
    nozzle1: { start: number; end: number };
    nozzle2: { start: number; end: number };
  };
  dispenser2: {
    nozzle1: { start: number; end: number };
    nozzle2: { start: number; end: number };
  };
}

// Domain-specific request/response types
export interface CreateDailyAccountRequest {
  date: string;
  shiftId: string;
  employeeId: string;
  meterReading: FuelMeterReading;
  dispenserCash: CashAmountReading;
  cashAmount: number;
  actualCashCounted: number;
  items: {
    twoT: number;
    capital: number;
    transfer: number;
    others: number;
  };
  note?: string;
}

export interface UpdateDailyAccountRequest {
  id: string;
  data: Partial<CreateDailyAccountRequest>;
}

export interface FuelSalesBreakdown {
  '95': number;
  'B7': number;
  'B10': number;
  'Diesel': number;
}

export interface AccountingSummary {
  date: string;
  totalFuelAmount: number;
  totalCash: number;
  difference: number;
  shiftName: string;
  employeeName: string;
}
