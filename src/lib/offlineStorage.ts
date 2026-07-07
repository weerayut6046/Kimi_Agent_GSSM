/**
 * Offline Storage Service
 * 
 * Manages IndexedDB for local data caching and offline support
 * - Queue for pending operations (create/update/delete)
 * - Cache for reference data (employees, products, shifts)
 * - Sync status tracking
 */

import { openDB, type DBSchema, type IDBPDatabase } from 'idb';

// Offline operation types
export interface PendingOperation {
  id: string;
  type: 'create' | 'update' | 'delete';
  entity: string;
  data: unknown;
  timestamp: number;
  retryCount: number;
}

// Sync status for entities
export interface SyncStatus {
  entity: string;
  lastSyncedAt: string | null;
  pendingCount: number;
  isSyncing: boolean;
}

// Database schema
interface OfflineDB extends DBSchema {
  pendingOperations: {
    key: string;
    value: PendingOperation;
    indexes: { 'by-entity': string; 'by-timestamp': number };
  };
  cache: {
    key: string;
    value: {
      key: string;
      data: unknown;
      cachedAt: string;
      expiresAt: string;
    };
  };
  syncStatus: {
    key: string;
    value: SyncStatus;
  };
}

const DB_NAME = 'gas-station-offline';
const DB_VERSION = 1;

let dbPromise: Promise<IDBPDatabase<OfflineDB>> | null = null;

// Cache expiration times (in hours)
const CACHE_EXPIRY = {
  employees: 24,
  products: 1,
  shifts: 24,
  schedules: 1,
  fuelPrices: 0.5, // 30 minutes
  posProducts: 1,
};

/**
 * Initialize IndexedDB
 */
export async function initOfflineDB(): Promise<IDBPDatabase<OfflineDB>> {
  if (dbPromise) return dbPromise;

  dbPromise = openDB<OfflineDB>(DB_NAME, DB_VERSION, {
    upgrade(db) {
      // Pending operations store
      if (!db.objectStoreNames.contains('pendingOperations')) {
        const pendingStore = db.createObjectStore('pendingOperations', {
          keyPath: 'id',
        });
        pendingStore.createIndex('by-entity', 'entity');
        pendingStore.createIndex('by-timestamp', 'timestamp');
      }

      // Cache store
      if (!db.objectStoreNames.contains('cache')) {
        db.createObjectStore('cache', { keyPath: 'key' });
      }

      // Sync status store
      if (!db.objectStoreNames.contains('syncStatus')) {
        db.createObjectStore('syncStatus', { keyPath: 'entity' });
      }
    },
  });

  return dbPromise;
}

/**
 * Pending Operations Management
 */
export const pendingOperations = {
  async add(operation: Omit<PendingOperation, 'id' | 'timestamp' | 'retryCount'>): Promise<void> {
    const db = await initOfflineDB();
    const pendingOp: PendingOperation = {
      ...operation,
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      retryCount: 0,
    };
    await db.put('pendingOperations', pendingOp);
    await updateSyncStatus(operation.entity, { pendingCount: await this.countByEntity(operation.entity) });
  },

  async getAll(): Promise<PendingOperation[]> {
    const db = await initOfflineDB();
    return db.getAll('pendingOperations');
  },

  async getByEntity(entity: string): Promise<PendingOperation[]> {
    const db = await initOfflineDB();
    return db.getAllFromIndex('pendingOperations', 'by-entity', entity);
  },

  async remove(id: string): Promise<void> {
    const db = await initOfflineDB();
    const op = await db.get('pendingOperations', id);
    await db.delete('pendingOperations', id);
    if (op) {
      const remaining = await this.countByEntity(op.entity);
      await updateSyncStatus(op.entity, { pendingCount: remaining });
    }
  },

  async count(): Promise<number> {
    const db = await initOfflineDB();
    return db.count('pendingOperations');
  },

  async countByEntity(entity: string): Promise<number> {
    const ops = await this.getByEntity(entity);
    return ops.length;
  },

  async incrementRetry(id: string): Promise<void> {
    const db = await initOfflineDB();
    const op = await db.get('pendingOperations', id);
    if (op) {
      op.retryCount++;
      await db.put('pendingOperations', op);
    }
  },

  async clear(): Promise<void> {
    const db = await initOfflineDB();
    await db.clear('pendingOperations');
    const allStatus = await syncStatus.getAll();
    for (const status of allStatus) {
      await updateSyncStatus(status.entity, { pendingCount: 0 });
    }
  },
};

