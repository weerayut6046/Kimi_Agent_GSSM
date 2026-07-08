import type {
  FuelInventory,
  FuelDelivery,
  FuelType,
  Product,
  ProductCategory,
  ProductTransaction,
  TransactionType,
  Supplier,
} from '@/types/inventory';
import { supabase } from '@/lib/supabase';
import { logAudit } from './coreStorage';

// ============================================================================
// Helper Functions - Fuel Inventory Mapping
// ============================================================================

const mapFuelInventoryToDb = (item: Partial<FuelInventory>): Record<string, unknown> => {
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
  if (item.temperature !== undefined) result.temperature = item.temperature;
  if (item.density !== undefined) result.density = item.density;
  if (item.recordedBy !== undefined) result.recorded_by = item.recordedBy;
  if (item.note !== undefined) result.note = item.note;
  if (item.createdAt !== undefined) result.created_at = item.createdAt;
  return result;
};

const mapFuelInventoryFromDb = (row: Record<string, unknown>): FuelInventory => ({
  id: row.id as string,
  date: row.date as string,
  fuelType: row.fuel_type as FuelType,
  tankNumber: (row.tank_number as number) || 1,
  openingStock: Number(row.opening_stock) || 0,
  receivedQty: Number(row.received_qty) || 0,
  soldQty: Number(row.sold_qty) || 0,
  adjustmentQty: Number(row.adjustment_qty) || 0,
  closingStock: Number(row.closing_stock) || 0,
  actualStock: row.actual_stock !== null ? Number(row.actual_stock) : undefined,
  variance: Number(row.variance) || 0,
  temperature: row.temperature !== null ? Number(row.temperature) : undefined,
  density: row.density !== null ? Number(row.density) : undefined,
  recordedBy: (row.recorded_by as string) || '',
  note: (row.note as string) || '',
  createdAt: (row.created_at as string) || new Date().toISOString(),
});

// ============================================================================
// Helper Functions - Fuel Delivery Mapping
// ============================================================================

const mapFuelDeliveryToDb = (item: Partial<FuelDelivery>): Record<string, unknown> => {
  const result: Record<string, unknown> = {};
  if (item.id !== undefined) result.id = item.id;
  if (item.doNumber !== undefined) result.do_number = item.doNumber;
  if (item.supplierId !== undefined) result.supplier_id = item.supplierId;
  if (item.fuelType !== undefined) result.fuel_type = item.fuelType;
  if (item.quantityLiters !== undefined) result.quantity_liters = item.quantityLiters;
  if (item.pricePerLiter !== undefined) result.price_per_liter = item.pricePerLiter;
  if (item.deliveryDate !== undefined) result.delivery_date = item.deliveryDate;
  if (item.receivedDate !== undefined) result.received_date = item.receivedDate;
  if (item.receivedBy !== undefined) result.received_by = item.receivedBy;
  if (item.status !== undefined) result.status = item.status;
  if (item.note !== undefined) result.note = item.note;
  if (item.createdAt !== undefined) result.created_at = item.createdAt;
  return result;
};

const mapFuelDeliveryFromDb = (row: Record<string, unknown>): FuelDelivery => ({
  id: row.id as string,
  doNumber: row.do_number as string,
  supplierId: (row.supplier_id as string) || '',
  fuelType: row.fuel_type as FuelType,
  quantityLiters: Number(row.quantity_liters) || 0,
  pricePerLiter: Number(row.price_per_liter) || 0,
  totalAmount: Number(row.total_amount) || 0,
  deliveryDate: row.delivery_date as string,
  receivedDate: row.received_date as string | undefined,
  receivedBy: row.received_by as string | undefined,
  status: row.status as 'pending' | 'received' | 'rejected',
  note: (row.note as string) || '',
  createdAt: (row.created_at as string) || new Date().toISOString(),
});

// ============================================================================
// Helper Functions - Product Mapping
// ============================================================================

