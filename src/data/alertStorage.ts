import type { Alert } from '@/types';
import { supabase } from '@/lib/supabase';
import { logAudit } from './coreStorage';

const mapAlertFromDb = (row: Record<string, unknown>): Alert => ({
  id: row.id as string,
  type: row.type as string,
  title: row.title as string,
  message: row.message as string,
  severity: row.severity as Alert['severity'],
  isRead: row.is_read === true || row.is_read === 'true',
  isResolved: row.is_resolved === true || row.is_resolved === 'true',
  relatedTable: (row.related_table || row.relatedTable) as string | undefined,
  relatedId: (row.related_id || row.relatedId) as string | undefined,
  createdAt: (row.created_at || row.createdAt) as string,
  resolvedAt: (row.resolved_at || row.resolvedAt) as string | undefined,
});

const mapAlertToDb = (alert: Alert | Partial<Alert>): Record<string, unknown> => {
  const result: Record<string, unknown> = {};
  if (alert.id !== undefined) result.id = alert.id;
  if (alert.type !== undefined) result.type = alert.type;
  if (alert.title !== undefined) result.title = alert.title;
  if (alert.message !== undefined) result.message = alert.message;
  if (alert.severity !== undefined) result.severity = alert.severity;
  if (alert.isRead !== undefined) result.is_read = alert.isRead;
  if (alert.isResolved !== undefined) result.is_resolved = alert.isResolved;
  if (alert.relatedTable !== undefined) result.related_table = alert.relatedTable;
  if (alert.relatedId !== undefined) result.related_id = alert.relatedId;
  if (alert.createdAt !== undefined) result.created_at = alert.createdAt;
  if (alert.resolvedAt !== undefined) result.resolved_at = alert.resolvedAt;
  return result;
};

export const alertStorage = {
  getAll: async (
    filter?: { severity?: Alert['severity']; isRead?: boolean; type?: string },
    limit?: number,
    offset?: number
  ): Promise<Alert[]> => {
    let query = supabase.from('alerts').select('*');

    if (filter?.severity) query = query.eq('severity', filter.severity);
    if (filter?.isRead !== undefined) query = query.eq('is_read', filter.isRead);
    if (filter?.type) query = query.eq('type', filter.type);

    query = query.order('created_at', { ascending: false });

    if (limit !== undefined && offset !== undefined) {
      query = query.range(offset, offset + limit - 1);
    } else if (limit !== undefined) {
      query = query.limit(limit);
    }

    const { data, error } = await query;
    if (error) {
      console.error('Error fetching alerts:', error);
      return [];
    }
    return (data || []).map((row: Record<string, unknown>) => mapAlertFromDb(row));
  },

  getUnreadCount: async (): Promise<number> => {
    const { count, error } = await supabase
      .from('alerts')
      .select('*', { count: 'exact', head: true })
      .eq('is_read', false)
      .eq('is_resolved', false);
    if (error) {
      console.error('Error counting unread alerts:', error);
      return 0;
    }
    return count || 0;
  },

  markAsRead: async (id: string): Promise<void> => {
    const { error } = await supabase.from('alerts').update({ is_read: true }).eq('id', id);
    if (error) console.error('Error marking alert as read:', error);
  },

  markAllAsRead: async (): Promise<void> => {
    const { error } = await supabase.from('alerts').update({ is_read: true }).eq('is_read', false);
    if (error) console.error('Error marking all alerts as read:', error);
  },

  resolve: async (id: string): Promise<void> => {
    const { error } = await supabase
      .from('alerts')
      .update({ is_resolved: true, resolved_at: new Date().toISOString() })
      .eq('id', id);
    if (error) {
      console.error('Error resolving alert:', error);
      return;
    }
    await logAudit({ tableName: 'alerts', recordId: id, action: 'update', newValue: { is_resolved: true, resolved_at: new Date().toISOString() } });
  },

  create: async (alert: Omit<Alert, 'id' | 'createdAt'>): Promise<void> => {
    const newAlert: Alert = {
      ...alert,
      id: `alert-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date().toISOString(),
    };
    const dbData = mapAlertToDb(newAlert);
    const { error } = await supabase.from('alerts').insert(dbData);
    if (error) {
      console.error('Error creating alert:', error);
      return;
    }
    await logAudit({ tableName: 'alerts', recordId: newAlert.id, action: 'create', newValue: dbData });
  },

  deleteOld: async (days: number): Promise<void> => {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    const { error } = await supabase
      .from('alerts')
      .delete()
      .lt('created_at', cutoffDate.toISOString());
    if (error) console.error('Error deleting old alerts:', error);
  },
};
