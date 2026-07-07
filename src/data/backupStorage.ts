import type {
  User, EmployeeProfile, Position, Skill, Shift, Schedule,
  LeaveRequest, SwapRequest, Attendance, Notification,
  DailyAccounting, FuelPrice,
  FuelInventory, FuelDelivery, Product, ProductTransaction, Supplier,
  Station, PayrollPeriod, PayrollRecord,
} from '@/types';
import type { Sale } from '@/types/pos';
import { supabase } from '@/lib/supabase';
import {
  BACKUP_VERSION,
  splitFullName,
  mapUserFromDb,
  mapProfileFromDb,
  mapStationFromDb,
  mapStationToDb,
  mapShiftFromDb,
  mapShiftToDb,
  mapScheduleFromDb,
  mapScheduleToDb,
  mapLeaveRequestFromDb,
  mapSwapRequestFromDb,
  mapAttendanceFromDb,
  mapNotificationFromDb,
  mapDailyAccountingToDb,
  mapDailyAccountingFromDb,
  mapFuelPriceToDb,
  mapFuelPriceFromDb,
} from './baseStorage';

// ============================================
// Inventory / POS / Payroll Mapping Helpers (used only by backup)
// ============================================

const mapFuelInventoryFromDb = (row: Record<string, unknown>): FuelInventory => ({
  id: row.id as string,
  date: row.date as string,
  fuelType: (row.fuel_type || row.fuelType) as FuelInventory['fuelType'],
  tankNumber: (row.tank_number || row.tankNumber || 1) as number,
  openingStock: Number(row.opening_stock || row.openingStock) || 0,
  receivedQty: Number(row.received_qty || row.receivedQty) || 0,
  soldQty: Number(row.sold_qty || row.soldQty) || 0,
  adjustmentQty: Number(row.adjustment_qty || row.adjustmentQty) || 0,
  closingStock: Number(row.closing_stock || row.closingStock) || 0,
  actualStock: row.actual_stock !== undefined || row.actualStock !== undefined
    ? Number(row.actual_stock || row.actualStock)
    : undefined,
  variance: Number(row.variance) || 0,
  temperature: row.temperature !== undefined ? Number(row.temperature) : undefined,
  density: row.density !== undefined ? Number(row.density) : undefined,
  recordedBy: (row.recorded_by || row.recordedBy) as string,
  note: (row.note || '') as string,
  createdAt: (row.created_at || row.createdAt) as string,
});

const mapFuelInventoryToDb = (item: FuelInventory | Partial<FuelInventory>): Record<string, unknown> => {
  const result: Record<string, unknown> = {};
  if (item.id !== undefined) result.id = item.id;
  if (item.date !== undefined) result.date = item.date;
  if (item.fuelType !== undefined) result.fuel_type = item.fuelType;
  if (item.tankNumber !== undefined) result.tank_number = item.tankNumber;
  if (item.openingStock !== undefined) result.opening_stock = item.openingStock;
  if (item.receivedQty !== undefined) result.received_qty = item.receivedQty;
  if (item.soldQty !== undefined) result.sold_qty = item.soldQty;
  if (item.adjustmentQty !== undefined) result.adjustment_qty = item.adjustmentQty;
  if (item.closingStock !== undefined) result.closing_stock = item.closingStock;
  if (item.actualStock !== undefined) result.actual_stock = item.actualStock;
  if (item.variance !== undefined) result.variance = item.variance;
  if (item.temperature !== undefined) result.temperature = item.temperature;
  if (item.density !== undefined) result.density = item.density;
  if (item.recordedBy !== undefined) result.recorded_by = item.recordedBy;
  if (item.note !== undefined) result.note = item.note;
  if (item.createdAt !== undefined) result.created_at = item.createdAt;
  return result;
};