/**
 * Cache Management
 */
export const cache = {
  async set<T>(key: string, data: T, expiryHours: number = 24): Promise<void> {
    const db = await initOfflineDB();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + expiryHours * 60 * 60 * 1000);

    await db.put('cache', {
      key,
      data,
      cachedAt: now.toISOString(),
      expiresAt: expiresAt.toISOString(),
    });
  },

  async get<T>(key: string): Promise<T | null> {
    const db = await initOfflineDB();
    const entry = await db.get('cache', key);

    if (!entry) return null;

    // Check expiration
    const now = new Date();
    const expiresAt = new Date(entry.expiresAt);
    if (now > expiresAt) {
      await db.delete('cache', key);
      return null;
    }

    return entry.data as T;
  },

  async remove(key: string): Promise<void> {
    const db = await initOfflineDB();
    await db.delete('cache', key);
  },

  async clear(): Promise<void> {
    const db = await initOfflineDB();
    await db.clear('cache');
  },

  // Entity-specific cache helpers
  async setEntity<T>(entity: string, id: string, data: T): Promise<void> {
    const key = `${entity}:${id}`;
    const expiry = CACHE_EXPIRY[entity as keyof typeof CACHE_EXPIRY] || 24;
    await this.set(key, data, expiry);
  },

  async getEntity<T>(entity: string, id: string): Promise<T | null> {
    return this.get<T>(`${entity}:${id}`);
  },

  async setEntityList<T>(entity: string, data: T[]): Promise<void> {
    const key = `${entity}:list`;
    const expiry = CACHE_EXPIRY[entity as keyof typeof CACHE_EXPIRY] || 24;
    await this.set(key, data, expiry);
  },

  async getEntityList<T>(entity: string): Promise<T[] | null> {
    return this.get<T[]>(`${entity}:list`);
  },

  async invalidateEntity(entity: string): Promise<void> {
    const db = await initOfflineDB();
    const allKeys = await db.getAllKeys('cache');
    for (const key of allKeys) {
      if (key.startsWith(`${entity}:`)) {
        await db.delete('cache', key);
      }
    }
  },
};

/**
 * Sync Status Management
 */
export const syncStatus = {
  async get(entity: string): Promise<SyncStatus> {
    const db = await initOfflineDB();
    const status = await db.get('syncStatus', entity);
    return status || {
      entity,
      lastSyncedAt: null,
      pendingCount: 0,
      isSyncing: false,
    };
  },

  async getAll(): Promise<SyncStatus[]> {
    const db = await initOfflineDB();
    return db.getAll('syncStatus');
  },

  async update(entity: string, updates: Partial<SyncStatus>): Promise<void> {
    const db = await initOfflineDB();
    const current = await this.get(entity);
    await db.put('syncStatus', { ...current, ...updates, entity });
  },

  async setSyncing(entity: string, isSyncing: boolean): Promise<void> {
    await this.update(entity, { isSyncing });
  },

  async setLastSynced(entity: string, timestamp: string = new Date().toISOString()): Promise<void> {
    await this.update(entity, { lastSyncedAt: timestamp });
  },

  async getPendingSummary(): Promise<{ total: number; byEntity: Record<string, number> }> {
    const allStatus = await this.getAll();
    const byEntity: Record<string, number> = {};
    let total = 0;

    for (const status of allStatus) {
      if (status.pendingCount > 0) {
        byEntity[status.entity] = status.pendingCount;
        total += status.pendingCount;
      }
    }

    return { total, byEntity };
  },
};

async function updateSyncStatus(entity: string, updates: Partial<SyncStatus>): Promise<void> {
  await syncStatus.update(entity, updates);
}

/**
 * Check if browser supports required APIs
 */
export function isOfflineSupported(): boolean {
  return (
    'indexedDB' in window &&
    'serviceWorker' in navigator &&
    'sync' in ('serviceWorker' in navigator ? (navigator as Navigator & { serviceWorker: ServiceWorkerContainer }).serviceWorker : {})
  );
}

/**
 * Get storage usage statistics
 */
export async function getStorageStats(): Promise<{
  pendingOperations: number;
  cachedItems: number;
  entitiesTracked: number;
}> {
  const db = await initOfflineDB();
  return {
    pendingOperations: await db.count('pendingOperations'),
    cachedItems: await db.count('cache'),
    entitiesTracked: await db.count('syncStatus'),
  };
}
