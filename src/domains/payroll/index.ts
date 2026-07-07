/**
 * Payroll Domain
 * Barrel export for all payroll-related modules
 */

// Re-export from existing modules until fully migrated
export { PayrollProvider, usePayroll } from '@/contexts/PayrollContext';
export type { PayrollPeriod, PayrollRecord } from '@/types';
export { payrollApi, type PayrollCalculationRequest, type PayrollCalculationResult } from '@/lib/api';
