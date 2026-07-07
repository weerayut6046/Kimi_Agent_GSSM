/**
 * Accounting Domain Hooks
 * Custom React hooks for the accounting domain
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { useEmployee } from '@/contexts/EmployeeContext';
import { accountingStorage, fuelPriceStorageApi, validateAccounting } from './api';
import type { DailyAccounting, FuelPrice } from '@/types';

export interface UseAccountingReturn {
  dailyAccounts: DailyAccounting[];
  fuelPrices: FuelPrice[];
  currentFuelPrice: FuelPrice | null;
  isLoading: boolean;
  error: string | null;
  loadAccounts: () => Promise<void>;
  createAccount: (account: Omit<DailyAccounting, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  updateAccount: (id: string, account: Partial<DailyAccounting>) => Promise<void>;
  deleteAccount: (id: string) => Promise<void>;
  validateMeterReading: (params: Parameters<typeof validateAccounting>[0]) => ReturnType<typeof validateAccounting>;
}

export function useAccounting(): UseAccountingReturn {
  const [dailyAccounts, setDailyAccounts] = useState<DailyAccounting[]>([]);
  const [fuelPrices, setFuelPrices] = useState<FuelPrice[]>([]);
  const [currentFuelPrice, setCurrentFuelPrice] = useState<FuelPrice | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { isLoading: isEmployeeLoading } = useEmployee();
  const isInitialized = useRef(false);

  const loadAccounts = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [accounts, prices] = await Promise.all([
        accountingStorage.getRecent(100),
        fuelPriceStorageApi.getAll(),
      ]);
      setDailyAccounts(accounts);
      setFuelPrices(prices);
      setCurrentFuelPrice(prices[prices.length - 1] || null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load accounting data');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isEmployeeLoading) return;
    if (isInitialized.current) return;
    isInitialized.current = true;
    loadAccounts();
  }, [isEmployeeLoading, loadAccounts]);

  const createAccount = useCallback(async (account: Omit<DailyAccounting, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      const newAccount = await accountingStorage.create(account);
      setDailyAccounts((prev) => [newAccount, ...prev]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create account');
      throw err;
    }
  }, []);

  const updateAccount = useCallback(async (id: string, account: Partial<DailyAccounting>) => {
    try {
      await accountingStorage.update(id, account);
      setDailyAccounts((prev) =>
        prev.map((a) => (a.id === id ? { ...a, ...account } : a))
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update account');
      throw err;
    }
  }, []);

  const deleteAccount = useCallback(async (id: string) => {
    try {
      await accountingStorage.delete(id);
      setDailyAccounts((prev) => prev.filter((a) => a.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete account');
      throw err;
    }
  }, []);

  const validateMeterReading = useCallback(async (params: Parameters<typeof validateAccounting>[0]) => {
    return validateAccounting(params);
  }, []);

  return {
    dailyAccounts,
    fuelPrices,
    currentFuelPrice,
    isLoading,
    error,
    loadAccounts,
    createAccount,
    updateAccount,
    deleteAccount,
    validateMeterReading,
  };
}

export function useFuelPrices() {
  const [fuelPrices, setFuelPrices] = useState<FuelPrice[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const loadPrices = useCallback(async () => {
    setIsLoading(true);
    try {
      const prices = await fuelPriceStorageApi.getAll();
      setFuelPrices(prices);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPrices();
  }, [loadPrices]);

  return { fuelPrices, isLoading, loadPrices };
}