const mapFuelDeliveryFromDb = (row: Record<string, unknown>): FuelDelivery => ({
  id: row.id as string,
  doNumber: (row.do_number || row.doNumber) as string,
  supplierId: (row.supplier_id || row.supplierId) as string,
  fuelType: (row.fuel_type || row.fuelType) as FuelDelivery['fuelType'],
  quantityLiters: Number(row.quantity_liters || row.quantityLiters) || 0,
  pricePerLiter: Number(row.price_per_liter || row.pricePerLiter) || 0,
  totalAmount: Number(row.total_amount || row.totalAmount) || 0,
  deliveryDate: (row.delivery_date || row.deliveryDate) as string,
  receivedDate: (row.received_date || row.receivedDate) as string | undefined,
  receivedBy: (row.received_by || row.receivedBy) as string | undefined,
  status: (row.status || 'pending') as FuelDelivery['status'],
  note: (row.note || '') as string,
  createdAt: (row.created_at || row.createdAt) as string,
  supplier: undefined as unknown as Supplier,
});

const mapFuelDeliveryToDb = (item: FuelDelivery | Partial<FuelDelivery>): Record<string, unknown> => {
  const result: Record<string, unknown> = {};
  if (item.id !== undefined) result.id = item.id;
  if (item.doNumber !== undefined) result.do_number = item.doNumber;
  if (item.supplierId !== undefined) result.supplier_id = item.supplierId;
  if (item.fuelType !== undefined) result.fuel_type = item.fuelType;
  if (item.quantityLiters !== undefined) result.quantity_liters = item.quantityLiters;
  if (item.pricePerLiter !== undefined) result.price_per_liter = item.pricePerLiter;
  if (item.totalAmount !== undefined) result.total_amount = item.totalAmount;
  if (item.deliveryDate !== undefined) result.delivery_date = item.deliveryDate;
  if (item.receivedDate !== undefined) result.received_date = item.receivedDate;
  if (item.receivedBy !== undefined) result.received_by = item.receivedBy;
  if (item.status !== undefined) result.status = item.status;
  if (item.note !== undefined) result.note = item.note;
  if (item.createdAt !== undefined) result.created_at = item.createdAt;
  return result;
};

const mapProductFromDb = (row: Record<string, unknown>): Product => ({
  id: row.id as string,
  barcode: (row.barcode || undefined) as string | undefined,
  sku: (row.sku || undefined) as string | undefined,
  name: row.name as string,
  category: row.category as Product['category'],
  unit: (row.unit || 'piece') as string,
  costPrice: Number(row.cost_price || row.costPrice) || 0,
  sellingPrice: Number(row.selling_price || row.sellingPrice) || 0,
  currentStock: Number(row.current_stock || row.currentStock) || 0,
  minStock: Number(row.min_stock || row.minStock) || 10,
  maxStock: Number(row.max_stock || row.maxStock) || 100,
  supplierId: (row.supplier_id || row.supplierId) as string | undefined,
  isActive: row.is_active !== undefined || row.isActive !== undefined
    ? Boolean(row.is_active || row.isActive)
    : true,
  createdAt: (row.created_at || row.createdAt) as string,
  supplier: undefined as unknown as Supplier,
});

const mapProductToDb = (item: Product | Partial<Product>): Record<string, unknown> => {
  const result: Record<string, unknown> = {};
  if (item.id !== undefined) result.id = item.id;
  if (item.barcode !== undefined) result.barcode = item.barcode;
  if (item.sku !== undefined) result.sku = item.sku;
  if (item.name !== undefined) result.name = item.name;
  if (item.category !== undefined) result.category = item.category;
  if (item.unit !== undefined) result.unit = item.unit;
  if (item.costPrice !== undefined) result.cost_price = item.costPrice;
  if (item.sellingPrice !== undefined) result.selling_price = item.sellingPrice;
  if (item.currentStock !== undefined) result.current_stock = item.currentStock;
  if (item.minStock !== undefined) result.min_stock = item.minStock;
  if (item.maxStock !== undefined) result.max_stock = item.maxStock;
  if (item.supplierId !== undefined) result.supplier_id = item.supplierId;
  if (item.isActive !== undefined) result.is_active = item.isActive;
  if (item.createdAt !== undefined) result.created_at = item.createdAt;
  return result;
};