const mapProductToDb = (product: Partial<Product>): Record<string, unknown> => {
  const result: Record<string, unknown> = {};
  if (product.id !== undefined) result.id = product.id;
  if (product.barcode !== undefined) result.barcode = product.barcode;
  if (product.sku !== undefined) result.sku = product.sku;
  if (product.name !== undefined) result.name = product.name;
  if (product.category !== undefined) result.category = product.category;
  if (product.unit !== undefined) result.unit = product.unit;
  if (product.costPrice !== undefined) result.cost_price = product.costPrice;
  if (product.sellingPrice !== undefined) result.selling_price = product.sellingPrice;
  if (product.currentStock !== undefined) result.current_stock = product.currentStock;
  if (product.minStock !== undefined) result.min_stock = product.minStock;
  if (product.maxStock !== undefined) result.max_stock = product.maxStock;
  if (product.supplierId !== undefined) result.supplier_id = product.supplierId;
  if (product.isActive !== undefined) result.is_active = product.isActive;
  if (product.createdAt !== undefined) result.created_at = product.createdAt;
  return result;
};

const mapProductFromDb = (row: Record<string, unknown>): Product => ({
  id: row.id as string,
  barcode: row.barcode as string | undefined,
  sku: row.sku as string | undefined,
  name: row.name as string,
  category: row.category as ProductCategory,
  unit: (row.unit as string) || 'piece',
  costPrice: Number(row.cost_price) || 0,
  sellingPrice: Number(row.selling_price) || 0,
  currentStock: Number(row.current_stock) || 0,
  minStock: Number(row.min_stock) || 10,
  maxStock: Number(row.max_stock) || 100,
  supplierId: row.supplier_id as string | undefined,
  isActive: row.is_active !== false,
  createdAt: (row.created_at as string) || new Date().toISOString(),
});

// ============================================================================
// Helper Functions - Product Transaction Mapping
// ============================================================================

const mapProductTransactionToDb = (transaction: Partial<ProductTransaction>): Record<string, unknown> => {
  const result: Record<string, unknown> = {};
  if (transaction.id !== undefined) result.id = transaction.id;
  if (transaction.productId !== undefined) result.product_id = transaction.productId;
  if (transaction.type !== undefined) result.type = transaction.type;
  if (transaction.quantity !== undefined) result.quantity = transaction.quantity;
  if (transaction.unitCost !== undefined) result.unit_cost = transaction.unitCost;
  if (transaction.referenceType !== undefined) result.reference_type = transaction.referenceType;
  if (transaction.referenceId !== undefined) result.reference_id = transaction.referenceId;
  if (transaction.performedBy !== undefined) result.performed_by = transaction.performedBy;
  if (transaction.note !== undefined) result.note = transaction.note;
  if (transaction.createdAt !== undefined) result.created_at = transaction.createdAt;
  return result;
};

const mapProductTransactionFromDb = (row: Record<string, unknown>): ProductTransaction => ({
  id: row.id as string,
  productId: (row.product_id as string) || '',
  type: row.type as TransactionType,
  quantity: Number(row.quantity) || 0,
  unitCost: row.unit_cost !== null ? Number(row.unit_cost) : undefined,
  referenceType: row.reference_type as string | undefined,
  referenceId: row.reference_id as string | undefined,
  performedBy: (row.performed_by as string) || '',
  note: (row.note as string) || '',
  createdAt: (row.created_at as string) || new Date().toISOString(),
});

// ============================================================================
// Helper Functions - Supplier Mapping
// ============================================================================

const mapSupplierToDb = (supplier: Partial<Supplier>): Record<string, unknown> => {
  const result: Record<string, unknown> = {};
  if (supplier.id !== undefined) result.id = supplier.id;
  if (supplier.name !== undefined) result.name = supplier.name;
  if (supplier.contactPerson !== undefined) result.contact_person = supplier.contactPerson;
  if (supplier.phone !== undefined) result.phone = supplier.phone;
  if (supplier.email !== undefined) result.email = supplier.email;
  if (supplier.address !== undefined) result.address = supplier.address;
  if (supplier.taxId !== undefined) result.tax_id = supplier.taxId;
  if (supplier.paymentTerms !== undefined) result.payment_terms = supplier.paymentTerms;
  if (supplier.isActive !== undefined) result.is_active = supplier.isActive;
  if (supplier.createdAt !== undefined) result.created_at = supplier.createdAt;
  return result;
};

