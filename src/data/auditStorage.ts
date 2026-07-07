import { supabase } from '@/lib/supabase';
import type { AuditLog, AuditLogFilter, AuditLogStats } from '@/types/audit';

const mapAuditLogFromDb = (row: Record<string, unknown>): AuditLog => ({
  id: row.id as string,
  tableName: (row.table_name || row.tableName) as string,
  recordId: (row.record_id || row.recordId) as string,
  action: (row.action || 'update') as AuditLog['action'],
  oldValue: (row.old_value || row.oldValue) as Record<string, unknown> | null,
  newValue: (row.new_value || row.newValue) as Record<string, unknown> | null,
  performedBy: (row.performed_by || row.performedBy) as string,
  performedByEmail: (row.performed_by_email || row.performedByEmail) as string | null,
  performedByName: (row.performed_by_name || row.performedByName) as string | null,
  performedAt: (row.performed_at || row.performedAt) as string,
  ipAddress: (row.ip_address || row.ipAddress) as string | null,
});

export const auditStorage = {
  // Get all audit logs with pagination and filtering
  getAll: async (filter?: AuditLogFilter, limit: number = 100, offset: number = 0): Promise<{ logs: AuditLog[]; total: number }> => {
    let query = supabase.from('audit_logs').select('*', { count: 'exact' });

    if (filter?.tableName) {
      query = query.eq('table_name', filter.tableName);
    }
    if (filter?.action) {
      query = query.eq('action', filter.action);
    }
    if (filter?.performedBy) {
      query = query.eq('performed_by', filter.performedBy);
    }
    if (filter?.startDate) {
      query = query.gte('performed_at', filter.startDate + 'T00:00:00');
    }
    if (filter?.endDate) {
      query = query.lte('performed_at', filter.endDate + 'T23:59:59');
    }
    if (filter?.searchTerm) {
      const term = filter.searchTerm.trim();
      query = query.or(`record_id.ilike.%${term}%,performed_by.ilike.%${term}%,performed_by_email.ilike.%${term}%`);
    }

    const { data, error, count } = await query
      .order('performed_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('Error fetching audit logs:', error);
      return { logs: [], total: 0 };
    }

    return {
      logs: (data || []).map((row: Record<string, unknown>) => mapAuditLogFromDb(row)),
      total: count || 0,
    };
  },

  // Get audit logs for a specific record
  getByRecord: async (tableName: string, recordId: string): Promise<AuditLog[]> => {
    const { data, error } = await supabase
      .from('audit_logs')
      .select('*')
      .eq('table_name', tableName)
      .eq('record_id', recordId)
      .order('performed_at', { ascending: false });

    if (error) {
      console.error('Error fetching audit logs by record:', error);
      return [];
    }

    return (data || []).map((row: Record<string, unknown>) => mapAuditLogFromDb(row));
  },

  // Create audit log entry
  create: async (log: Omit<AuditLog, 'id' | 'performedAt'>): Promise<boolean> => {
    const { error } = await supabase.from('audit_logs').insert({
      table_name: log.tableName,
      record_id: log.recordId,
      action: log.action,
      old_value: log.oldValue,
      new_value: log.newValue,
      performed_by: log.performedBy,
      performed_by_email: log.performedByEmail,
      performed_by_name: log.performedByName,
      ip_address: log.ipAddress,
    });

    if (error) {
      console.error('Error creating audit log:', error);
      return false;
    }
    return true;
  },

  // Get statistics
  getStats: async (startDate?: string, endDate?: string): Promise<AuditLogStats> => {
    let query = supabase.from('audit_logs').select('*');

    if (startDate) {
      query = query.gte('performed_at', startDate + 'T00:00:00');
    }
    if (endDate) {
      query = query.lte('performed_at', endDate + 'T23:59:59');
    }

    const { data, error } = await query;

    if (error || !data) {
      return { totalLogs: 0, createCount: 0, updateCount: 0, deleteCount: 0, topTables: [] };
    }

    const logs = data.map((row: Record<string, unknown>) => mapAuditLogFromDb(row));

    const createCount = logs.filter((l) => l.action === 'create').length;
    const updateCount = logs.filter((l) => l.action === 'update').length;
    const deleteCount = logs.filter((l) => l.action === 'delete').length;

    // Count by table
    const tableCounts: Record<string, number> = {};
    logs.forEach((l) => {
      tableCounts[l.tableName] = (tableCounts[l.tableName] || 0) + 1;
    });

    const topTables = Object.entries(tableCounts)
      .map(([tableName, count]) => ({ tableName, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    return {
      totalLogs: logs.length,
      createCount,
      updateCount,
      deleteCount,
      topTables,
    };
  },

  // Export to CSV format
  exportToCsv: async (filter?: AuditLogFilter): Promise<string> => {
    const { logs } = await auditStorage.getAll(filter, 10000, 0);

    const headers = ['วันที่', 'ตาราง', 'รายการ', 'การกระทำ', 'ผู้ดำเนินการ', 'อีเมล', 'IP'];
    const rows = logs.map((log) => [
      new Date(log.performedAt).toLocaleString('th-TH'),
      log.tableName,
      log.recordId,
      log.action === 'create' ? 'สร้าง' : log.action === 'update' ? 'แก้ไข' : 'ลบ',
      log.performedByName || log.performedBy,
      log.performedByEmail || '-',
      log.ipAddress || '-',
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))].join('\n');

    return '\uFEFF' + csvContent; // BOM for Thai Excel
  },
};
