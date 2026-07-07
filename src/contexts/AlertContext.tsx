import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef, type ReactNode } from 'react';
import type { Alert } from '@/types';
import { alertStorage } from '@/data/alertStorage';
import { checkAllRules } from '@/lib/alertRules';
import { toast } from 'sonner';
import { subscribeToTable } from '@/lib/realtime';

interface AlertContextType {
  alerts: Alert[];
  unreadCount: number;
  isLoading: boolean;
  fetchAlerts: () => Promise<void>;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  resolveAlert: (id: string) => Promise<void>;
  createAlert: (alert: Omit<Alert, 'id' | 'createdAt'>) => Promise<void>;
  checkRules: () => Promise<void>;
}

const AlertContext = createContext<AlertContextType | undefined>(undefined);

export const AlertProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const realtimeDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchAlerts = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await alertStorage.getAll(undefined, 100);
      setAlerts(data);
    } catch (error) {
      console.error('Error loading alerts:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAlerts();
  }, [fetchAlerts]);

  // Realtime subscription
  useEffect(() => {
    const unsubscribe = subscribeToTable({
      table: 'alerts',
      onEvent: () => {
        if (realtimeDebounceRef.current) clearTimeout(realtimeDebounceRef.current);
        realtimeDebounceRef.current = setTimeout(() => {
          fetchAlerts().catch(console.error);
        }, 800);
      },
    });
    return unsubscribe;
  }, [fetchAlerts]);

  const markAsRead = useCallback(async (id: string) => {
    await alertStorage.markAsRead(id);
    setAlerts((prev) => prev.map((a) => (a.id === id ? { ...a, isRead: true } : a)));
  }, []);

  const markAllAsRead = useCallback(async () => {
    await alertStorage.markAllAsRead();
    setAlerts((prev) => prev.map((a) => ({ ...a, isRead: true })));
  }, []);

  const resolveAlert = useCallback(async (id: string) => {
    await alertStorage.resolve(id);
    setAlerts((prev) =>
      prev.map((a) =>
        a.id === id ? { ...a, isResolved: true, resolvedAt: new Date().toISOString() } : a
      )
    );
  }, []);

  const createAlert = useCallback(
    async (alert: Omit<Alert, 'id' | 'createdAt'>) => {
      await alertStorage.create(alert);
      await fetchAlerts();
    },
    [fetchAlerts]
  );

  const checkRules = useCallback(async () => {
    try {
      const newAlerts = await checkAllRules();
      let createdCount = 0;
      for (const alertData of newAlerts) {
        // Check if similar unresolved alert already exists
        const exists = alerts.some(
          (a) => a.type === alertData.type && a.relatedId === alertData.relatedId && !a.isResolved
        );
        if (!exists) {
          await alertStorage.create(alertData);
          createdCount++;
        }
      }
      if (createdCount > 0) {
        await fetchAlerts();
        toast.info(`พบ ${createdCount} การแจ้งเตือนใหม่`);
      }
    } catch (error) {
      console.error('Error checking alert rules:', error);
    }
  }, [alerts, fetchAlerts]);

  const unreadCount = useMemo(
    () => alerts.filter((a) => !a.isRead && !a.isResolved).length,
    [alerts]
  );

  const value = useMemo<AlertContextType>(
    () => ({
      alerts,
      unreadCount,
      isLoading,
      fetchAlerts,
      markAsRead,
      markAllAsRead,
      resolveAlert,
      createAlert,
      checkRules,
    }),
    [alerts, unreadCount, isLoading, fetchAlerts, markAsRead, markAllAsRead, resolveAlert, createAlert, checkRules]
  );

  return <AlertContext.Provider value={value}>{children}</AlertContext.Provider>;
};

// eslint-disable-next-line react-refresh/only-export-components
export const useAlerts = (): AlertContextType => {
  const context = useContext(AlertContext);
  if (context === undefined) {
    throw new Error('useAlerts must be used within an AlertProvider');
  }
  return context;
};
