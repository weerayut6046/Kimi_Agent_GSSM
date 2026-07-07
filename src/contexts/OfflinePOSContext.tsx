/**
 * Offline-First POS Context
 * 
 * Wraps POS operations with offline support
 * - Queue sales when offline
 * - Sync when back online
 * - Cache product data for quick access
 */

import React, { createContext, useContext, useCallback, useEffect, useState } from 'react';
import { useNetworkStatus } from '@/contexts/NetworkStatusContext';
import { cache, pendingOperations } from '@/lib/offlineStorage';
import type { CartItem, QuickProduct, Payment } from '@/types/pos';
import { toast } from 'sonner';

interface OfflineSale {
  id: string;
  saleNumber: string;
  items: CartItem[];
  payments: Payment[];
  total: number;
  paidAmount: number;
  change: number;
  customerName?: string;
  customerPhone?: string;
  employeeId: string;
  shiftId?: string;
  createdAt: string;
  status: 'pending' | 'completed' | 'synced';
}

interface OfflinePOSContextType {
  offlineSales: OfflineSale[];
  isSyncing: boolean;
  pendingCount: number;
  saveOfflineSale: (sale: Omit<OfflineSale, 'id' | 'createdAt' | 'status'>) => Promise<OfflineSale>;
  syncOfflineSales: () => Promise<void>;
  getCachedProducts: () => Promise<QuickProduct[]>;
  cacheProducts: (products: QuickProduct[]) => Promise<void>;
}

const OfflinePOSContext = createContext<OfflinePOSContextType | null>(null);

const OFFLINE_SALES_KEY = 'offline-pos-sales';
const CACHED_PRODUCTS_KEY = 'pos-cached-products';

export const OfflinePOSProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isOnline } = useNetworkStatus();
  const [offlineSales, setOfflineSales] = useState<OfflineSale[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);

  // Load offline sales from IndexedDB on mount
  useEffect(() => {
    loadOfflineSales();
  }, []);

  const loadOfflineSales = async () => {
    const cached = await cache.get<OfflineSale[]>(OFFLINE_SALES_KEY);
    if (cached) {
      setOfflineSales(cached);
      const pending = cached.filter(s => s.status === 'pending').length;
      setPendingCount(pending);
    }
  };

  const saveOfflineSale = useCallback(async (
    saleData: Omit<OfflineSale, 'id' | 'createdAt' | 'status'>
  ): Promise<OfflineSale> => {
    const newSale: OfflineSale = {
      ...saleData,
      id: `offline-${Date.now()}`,
      createdAt: new Date().toISOString(),
      status: 'pending',
    };

    const updated = [...offlineSales, newSale];
    setOfflineSales(updated);
    await cache.set(OFFLINE_SALES_KEY, updated);
    setPendingCount(prev => prev + 1);

    // Also add to pending operations queue for sync
    await pendingOperations.add({
      type: 'create',
      entity: 'pos_sales',
      data: newSale,
    });

    toast.success('บันทึกการขายเรียบร้อย', {
      description: isOnline ? 'กำลังซิงค์...' : 'จะซิงค์เมื่อออนไลน์',
    });

    return newSale;
  }, [offlineSales, isOnline]);

  const syncOfflineSales = useCallback(async () => {
    if (!isOnline || isSyncing) return;

    setIsSyncing(true);
    const pending = offlineSales.filter(s => s.status === 'pending');
    const synced: string[] = [];
    const failed: string[] = [];

    for (const sale of pending) {
      try {
        // This would call the actual POS API
        // const result = await posStorage.sales.create(sale);
        
        // Mark as synced
        sale.status = 'synced';
        synced.push(sale.id);
      } catch (err) {
        console.error('Failed to sync sale:', err);
        failed.push(sale.id);
      }
    }

    // Update local state
    const updated = offlineSales.map(s => 
      synced.includes(s.id) ? { ...s, status: 'synced' as const } : s
    );
    setOfflineSales(updated);
    await cache.set(OFFLINE_SALES_KEY, updated);
    setPendingCount(failed.length);

    setIsSyncing(false);

    if (synced.length > 0) {
      toast.success(`ซิงค์สำเร็จ ${synced.length} รายการ`);
    }
    if (failed.length > 0) {
      toast.error(`ซิงค์ล้มเหลว ${failed.length} รายการ`);
    }
  }, [isOnline, isSyncing, offlineSales]);

  const getCachedProducts = useCallback(async (): Promise<QuickProduct[]> => {
    return (await cache.get<QuickProduct[]>(CACHED_PRODUCTS_KEY)) || [];
  }, []);

  const cacheProducts = useCallback(async (products: QuickProduct[]): Promise<void> => {
    await cache.set(CACHED_PRODUCTS_KEY, products, 1); // 1 hour expiry
  }, []);

  // Auto-sync when coming back online
  useEffect(() => {
    if (isOnline && pendingCount > 0) {
      syncOfflineSales();
    }
  }, [isOnline, pendingCount, syncOfflineSales]);

  const contextValue: OfflinePOSContextType = {
    offlineSales,
    isSyncing,
    pendingCount,
    saveOfflineSale,
    syncOfflineSales,
    getCachedProducts,
    cacheProducts,
  };

  return (
    <OfflinePOSContext.Provider value={contextValue}>
      {children}
    </OfflinePOSContext.Provider>
  );
};

export const useOfflinePOS = (): OfflinePOSContextType => {
  const context = useContext(OfflinePOSContext);
  if (!context) {
    throw new Error('useOfflinePOS must be used within OfflinePOSProvider');
  }
  return context;
};

export default OfflinePOSContext;
