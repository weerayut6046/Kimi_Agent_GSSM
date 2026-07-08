import { supabase } from '@/lib/supabase';
import type { Customer, CustomerTransaction, CustomerFilter, CustomerTier } from '@/types/customer';
import { logAudit } from './coreStorage';

const mapCustomerFromDb = (row: Record<string, unknown>): Customer => ({
  id: row.id as string,
  memberCode: (row.member_code || row.memberCode) as string,
  name: row.name as string,
  phone: (row.phone || undefined) as string | undefined,
  email: (row.email || undefined) as string | undefined,
  tier: (row.tier || 'bronze') as CustomerTier,
  points: Number(row.points) || 0,
  totalSpent: Number(row.total_spent || row.totalSpent) || 0,
  birthDate: (row.birth_date || row.birthDate) as string | undefined,
  isActive: row.is_active !== undefined || row.isActive !== undefined
    ? Boolean(row.is_active || row.isActive)
    : true,
  createdAt: (row.created_at || row.createdAt) as string,
  updatedAt: (row.updated_at || row.updatedAt) as string,
});

const mapCustomerToDb = (customer: Customer | Partial<Customer>): Record<string, unknown> => {
  const result: Record<string, unknown> = {};
  if (customer.id !== undefined) result.id = customer.id;
  if (customer.memberCode !== undefined) result.member_code = customer.memberCode;
  if (customer.name !== undefined) result.name = customer.name;
  if (customer.phone !== undefined) result.phone = customer.phone;
  if (customer.email !== undefined) result.email = customer.email;
  if (customer.tier !== undefined) result.tier = customer.tier;
  if (customer.points !== undefined) result.points = customer.points;
  if (customer.totalSpent !== undefined) result.total_spent = customer.totalSpent;
  if (customer.birthDate !== undefined) result.birth_date = customer.birthDate;
  if (customer.isActive !== undefined) result.is_active = customer.isActive;
  if (customer.createdAt !== undefined) result.created_at = customer.createdAt;
  if (customer.updatedAt !== undefined) result.updated_at = customer.updatedAt;
  return result;
};

const mapTransactionFromDb = (row: Record<string, unknown>): CustomerTransaction => ({
  id: row.id as string,
  customerId: (row.customer_id || row.customerId) as string,
  saleId: (row.sale_id || row.saleId) as string | undefined,
  type: (row.type || 'earn') as CustomerTransaction['type'],
  points: Number(row.points) || 0,
  amount: Number(row.amount) || 0,
  note: (row.note || undefined) as string | undefined,
  createdAt: (row.created_at || row.createdAt) as string,
});

