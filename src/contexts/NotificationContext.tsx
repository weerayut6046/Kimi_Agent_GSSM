import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, type ReactNode, useRef } from 'react';
import type { Notification } from '@/types';
import { notificationStorage } from '@/data/storage';
import { useAuth } from '@/contexts/AuthContext';
import { subscribeToTable } from '@/lib/realtime';
import { toast } from 'sonner';

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  isLoading: boolean;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  addNotification: (notification: Omit<Notification, 'id' | 'createdAt'>) => Promise<void>;
  deleteNotification: (id: string) => Promise<void>;
  deleteAllRead: () => Promise<void>;
  deleteAll: () => Promise<void>;
  refreshNotifications: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const realtimeDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const refreshNotifications = useCallback(async () => {
    if (!user) {
      setNotifications([]);
      return;
    }
    setIsLoading(true);
    try {
      const data = await notificationStorage.getRecentByUser(user.id, 50);
      setNotifications(data.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
    } catch (error) {
      console.error('Error loading notifications:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    refreshNotifications();
  }, [refreshNotifications]);

  // Realtime subscription for notifications
  useEffect(() => {
    if (!user) return;
    const unsubscribe = subscribeToTable({
      table: 'notifications',
      filter: `userid=eq.${user.id}`,
      onEvent: (payload) => {
        if (realtimeDebounceRef.current) clearTimeout(realtimeDebounceRef.current);
        realtimeDebounceRef.current = setTimeout(() => {
          refreshNotifications();
          if (payload.eventType === 'INSERT') {
            const record = payload.new as Record<string, unknown>;
            const title = (record.title as string) || 'แจ้งเตือนใหม่';
            toast.info(title, { duration: 4000 });
          }
        }, 600);
      },
    });
    return unsubscribe;
  }, [user, refreshNotifications]);

  const markAsRead = useCallback(async (id: string) => {
    await notificationStorage.markAsRead(id);
    setNotifications(prev => prev.map(n => (n.id === id ? { ...n, read: true } : n)));
  }, []);

  const markAllAsRead = useCallback(async () => {
    if (!user) return;
    await notificationStorage.markAllAsRead(user.id);
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  }, [user]);

  const addNotification = useCallback(async (notification: Omit<Notification, 'id' | 'createdAt'>) => {
    const newNotification: Notification = {
      ...notification,
      id: `notif-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date().toISOString(),
    };
    await notificationStorage.create(newNotification);
    if (user && notification.userId === user.id) {
      setNotifications(prev => [newNotification, ...prev]);
    }
  }, [user]);

  const deleteNotification = useCallback(async (id: string) => {
    await notificationStorage.delete(id);
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  const deleteAllRead = useCallback(async () => {
    if (!user) return;
    await notificationStorage.deleteAllRead(user.id);
    setNotifications(prev => prev.filter(n => !n.read));
  }, [user]);

  const deleteAll = useCallback(async () => {
    if (!user) return;
    await notificationStorage.deleteAll(user.id);
    setNotifications([]);
  }, [user]);

  const unreadCount = useMemo(
    () => notifications.filter(n => !n.read).length,
    [notifications]
  );

  const value = useMemo<NotificationContextType>(
    () => ({
      notifications,
      unreadCount,
      isLoading,
      markAsRead,
      markAllAsRead,
      addNotification,
      deleteNotification,
      deleteAllRead,
      deleteAll,
      refreshNotifications,
    }),
    [notifications, unreadCount, isLoading, markAsRead, markAllAsRead, addNotification, deleteNotification, deleteAllRead, deleteAll, refreshNotifications]
  );

  return <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>;
};

// eslint-disable-next-line react-refresh/only-export-components
export const useNotifications = (): NotificationContextType => {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};