const mapProductTransactionFromDb = (row: Record<string, unknown>): ProductTransaction => ({
  id: row.id as string,
  productId: (row.product_id || row.productId) as string,
  type: (row.type || 'in') as ProductTransaction['type'],
  quantity: Number(row.quantity) || 0,
  unitCost: row.unit_cost !== undefined || row.unitCost !== undefined
    ? Number(row.unit_cost || row.unitCost)
    : undefined,
  referenceType: (row.reference_type || row.referenceType) as string | undefined,
  referenceId: (row.reference_id || row.referenceId) as string | undefined,
  performedBy: (row.performed_by || row.performedBy) as string,
  note: (row.note || '') as string,
  createdAt: (row.created_at || row.createdAt) as string,
  product: undefined as unknown as Product,
});

const mapProductTransactionToDb = (item: ProductTransaction | Partial<ProductTransaction>): Record<string, unknown> => {
  const result: Record<string, unknown> = {};
  if (item.id !== undefined) result.id = item.id;
  if (item.productId !== undefined) result.product_id = item.productId;
  if (item.type !== undefined) result.type = item.type;
  if (item.quantity !== undefined) result.quantity = item.quantity;
  if (item.unitCost !== undefined) result.unit_cost = item.unitCost;
  if (item.referenceType !== undefined) result.reference_type = item.referenceType;
  if (item.referenceId !== undefined) result.reference_id = item.referenceId;
  if (item.performedBy !== undefined) result.performed_by = item.performedBy;
  if (item.note !== undefined) result.note = item.note;
  if (item.createdAt !== undefined) result.created_at = item.createdAt;
  return result;
};

const mapSupplierFromDb = (row: Record<string, unknown>): Supplier => ({
  id: row.id as string,
  name: row.name as string,
  contactPerson: (row.contact_person || row.contactPerson) as string | undefined,
  phone: (row.phone || undefined) as string | undefined,
  email: (row.email || undefined) as string | undefined,
  address: (row.address || undefined) as string | undefined,
  taxId: (row.tax_id || row.taxId) as string | undefined,
  paymentTerms: Number(row.payment_terms || row.paymentTerms) || 15,
  isActive: row.is_active !== undefined || row.isActive !== undefined
    ? Boolean(row.is_active || row.isActive)
    : true,
  createdAt: (row.created_at || row.createdAt) as string,
});

const mapSupplierToDb = (item: Supplier | Partial<Supplier>): Record<string, unknown> => {
  const result: Record<string, unknown> = {};
  if (item.id !== undefined) result.id = item.id;
  if (item.name !== undefined) result.name = item.name;
  if (item.contactPerson !== undefined) result.contact_person = item.contactPerson;
  if (item.phone !== undefined) result.phone = item.phone;
  if (item.email !== undefined) result.email = item.email;
  if (item.address !== undefined) result.address = item.address;
  if (item.taxId !== undefined) result.tax_id = item.taxId;
  if (item.paymentTerms !== undefined) result.payment_terms = item.paymentTerms;
  if (item.isActive !== undefined) result.is_active = item.isActive;
  if (item.createdAt !== undefined) result.created_at = item.createdAt;
  return result;
};

const mapSaleFromDb = (row: Record<string, unknown>): Sale => ({
  id: row.id as string,
  saleNumber: (row.sale_number || row.saleNumber) as string,
  date: row.date as string,
  time: row.time as string,
  employeeId: (row.employee_id || row.employeeId) as string,
  shiftId: (row.shift_id || row.shiftId) as string | undefined,
  items: (row.items || []) as Sale['items'],
  subtotal: Number(row.subtotal) || 0,
  discount: Number(row.discount) || 0,
  tax: Number(row.tax) || 0,
  total: Number(row.total) || 0,
  payments: (row.payments || []) as Sale['payments'],
  paidAmount: Number(row.paid_amount || row.paidAmount) || 0,
  change: Number(row.change_amount || row.change) || 0,
  status: (row.status || 'pending') as Sale['status'],
  cancelledAt: (row.cancelled_at || row.cancelledAt) as string | undefined,
  cancelledBy: (row.cancelled_by || row.cancelledBy) as string | undefined,
  cancelReason: (row.cancel_reason || row.cancelReason) as string | undefined,
  refundedAt: (row.refunded_at || row.refundedAt) as string | undefined,
  refundedBy: (row.refunded_by || row.refundedBy) as string | undefined,
  refundReason: (row.refund_reason || row.refundReason) as string | undefined,
  originalSaleId: (row.original_sale_id || row.originalSaleId) as string | undefined,
  customerName: (row.customer_name || row.customerName) as string | undefined,
  customerPhone: (row.customer_phone || row.customerPhone) as string | undefined,
  customerType: (row.customer_type || row.customerType || 'general') as Sale['customerType'],
  memberId: (row.member_id || row.memberId) as string | undefined,
  note: (row.note || undefined) as string | undefined,
  createdAt: (row.created_at || row.createdAt) as string,
  updatedAt: (row.updated_at || row.updatedAt) as string,
});

