/**
 * Shared Utilities
 * Cross-domain utilities that can be used by any domain
 */

export { cn } from '@/lib/utils';
export { formatThaiDate, getCurrentDate, getDayName } from '@/utils/dateUtils';
export { invokeFunction, dashboardApi, exportApi, payrollApi, accountingApi } from '@/lib/api';
export type {
  DashboardSummary,
  PayrollCalculationRequest,
  PayrollCalculationResult,
  AccountingValidationRequest,
  AccountingValidationResult,
} from '@/lib/api';
