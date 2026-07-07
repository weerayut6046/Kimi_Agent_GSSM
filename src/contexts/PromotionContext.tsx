import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef, type ReactNode } from 'react';
import type { Promotion, PromotionFilter } from '@/types/promotion';
import { promotionStorage } from '@/data/promotionStorage';
import { subscribeToTable } from '@/lib/realtime';

interface PromotionContextType {
  promotions: Promotion[];
  activePromotions: Promotion[];
  isLoading: boolean;
  totalPromotions: number;
  fetchPromotions: (filter?: PromotionFilter, limit?: number, offset?: number) => Promise<void>;
  getPromotionById: (id: string) => Promise<Promotion | undefined>;
  addPromotion: (promotion: Omit<Promotion, 'id' | 'createdAt' | 'updatedAt'>) => Promise<Promotion | null>;
  updatePromotion: (id: string, updates: Partial<Promotion>) => Promise<boolean>;
  deletePromotion: (id: string) => Promise<boolean>;
  toggleActive: (id: string, isActive: boolean) => Promise<boolean>;
}

const PromotionContext = createContext<PromotionContextType | undefined>(undefined);

export const PromotionProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [activePromotions, setActivePromotions] = useState<Promotion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [totalPromotions, setTotalPromotions] = useState(0);
  const realtimeDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchPromotions = useCallback(async (filter?: PromotionFilter, limit = 100, offset = 0) => {
    setIsLoading(true);
    try {
      const result = await promotionStorage.getAll(filter, limit, offset);
      setPromotions(result.promotions);
      setTotalPromotions(result.total);
    } catch (error) {
      console.error('Error loading promotions:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchActivePromotions = useCallback(async () => {
    try {
      const result = await promotionStorage.getActive();
      setActivePromotions(result);
    } catch (error) {
      console.error('Error loading active promotions:', error);
    }
  }, []);

  useEffect(() => {
    fetchPromotions();
    fetchActivePromotions();
  }, [fetchPromotions, fetchActivePromotions]);

  // Realtime subscription
  useEffect(() => {
    const unsubscribe = subscribeToTable({
      table: 'promotions',
      onEvent: () => {
        if (realtimeDebounceRef.current) clearTimeout(realtimeDebounceRef.current);
        realtimeDebounceRef.current = setTimeout(() => {
          fetchPromotions().catch(console.error);
          fetchActivePromotions().catch(console.error);
        }, 800);
      },
    });
    return unsubscribe;
  }, [fetchPromotions, fetchActivePromotions]);

  const getPromotionById = useCallback(async (id: string) => {
    return await promotionStorage.getById(id);
  }, []);

  const addPromotion = useCallback(async (
    promotion: Omit<Promotion, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<Promotion | null> => {
    const result = await promotionStorage.create(promotion);
    if (result) {
      setPromotions(prev => [result, ...prev]);
      setTotalPromotions(prev => prev + 1);
      if (result.isActive) {
        setActivePromotions(prev => [result, ...prev]);
      }
    }
    return result;
  }, []);

  const updatePromotion = useCallback(async (id: string, updates: Partial<Promotion>): Promise<boolean> => {
    const success = await promotionStorage.update(id, updates);
    if (success) {
      setPromotions(prev => prev.map(p => p.id === id ? { ...p, ...updates } : p));
      if (updates.isActive !== undefined || updates.type !== undefined || updates.discountValue !== undefined) {
        fetchActivePromotions().catch(console.error);
      }
    }
    return success;
  }, [fetchActivePromotions]);

  const deletePromotion = useCallback(async (id: string): Promise<boolean> => {
    const success = await promotionStorage.delete(id);
    if (success) {
      setPromotions(prev => prev.filter(p => p.id !== id));
      setActivePromotions(prev => prev.filter(p => p.id !== id));
      setTotalPromotions(prev => prev - 1);
    }
    return success;
  }, []);

  const toggleActive = useCallback(async (id: string, isActive: boolean): Promise<boolean> => {
    return await updatePromotion(id, { isActive });
  }, [updatePromotion]);

  const value = useMemo<PromotionContextType>(
    () => ({
      promotions,
      activePromotions,
      isLoading,
      totalPromotions,
      fetchPromotions,
      getPromotionById,
      addPromotion,
      updatePromotion,
      deletePromotion,
      toggleActive,
    }),
    [promotions, activePromotions, isLoading, totalPromotions, fetchPromotions, getPromotionById, addPromotion, updatePromotion, deletePromotion, toggleActive]
  );

  return <PromotionContext.Provider value={value}>{children}</PromotionContext.Provider>;
};

// eslint-disable-next-line react-refresh/only-export-components
export const usePromotions = (): PromotionContextType => {
  const context = useContext(PromotionContext);
  if (!context) {
    throw new Error('usePromotions must be used within a PromotionProvider');
  }
  return context;
};
