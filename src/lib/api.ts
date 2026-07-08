/**
 * BFF API Client for Edge Functions
 * Centralized abstraction layer for calling Supabase Edge Functions
 */

import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

// ---------------------------------------------------------------------------
// Generic Edge Function Invoker
// ---------------------------------------------------------------------------

async function invokeFunction<TResponse>(
  functionName: string,
  body?: unknown,
  options?: { token?: string; method?: string }
): Promise<TResponse> {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    throw new Error('Supabase URL or Anon Key is not configured');
  }

  const response = await fetch(`${SUPABASE_URL}/functions/v1/${functionName}`, {
    method: options?.method || 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${options?.token || SUPABASE_ANON_KEY}`,
      apikey: SUPABASE_ANON_KEY,
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    let errorMessage = `Function ${functionName} failed`;
    try {
      const errorData = await response.json();
      errorMessage = errorData.error || errorMessage;
    } catch {
      errorMessage = `${errorMessage}: ${response.statusText}`;
    }
    throw new Error(errorMessage);
  }

  // Handle blob responses (file downloads)
  const contentType = response.headers.get('Content-Type') || '';
  if (contentType.includes('application/pdf') || contentType.includes('spreadsheet')) {
    return response.blob() as unknown as TResponse;
  }

  return response.json() as Promise<TResponse>;
}

function downloadBlob(blob: Blob, filename: string) {
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.URL.revokeObjectURL(url);
}

// ---------------------------------------------------------------------------
// Export API (File Generation via Edge Functions)
// ---------------------------------------------------------------------------

export const exportApi = {
  async toExcel(data: unknown[], filename: string, sheetName = 'Sheet1'): Promise<void> {
    const blob = await invokeFunction<Blob>('export-excel', { data, filename, sheetName });
    downloadBlob(blob, `${filename}.xlsx`);
    toast.success('Export Excel สำเร็จ');
  },

  async toPdf(title: string, data: unknown[], headers: string[], filename: string): Promise<void> {
    const blob = await invokeFunction<Blob>('export-pdf', { title, data, headers, filename });
    downloadBlob(blob, `${filename}.pdf`);
    toast.success('Export PDF สำเร็จ');
  },

  async receipt(saleData: Record<string, unknown>, filename: string): Promise<void> {
    const blob = await invokeFunction<Blob>('generate-receipt', saleData);
    downloadBlob(blob, `${filename}.pdf`);
    toast.success('พิมพ์ใบเสร็จสำเร็จ');
  },
};

// ---------------------------------------------------------------------------
// Dashboard API
// ---------------------------------------------------------------------------

export interface DashboardSummary {
  stats: {
    totalEmployees: number;
    activeEmployees: number;
    todayShifts: number;
    pendingLeaves: number;
    pendingSwaps: number;
    lateToday: number;
    absentToday: number;
  };
  myTodaySchedule: unknown | null;
  recentLeaves: unknown[];
  recentSwaps: unknown[];
  analytics: {
    fuelStockPrediction: unknown | null;
    productStockPrediction: unknown | null;
    salesTrend: unknown | null;
    attendanceRate: unknown | null;
  } | null;
}

export const dashboardApi = {
  async getSummary(): Promise<DashboardSummary> {
    return invokeFunction<DashboardSummary>('api-dashboard-summary');
  },
};

// ---------------------------------------------------------------------------
// Payroll API
// ---------------------------------------------------------------------------

export interface PayrollCalculationRequest {
  employeeId: string;
  periodId: string;
  startDate: string;
  endDate: string;
  hourlyRate?: number;
  shiftRate?: number;
  deductions?: { type: string; amount: number }[];
  allowances?: { type: string; amount: number }[];
}

export interface PayrollCalculationResult {
  employeeId: string;
  periodId: string;
  baseSalary: number;
  overtimePay: number;
  allowances: number;
  deductions: number;
  tax: number;
  netSalary: number;
  details: {
    totalShifts: number;
    totalHours: number;
    lateDays: number;
    absentDays: number;
    leaveDays: number;
  };
}

export const payrollApi = {
  async calculate(params: PayrollCalculationRequest): Promise<PayrollCalculationResult> {
    return invokeFunction<PayrollCalculationResult>('api-payroll-calculate', params);
  },
};

// ---------------------------------------------------------------------------
// Accounting API
// ---------------------------------------------------------------------------

export interface AccountingValidationRequest {
  date: string;
  shiftId: string;
  employeeId: string;
  meterReading: unknown;
  cashAmount?: number;
  actualCashCounted?: number;
  items?: Record<string, number>;
  fuelPrices?: Record<string, number>;
}

export interface AccountingValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  calculations: {
    fuelSales: { '95': number; 'B7': number; 'B10': number; 'Diesel': number };
    fuelAmount: { '95': number; 'B7': number; 'B10': number; 'Diesel': number };
    totalFuelAmount: number;
    totalCash: number;
    difference: number;
  };
}

export const accountingApi = {
  async validate(params: AccountingValidationRequest): Promise<AccountingValidationResult> {
    return invokeFunction<AccountingValidationResult>('api-accounting-validate', params);
  },
};

// ---------------------------------------------------------------------------
// Database Backup API
// ---------------------------------------------------------------------------

export interface DatabaseBackupResponse {
  success: boolean;
  message?: string;
  error?: string;
}

export const backupApi = {
  async triggerDatabaseBackup(): Promise<DatabaseBackupResponse> {
    const { data: { session } } = await supabase.auth.getSession();
    return invokeFunction<DatabaseBackupResponse>(
      'backup-database',
      undefined,
      { token: session?.access_token }
    );
  },
};

// ---------------------------------------------------------------------------
// Legacy compatibility: re-export invokeFunction for custom calls
// ---------------------------------------------------------------------------

export { invokeFunction };
