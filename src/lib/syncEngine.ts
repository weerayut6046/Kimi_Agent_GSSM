/**
 * Sync Engine
 * 
 * Manages synchronization between local IndexedDB and Supabase
 * - Processes pending operations queue
 * - Handles conflicts
 * - Provides background sync
 */

import { pendingOperations, syncStatus, cache, type PendingOperation } from './offlineStorage';
import { toast } from 'sonner';

// Entity-specific sync handlers
export interface SyncHandler<T = unknown> {
  entity: string;
  create: (data: T) => Promise<T>;
  update: (id: string, data: Partial<T>) => Promise<T>;
  delete: (id: string) => Promise<void>;
  fetchAll: () => Promise<T[]>;
}

// Sync result
interface SyncResult {
  success: boolean;
  processed: number;
  failed: number;
  errors: Array<{ operation: PendingOperation; error: Error }>;
}

// Sync engine state
interface SyncEngineState {
  isSyncing: boolean;
  lastSyncAt: Date | null;
  syncProgress: {
    total: number;
    processed: number;
    currentEntity: string | null;
  };
}

const syncHandlers: Map<string, SyncHandler> = new Map();
let syncState: SyncEngineState = {
  isSyncing: false,
  lastSyncAt: null,
  syncProgress: { total: 0, processed: 0, currentEntity: null },
};
const syncListeners: Set<(state: SyncEngineState) => void> = new Set();

/**
 * Register a sync handler for an entity
 */
export function registerSyncHandler<T>(handler: SyncHandler<T>): void {
  syncHandlers.set(handler.entity, handler as SyncHandler);
}

/**
 * Unregister a sync handler
 */
export function unregisterSyncHandler(entity: string): void {
  syncHandlers.delete(entity);
}

/**
 * Get current sync state
 */
export function getSyncState(): SyncEngineState {
  return { ...syncState };
}

/**
 * Subscribe to sync state changes
 */
export function subscribeToSync(callback: (state: SyncEngineState) => void): () => void {
  syncListeners.add(callback);
  return () => syncListeners.delete(callback);
}

/**
 * Update sync state and notify listeners
 */
function updateSyncState(updates: Partial<SyncEngineState>): void {
  syncState = { ...syncState, ...updates };
  syncListeners.forEach(listener => listener(syncState));
}

/**
 * Process a single pending operation
 */
async function processOperation(operation: PendingOperation): Promise<void> {
  const handler = syncHandlers.get(operation.entity);
  
  if (!handler) {
    throw new Error(`No sync handler registered for entity: ${operation.entity}`);
  }

  switch (operation.type) {
    case 'create':
      await handler.create(operation.data);
      break;
    case 'update': {
      const { id, ...updateData } = operation.data as { id: string } & Record<string, unknown>;
      await handler.update(id, updateData);
      break;
    }
    case 'delete': {
      const { id } = operation.data as { id: string };
      await handler.delete(id);
      break;
    }
    default:
      throw new Error(`Unknown operation type: ${operation.type}`);
  }
}

/**
 * Sync all pending operations
 */
export async function syncPendingOperations(): Promise<SyncResult> {
  if (syncState.isSyncing) {
    return { success: false, processed: 0, failed: 0, errors: [] };
  }

  updateSyncState({ isSyncing: true });
  
  const allOperations = await pendingOperations.getAll();
  const sortedOps = allOperations.sort((a, b) => a.timestamp - b.timestamp);
  
  updateSyncState({
    syncProgress: {
      total: sortedOps.length,
      processed: 0,
      currentEntity: null,
    },
  });

  const result: SyncResult = {
    success: true,
    processed: 0,
    failed: 0,
    errors: [],
  };

  for (const operation of sortedOps) {
    updateSyncState({ syncProgress: { ...syncState.syncProgress, currentEntity: operation.entity } });

    try {
      await processOperation(operation);
      await pendingOperations.remove(operation.id);
      result.processed++;
    } catch (error) {
      // If failed more than 3 times, keep it but notify
      if (operation.retryCount >= 3) {
        result.failed++;
        result.errors.push({ operation, error: error as Error });
        console.error(`Sync failed for ${operation.entity}:`, error);
      } else {
        await pendingOperations.incrementRetry(operation.id);
      }
    }

    updateSyncState({
      syncProgress: { ...syncState.syncProgress, processed: result.processed },
    });
  }

  result.success = result.failed === 0;
  
  updateSyncState({
    isSyncing: false,
    lastSyncAt: new Date(),
    syncProgress: { total: 0, processed: 0, currentEntity: null },
  });

  // Update sync status for all entities
  for (const [entity] of syncHandlers) {
    await syncStatus.setLastSynced(entity);
  }

  return result;
}

/**
 * Sync a specific entity's pending operations
 */
