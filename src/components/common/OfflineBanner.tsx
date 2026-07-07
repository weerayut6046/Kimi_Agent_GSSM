/**
 * Offline Banner Component
 * 
 * Shows network status and sync state
 * - Displays when offline
 * - Shows pending operations count
 * - Allows manual sync trigger
 */

import React, { useEffect, useState } from 'react';
import { Wifi, WifiOff, RefreshCw, Database } from 'lucide-react';
import { useNetworkStatus } from '@/contexts/NetworkStatusContext';
import { pendingOperations, getStorageStats } from '@/lib/offlineStorage';
import { syncPendingOperations, subscribeToSync } from '@/lib/syncEngine';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

export const OfflineBanner: React.FC = () => {
  const { isOnline, networkStatus } = useNetworkStatus();
  const [pendingCount, setPendingCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [storageStats, setStorageStats] = useState({ pendingOperations: 0, cachedItems: 0, entitiesTracked: 0 });

  // Update pending count
  useEffect(() => {
    const updatePending = async () => {
      const count = await pendingOperations.count();
      setPendingCount(count);
      const stats = await getStorageStats();
      setStorageStats(stats);
    };

    updatePending();
    const interval = setInterval(updatePending, 5000);
    return () => clearInterval(interval);
  }, []);

  // Subscribe to sync state
  useEffect(() => {
    const unsubscribe = subscribeToSync((state) => {
      setIsSyncing(state.isSyncing);
    });
    return unsubscribe;
  }, []);

  // Auto-sync when coming back online
  useEffect(() => {
    if (isOnline && pendingCount > 0) {
      handleSync();
    }
  }, [isOnline]);

  const handleSync = async () => {
    if (isSyncing || !isOnline) return;

    setIsSyncing(true);
    try {
      const result = await syncPendingOperations();
      if (result.success) {
        toast.success(`Synced ${result.processed} items`);
      } else {
        toast.error(`Sync failed: ${result.failed} items`);
      }
      const count = await pendingOperations.count();
      setPendingCount(count);
    } catch (err) {
      toast.error('Sync failed');
    } finally {
      setIsSyncing(false);
    }
  };

  // Don't show if online and no pending
  if (isOnline && pendingCount === 0) return null;

  return (
    <div className={`sticky top-0 z-50 px-4 py-2 ${isOnline ? 'bg-amber-50 border-b border-amber-200' : 'bg-red-50 border-b border-red-200'}`}>
      <div className="flex items-center justify-between max-w-7xl mx-auto">
        <div className="flex items-center gap-2">
          {isOnline ? (
            <>
              <Wifi className="h-4 w-4 text-amber-600" />
              <span className="text-sm text-amber-800">
                Offline mode - {pendingCount} pending changes
              </span>
            </>
          ) : (
            <>
              <WifiOff className="h-4 w-4 text-red-600" />
              <span className="text-sm text-red-800 font-medium">
                You are offline
              </span>
              {pendingCount > 0 && (
                <Badge variant="secondary" className="text-xs">
                  {pendingCount} pending
                </Badge>
              )}
            </>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowDetails(!showDetails)}
            className="text-xs"
          >
            <Database className="h-3 w-3 mr-1" />
            Details
          </Button>
          
          {isOnline && pendingCount > 0 && (
            <Button
              size="sm"
              onClick={handleSync}
              disabled={isSyncing}
              className="text-xs"
            >
              <RefreshCw className={`h-3 w-3 mr-1 ${isSyncing ? 'animate-spin' : ''}`} />
              {isSyncing ? 'Syncing...' : 'Sync Now'}
            </Button>
          )}
        </div>
      </div>

      {showDetails && (
        <div className="mt-2 p-3 bg-white/50 rounded text-xs">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="font-medium">Storage</p>
              <p>Pending: {storageStats.pendingOperations}</p>
              <p>Cached: {storageStats.cachedItems}</p>
            </div>
            <div>
              <p className="font-medium">Network</p>
              <p>Status: {isOnline ? 'Online' : 'Offline'}</p>
              <p>Type: {networkStatus.connectionType}</p>
              {networkStatus.downlink && <p>Speed: {networkStatus.downlink} Mbps</p>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OfflineBanner;