const mapSaleToDb = (item: Sale | Partial<Sale>): Record<string, unknown> => {
  const result: Record<string, unknown> = {};
  if (item.id !== undefined) result.id = item.id;
  if (item.saleNumber !== undefined) result.sale_number = item.saleNumber;
  if (item.date !== undefined) result.date = item.date;
  if (item.time !== undefined) result.time = item.time;
  if (item.employeeId !== undefined) result.employee_id = item.employeeId;
  if (item.shiftId !== undefined) result.shift_id = item.shiftId;
  if (item.items !== undefined) result.items = item.items;
  if (item.subtotal !== undefined) result.subtotal = item.subtotal;
  if (item.discount !== undefined) result.discount = item.discount;
  if (item.tax !== undefined) result.tax = item.tax;
  if (item.total !== undefined) result.total = item.total;
  if (item.payments !== undefined) result.payments = item.payments;
  if (item.paidAmount !== undefined) result.paid_amount = item.paidAmount;
  if (item.change !== undefined) result.change_amount = item.change;
  if (item.status !== undefined) result.status = item.status;
  if (item.cancelledAt !== undefined) result.cancelled_at = item.cancelledAt;
  if (item.cancelledBy !== undefined) result.cancelled_by = item.cancelledBy;
  if (item.cancelReason !== undefined) result.cancel_reason = item.cancelReason;
  if (item.refundedAt !== undefined) result.refunded_at = item.refundedAt;
  if (item.refundedBy !== undefined) result.refunded_by = item.refundedBy;
  if (item.refundReason !== undefined) result.refund_reason = item.refundReason;
  if (item.originalSaleId !== undefined) result.original_sale_id = item.originalSaleId;
  if (item.customerName !== undefined) result.customer_name = item.customerName;
  if (item.customerPhone !== undefined) result.customer_phone = item.customerPhone;
  if (item.customerType !== undefined) result.customer_type = item.customerType;
  if (item.memberId !== undefined) result.member_id = item.memberId;
  if (item.note !== undefined) result.note = item.note;
  if (item.createdAt !== undefined) result.created_at = item.createdAt;
  if (item.updatedAt !== undefined) result.updated_at = item.updatedAt;
  return result;
};

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
// Backup table names
// ============================================
export type BackupTableName = 
  | 'users'
  | 'profiles'
  | 'positions'
  | 'skills'
  | 'profile_skills'
  | 'shifts'
  | 'schedules'
  | 'leave_requests'
  | 'swap_requests'
  | 'attendances'
  | 'daily_accounting'
  | 'fuel_prices'
  | 'notifications'
  | 'fuel_inventory'
  | 'fuel_deliveries'
  | 'products'
  | 'product_transactions'
  | 'suppliers'
  | 'sales'
  | 'stations'
  | 'payroll_periods'
  | 'payroll_records';

