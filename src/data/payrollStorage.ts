import type { PayrollPeriod, PayrollRecord } from '@/types';
import { supabase } from '@/lib/supabase';
import { logAudit } from './coreStorage';

// ============================================
// Payroll Period Mapping Helpers
// ============================================

const mapPayrollPeriodFromDb = (row: Record<string, unknown>): PayrollPeriod => ({
  id: row.id as string,
  year: Number(row.year) || 0,
  month: Number(row.month) || 0,
  startDate: (row.start_date || row.startDate) as string,
  endDate: (row.end_date || row.endDate) as string,
  payDate: (row.pay_date || row.payDate) as string | undefined,
  status: (row.status || 'open') as PayrollPeriod['status'],
});

const mapPayrollPeriodToDb = (period: PayrollPeriod | Partial<PayrollPeriod>): Record<string, unknown> => {
  const result: Record<string, unknown> = {};
  if (period.id !== undefined) result.id = period.id;
  if (period.year !== undefined) result.year = period.year;
  if (period.month !== undefined) result.month = period.month;
  if (period.startDate !== undefined) result.start_date = period.startDate;
  if (period.endDate !== undefined) result.end_date = period.endDate;
  if (period.payDate !== undefined) result.pay_date = period.payDate;
  if (period.status !== undefined) result.status = period.status;
  return result;
};

// ============================================
// Payroll Record Mapping Helpers
// ============================================

const mapPayrollRecordFromDb = (row: Record<string, unknown>): PayrollRecord => ({
  id: row.id as string,
  periodId: (row.period_id || row.periodId) as string,
  employeeId: (row.employee_id || row.employeeId) as string,
  baseSalary: Number(row.base_salary || row.baseSalary) || 0,
  shiftCount: Number(row.shift_count || row.shiftCount) || 0,
  shiftRate: Number(row.shift_rate || row.shiftRate) || 0,
  overtimeHours: Number(row.overtime_hours || row.overtimeHours) || 0,
  overtimeRate: Number(row.overtime_rate || row.overtimeRate) || 0,
  totalIncome: Number(row.total_income || row.totalIncome) || 0,
  taxDeduction: Number(row.tax_deduction || row.taxDeduction) || 0,
  socialSecurity: Number(row.social_security || row.socialSecurity) || 0,
  otherDeductions: Number(row.other_deductions || row.otherDeductions) || 0,
  netSalary: Number(row.net_salary || row.netSalary) || 0,
  status: (row.status || 'draft') as PayrollRecord['status'],
});

const mapPayrollRecordToDb = (record: PayrollRecord | Partial<PayrollRecord>): Record<string, unknown> => {
  const result: Record<string, unknown> = {};
  if (record.id !== undefined) result.id = record.id;
  if (record.periodId !== undefined) result.period_id = record.periodId;
  if (record.employeeId !== undefined) result.employee_id = record.employeeId;
  if (record.baseSalary !== undefined) result.base_salary = record.baseSalary;
  if (record.shiftCount !== undefined) result.shift_count = record.shiftCount;
  if (record.shiftRate !== undefined) result.shift_rate = record.shiftRate;
  if (record.overtimeHours !== undefined) result.overtime_hours = record.overtimeHours;
  if (record.overtimeRate !== undefined) result.overtime_rate = record.overtimeRate;
  if (record.totalIncome !== undefined) result.total_income = record.totalIncome;
  if (record.taxDeduction !== undefined) result.tax_deduction = record.taxDeduction;
  if (record.socialSecurity !== undefined) result.social_security = record.socialSecurity;
  if (record.otherDeductions !== undefined) result.other_deductions = record.otherDeductions;
  if (record.netSalary !== undefined) result.net_salary = record.netSalary;
  if (record.status !== undefined) result.status = record.status;
  return result;
};

// ============================================
// Payroll Period Storage
// ============================================

