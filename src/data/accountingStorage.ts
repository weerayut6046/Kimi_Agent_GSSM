import type { DailyAccounting, FuelPrice, Shift, EmployeeProfile } from '@/types';
import { supabase } from '@/lib/supabase';
import { logAudit } from './coreStorage';

// Daily Accounting Storage - Helper to map camelCase to lowercase for PostgreSQL
export const mapDailyAccountingToDb = (account: DailyAccounting | Partial<DailyAccounting>): Record<string, unknown> => {
  const result: Record<string, unknown> = {};

  if (account.id !== undefined) result.id = account.id;
  if (account.date !== undefined) result.date = account.date;
  if (account.shiftId !== undefined) result.shiftid = account.shiftId;
  if (account.employeeId !== undefined) result.employeeid = account.employeeId;
  if (account.fuelMeter !== undefined) result.fuelmeter = account.fuelMeter;
  if (account.fuelSales !== undefined) result.fuelsales = account.fuelSales;
  if (account.fuelAmount !== undefined) result.fuelamount = account.fuelAmount;
  if (account.totalFuelAmount !== undefined) result.totalfuelamount = account.totalFuelAmount;
  if (account.systemAmount !== undefined) result.systemamount = account.systemAmount;
  if (account.cashAmount !== undefined) result.cashamount = account.cashAmount;
  if (account.actualCashCounted !== undefined) result.actualcashcounted = account.actualCashCounted;
  if (account.dispenserCash !== undefined) result.dispensercash = account.dispenserCash;
  if (account.items !== undefined) result.items = account.items;
  if (account.totalAmount !== undefined) result.totalamount = account.totalAmount;
  if (account.difference !== undefined) result.difference = account.difference;
  if (account.note !== undefined) result.note = account.note;
  if (account.createdAt !== undefined) result.createdat = account.createdAt;
  if (account.updatedAt !== undefined) result.updatedat = account.updatedAt;

  return result;
};

export const mapDailyAccountingFromDb = (row: Record<string, unknown>): DailyAccounting => ({
  id: row.id as string,
  date: row.date as string,
  shiftId: row.shiftid as string,
  employeeId: row.employeeid as string,
  fuelMeter: (row.fuelmeter ?? row.fuelMeter) as DailyAccounting['fuelMeter'],
  fuelSales: (row.fuelsales ?? row.fuelSales) as DailyAccounting['fuelSales'],
  fuelAmount: (row.fuelamount ?? row.fuelAmount) as DailyAccounting['fuelAmount'],
  totalFuelAmount: (row.totalfuelamount ?? row.totalFuelAmount ?? 0) as number,
  systemAmount: (row.systemamount ?? row.systemAmount ?? 0) as number,
  cashAmount: (row.cashamount ?? row.cashAmount ?? 0) as number,
  actualCashCounted: (row.actualcashcounted ?? row.actualCashCounted ?? 0) as number,
  dispenserCash: (row.dispensercash ?? row.dispenserCash) as DailyAccounting['dispenserCash'],
  items: (row.items ?? {}) as DailyAccounting['items'],
  totalAmount: (row.totalamount ?? row.totalAmount ?? 0) as number,
  difference: (row.difference ?? 0) as number,
  note: (row.note ?? '') as string,
  createdAt: (row.createdat ?? row.createdAt) as string,
  updatedAt: (row.updatedat ?? row.updatedAt) as string,
  shift: undefined as unknown as Shift,
  employee: undefined as unknown as EmployeeProfile,
});

// Fuel Price Storage - Helper to map camelCase to lowercase for PostgreSQL
export const mapFuelPriceToDb = (price: FuelPrice | Partial<FuelPrice>): Record<string, unknown> => {
  const result: Record<string, unknown> = {};

  if (price.id !== undefined) result.id = price.id;
  if (price['95'] !== undefined) result['95'] = price['95'];
  if (price['B7'] !== undefined) result['B7'] = price['B7'];
  if (price['B10'] !== undefined) result['B10'] = price['B10'];
  if (price['Diesel'] !== undefined) result['Diesel'] = price['Diesel'];
  if (price.effectiveDate !== undefined) result.effectivedate = price.effectiveDate;
  if (price.createdAt !== undefined) result.createdat = price.createdAt;

  return result;
};

export const mapFuelPriceFromDb = (row: Record<string, unknown>): FuelPrice => ({
  id: row.id as string,
  '95': Number(row['95']) || 0,
  'B7': Number(row['B7']) || 0,
  'B10': Number(row['B10']) || 0,
  'Diesel': Number(row['Diesel']) || 0,
  effectiveDate: (row.effectivedate || row.effectiveDate) as string,
  createdAt: (row.createdat || row.createdAt) as string,
});