const mapSupplierFromDb = (row: Record<string, unknown>): Supplier => ({
  id: row.id as string,
  name: row.name as string,
  contactPerson: row.contact_person as string | undefined,
  phone: row.phone as string | undefined,
  email: row.email as string | undefined,
  address: row.address as string | undefined,
  taxId: row.tax_id as string | undefined,
  paymentTerms: Number(row.payment_terms) || 15,
  isActive: row.is_active !== false,
  createdAt: (row.created_at as string) || new Date().toISOString(),
});

// ============================================================================
// Fuel Inventory Storage
// ============================================================================

export const fuelInventoryStorage = {
  getByDateRange: async (start: string, end: string): Promise<FuelInventory[]> => {
    const { data, error } = await supabase
      .from('fuel_inventory')
      .select('*')
      .gte('date', start)
      .lte('date', end)
      .order('date', { ascending: false });
    
    if (error) {
      console.error('Error fetching fuel inventory:', error);
      return [];
    }
    return (data || []).map(mapFuelInventoryFromDb);
  },

  getLatestByType: async (fuelType: FuelType): Promise<FuelInventory | undefined> => {
    const { data, error } = await supabase
      .from('fuel_inventory')
      .select('*')
      .eq('fuel_type', fuelType)
      .order('date', { ascending: false })
      .limit(1);
    
    if (error || !data || data.length === 0) return undefined;
    return mapFuelInventoryFromDb(data[0]);
  },

  create: async (data: Omit<FuelInventory, 'id' | 'variance' | 'createdAt'>): Promise<FuelInventory | null> => {
    const id = `finv${Date.now()}`;
    const now = new Date().toISOString();
    
    // Calculate closing stock and variance
    const closingStock = data.openingStock + data.receivedQty - data.soldQty + data.adjustmentQty;
    const variance = (data.actualStock !== undefined ? data.actualStock : closingStock) - closingStock;
    
    const dbData = mapFuelInventoryToDb({
      ...data,
      id,
      closingStock,
      variance,
      createdAt: now,
    });
    
    const { error } = await supabase.from('fuel_inventory').insert(dbData);
    if (error) {
      console.error('Error creating fuel inventory:', error);
      return null;
    }
    
    await logAudit({ tableName: 'fuel_inventory', recordId: id, action: 'create', newValue: dbData });
    return { ...data, id, closingStock, variance, createdAt: now };
  },

  updateActualStock: async (id: string, actualStock: number): Promise<boolean> => {
    // Get current record to recalculate variance
    const { data: current } = await supabase
      .from('fuel_inventory')
      .select('closing_stock')
      .eq('id', id)
      .single();
    
    if (!current) return false;
    
    const variance = actualStock - Number(current.closing_stock);
    
    const { error } = await supabase
      .from('fuel_inventory')
      .update({
        actual_stock: actualStock,
        variance: variance,
      })
      .eq('id', id);
    
    if (error) {
      console.error('Error updating actual stock:', error);
      return false;
    }
    await logAudit({ tableName: 'fuel_inventory', recordId: id, action: 'update', newValue: { actual_stock: actualStock, variance } });
    return true;
  },

  // Auto-update sold quantity from daily accounting
  updateSoldQty: async (date: string, fuelType: FuelType, liters: number): Promise<void> => {
    const { data: existing } = await supabase
      .from('fuel_inventory')
      .select('id, sold_qty, opening_stock, received_qty, adjustment_qty, actual_stock')
      .eq('date', date)
      .eq('fuel_type', fuelType)
      .single();
    
    if (existing) {
      const newSoldQty = Number(existing.sold_qty) + liters;
      const closingStock = Number(existing.opening_stock) + Number(existing.received_qty) - newSoldQty + Number(existing.adjustment_qty);
      const variance = (existing.actual_stock !== null ? Number(existing.actual_stock) : closingStock) - closingStock;
      
      await supabase
        .from('fuel_inventory')
        .update({
          sold_qty: newSoldQty,
          closing_stock: closingStock,
          variance: variance,
        })
        .eq('id', existing.id);
    }
  },
};