export const payrollPeriodStorage = {
  getAll: async (): Promise<PayrollPeriod[]> => {
    const { data, error } = await supabase.from('payroll_periods').select('*').order('year', { ascending: false }).order('month', { ascending: false });
    if (error) {
      // Silently ignore if table doesn't exist (PGRST205) or no rows (PGRST116)
      if (error.code !== 'PGRST205' && error.code !== 'PGRST116') {
        console.warn('Error fetching payroll periods:', error.message);
      }
      return [];
    }
    return (data || []).map((row: Record<string, unknown>) => mapPayrollPeriodFromDb(row));
  },

  getByYearMonth: async (year: number, month: number): Promise<PayrollPeriod | undefined> => {
    const { data, error } = await supabase
      .from('payroll_periods')
      .select('*')
      .eq('year', year)
      .eq('month', month)
      .limit(1);
    if (error) {
      if (error.code !== 'PGRST205' && error.code !== 'PGRST116') {
        console.warn('Error fetching payroll period:', error.message);
      }
      return undefined;
    }
    return data && data.length > 0 ? mapPayrollPeriodFromDb(data[0] as Record<string, unknown>) : undefined;
  },

  create: async (period: PayrollPeriod): Promise<boolean> => {
    const dbPeriod = mapPayrollPeriodToDb(period);
    const { error } = await supabase.from('payroll_periods').insert(dbPeriod);
    if (error) {
      console.error('Error creating payroll period:', error);
      return false;
    }
    await logAudit({ tableName: 'payroll_periods', recordId: period.id, action: 'create', newValue: dbPeriod });
    return true;
  },

  update: async (id: string, updates: Partial<PayrollPeriod>): Promise<boolean> => {
    const dbUpdates = mapPayrollPeriodToDb(updates);
    const { error } = await supabase.from('payroll_periods').update(dbUpdates).eq('id', id);
    if (error) {
      console.error('Error updating payroll period:', error);
      return false;
    }
    await logAudit({ tableName: 'payroll_periods', recordId: id, action: 'update', newValue: dbUpdates });
    return true;
  },

  delete: async (id: string): Promise<boolean> => {
    const { error } = await supabase.from('payroll_periods').delete().eq('id', id);
    if (error) {
      console.error('Error deleting payroll period:', error);
      return false;
    }
    await logAudit({ tableName: 'payroll_periods', recordId: id, action: 'delete' });
    return true;
  },
};

// ============================================
// Payroll Record Storage
// ============================================

export const payrollRecordStorage = {
  getAll: async (): Promise<PayrollRecord[]> => {
    const { data, error } = await supabase.from('payroll_records').select('*');
    if (error) {
      if (error.code !== 'PGRST205' && error.code !== 'PGRST116') {
        console.warn('Error fetching payroll records:', error.message);
      }
      return [];
    }
    return (data || []).map((row: Record<string, unknown>) => mapPayrollRecordFromDb(row));
  },

  getByPeriod: async (periodId: string): Promise<PayrollRecord[]> => {
    const { data, error } = await supabase.from('payroll_records').select('*').eq('period_id', periodId);
    if (error) {
      if (error.code !== 'PGRST205' && error.code !== 'PGRST116') {
        console.warn('Error fetching payroll records by period:', error.message);
      }
      return [];
    }
    return (data || []).map((row: Record<string, unknown>) => mapPayrollRecordFromDb(row));
  },

  getByEmployee: async (employeeId: string): Promise<PayrollRecord[]> => {
    const { data, error } = await supabase.from('payroll_records').select('*').eq('employee_id', employeeId).order('period_id', { ascending: false });
    if (error) {
      if (error.code !== 'PGRST205' && error.code !== 'PGRST116') {
        console.warn('Error fetching payroll records by employee:', error.message);
      }
      return [];
    }
    return (data || []).map((row: Record<string, unknown>) => mapPayrollRecordFromDb(row));
  },

  create: async (record: PayrollRecord): Promise<boolean> => {
    const dbRecord = mapPayrollRecordToDb(record);
    const { error } = await supabase.from('payroll_records').insert(dbRecord);
    if (error) {
      console.error('Error creating payroll record:', error);
      return false;
    }
    await logAudit({ tableName: 'payroll_records', recordId: record.id, action: 'create', newValue: dbRecord });
    return true;
  },

  update: async (id: string, updates: Partial<PayrollRecord>): Promise<boolean> => {
    const dbUpdates = mapPayrollRecordToDb(updates);
    const { error } = await supabase.from('payroll_records').update(dbUpdates).eq('id', id);
    if (error) {
      console.error('Error updating payroll record:', error);
      return false;
    }
    await logAudit({ tableName: 'payroll_records', recordId: id, action: 'update', newValue: dbUpdates });
    return true;
  },

  delete: async (id: string): Promise<boolean> => {
    const { error } = await supabase.from('payroll_records').delete().eq('id', id);
    if (error) {
      console.error('Error deleting payroll record:', error);
      return false;
    }
    await logAudit({ tableName: 'payroll_records', recordId: id, action: 'delete' });
    return true;
  },

  bulkCreate: async (records: PayrollRecord[]): Promise<boolean> => {
    if (records.length === 0) return true;
    const dbRecords = records.map(mapPayrollRecordToDb);
    const { error } = await supabase.from('payroll_records').insert(dbRecords);
    if (error) {
      console.error('Error bulk creating payroll records:', error);
      return false;
    }
    for (const record of records) {
      await logAudit({ tableName: 'payroll_records', recordId: record.id, action: 'create', newValue: mapPayrollRecordToDb(record) });
    }
    return true;
  },

  deleteByPeriod: async (periodId: string): Promise<boolean> => {
    const { error } = await supabase.from('payroll_records').delete().eq('period_id', periodId);
    if (error) {
      console.error('Error deleting payroll records by period:', error);
      return false;
    }
    return true;
  },
};