export const customerStorage = {
  // ========== Customers ==========

  getAll: async (filter?: CustomerFilter, limit = 100, offset = 0): Promise<{ customers: Customer[]; total: number }> => {
    let query = supabase.from('customers').select('*', { count: 'exact' });

    if (filter?.search) {
      query = query.or(`name.ilike.%${filter.search}%,phone.ilike.%${filter.search}%,member_code.ilike.%${filter.search}%`);
    }
    if (filter?.tier) {
      query = query.eq('tier', filter.tier);
    }
    if (filter?.isActive !== undefined) {
      query = query.eq('is_active', filter.isActive);
    }

    const { data, error, count } = await query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      return { customers: [], total: 0 };
    }

    return {
      customers: (data || []).map((row: Record<string, unknown>) => mapCustomerFromDb(row)),
      total: count || 0,
    };
  },

  getById: async (id: string): Promise<Customer | undefined> => {
    const { data, error } = await supabase.from('customers').select('*').eq('id', id).single();
    if (error || !data) return undefined;
    return mapCustomerFromDb(data as Record<string, unknown>);
  },

  getByMemberCode: async (code: string): Promise<Customer | undefined> => {
    const { data, error } = await supabase.from('customers').select('*').eq('member_code', code).single();
    if (error || !data) return undefined;
    return mapCustomerFromDb(data as Record<string, unknown>);
  },

  getByPhone: async (phone: string): Promise<Customer | undefined> => {
    const { data, error } = await supabase.from('customers').select('*').eq('phone', phone).single();
    if (error || !data) return undefined;
    return mapCustomerFromDb(data as Record<string, unknown>);
  },

  create: async (customer: Omit<Customer, 'id' | 'createdAt' | 'updatedAt' | 'points' | 'totalSpent'>): Promise<Customer | null> => {
    const id = `cust-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const newCustomer: Customer = {
      ...customer,
      id,
      points: 0,
      totalSpent: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const { error } = await supabase.from('customers').insert(mapCustomerToDb(newCustomer));
    if (error) {
      return null;
    }
    await logAudit({ tableName: 'customers', recordId: id, action: 'create', newValue: mapCustomerToDb(newCustomer) });
    return newCustomer;
  },

  update: async (id: string, updates: Partial<Customer>): Promise<boolean> => {
    const dbUpdates = mapCustomerToDb({ ...updates, updatedAt: new Date().toISOString() });
    const { error } = await supabase.from('customers').update(dbUpdates).eq('id', id);
    if (error) {
      return false;
    }
    await logAudit({ tableName: 'customers', recordId: id, action: 'update', newValue: dbUpdates });
    return true;
  },

  delete: async (id: string): Promise<boolean> => {
    const { error } = await supabase.from('customers').delete().eq('id', id);
    if (error) {
      return false;
    }
    await logAudit({ tableName: 'customers', recordId: id, action: 'delete' });
    return true;
  },

  // ========== Points & Transactions ==========

  addPoints: async (customerId: string, points: number, amount: number, saleId?: string): Promise<boolean> => {
    // Get current customer
    const customer = await customerStorage.getById(customerId);
    if (!customer) return false;

    const newPoints = customer.points + points;
    const newTotalSpent = customer.totalSpent + amount;

    // Update customer points and tier
    const { error: updateError } = await supabase.from('customers').update({
      points: newPoints,
      total_spent: newTotalSpent,
      tier: newPoints >= 5000 ? 'gold' : newPoints >= 1000 ? 'silver' : 'bronze',
      updated_at: new Date().toISOString(),
    }).eq('id', customerId);

    if (updateError) {
      return false;
    }

    // Create transaction record
    const earnTxId = `ctx-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const { error: txError } = await supabase.from('customer_transactions').insert({
      id: earnTxId,
      customer_id: customerId,
      sale_id: saleId || null,
      type: 'earn',
      points,
      amount,
      created_at: new Date().toISOString(),
    });

    if (txError) {
      return false;
    }

    await logAudit({ tableName: 'customer_transactions', recordId: earnTxId, action: 'create', newValue: { customer_id: customerId, type: 'earn', points, amount, sale_id: saleId || null } });
    await logAudit({ tableName: 'customers', recordId: customerId, action: 'update', newValue: { points: newPoints, total_spent: newTotalSpent } });
    return true;
  },

  redeemPoints: async (customerId: string, points: number, note?: string): Promise<boolean> => {
    const customer = await customerStorage.getById(customerId);
    if (!customer || customer.points < points) return false;

    const newPoints = customer.points - points;

    const { error: updateError } = await supabase.from('customers').update({
      points: newPoints,
      tier: newPoints >= 5000 ? 'gold' : newPoints >= 1000 ? 'silver' : 'bronze',
      updated_at: new Date().toISOString(),
    }).eq('id', customerId);

    if (updateError) {
      return false;
    }

    const redeemTxId = `ctx-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const { error: txError } = await supabase.from('customer_transactions').insert({
      id: redeemTxId,
      customer_id: customerId,
      type: 'redeem',
      points: -points,
      amount: 0,
      note: note || null,
      created_at: new Date().toISOString(),
    });

    if (txError) {
      return false;
    }

    await logAudit({ tableName: 'customer_transactions', recordId: redeemTxId, action: 'create', newValue: { customer_id: customerId, type: 'redeem', points: -points, amount: 0, note: note || null } });
    await logAudit({ tableName: 'customers', recordId: customerId, action: 'update', newValue: { points: newPoints } });
    return true;
  },

  // ========== Transactions ==========

  getTransactions: async (customerId: string, limit = 50): Promise<CustomerTransaction[]> => {
    const { data, error } = await supabase
      .from('customer_transactions')
      .select('*')
      .eq('customer_id', customerId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      return [];
    }

    return (data || []).map((row: Record<string, unknown>) => mapTransactionFromDb(row));
  },
};