// ============================================================================
// Fuel Delivery Storage
// ============================================================================

export const fuelDeliveryStorage = {
  getAll: async (): Promise<FuelDelivery[]> => {
    const { data, error } = await supabase
      .from('fuel_deliveries')
      .select('*')
      .order('delivery_date', { ascending: false });
    
    if (error) {
      console.error('Error fetching fuel deliveries:', error);
      return [];
    }
    return (data || []).map(mapFuelDeliveryFromDb);
  },

  getPending: async (): Promise<FuelDelivery[]> => {
    const { data, error } = await supabase
      .from('fuel_deliveries')
      .select('*')
      .eq('status', 'pending')
      .order('delivery_date', { ascending: false });
    
    if (error) {
      console.error('Error fetching pending deliveries:', error);
      return [];
    }
    return (data || []).map(mapFuelDeliveryFromDb);
  },

  create: async (data: Omit<FuelDelivery, 'id' | 'totalAmount' | 'createdAt'>): Promise<FuelDelivery | null> => {
    const id = `fdel${Date.now()}`;
    const now = new Date().toISOString();
    const totalAmount = data.quantityLiters * data.pricePerLiter;
    
    const dbData = mapFuelDeliveryToDb({
      ...data,
      id,
      totalAmount,
      createdAt: now,
    });
    
    const { error } = await supabase.from('fuel_deliveries').insert(dbData);
    if (error) {
      console.error('Error creating fuel delivery:', error);
      return null;
    }
    
    await logAudit({ tableName: 'fuel_deliveries', recordId: id, action: 'create', newValue: dbData });
    return { ...data, id, totalAmount, createdAt: now };
  },

  confirm: async (id: string, receivedBy: string): Promise<boolean> => {
    const receivedDate = new Date().toISOString();
    
    const { data: delivery } = await supabase
      .from('fuel_deliveries')
      .select('*')
      .eq('id', id)
      .single();
    
    if (!delivery) return false;
    
    // Update delivery status
    const { error: updateError } = await supabase
      .from('fuel_deliveries')
      .update({
        status: 'received',
        received_date: receivedDate,
        received_by: receivedBy,
      })
      .eq('id', id);
    
    if (updateError) {
      console.error('Error confirming delivery:', updateError);
      return false;
    }
    
    await logAudit({ tableName: 'fuel_deliveries', recordId: id, action: 'update', newValue: { status: 'received', received_date: receivedDate, received_by: receivedBy } });
    
    // Update fuel inventory received quantity
    const fuelType = delivery.fuel_type as FuelType;
    const quantity = Number(delivery.quantity_liters);
    const deliveryDate = delivery.delivery_date as string;
    
    // Find or create inventory record for delivery date
    const { data: inventory } = await supabase
      .from('fuel_inventory')
      .select('*')
      .eq('date', deliveryDate)
      .eq('fuel_type', fuelType)
      .single();
    
    if (inventory) {
      const newReceivedQty = Number(inventory.received_qty) + quantity;
      const newClosingStock = Number(inventory.opening_stock) + newReceivedQty - Number(inventory.sold_qty) + Number(inventory.adjustment_qty);
      const variance = (inventory.actual_stock !== null ? Number(inventory.actual_stock) : newClosingStock) - newClosingStock;
      
      await supabase
        .from('fuel_inventory')
        .update({
          received_qty: newReceivedQty,
          closing_stock: newClosingStock,
          variance: variance,
        })
        .eq('id', inventory.id);
    } else {
      // Get previous day's closing stock as opening stock
      const { data: prevInventory } = await supabase
        .from('fuel_inventory')
        .select('closing_stock')
        .eq('fuel_type', fuelType)
        .lt('date', deliveryDate)
        .order('date', { ascending: false })
        .limit(1)
        .single();
      
      const openingStock = prevInventory ? Number(prevInventory.closing_stock) : 0;
      const closingStock = openingStock + quantity;
      
      await supabase.from('fuel_inventory').insert({
        id: `finv${Date.now()}`,
        date: deliveryDate,
        fuel_type: fuelType,
        tank_number: 1,
        opening_stock: openingStock,
        received_qty: quantity,
        sold_qty: 0,
        adjustment_qty: 0,
        closing_stock: closingStock,
        recorded_by: receivedBy,
        note: `Auto-created from delivery ${delivery.do_number}`,
        created_at: receivedDate,
      });
    }
    
    return true;
  },

  reject: async (id: string): Promise<boolean> => {
    const { error } = await supabase
      .from('fuel_deliveries')
      .update({ status: 'rejected' })
      .eq('id', id);
    
    if (error) {
      console.error('Error rejecting delivery:', error);
      return false;
    }
    await logAudit({ tableName: 'fuel_deliveries', recordId: id, action: 'update', newValue: { status: 'rejected' } });
    return true;
  },
};

