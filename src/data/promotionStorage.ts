import { supabase } from '@/lib/supabase';
import type { Promotion, PromotionFilter } from '@/types/promotion';

const mapPromotionFromDb = (row: Record<string, unknown>): Promotion => ({
  id: row.id as string,
  name: row.name as string,
  type: (row.type || 'threshold') as Promotion['type'],
  description: (row.description || '') as string,
  fuelType: (row.fuel_type || row.fuelType || 'all') as Promotion['fuelType'],
  minAmount: Number(row.min_amount || row.minAmount) || 0,
  discountValue: Number(row.discount_value || row.discountValue) || 0,
  discountType: (row.discount_type || row.discountType || 'amount') as Promotion['discountType'],
  startTime: (row.start_time || row.startTime || undefined) as string | undefined,
  endTime: (row.end_time || row.endTime || undefined) as string | undefined,
  startDate: (row.start_date || row.startDate || undefined) as string | undefined,
  endDate: (row.end_date || row.endDate || undefined) as string | undefined,
  isActive: row.is_active !== undefined || row.isActive !== undefined
    ? Boolean(row.is_active || row.isActive)
    : true,
  createdAt: (row.created_at || row.createdAt) as string,
  updatedAt: (row.updated_at || row.updatedAt) as string,
});

const mapPromotionToDb = (promotion: Promotion | Partial<Promotion>): Record<string, unknown> => {
  const result: Record<string, unknown> = {};
  if (promotion.id !== undefined) result.id = promotion.id;
  if (promotion.name !== undefined) result.name = promotion.name;
  if (promotion.type !== undefined) result.type = promotion.type;
  if (promotion.description !== undefined) result.description = promotion.description;
  if (promotion.fuelType !== undefined) result.fuel_type = promotion.fuelType;
  if (promotion.minAmount !== undefined) result.min_amount = promotion.minAmount;
  if (promotion.discountValue !== undefined) result.discount_value = promotion.discountValue;
  if (promotion.discountType !== undefined) result.discount_type = promotion.discountType;
  if (promotion.startTime !== undefined) result.start_time = promotion.startTime || null;
  if (promotion.endTime !== undefined) result.end_time = promotion.endTime || null;
  if (promotion.startDate !== undefined) result.start_date = promotion.startDate || null;
  if (promotion.endDate !== undefined) result.end_date = promotion.endDate || null;
  if (promotion.isActive !== undefined) result.is_active = promotion.isActive;
  if (promotion.createdAt !== undefined) result.created_at = promotion.createdAt;
  if (promotion.updatedAt !== undefined) result.updated_at = promotion.updatedAt;
  return result;
};

export const promotionStorage = {
  getAll: async (filter?: PromotionFilter, limit = 100, offset = 0): Promise<{ promotions: Promotion[]; total: number }> => {
    let query = supabase.from('promotions').select('*', { count: 'exact' });

    if (filter?.search) {
      query = query.or(`name.ilike.%${filter.search}%,description.ilike.%${filter.search}%`);
    }
    if (filter?.type) {
      query = query.eq('type', filter.type);
    }
    if (filter?.isActive !== undefined) {
      query = query.eq('is_active', filter.isActive);
    }

    const { data, error, count } = await query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('Error fetching promotions:', error);
      return { promotions: [], total: 0 };
    }

    return {
      promotions: (data || []).map((row: Record<string, unknown>) => mapPromotionFromDb(row)),
      total: count || 0,
    };
  },

  getById: async (id: string): Promise<Promotion | undefined> => {
    const { data, error } = await supabase.from('promotions').select('*').eq('id', id).single();
    if (error || !data) return undefined;
    return mapPromotionFromDb(data as Record<string, unknown>);
  },

  getActive: async (): Promise<Promotion[]> => {
    const { data, error } = await supabase
      .from('promotions')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching active promotions:', error);
      return [];
    }

    return (data || []).map((row: Record<string, unknown>) => mapPromotionFromDb(row));
  },

  create: async (promotion: Omit<Promotion, 'id' | 'createdAt' | 'updatedAt'>): Promise<Promotion | null> => {
    const id = `promo-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const now = new Date().toISOString();
    const newPromotion: Promotion = {
      ...promotion,
      id,
      createdAt: now,
      updatedAt: now,
    };

    const { error } = await supabase.from('promotions').insert(mapPromotionToDb(newPromotion));
    if (error) {
      console.error('Error creating promotion:', error);
      return null;
    }
    return newPromotion;
  },

  update: async (id: string, updates: Partial<Promotion>): Promise<boolean> => {
    const dbUpdates = mapPromotionToDb({ ...updates, updatedAt: new Date().toISOString() });
    const { error } = await supabase.from('promotions').update(dbUpdates).eq('id', id);
    if (error) {
      console.error('Error updating promotion:', error);
      return false;
    }
    return true;
  },

  delete: async (id: string): Promise<boolean> => {
    const { error } = await supabase.from('promotions').delete().eq('id', id);
    if (error) {
      console.error('Error deleting promotion:', error);
      return false;
    }
    return true;
  },
};
