/**
 * useOfflineData Hook
 * 
 * Provides offline-first data operations for any entity
 */

import { useState, useCallback, useEffect } from 'react';
import { useNetworkStatus } from '@/contexts/NetworkStatusContext';
import { cache, pendingOperations, type SyncStatus, syncStatus as syncStatusStore } from '@/lib/offlineStorage';
import { syncEntity, registerSyncHandler, type SyncHandler } from '@/lib/syncEngine';
import { toast } from 'sonner';

interface UseOfflineDataOptions<T> {
  entity: string;
  fetchAll: () => Promise<T[]>;
  create: (data: Omit<T, 'id' | 'createdAt' | 'updatedAt'>) => Promise<T>;
  update: (id: string, data: Partial<T>) => Promise<T>;
  remove: (id: string) => Promise<void>;
  autoSync?: boolean;
}

interface UseOfflineDataReturn<T> {
  data: T[];
  isLoading: boolean;
  error: Error | null;
  syncStatus: SyncStatus | null;
  isOffline: boolean;
  hasPendingChanges: boolean;
  refresh: () => Promise<void>;
  create: (data: Omit<T, 'id' | 'createdAt' | 'updatedAt'>) => Promise<T>;
  update: (id: string, data: Partial<T>) => Promise<T>;
  remove: (id: string) => Promise<void>;
  sync: () => Promise<void>;
}

export function useOfflineData<T extends { id: string }>(
  options: UseOfflineDataOptions<T>
): UseOfflineDataReturn<T> {
  const { isOnline } = useNetworkStatus();
  const [data, setData] = useState<T[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [syncStatus, setSyncStatus] = useState<SyncStatus | null>(null);
  const [hasPendingChanges, setHasPendingChanges] = useState(false);

  const { entity, fetchAll, create, update, remove } = options;

  useEffect(() => {
    const handler: SyncHandler<T> = {
      entity,
      create: async (data) => create(data as Omit<T, 'id' | 'createdAt' | 'updatedAt'>),
      update: async (id, data) => update(id, data),
      delete: async (id) => remove(id),
      fetchAll: async () => fetchAll(),
    };
    registerSyncHandler(handler);
  }, [entity, fetchAll, create, update, remove]);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const cached = await cache.getEntityList<T>(entity);
      if (cached) setData(cached);
      if (isOnline) {
        try {
          const fresh = await fetchAll();
          setData(fresh);
          await cache.setEntityList(entity, fresh);
        } catch (err) {
          if (!cached) throw err;
        }
      }
    } catch (err) {
      setError(err as Error);
      toast.error(`Failed to load ${entity}`);
    } finally {
      setIsLoading(false);
    }
  }, [entity, fetchAll, isOnline]);

  const loadSyncStatus = useCallback(async () => {
    const status = await syncStatusStore.get(entity);
    setSyncStatus(status);
    setHasPendingChanges(status.pendingCount > 0);
  }, [entity]);

  useEffect(() => {
    loadData();
    loadSyncStatus();
  }, [loadData, loadSyncStatus]);

  const createItem = useCallback(async (itemData: Omit<T, 'id' | 'createdAt' | 'updatedAt'>): Promise<T> => {
    if (isOnline) {
      try {
        const result = await create(itemData);
        setData(prev => [...prev, result]);
        await cache.setEntityList(entity, [...data, result]);
        return result;
      } catch (err) {
        console.warn(`Create failed, queuing`, err);
      }
    }
    const tempId = `temp-${Date.now()}`;
    const tempItem = { ...itemData, id: tempId, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() } as unknown as T;
    await pendingOperations.add({ type: 'create', entity, data: tempItem });
    setData(prev => [...prev, tempItem]);
    await cache.setEntityList(entity, [...data, tempItem]);
    await loadSyncStatus();
    toast.info('Saved locally, will sync when online');
    return tempItem;
  }, [isOnline, entity, create, data, loadSyncStatus]);

  const updateItem = useCallback(async (id: string, updates: Partial<T>): Promise<T> => {
    const existingItem = data.find(item => item.id === id);
    if (!existingItem) throw new Error(`Item ${id} not found`);
    if (isOnline && !id.startsWith('temp-')) {
      try {
        const result = await update(id, updates);
        setData(prev => prev.map(item => item.id === id ? result : item));
        await cache.setEntityList(entity, data.map(item => item.id === id ? result : item));
        return result;
      } catch (err) {
        console.warn(`Update failed, queuing`, err);
      }
    }
    await pendingOperations.add({ type: 'update', entity, data: { id, ...updates } });
    const updatedItem = { ...existingItem, ...updates, updatedAt: new Date().toISOString() } as T;
    setData(prev => prev.map(item => item.id === id ? updatedItem : item));
    await cache.setEntityList(entity, data.map(item => item.id === id ? updatedItem : item));
    await loadSyncStatus();
    toast.info('Updated locally, will sync when online');
    return updatedItem;
  }, [isOnline, entity, update, data, loadSyncStatus]);

  const removeItem = useCallback(async (id: string): Promise<void> => {
    if (isOnline && !id.startsWith('temp-')) {
      try {
        await remove(id);
        setData(prev => prev.filter(item => item.id !== id));
        await cache.setEntityList(entity, data.filter(item => item.id !== id));
        return;
      } catch (err) {
        console.warn(`Delete failed, queuing`, err);
      }
    }
    await pendingOperations.add({ type: 'delete', entity, data: { id } });
    setData(prev => prev.filter(item => item.id !== id));
    await cache.setEntityList(entity, data.filter(item => item.id !== id));
    await loadSyncStatus();
    toast.info('Deleted locally, will sync when online');
  }, [isOnline, entity, remove, data, loadSyncStatus]);

  const sync = useCallback(async () => {
    if (!isOnline) {
      toast.error('Cannot sync while offline');
      return;
    }
    try {
      await syncEntity(entity);
      await loadData();
      await loadSyncStatus();
      toast.success('Sync completed');
    } catch (err) {
      toast.error('Sync failed');
      throw err;
    }
  }, [isOnline, entity, loadData, loadSyncStatus]);

  return {
    data,
    isLoading,
    error,
    syncStatus,
    isOffline: !isOnline,
    hasPendingChanges,
    refresh: loadData,
    create: createItem,
    update: updateItem,
    remove: removeItem,
    sync,
  };
}