// ============================================================================
// Product Storage
// ============================================================================

export const productStorage = {
  getAll: async (): Promise<Product[]> => {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('is_active', true)
      .order('name');
    
    if (error) {
      console.error('Error fetching products:', error);
      return [];
    }
    return (data || []).map(mapProductFromDb);
  },

  getById: async (id: string): Promise<Product | undefined> => {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error || !data) return undefined;
    return mapProductFromDb(data);
  },

  getByBarcode: async (barcode: string): Promise<Product | undefined> => {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('barcode', barcode)
      .eq('is_active', true)
      .single();
    
    if (error || !data) return undefined;
    return mapProductFromDb(data);
  },

  create: async (product: Omit<Product, 'id' | 'createdAt'>): Promise<Product | null> => {
    const id = `prod${Date.now()}`;
    const now = new Date().toISOString();
    
    const dbData = mapProductToDb({
      ...product,
      id,
      createdAt: now,
    });
    
    const { error } = await supabase.from('products').insert(dbData);
    if (error) {
      console.error('Error creating product:', error);
      return null;
    }
    
    await logAudit({ tableName: 'products', recordId: id, action: 'create', newValue: dbData });
    return { ...product, id, createdAt: now };
  },

  update: async (id: string, updates: Partial<Product>): Promise<boolean> => {
    const dbUpdates = mapProductToDb(updates);
    
    const { error } = await supabase
      .from('products')
      .update(dbUpdates)
      .eq('id', id);
    
    if (error) {
      console.error('Error updating product:', error);
      return false;
    }
    await logAudit({ tableName: 'products', recordId: id, action: 'update', newValue: dbUpdates });
    return true;
  },

  delete: async (id: string): Promise<boolean> => {
    // Soft delete
    const { error } = await supabase
      .from('products')
      .update({ is_active: false })
      .eq('id', id);
    
    if (error) {
      console.error('Error deleting product:', error);
      return false;
    }
    await logAudit({ tableName: 'products', recordId: id, action: 'delete', newValue: { is_active: false } });
    return true;
  },

  adjustStock: async (
    productId: string,
    quantity: number,
    type: TransactionType,
    note: string,
    performedBy: string,
    referenceType?: string,
    referenceId?: string
  ): Promise<boolean> => {
    const now = new Date().toISOString();
    
    // Get current product
    const { data: product } = await supabase
      .from('products')
      .select('current_stock, cost_price')
      .eq('id', productId)
      .single();
    
    if (!product) return false;
    
    // Calculate new stock
    let newStock = Number(product.current_stock);
    if (type === 'in' || type === 'return') {
      newStock += quantity;
    } else if (type === 'out') {
      newStock -= quantity;
    } else if (type === 'adjust') {
      newStock = quantity; // Direct adjustment
    }
    
    // Ensure non-negative
    if (newStock < 0) newStock = 0;
    
    // Create transaction record
    const transactionId = `ptrx${Date.now()}`;
    const transactionData = mapProductTransactionToDb({
      id: transactionId,
      productId,
      type,
      quantity,
      unitCost: type === 'in' ? Number(product.cost_price) : undefined,
      referenceType,
      referenceId,
      performedBy,
      note,
      createdAt: now,
    });
    
    // Update product stock
    const { error: updateError } = await supabase
      .from('products')
      .update({ current_stock: newStock })
      .eq('id', productId);
    
    if (updateError) {
      console.error('Error updating product stock:', updateError);
      return false;
    }
    
    // Insert transaction record
    const { error: trxError } = await supabase
      .from('product_transactions')
      .insert(transactionData);
    
    if (trxError) {
      console.error('Error recording transaction:', trxError);
      // Rollback stock update would be complex, log for manual fix
    } else {
      await logAudit({ tableName: 'product_transactions', recordId: transactionId, action: 'create', newValue: transactionData });
    }
    
    return true;
  },

  // Get stock transaction history
  getTransactions: async (productId?: string, limit: number = 50): Promise<ProductTransaction[]> => {
    let query = supabase
      .from('product_transactions')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);
    
    if (productId) {
      query = query.eq('product_id', productId);
    }
    
    const { data, error } = await query;
    
    if (error) {
      console.error('Error fetching transactions:', error);
      return [];
    }
    return (data || []).map(mapProductTransactionFromDb);
  },
};

