/**
 * Network Status Context
 * 
 * Monitors online/offline status and manages offline mode
 * - Detects connection state changes
 * - Provides retry mechanisms
 * - Triggers sync when coming back online
 */

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';

interface NetworkStatus {
  isOnline: boolean;
  isChecking: boolean;
  lastCheckedAt: Date | null;
  connectionType: string;
  downlink: number | null;
}

interface NetworkStatusContextType {
  isOnline: boolean;
  isOfflineMode: boolean;
  networkStatus: NetworkStatus;
  checkConnection: () => Promise<boolean>;
  setManualOffline: (offline: boolean) => void;
}

const NetworkStatusContext = createContext<NetworkStatusContextType | null>(null);

const PING_INTERVAL = 30000; // Check every 30 seconds
const PING_TIMEOUT = 5000; // 5 second timeout
const PING_URL = '/api/health'; // Will be handled by service worker

export const NetworkStatusProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);
  const [isOfflineMode, setIsOfflineMode] = useState<boolean>(false);
  const [isChecking, setIsChecking] = useState<boolean>(false);
  const [lastCheckedAt, setLastCheckedAt] = useState<Date | null>(null);
  const [connectionType, setConnectionType] = useState<string>('unknown');
  const [downlink, setDownlink] = useState<number | null>(null);
  
  const checkTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Get connection info from Network Information API
  useEffect(() => {
    const connection = (navigator as Navigator & { connection?: NetworkInformation }).connection;
    if (connection) {
      setConnectionType(connection.effectiveType || 'unknown');
      setDownlink(connection.downlink || null);

      const handleConnectionChange = () => {
        setConnectionType(connection.effectiveType || 'unknown');
        setDownlink(connection.downlink || null);
      };

      connection.addEventListener('change', handleConnectionChange);
      return () => connection.removeEventListener('change', handleConnectionChange);
    }
  }, []);

  // Check actual connectivity by pinging server
  const checkConnection = useCallback(async (): Promise<boolean> => {
    // Use ref to avoid dependency issues
    if (isChecking) return isOnline;

    setIsChecking(true);
    
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), PING_TIMEOUT);

      const response = await fetch(PING_URL, {
        method: 'HEAD',
        signal: controller.signal,
        cache: 'no-store',
      });

      clearTimeout(timeoutId);
      const newStatus = response.ok;
      
      setIsOnline(current => {
        if (newStatus !== current) {
          return newStatus;
        }
        return current;
      });
      
      setLastCheckedAt(new Date());
      return newStatus;
    } catch {
      setIsOnline(current => {
        if (current) return false;
        return current;
      });
      setLastCheckedAt(new Date());
      return false;
    } finally {
      setIsChecking(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Handle browser online/offline events
  useEffect(() => {
    let isMounted = true;
    
    const handleOnline = () => {
      // Verify with actual ping before marking as online
      if (isMounted) checkConnection();
    };

    const handleOffline = () => {
      if (isMounted) setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Initial check - delay to avoid blocking render
    const initialCheck = setTimeout(() => {
      if (isMounted) checkConnection();
    }, 1000);

    // Periodic checks
    intervalRef.current = setInterval(() => {
      if (isMounted) checkConnection();
    }, PING_INTERVAL);

    return () => {
      isMounted = false;
      clearTimeout(initialCheck);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      if (checkTimeoutRef.current) {
        clearTimeout(checkTimeoutRef.current);
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setManualOffline = useCallback((offline: boolean) => {
    setIsOfflineMode(offline);
  }, []);

  const contextValue: NetworkStatusContextType = {
    isOnline: isOnline && !isOfflineMode,
    isOfflineMode,
    networkStatus: {
      isOnline: isOnline && !isOfflineMode,
      isChecking,
      lastCheckedAt,
      connectionType,
      downlink,
    },
    checkConnection,
    setManualOffline,
  };

  return (
    <NetworkStatusContext.Provider value={contextValue}>
      {children}
    </NetworkStatusContext.Provider>
  );
};

export const useNetworkStatus = (): NetworkStatusContextType => {
  const context = useContext(NetworkStatusContext);
  if (!context) {
    throw new Error('useNetworkStatus must be used within NetworkStatusProvider');
  }
  return context;
};

export default NetworkStatusContext;

// Type for Network Information API
declare global {
  interface NetworkInformation extends EventTarget {
    effectiveType: string;
    downlink: number;
    rtt: number;
    saveData: boolean;
  }

  interface Navigator {
    connection?: NetworkInformation;
  }
}
