/**
 * Accounting Domain API
 * Encapsulates all API calls for the accounting domain
 */

import { accountingApi } from '@/lib/api';
import type {
  AccountingValidationRequest,
  AccountingValidationResult,
} from '@/lib/api';
import { dailyAccountingStorage, fuelPriceStorage } from '@/data/storage';
import type { DailyAccounting, FuelPrice } from '@/types';
import { exportDailyAccountingToExcel } from '@/lib/exportUtils';

// Re-export validation API from BFF
export const validateAccounting = accountingApi.validate;

// Export file generation (client-side)
export const exportAccountingToExcel = exportDailyAccountingToExcel;

// Direct Supabase CRUD operations
export const accountingStorage = {
  getAll: () => dailyAccountingStorage.getAll(),
  getRecent: (limit: number) => dailyAccountingStorage.getRecent(limit),
  getByDate: (date: string) => dailyAccountingStorage.getByDate(date),
  getByDateRange: (startDate: string, endDate: string) =>
    dailyAccountingStorage.getByDateRange(startDate, endDate),
  create: (data: Omit<DailyAccounting, 'id' | 'createdAt' | 'updatedAt'>) =>
    dailyAccountingStorage.create(data),
  update: (id: string, data: Partial<DailyAccounting>) =>
    dailyAccountingStorage.update(id, data),
  delete: (id: string) => dailyAccountingStorage.delete(id),
};

export const fuelPriceStorageApi = {
  getAll: () => fuelPriceStorage.getAll(),
  getCurrent: () => fuelPriceStorage.getCurrentPrice(),
  create: (prices: Omit<FuelPrice, 'id' | 'createdAt'>) =>
    fuelPriceStorage.create(prices),
  update: (id: string, prices: Partial<FuelPrice>) =>
    fuelPriceStorage.update(id, prices),
};

// Re-export types for convenience
export type { AccountingValidationRequest, AccountingValidationResult };
