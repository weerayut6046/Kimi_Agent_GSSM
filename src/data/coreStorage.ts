import { supabase } from '@/lib/supabase';
import type { Station } from '@/types';

// Backup version constant
export const BACKUP_VERSION = '1.0.0';

// ============================================
// Audit Trail Helper
// ============================================

export const logAudit = async (params: {
  tableName: string;
  recordId: string;
  action: 'create' | 'update' | 'delete';
  oldValue?: unknown;
  newValue?: unknown;
  performedBy?: string;
  performedByEmail?: string | null;
  performedByName?: string | null;
}): Promise<void> => {
  try {
    await supabase.from('audit_logs').insert({
      table_name: params.tableName,
      record_id: params.recordId,
      action: params.action,
      old_value: params.oldValue ?? null,
      new_value: params.newValue ?? null,
      performed_by: params.performedBy || 'system',
      performed_by_email: params.performedByEmail || null,
      performed_by_name: params.performedByName || null,
      ip_address: null,
    });
  } catch (err) {
    console.error('Audit log failed:', err);
  }
};

// Helper to check for RLS errors and provide helpful messages
export const checkForRLSError = (error: { message?: string; code?: string }, operation: string): void => {
  if (error?.message?.includes('406') || error?.message?.includes('Not Acceptable')) {
    console.error(`
❌ RLS (Row Level Security) Error ในการ ${operation}

ปัญหา: Supabase บล็อกการเข้าถึงข้อมูลเนื่องจากไม่มี RLS Policy

วิธีแก้ไข:
1. ไปที่ Supabase Dashboard → Table Editor → [ชื่อตาราง] → Policies
2. คลิก "New Policy" หรือปิด RLS ชั่วคราว (สำหรับ development)

SQL สำหรับสร้าง Policy:
  CREATE POLICY "Allow all" ON [ชื่อตาราง] FOR ALL USING (true) WITH CHECK (true);

หรือปิด RLS:
  ALTER TABLE [ชื่อตาราง] DISABLE ROW LEVEL SECURITY;
    `);
  }
};

// Station Storage - Helper to map camelCase to lowercase for PostgreSQL
export const mapStationFromDb = (row: Record<string, unknown>): Station => ({
  id: row.id as string,
  name: row.name as string,
  address: row.address as string,
  phone: row.phone as string,
  managerId: row.managerid as string,
});

export const mapStationToDb = (station: Station | Partial<Station>): Record<string, unknown> => {
  const result: Record<string, unknown> = {};
  if (station.id !== undefined) result.id = station.id;
  if (station.name !== undefined) result.name = station.name;
  if (station.address !== undefined) result.address = station.address;
  if (station.phone !== undefined) result.phone = station.phone;
  if (station.managerId !== undefined) result.managerid = station.managerId;
  return result;
};

export const stationStorage = {
  getAll: async (): Promise<Station[]> => {
    const { data, error } = await supabase.from('stations').select('*');
    if (error) {
      console.error('Error fetching stations:', error);
      checkForRLSError(error, 'ดึงข้อมูลสาขา');
      return [];
    }
    return (data || []).map((row: Record<string, unknown>) => mapStationFromDb(row));
  },
  getById: async (id: string): Promise<Station | undefined> => {
    const { data, error } = await supabase.from('stations').select('*').eq('id', id).single();
    if (error) {
      console.error(error);
      return undefined;
    }
    return data ? mapStationFromDb(data as Record<string, unknown>) : undefined;
  },
  create: async (station: Station): Promise<boolean> => {
    const dbStation = mapStationToDb(station);
    const { error } = await supabase.from('stations').insert(dbStation);
    if (error) {
      console.error('Error creating station:', error);
      return false;
    }
    await logAudit({ tableName: 'stations', recordId: station.id, action: 'create', newValue: dbStation });
    return true;
  },
  update: async (id: string, updates: Partial<Station>): Promise<boolean> => {
    const dbUpdates = mapStationToDb(updates);
    const { error } = await supabase.from('stations').update(dbUpdates).eq('id', id);
    if (error) {
      console.error(error);
      return false;
    }
    await logAudit({ tableName: 'stations', recordId: id, action: 'update', newValue: dbUpdates });
    return true;
  },
  delete: async (id: string): Promise<boolean> => {
    const { error } = await supabase.from('stations').delete().eq('id', id);
    if (error) {
      console.error(error);
      return false;
    }
    await logAudit({ tableName: 'stations', recordId: id, action: 'delete' });
    return true;
  },
};

// Current User Session - Now handled by Supabase Auth
export const sessionStorage = {
  getCurrentUser: (): null => {
    return null;
  },
  setCurrentUser: (_user: { id: string } | null): void => {
    void _user;
  },
  clear: (): void => {
    // No-op
  },
};

// Seed database - NO LONGER USED
export const seedDatabase = async (): Promise<void> => {
  // Database seeding is disabled. Use database-setup.sql instead.
};

// Reset storage - NO LONGER USED
export const resetStorage = async (): Promise<void> => {
  // resetStorage is disabled for safety. Use Supabase Dashboard instead.
};

// Clear all storage - NO LONGER USED
export const clearStorage = async (): Promise<void> => {
  // clearStorage is disabled for safety.
};

// Debug functions - kept for troubleshooting
export const debugAuth = async (): Promise<void> => {
  // Auth debugging is disabled in production.
  // Use Supabase Dashboard for auth troubleshooting.
};
