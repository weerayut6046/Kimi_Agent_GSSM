import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef, type ReactNode } from 'react';
import type { AuditLog, AuditLogFilter, AuditLogStats } from '@/types/audit';
import { auditStorage } from '@/data/auditStorage';
import { useAuth } from '@/contexts/AuthContext';
import { subscribeToTable } from '@/lib/realtime';

interface AuditContextType {
  logs: AuditLog[];
  isLoading: boolean;
  totalLogs: number;
  stats: AuditLogStats | null;
  fetchLogs: (filter?: AuditLogFilter, limit?: number, offset?: number) => Promise<void>;
  fetchStats: (startDate?: string, endDate?: string) => Promise<void>;
  logAudit: (params: {
    tableName: string;
    recordId: string;
    action: AuditLog['action'];
    oldValue?: Record<string, unknown> | null;
    newValue?: Record<string, unknown> | null;
    performedByName?: string | null;
  }) => Promise<boolean>;
  exportToCsv: (filter?: AuditLogFilter) => Promise<string>;
}

const AuditContext = createContext<AuditContextType | undefined>(undefined);

export const AuditProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { user, profile } = useAuth();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [totalLogs, setTotalLogs] = useState(0);
  const [stats, setStats] = useState<AuditLogStats | null>(null);
  const realtimeDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchLogs = useCallback(async (filter?: AuditLogFilter, limit = 100, offset = 0) => {
    setIsLoading(true);
    try {
      const result = await auditStorage.getAll(filter, limit, offset);
      setLogs(result.logs);
      setTotalLogs(result.total);
    } catch (error) {
      console.error('Error fetching audit logs:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchStats = useCallback(async (startDate?: string, endDate?: string) => {
    try {
      const result = await auditStorage.getStats(startDate, endDate);
      setStats(result);
    } catch (error) {
      console.error('Error fetching audit stats:', error);
    }
  }, []);

  const logAudit = useCallback(
    async (params: {
      tableName: string;
      recordId: string;
      action: AuditLog['action'];
      oldValue?: Record<string, unknown> | null;
      newValue?: Record<string, unknown> | null;
      performedByName?: string | null;
    }): Promise<boolean> => {
      try {
        return await auditStorage.create({
          tableName: params.tableName,
          recordId: params.recordId,
          action: params.action,
          oldValue: params.oldValue ?? null,
          newValue: params.newValue ?? null,
          performedBy: user?.id || 'system',
          performedByEmail: user?.email || null,
          performedByName: params.performedByName || profile?.fullName || null,
          ipAddress: null,
        });
      } catch (error) {
        console.error('Error logging audit:', error);
        return false;
      }
    },
    [user, profile]
  );

  const exportToCsv = useCallback(async (filter?: AuditLogFilter): Promise<string> => {
    return await auditStorage.exportToCsv(filter);
  }, []);

  // Realtime subscription
  useEffect(() => {
    const unsubscribe = subscribeToTable({
      table: 'audit_logs',
      onEvent: () => {
        if (realtimeDebounceRef.current) clearTimeout(realtimeDebounceRef.current);
        realtimeDebounceRef.current = setTimeout(() => {
          fetchLogs().catch(console.error);
        }, 800);
      },
    });
    return unsubscribe;
  }, [fetchLogs]);

  const value = useMemo(
    () => ({
      logs,
      isLoading,
      totalLogs,
      stats,
      fetchLogs,
      fetchStats,
      logAudit,
      exportToCsv,
    }),
    [logs, isLoading, totalLogs, stats, fetchLogs, fetchStats, logAudit, exportToCsv]
  );

  return <AuditContext.Provider value={value}>{children}</AuditContext.Provider>;
};

export const useAudit = (): AuditContextType => {
  const context = useContext(AuditContext);
  if (!context) {
    throw new Error('useAudit must be used within an AuditProvider');
  }
  return context;
};