export const fuelPriceStorage = {
  getAll: async (): Promise<FuelPrice[]> => {
    const { data, error } = await supabase.from('fuel_prices').select('*');
    if (error) {
      console.error(error);
      return [];
    }
    return (data || []).map((row: Record<string, unknown>) => mapFuelPriceFromDb(row));
  },
  getById: async (id: string): Promise<FuelPrice | undefined> => {
    const { data, error } = await supabase.from('fuel_prices').select('*').eq('id', id).single();
    if (error) {
      console.error(error);
      return undefined;
    }
    return data ? mapFuelPriceFromDb(data as Record<string, unknown>) : undefined;
  },
  getCurrentPrice: async (): Promise<FuelPrice | null> => {
    const { data, error } = await supabase
      .from('fuel_prices')
      .select('*')
      .order('effectivedate', { ascending: false })
      .limit(1);
    if (error || !data || data.length === 0) return null;
    return mapFuelPriceFromDb(data[0] as Record<string, unknown>);
  },
  create: async (price: FuelPrice): Promise<void> => {
    const dbPrice = mapFuelPriceToDb(price);
    const { error } = await supabase.from('fuel_prices').insert(dbPrice);
    if (error) {
      console.error('Error creating fuel price:', error);
      throw error;
    }
    await logAudit({ tableName: 'fuel_prices', recordId: price.id, action: 'create', newValue: dbPrice });
  },
  update: async (id: string, updates: Partial<FuelPrice>): Promise<void> => {
    const dbUpdates = mapFuelPriceToDb(updates);
    const { error } = await supabase.from('fuel_prices').update(dbUpdates).eq('id', id);
    if (error) {
      console.error('Error updating fuel price:', error);
      throw error;
    }
    await logAudit({ tableName: 'fuel_prices', recordId: id, action: 'update', newValue: dbUpdates });
  },
  delete: async (id: string): Promise<void> => {
    const { error } = await supabase.from('fuel_prices').delete().eq('id', id);
    if (error) console.error(error);
    else await logAudit({ tableName: 'fuel_prices', recordId: id, action: 'delete' });
  },
};

export const dailyAccountingStorage = {
  getAll: async (): Promise<DailyAccounting[]> => {
    const { data, error } = await supabase.from('daily_accounting').select('*');
    if (error) {
      console.error(error);
      return [];
    }
    return (data || []).map((row: Record<string, unknown>) => mapDailyAccountingFromDb(row));
  },
  getById: async (id: string): Promise<DailyAccounting | undefined> => {
    const { data, error } = await supabase.from('daily_accounting').select('*').eq('id', id).single();
    if (error) {
      console.error(error);
      return undefined;
    }
    return data ? mapDailyAccountingFromDb(data as Record<string, unknown>) : undefined;
  },
  getByDate: async (date: string): Promise<DailyAccounting[]> => {
    const { data, error } = await supabase.from('daily_accounting').select('*').eq('date', date);
    if (error) {
      console.error(error);
      return [];
    }
    return (data || []).map((row: Record<string, unknown>) => mapDailyAccountingFromDb(row));
  },
  getByDateRange: async (startDate: string, endDate: string): Promise<DailyAccounting[]> => {
    const { data, error } = await supabase
      .from('daily_accounting')
      .select('*')
      .gte('date', startDate)
      .lte('date', endDate);
    if (error) {
      console.error(error);
      return [];
    }
    return (data || []).map((row: Record<string, unknown>) => mapDailyAccountingFromDb(row));
  },
  getRecent: async (limit: number = 100): Promise<DailyAccounting[]> => {
    const { data, error } = await supabase
      .from('daily_accounting')
      .select('*')
      .order('date', { ascending: false })
      .limit(limit);
    if (error) {
      console.error(error);
      return [];
    }
    return (data || []).map((row: Record<string, unknown>) => mapDailyAccountingFromDb(row));
  },
  getByShift: async (shiftId: string): Promise<DailyAccounting[]> => {
    const { data, error } = await supabase.from('daily_accounting').select('*').eq('shiftid', shiftId);
    if (error) {
      console.error(error);
      return [];
    }
    return (data || []).map((row: Record<string, unknown>) => mapDailyAccountingFromDb(row));
  },
  create: async (account: DailyAccounting): Promise<void> => {
    const accountData = { ...account };
    delete (accountData as { shift?: unknown }).shift;
    delete (accountData as { employee?: unknown }).employee;
    const dbData = mapDailyAccountingToDb(accountData);
    const { error } = await supabase.from('daily_accounting').insert(dbData);
    if (error) {
      console.error('Error creating daily accounting:', error);
      throw error;
    }
    await logAudit({ tableName: 'daily_accounting', recordId: account.id, action: 'create', newValue: dbData });
  },
  update: async (id: string, updates: Partial<DailyAccounting>): Promise<void> => {
    const updateData = { ...updates };
    delete (updateData as { shift?: unknown }).shift;
    delete (updateData as { employee?: unknown }).employee;
    const dbData = mapDailyAccountingToDb(updateData);
    const { error } = await supabase.from('daily_accounting').update(dbData).eq('id', id);
    if (error) {
      console.error('Error updating daily accounting:', error);
      throw error;
    }
    await logAudit({ tableName: 'daily_accounting', recordId: id, action: 'update', newValue: dbData });
  },
  delete: async (id: string): Promise<void> => {
    const { error } = await supabase.from('daily_accounting').delete().eq('id', id);
    if (error) console.error(error);
    else await logAudit({ tableName: 'daily_accounting', recordId: id, action: 'delete' });
  },
};
