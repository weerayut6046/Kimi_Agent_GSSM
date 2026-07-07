import type { Notification } from '@/types';
import { supabase } from '@/lib/supabase';
import { logAudit } from './coreStorage';

// Notification mapping helpers
export const mapNotificationFromDb = (row: Record<string, unknown>): Notification => ({
  id: row.id as string,
  userId: (row.userid || row.userId) as string,
  title: row.title as string,
  message: row.message as string,
  type: row.type as Notification['type'],
  read: row.read === true || row.read === 'true',
  createdAt: (row.createdat || row.createdAt) as string,
});

export const mapNotificationToDb = (notification: Notification): Record<string, unknown> => ({
  id: notification.id,
  userid: notification.userId,
  title: notification.title,
  message: notification.message,
  type: notification.type,
  read: notification.read,
  createdat: notification.createdAt,
});

export const notificationStorage = {
  getAll: async (): Promise<Notification[]> => {
    const { data, error } = await supabase.from('notifications').select('*');
    if (error) {
      console.error(error);
      return [];
    }
    return (data || []).map((row: Record<string, unknown>) => mapNotificationFromDb(row));
  },
  getByUser: async (userId: string): Promise<Notification[]> => {
    const { data, error } = await supabase.from('notifications').select('*').eq('userid', userId);
    if (error) {
      console.error(error);
      return [];
    }
    return (data || []).map((row: Record<string, unknown>) => mapNotificationFromDb(row));
  },
  getRecentByUser: async (userId: string, limit: number = 50): Promise<Notification[]> => {
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('userid', userId)
      .order('createdat', { ascending: false })
      .limit(limit);
    if (error) {
      console.error(error);
      return [];
    }
    return (data || []).map((row: Record<string, unknown>) => mapNotificationFromDb(row));
  },
  getUnread: async (userId: string): Promise<Notification[]> => {
    const { data, error } = await supabase.from('notifications').select('*').eq('userid', userId).eq('read', false);
    if (error) {
      console.error(error);
      return [];
    }
    return (data || []).map((row: Record<string, unknown>) => mapNotificationFromDb(row));
  },
  create: async (notification: Notification): Promise<void> => {
    const dbData = mapNotificationToDb(notification);
    const { error } = await supabase.from('notifications').insert(dbData);
    if (error) console.error(error);
    else await logAudit({ tableName: 'notifications', recordId: notification.id, action: 'create', newValue: dbData });
  },
  markAsRead: async (id: string): Promise<void> => {
    const { error } = await supabase.from('notifications').update({ read: true }).eq('id', id);
    if (error) console.error(error);
  },
  markAllAsRead: async (userId: string): Promise<void> => {
    const { error } = await supabase.from('notifications').update({ read: true }).eq('userid', userId);
    if (error) console.error(error);
  },
  delete: async (id: string): Promise<void> => {
    const { error } = await supabase.from('notifications').delete().eq('id', id);
    if (error) console.error(error);
    else await logAudit({ tableName: 'notifications', recordId: id, action: 'delete' });
  },
  deleteAllRead: async (userId: string): Promise<void> => {
    const { error } = await supabase.from('notifications').delete().eq('userid', userId).eq('read', true);
    if (error) console.error(error);
  },
  deleteAll: async (userId: string): Promise<void> => {
    const { error } = await supabase.from('notifications').delete().eq('userid', userId);
    if (error) console.error(error);
  },
};