// Backup table labels (for UI)
export const backupTableLabels: Record<BackupTableName, string> = {
  users: 'ผู้ใช้งาน',
  profiles: 'ข้อมูลพนักงาน',
  positions: 'ตำแหน่งงาน',
  skills: 'ทักษะ',
  profile_skills: 'ทักษะพนักงาน',
  shifts: 'กะการทำงาน',
  schedules: 'ตารางงาน',
  leave_requests: 'คำขอลา',
  swap_requests: 'คำขอสลับกะ',
  attendances: 'การลงเวลา',
  daily_accounting: 'บัญชีรายวัน',
  fuel_prices: 'ราคาน้ำมัน',
  notifications: 'การแจ้งเตือน',
  fuel_inventory: 'สต็อกน้ำมัน',
  fuel_deliveries: 'การรับน้ำมัน',
  products: 'สินค้า',
  product_transactions: 'การเคลื่อนไหวสินค้า',
  suppliers: 'ซัพพลายเออร์',
  sales: 'การขาย (POS)',
  stations: 'สาขา',
  payroll_periods: 'งวดเงินเดือน',
  payroll_records: 'รายการจ่ายเงินเดือน',
};

// Backup table dependencies (for correct restore order)
export const backupTableDependencies: Partial<Record<BackupTableName, BackupTableName[]>> = {
  users: ['profiles'],
  profile_skills: ['profiles', 'skills'],
  schedules: ['shifts', 'profiles'],
  leave_requests: ['profiles'],
  swap_requests: ['profiles', 'schedules'],
  attendances: ['profiles', 'schedules'],
  daily_accounting: ['shifts', 'profiles'],
  notifications: ['users'],
  fuel_deliveries: ['suppliers'],
  product_transactions: ['products'],
  products: ['suppliers'],
  sales: ['profiles'],
  stations: ['profiles'],
  payroll_records: ['payroll_periods', 'profiles'],
};

// Backup Data Interface
export interface BackupData {
  version: string;
  exportedAt: string;
  exportedBy: string;
  selectedTables: BackupTableName[];
  tables: {
    users?: User[];
    profiles?: EmployeeProfile[];
    positions?: Position[];
    skills?: Skill[];
    profile_skills?: { profileid: string; skillid: string }[];
    shifts?: Shift[];
    schedules?: Schedule[];
    leave_requests?: LeaveRequest[];
    swap_requests?: SwapRequest[];
    attendances?: Attendance[];
    daily_accounting?: DailyAccounting[];
    fuel_prices?: FuelPrice[];
    notifications?: Notification[];
    fuel_inventory?: FuelInventory[];
    fuel_deliveries?: FuelDelivery[];
    products?: Product[];
    product_transactions?: ProductTransaction[];
    suppliers?: Supplier[];
    sales?: Sale[];
    stations?: Station[];
    payroll_periods?: PayrollPeriod[];
    payroll_records?: PayrollRecord[];
  };
}

// Helper function to sort tables by dependencies (topological sort)
function sortTablesByDependencies(tables: BackupTableName[]): BackupTableName[] {
  const result: BackupTableName[] = [];
  const visited = new Set<BackupTableName>();
  const temp = new Set<BackupTableName>();

  function visit(table: BackupTableName) {
    if (temp.has(table)) return;
    if (visited.has(table)) return;

    temp.add(table);

    const deps = backupTableDependencies[table] || [];
    for (const dep of deps) {
      if (tables.includes(dep)) {
        visit(dep);
      }
    }

    temp.delete(table);
    visited.add(table);
    result.push(table);
  }

  for (const table of tables) {
    visit(table);
  }

  return result;
}

