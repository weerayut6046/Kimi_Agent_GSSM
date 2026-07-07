import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef, type ReactNode } from 'react';
import type { Customer, CustomerTransaction, CustomerFilter, CustomerTier } from '@/types/customer';
import { customerStorage } from '@/data/customerStorage';
import { subscribeToTables } from '@/lib/realtime';

interface CustomerContextType {
  customers: Customer[];
  isLoading: boolean;
  totalCustomers: number;
  fetchCustomers: (filter?: CustomerFilter, limit?: number, offset?: number) => Promise<void>;
  getCustomerById: (id: string) => Promise<Customer | undefined>;
  getCustomerByCode: (code: string) => Promise<Customer | undefined>;
  getCustomerByPhone: (phone: string) => Promise<Customer | undefined>;
  addCustomer: (customer: Omit<Customer, 'id' | 'createdAt' | 'updatedAt' | 'points' | 'totalSpent'>) => Promise<Customer | null>;
  updateCustomer: (id: string, updates: Partial<Customer>) => Promise<boolean>;
  deleteCustomer: (id: string) => Promise<boolean>;
  addPoints: (customerId: string, points: number, amount: number, saleId?: string) => Promise<boolean>;
  redeemPoints: (customerId: string, points: number, note?: string) => Promise<boolean>;
  getTransactions: (customerId: string) => Promise<CustomerTransaction[]>;
}

const CustomerContext = createContext<CustomerContextType | undefined>(undefined);

export const CustomerProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [totalCustomers, setTotalCustomers] = useState(0);
  const realtimeDebounceRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  const fetchCustomers = useCallback(async (filter?: CustomerFilter, limit = 100, offset = 0) => {
    setIsLoading(true);
    try {
      const result = await customerStorage.getAll(filter, limit, offset);
      setCustomers(result.customers);
      setTotalCustomers(result.total);
    } catch {
      // Silently handle missing customers table
    } finally {
      setIsLoading(false);
    }
  }, []);

  const getCustomerById = useCallback(async (id: string) => {
    return await customerStorage.getById(id);
  }, []);

  const getCustomerByCode = useCallback(async (code: string) => {
    return await customerStorage.getByMemberCode(code);
  }, []);

  const getCustomerByPhone = useCallback(async (phone: string) => {
    return await customerStorage.getByPhone(phone);
  }, []);

  const addCustomer = useCallback(async (
    customer: Omit<Customer, 'id' | 'createdAt' | 'updatedAt' | 'points' | 'totalSpent'>
  ): Promise<Customer | null> => {
    const result = await customerStorage.create(customer);
    if (result) {
      setCustomers(prev => [result, ...prev]);
      setTotalCustomers(prev => prev + 1);
    }
    return result;
  }, []);

  const updateCustomer = useCallback(async (id: string, updates: Partial<Customer>): Promise<boolean> => {
    const success = await customerStorage.update(id, updates);
    if (success) {
      setCustomers(prev => prev.map(c => c.id === id ? { ...c, ...updates } : c));
    }
    return success;
  }, []);

  const deleteCustomer = useCallback(async (id: string): Promise<boolean> => {
    const success = await customerStorage.delete(id);
    if (success) {
      setCustomers(prev => prev.filter(c => c.id !== id));
      setTotalCustomers(prev => prev - 1);
    }
    return success;
  }, []);

  const addPoints = useCallback(async (customerId: string, points: number, amount: number, saleId?: string): Promise<boolean> => {
    const success = await customerStorage.addPoints(customerId, points, amount, saleId);
    if (success) {
      setCustomers(prev => prev.map(c => {
        if (c.id === customerId) {
          const newPoints = c.points + points;
          return {
            ...c,
            points: newPoints,
            totalSpent: c.totalSpent + amount,
            tier: newPoints >= 5000 ? 'gold' : newPoints >= 1000 ? 'silver' : 'bronze' as CustomerTier,
          };
        }
        return c;
      }));
    }
    return success;
  }, []);

  const redeemPoints = useCallback(async (customerId: string, points: number, note?: string): Promise<boolean> => {
    const success = await customerStorage.redeemPoints(customerId, points, note);
    if (success) {
      setCustomers(prev => prev.map(c => {
        if (c.id === customerId) {
          const newPoints = c.points - points;
          return {
            ...c,
            points: newPoints,
            tier: newPoints >= 5000 ? 'gold' : newPoints >= 1000 ? 'silver' : 'bronze' as CustomerTier,
          };
        }
        return c;
      }));
    }
    return success;
  }, []);

  const getTransactions = useCallback(async (customerId: string): Promise<CustomerTransaction[]> => {
    return await customerStorage.getTransactions(customerId);
  }, []);

  // Realtime subscriptions
  useEffect(() => {
    const unsubscribes = subscribeToTables([
      {
        table: 'customers',
        onEvent: () => {
          if (realtimeDebounceRef.current['customers']) clearTimeout(realtimeDebounceRef.current['customers']);
          realtimeDebounceRef.current['customers'] = setTimeout(() => {
            // Only refresh if we already have customers loaded
            if (customers.length > 0) {
              fetchCustomers().catch(console.error);
            }
          }, 800);
        },
      },
      {
        table: 'customer_transactions',
        onEvent: () => {
          // customer_transactions are typically fetched on-demand per customer
          // so we don't auto-reload them here
        },
      },
    ]);
    return unsubscribes;
  }, [fetchCustomers, customers.length]);

  const value = useMemo(
    () => ({
      customers,
      isLoading,
      totalCustomers,
      fetchCustomers,
      getCustomerById,
      getCustomerByCode,
      getCustomerByPhone,
      addCustomer,
      updateCustomer,
      deleteCustomer,
      addPoints,
      redeemPoints,
      getTransactions,
    }),
    [customers, isLoading, totalCustomers, fetchCustomers, getCustomerById, getCustomerByCode, getCustomerByPhone, addCustomer, updateCustomer, deleteCustomer, addPoints, redeemPoints, getTransactions]
  );

  return <CustomerContext.Provider value={value}>{children}</CustomerContext.Provider>;
};

export const useCustomer = (): CustomerContextType => {
  const context = useContext(CustomerContext);
  if (!context) {
    throw new Error('useCustomer must be used within a CustomerProvider');
  }
  return context;
};