// ============================================================================
// Supplier Storage
// ============================================================================

export const supplierStorage = {
  getAll: async (): Promise<Supplier[]> => {
    const { data, error } = await supabase
      .from('suppliers')
      .select('*')
      .eq('is_active', true)
      .order('name');
    
    if (error) {
      console.error('Error fetching suppliers:', error);
      return [];
    }
    return (data || []).map(mapSupplierFromDb);
  },

  getById: async (id: string): Promise<Supplier | undefined> => {
    const { data, error } = await supabase
      .from('suppliers')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error || !data) return undefined;
    return mapSupplierFromDb(data);
  },

  create: async (supplier: Omit<Supplier, 'id' | 'createdAt'>): Promise<Supplier | null> => {
    const id = `supp${Date.now()}`;
    const now = new Date().toISOString();
    
    const dbData = mapSupplierToDb({
      ...supplier,
      id,
      createdAt: now,
    });
    
    const { error } = await supabase.from('suppliers').insert(dbData);
    if (error) {
      console.error('Error creating supplier:', error);
      return null;
    }
    
    await logAudit({ tableName: 'suppliers', recordId: id, action: 'create', newValue: dbData });
    return { ...supplier, id, createdAt: now };
  },

  update: async (id: string, updates: Partial<Supplier>): Promise<boolean> => {
    const dbUpdates = mapSupplierToDb(updates);
    
    const { error } = await supabase
      .from('suppliers')
      .update(dbUpdates)
      .eq('id', id);
    
    if (error) {
      console.error('Error updating supplier:', error);
      return false;
    }
    await logAudit({ tableName: 'suppliers', recordId: id, action: 'update', newValue: dbUpdates });
    return true;
  },

  delete: async (id: string): Promise<boolean> => {
    const { error } = await supabase
      .from('suppliers')
      .update({ is_active: false })
      .eq('id', id);
    
    if (error) {
      console.error('Error deleting supplier:', error);
      return false;
    }
    await logAudit({ tableName: 'suppliers', recordId: id, action: 'delete', newValue: { is_active: false } });
    return true;
  },
};