// Backup Storage - Export selected tables to JSON file
export const backupStorage = {
  exportSelected: async (
    exportedBy: string, 
    selectedTables: BackupTableName[]
  ): Promise<BackupData> => {
    const sortedTables = sortTablesByDependencies(selectedTables);
    
    const result: BackupData = {
      version: BACKUP_VERSION,
      exportedAt: new Date().toISOString(),
      exportedBy,
      selectedTables,
      tables: {},
    };

    const fetchPromises = sortedTables.map(async (tableName) => {
      try {
        const { data, error } = await supabase.from(tableName).select('*');
        if (error) {
          console.error(`Error fetching ${tableName}:`, error);
          return { tableName, data: [] };
        }
        return { tableName, data: data || [] };
      } catch (err) {
        console.error(`Error fetching ${tableName}:`, err);
        return { tableName, data: [] };
      }
    });

    const fetchedData = await Promise.all(fetchPromises);

    fetchedData.forEach(({ tableName, data }) => {
      switch (tableName) {
        case 'users':
          result.tables.users = data.map((row: Record<string, unknown>) => mapUserFromDb(row));
          break;
        case 'profiles':
          result.tables.profiles = data.map((row: Record<string, unknown>) => mapProfileFromDb(row));
          break;
        case 'positions':
          result.tables.positions = data as Position[];
          break;
        case 'skills':
          result.tables.skills = data as Skill[];
          break;
        case 'profile_skills':
          result.tables.profile_skills = data as { profileid: string; skillid: string }[];
          break;
        case 'shifts':
          result.tables.shifts = data.map((s: Record<string, unknown>) => mapShiftFromDb(s));
          break;
        case 'schedules':
          result.tables.schedules = data.map(mapScheduleFromDb);
          break;
        case 'leave_requests':
          result.tables.leave_requests = data.map((row: Record<string, unknown>) => mapLeaveRequestFromDb(row));
          break;
        case 'swap_requests':
          result.tables.swap_requests = data.map((row: Record<string, unknown>) => mapSwapRequestFromDb(row));
          break;
        case 'attendances':
          result.tables.attendances = data.map((row: Record<string, unknown>) => mapAttendanceFromDb(row));
          break;
        case 'daily_accounting':
          result.tables.daily_accounting = data.map((row: Record<string, unknown>) => mapDailyAccountingFromDb(row));
          break;
        case 'fuel_prices':
          result.tables.fuel_prices = data.map((row: Record<string, unknown>) => mapFuelPriceFromDb(row));
          break;
        case 'notifications':
          result.tables.notifications = data.map((row: Record<string, unknown>) => mapNotificationFromDb(row));
          break;
        case 'fuel_inventory':
          result.tables.fuel_inventory = data.map((row: Record<string, unknown>) => mapFuelInventoryFromDb(row));
          break;
        case 'fuel_deliveries':
          result.tables.fuel_deliveries = data.map((row: Record<string, unknown>) => mapFuelDeliveryFromDb(row));
          break;
        case 'products':
          result.tables.products = data.map((row: Record<string, unknown>) => mapProductFromDb(row));
          break;
        case 'product_transactions':
          result.tables.product_transactions = data.map((row: Record<string, unknown>) => mapProductTransactionFromDb(row));
          break;
        case 'suppliers':
          result.tables.suppliers = data.map((row: Record<string, unknown>) => mapSupplierFromDb(row));
          break;
        case 'sales':
          result.tables.sales = data.map((row: Record<string, unknown>) => mapSaleFromDb(row));
          break;
        case 'stations':
          result.tables.stations = data.map((row: Record<string, unknown>) => mapStationFromDb(row));
          break;
        case 'payroll_periods':
          result.tables.payroll_periods = data.map((row: Record<string, unknown>) => mapPayrollPeriodFromDb(row));
          break;
        case 'payroll_records':
          result.tables.payroll_records = data.map((row: Record<string, unknown>) => mapPayrollRecordFromDb(row));
          break;
        default:
          (result.tables as Record<string, unknown[]>)[tableName] = data;
          break;
      }
    });

    return result;
  },

  exportAll: async (exportedBy: string): Promise<BackupData> => {
    const allTables: BackupTableName[] = [
      'users', 'profiles', 'positions', 'skills', 'profile_skills',
      'shifts', 'schedules', 'leave_requests', 'swap_requests',
      'attendances', 'daily_accounting', 'fuel_prices', 'notifications',
      'suppliers', 'products', 'fuel_inventory', 'fuel_deliveries',
      'product_transactions', 'sales', 'stations',
    ];
    return backupStorage.exportSelected(exportedBy, allTables);
  },

  downloadBackup: (backupData: BackupData): void => {
    const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    link.href = url;
    link.download = `backup-gasstation-${timestamp}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  },

  validateBackup: (data: unknown): data is BackupData => {
    if (typeof data !== 'object' || data === null) return false;
    const backup = data as Partial<BackupData>;

    if (
      typeof backup.version !== 'string' ||
      typeof backup.exportedAt !== 'string' ||
      typeof backup.exportedBy !== 'string' ||
      typeof backup.tables !== 'object' ||
      backup.tables === null
    ) {
      return false;
    }

    if (backup.version !== BACKUP_VERSION) {
      console.warn(`Backup version mismatch: expected ${BACKUP_VERSION}, got ${backup.version}`);
    }

    if (backup.selectedTables !== undefined && !Array.isArray(backup.selectedTables)) {
      return false;
    }

    const allValidTables: BackupTableName[] = [
      'users', 'profiles', 'positions', 'skills', 'profile_skills',
      'shifts', 'schedules', 'leave_requests', 'swap_requests',
      'attendances', 'daily_accounting', 'fuel_prices', 'notifications',
      'fuel_inventory', 'fuel_deliveries', 'products', 'product_transactions',
      'suppliers', 'sales', 'stations', 'payroll_periods', 'payroll_records',
    ];

    const tableKeys = Object.keys(backup.tables);
    for (const key of tableKeys) {
      if (!allValidTables.includes(key as BackupTableName)) {
        console.warn(`Invalid table name in backup: ${key}`);
        return false;
      }
      const tableData = backup.tables[key as keyof BackupData['tables']];
      if (tableData !== undefined && !Array.isArray(tableData)) {
        return false;
      }
    }

    return true;
  },

  restoreFromBackup: async (
    backupData: BackupData,
    selectedTables?: BackupTableName[],
    onProgress?: (tableName: BackupTableName, completed: number, total: number) => void
  ): Promise<{ success: boolean; restoredTables: string[]; failedTable?: string; error?: string }> => {
    const restoredTables: string[] = [];

    try {
      const tablesToRestore = selectedTables || backupData.selectedTables ||
        (Object.keys(backupData.tables) as BackupTableName[]).filter(
          (key) => backupData.tables[key] && backupData.tables[key]!.length > 0
        );

      const sortedTables = sortTablesByDependencies(tablesToRestore);
      const total = sortedTables.length;

      for (let i = 0; i < sortedTables.length; i++) {
        const tableName = sortedTables[i];
        const tableData = backupData.tables[tableName];
        if (!tableData || tableData.length === 0) {
          restoredTables.push(`${tableName} (ว่าง)`);
          if (onProgress) onProgress(tableName, i + 1, total);
          continue;
        }

        try {
          switch (tableName) {
            case 'positions':
              await supabase.from('positions').upsert(tableData);
              break;
            case 'skills':
              await supabase.from('skills').upsert(tableData);
              break;
            case 'shifts':
              await supabase.from('shifts').upsert((tableData as Shift[]).map(mapShiftToDb));
              break;
            case 'profiles': {
              const profileData = (tableData as EmployeeProfile[]).map((p) => {
                const { firstName, lastName } = splitFullName(p.fullName);
                return {
                  id: p.id,
                  userid: p.userId,
                  firstname: firstName,
                  lastname: lastName,
                  fullname: p.fullName,
                  phone: p.phone,
                  avatar: p.avatar,
                  positionid: p.positionId,
                  stationid: p.stationId,
                  status: p.status,
                  hiredate: p.hireDate,
                };
              });
              await supabase.from('profiles').upsert(profileData);
              break;
            }
            case 'users': {
              const userData = (tableData as User[]).map((u) => ({
                id: u.id,
                authuid: u.authUid,
                email: u.email,
                password: u.password,
                role: u.role,
                profileid: u.profileId,
                createdat: u.createdAt,
                updatedat: u.updatedAt,
              }));
              await supabase.from('users').upsert(userData);
              break;
            }
            case 'profile_skills':
              await supabase.from('profile_skills').upsert(tableData);
              break;
            case 'schedules':
              await supabase.from('schedules').upsert((tableData as Schedule[]).map(mapScheduleToDb));
              break;
            case 'leave_requests': {
              const leaveData = (tableData as LeaveRequest[]).map((l) => ({
                id: l.id,
                employeeid: l.employeeId,
                type: l.type,
                startdate: l.startDate,
                enddate: l.endDate,
                days: l.days,
                reason: l.reason,
                status: l.status,
                approvedby: l.approvedBy,
                approvedat: l.approvedAt,
                createdat: l.createdAt,
              }));
              await supabase.from('leave_requests').upsert(leaveData);
              break;
            }
            case 'swap_requests': {
              const swapData = (tableData as SwapRequest[]).map((s) => ({
                id: s.id,
                requesterid: s.requesterId,
                requestedid: s.requestedId,
                scheduleid: s.scheduleId,
                targetscheduleid: s.targetScheduleId,
                status: s.status,
                approvedby: s.approvedBy,
                createdat: s.createdAt,
              }));
              await supabase.from('swap_requests').upsert(swapData);
              break;
            }
            case 'attendances': {
              const attendanceData = (tableData as Attendance[]).map((a) => ({
                id: a.id,
                employeeid: a.employeeId,
                scheduleid: a.scheduleId,
                checkin: a.checkIn,
                checkout: a.checkOut,
                checkinlocation: a.checkInLocation,
                checkoutlocation: a.checkOutLocation,
                note: a.note,
                status: a.status,
              }));
              await supabase.from('attendances').upsert(attendanceData);
              break;
            }
            case 'daily_accounting':
              await supabase.from('daily_accounting').upsert(
                (tableData as DailyAccounting[]).map(mapDailyAccountingToDb)
              );
              break;
            case 'fuel_prices':
              await supabase.from('fuel_prices').upsert(
                (tableData as FuelPrice[]).map(mapFuelPriceToDb)
              );
              break;
            case 'notifications': {
              const notificationData = (tableData as Notification[]).map((n) => ({
                id: n.id,
                userid: n.userId,
                title: n.title,
                message: n.message,
                type: n.type,
                read: n.read,
                createdat: n.createdAt,
              }));
              await supabase.from('notifications').upsert(notificationData);
              break;
            }
            case 'fuel_inventory':
              await supabase.from('fuel_inventory').upsert(
                (tableData as FuelInventory[]).map(mapFuelInventoryToDb)
              );
              break;
            case 'fuel_deliveries':
              await supabase.from('fuel_deliveries').upsert(
                (tableData as FuelDelivery[]).map(mapFuelDeliveryToDb)
              );
              break;
            case 'products':
              await supabase.from('products').upsert(
                (tableData as Product[]).map(mapProductToDb)
              );
              break;
            case 'product_transactions':
              await supabase.from('product_transactions').upsert(
                (tableData as ProductTransaction[]).map(mapProductTransactionToDb)
              );
              break;
            case 'suppliers':
              await supabase.from('suppliers').upsert(
                (tableData as Supplier[]).map(mapSupplierToDb)
              );
              break;
            case 'sales':
              await supabase.from('sales').upsert(
                (tableData as Sale[]).map(mapSaleToDb)
              );
              break;
            case 'stations':
              await supabase.from('stations').upsert(
                (tableData as Station[]).map(mapStationToDb)
              );
              break;
            case 'payroll_periods':
              await supabase.from('payroll_periods').upsert(
                (tableData as PayrollPeriod[]).map(mapPayrollPeriodToDb)
              );
              break;
            case 'payroll_records':
              await supabase.from('payroll_records').upsert(
                (tableData as PayrollRecord[]).map(mapPayrollRecordToDb)
              );
              break;
            default:
              await supabase.from(tableName).upsert(tableData);
              break;
          }

          restoredTables.push(tableName);
          if (onProgress) onProgress(tableName, i + 1, total);
        } catch (err) {
          const errorMsg = err instanceof Error ? err.message : 'Unknown error';
          console.error(`Error restoring ${tableName}:`, err);
          return {
            success: false,
            restoredTables,
            failedTable: tableName,
            error: `${tableName}: ${errorMsg}`,
          };
        }
      }

      return { success: true, restoredTables };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return { success: false, restoredTables, error: errorMessage };
    }
  },
};