export async function syncEntity(entity: string): Promise<SyncResult> {
  const handler = syncHandlers.get(entity);
  if (!handler) {
    throw new Error(`No sync handler registered for entity: ${entity}`);
  }

  await syncStatus.setSyncing(entity, true);
  
  const operations = await pendingOperations.getByEntity(entity);
  const sortedOps = operations.sort((a, b) => a.timestamp - b.timestamp);

  const result: SyncResult = {
    success: true,
    processed: 0,
    failed: 0,
    errors: [],
  };

  for (const operation of sortedOps) {
    try {
      await processOperation(operation);
      await pendingOperations.remove(operation.id);
      result.processed++;
    } catch (error) {
      await pendingOperations.incrementRetry(operation.id);
      result.failed++;
      result.errors.push({ operation, error: error as Error });
    }
  }

  result.success = result.failed === 0;
  await syncStatus.setLastSynced(entity);
  await syncStatus.setSyncing(entity, false);

  return result;
}

/**
 * Pull latest data from server and update cache
 */
export async function pullEntityData<T>(entity: string): Promise<T[]> {
  const handler = syncHandlers.get(entity) as SyncHandler<T> | undefined;
  if (!handler) {
    throw new Error(`No sync handler registered for entity: ${entity}`);
  }

  await syncStatus.setSyncing(entity, true);

  try {
    const data = await handler.fetchAll();
    await cache.setEntityList(entity, data);
    await syncStatus.setLastSynced(entity);
    return data as T[];
  } catch (error) {
    console.error(`Failed to pull ${entity}:`, error);
    throw error;
  } finally {
    await syncStatus.setSyncing(entity, false);
  }
}

/**
 * Full sync: push pending + pull latest
 */
export async function fullSync(): Promise<Record<string, SyncResult>> {
  const results: Record<string, SyncResult> = {};

  // First push all pending
  const pushResult = await syncPendingOperations();
  results['_pending'] = pushResult;

  // Then pull each entity
  for (const [entity] of syncHandlers) {
    try {
      await pullEntityData(entity);
      results[entity] = { success: true, processed: 0, failed: 0, errors: [] };
    } catch (error) {
      results[entity] = {
        success: false,
        processed: 0,
        failed: 1,
        errors: [{ operation: null as unknown as PendingOperation, error: error as Error }],
      };
    }
  }

  return results;
}

/**
 * Check if there are pending operations
 */
export async function hasPendingOperations(): Promise<boolean> {
  const count = await pendingOperations.count();
  return count > 0;
}

/**
 * Get pending operations summary
 */
export async function getPendingSummary(): Promise<{
  total: number;
  byEntity: Record<string, number>;
}> {
  return syncStatus.getPendingSummary();
}

/**
 * Clear all pending operations (use with caution!)
 */
export async function clearPendingOperations(): Promise<void> {
  await pendingOperations.clear();
}

/**
 * Setup automatic sync when coming online
 */
export function setupAutoSync(): () => void {
  const handleOnline = async () => {
    const hasPending = await hasPendingOperations();
    if (hasPending) {
      toast.info('กำลังซิงค์ข้อมูล...', {
        description: 'มีข้อมูลที่รอการซิงค์',
      });

      const result = await syncPendingOperations();

      if (result.success) {
        toast.success('ซิงค์ข้อมูลสำเร็จ', {
          description: `ซิงค์ ${result.processed} รายการ`,
        });
      } else {
        toast.error('ซิงค์ข้อมูลไม่สำเร็จ', {
          description: `สำเร็จ ${result.processed} รายการ, ล้มเหลว ${result.failed} รายการ`,
        });
      }
    }
  };

  window.addEventListener('online', handleOnline);
  
  // Also try sync on visibility change (app becomes active)
  const handleVisibilityChange = () => {
    if (document.visibilityState === 'visible' && navigator.onLine) {
      handleOnline();
    }
  };
  document.addEventListener('visibilitychange', handleVisibilityChange);

  return () => {
    window.removeEventListener('online', handleOnline);
    document.removeEventListener('visibilitychange', handleVisibilityChange);
  };
}

/**
 * Retry failed operations
 */
export async function retryFailedOperations(): Promise<SyncResult> {
  const allOps = await pendingOperations.getAll();
  const failedOps = allOps.filter(op => op.retryCount > 0);

  const result: SyncResult = {
    success: true,
    processed: 0,
    failed: 0,
    errors: [],
  };

  for (const operation of failedOps) {
    try {
      await processOperation(operation);
      await pendingOperations.remove(operation.id);
      result.processed++;
    } catch (error) {
      result.failed++;
      result.errors.push({ operation, error: error as Error });
    }
  }

  result.success = result.failed === 0;
  return result;
}
