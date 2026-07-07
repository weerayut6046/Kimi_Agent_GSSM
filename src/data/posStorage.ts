// POS Storage - Supabase operations for POS system
import { supabase } from '@/lib/supabase';
import type { Sale, SaleItem, Payment, DailySalesSummary, QuickProduct } from '@/types/pos';
import { generateId } from '@/lib/utils';

// Generate sale number (POS-YYYYMMDD-XXX)
const generateSaleNumber = (): string => {
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const random = Math.floor(Math.random() * 999).toString().padStart(3, '0');
  return `POS-${date}-${random}`;
};

// Map database row to Sale object
const mapSaleFromDb = (row: Record<string, unknown>): Sale => ({
  id: row.id as string,
  saleNumber: row.sale_number as string,
  date: row.date as string,
  time: row.time as string,
  employeeId: row.employee_id as string,
  shiftId: row.shift_id as string | undefined,
  items: (row.items as SaleItem[]) || [],
  subtotal: Number(row.subtotal) || 0,
  discount: Number(row.discount) || 0,
  tax: Number(row.tax) || 0,
  total: Number(row.total) || 0,
  payments: (row.payments as Payment[]) || [],
  paidAmount: Number(row.paid_amount) || 0,
  change: Number(row.change_amount) || 0,
  status: row.status as Sale['status'],
  cancelledAt: row.cancelled_at as string | undefined,
  cancelledBy: row.cancelled_by as string | undefined,
  cancelReason: row.cancel_reason as string | undefined,
  refundedAt: row.refunded_at as string | undefined,
  refundedBy: row.refunded_by as string | undefined,
  refundReason: row.refund_reason as string | undefined,
  originalSaleId: row.original_sale_id as string | undefined,
  customerName: row.customer_name as string | undefined,
  customerPhone: row.customer_phone as string | undefined,
  customerType: row.customer_type as Sale['customerType'] || 'general',
  memberId: row.member_id as string | undefined,
  note: row.note as string | undefined,
  createdAt: row.created_at as string,
  updatedAt: row.updated_at as string,
});

// Map Sale object to database row
const mapSaleToDb = (sale: Partial<Sale>): Record<string, unknown> => ({
  ...(sale.id && { id: sale.id }),
  ...(sale.saleNumber && { sale_number: sale.saleNumber }),
  ...(sale.date && { date: sale.date }),
  ...(sale.time && { time: sale.time }),
  ...(sale.employeeId && { employee_id: sale.employeeId }),
  ...(sale.shiftId && { shift_id: sale.shiftId }),
  ...(sale.items && { items: sale.items }),
  ...(sale.subtotal !== undefined && { subtotal: sale.subtotal }),
  ...(sale.discount !== undefined && { discount: sale.discount }),
  ...(sale.tax !== undefined && { tax: sale.tax }),
  ...(sale.total !== undefined && { total: sale.total }),
  ...(sale.payments && { payments: sale.payments }),
  ...(sale.paidAmount !== undefined && { paid_amount: sale.paidAmount }),
  ...(sale.change !== undefined && { change_amount: sale.change }),
  ...(sale.status && { status: sale.status }),
  ...(sale.cancelledAt && { cancelled_at: sale.cancelledAt }),
  ...(sale.cancelledBy && { cancelled_by: sale.cancelledBy }),
  ...(sale.cancelReason && { cancel_reason: sale.cancelReason }),
  ...(sale.refundedAt && { refunded_at: sale.refundedAt }),
  ...(sale.refundedBy && { refunded_by: sale.refundedBy }),
  ...(sale.refundReason && { refund_reason: sale.refundReason }),
  ...(sale.originalSaleId && { original_sale_id: sale.originalSaleId }),
  ...(sale.customerName && { customer_name: sale.customerName }),
  ...(sale.customerPhone && { customer_phone: sale.customerPhone }),
  ...(sale.customerType && { customer_type: sale.customerType }),
  ...(sale.memberId && { member_id: sale.memberId }),
  ...(sale.note && { note: sale.note }),
  ...(sale.createdAt && { created_at: sale.createdAt }),
  ...(sale.updatedAt && { updated_at: sale.updatedAt }),
});

// Sale storage operations
export const saleStorage = {
  // Get all sales
  getAll: async (): Promise<Sale[]> => {
    const { data, error } = await supabase
      .from('sales')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Error fetching sales:', error);
      return [];
    }
    
    return (data || []).map(mapSaleFromDb);
  },

  // Get sales by date
  getByDate: async (date: string): Promise<Sale[]> => {
    const { data, error } = await supabase
      .from('sales')
      .select('*')
      .eq('date', date)
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Error fetching sales by date:', error);
      return [];
    }
    
    return (data || []).map(mapSaleFromDb);
  },

  // Get sale by ID
  getById: async (id: string): Promise<Sale | undefined> => {
    const { data, error } = await supabase
      .from('sales')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error || !data) {
      console.error('Error fetching sale:', error);
      return undefined;
    }
    
    return mapSaleFromDb(data);
  },

  // Get sale by number
  getByNumber: async (saleNumber: string): Promise<Sale | undefined> => {
    const { data, error } = await supabase
      .from('sales')
      .select('*')
      .eq('sale_number', saleNumber)
      .single();
    
    if (error || !data) {
      console.error('Error fetching sale by number:', error);
      return undefined;
    }
    
    return mapSaleFromDb(data);
  },

  // Create new sale
  create: async (saleData: Omit<Sale, 'id' | 'saleNumber' | 'createdAt' | 'updatedAt'>): Promise<Sale> => {
    const now = new Date().toISOString();
    const saleNumber = generateSaleNumber();
    
    const newSale: Partial<Sale> = {
      id: generateId(),
      saleNumber,
      date: saleData.date || now.slice(0, 10),
      time: saleData.time || now.slice(11, 19),
      employeeId: saleData.employeeId,
      shiftId: saleData.shiftId,
      items: saleData.items || [],
      subtotal: saleData.subtotal || 0,
      discount: saleData.discount || 0,
      tax: saleData.tax || 0,
      total: saleData.total || 0,
      payments: saleData.payments || [],
      paidAmount: saleData.paidAmount || 0,
      change: saleData.change || 0,
      status: saleData.status || 'pending',
      customerName: saleData.customerName,
      customerPhone: saleData.customerPhone,
      customerType: saleData.customerType || 'general',
      memberId: saleData.memberId,
      note: saleData.note,
      createdAt: now,
      updatedAt: now,
    };

    const dbData = mapSaleToDb(newSale);
    
    const { data, error } = await supabase
      .from('sales')
      .insert(dbData)
      .select()
      .single();

    if (error) {
      console.error('Error creating sale:', error);
      console.error('Error details:', JSON.stringify(error, null, 2));
      throw error;
    }

    return mapSaleFromDb(data);
  },

  // Update sale
  update: async (id: string, updates: Partial<Sale>): Promise<Sale | undefined> => {
    const updateData = mapSaleToDb({
      ...updates,
      updatedAt: new Date().toISOString(),
    });

    const { data, error } = await supabase
      .from('sales')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error || !data) {
      console.error('Error updating sale:', error);
      return undefined;
    }

    return mapSaleFromDb(data);
  },

  // Cancel sale
  cancel: async (id: string, cancelledBy: string, reason: string): Promise<Sale | undefined> => {
    const updateData = mapSaleToDb({
      status: 'cancelled',
      cancelledAt: new Date().toISOString(),
      cancelledBy,
      cancelReason: reason,
      updatedAt: new Date().toISOString(),
    });

    const { data, error } = await supabase
      .from('sales')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error || !data) {
      console.error('Error cancelling sale:', error);
      return undefined;
    }

    return mapSaleFromDb(data);
  },

  // Refund sale
  refund: async (id: string, refundedBy: string, reason: string): Promise<Sale | undefined> => {
    const updateData = mapSaleToDb({
      status: 'refunded',
      refundedAt: new Date().toISOString(),
      refundedBy,
      refundReason: reason,
      updatedAt: new Date().toISOString(),
    });

    const { data, error } = await supabase
      .from('sales')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error || !data) {
      console.error('Error refunding sale:', error);
      return undefined;
    }

    return mapSaleFromDb(data);
  },

  // Get today's sales
  getToday: async (): Promise<Sale[]> => {
    const today = new Date().toISOString().slice(0, 10);
    return saleStorage.getByDate(today);
  },

  // Get sales by employee
  getByEmployee: async (employeeId: string, date?: string): Promise<Sale[]> => {
    let query = supabase
      .from('sales')
      .select('*')
      .eq('employee_id', employeeId);
    
    if (date) {
      query = query.eq('date', date);
    }
    
    const { data, error } = await query.order('created_at', { ascending: false });
    
    if (error) {
      console.error('Error fetching employee sales:', error);
      return [];
    }
    
    return (data || []).map(mapSaleFromDb);
  },
};

// Product stock operations (update stock when selling)
export const posStockStorage = {
  // Deduct product stock
  deductStock: async (productId: string, quantity: number, saleId: string): Promise<boolean> => {
    try {
      // Get current stock
      const { data: product, error: fetchError } = await supabase
        .from('products')
        .select('current_stock')
        .eq('id', productId)
        .single();
      
      if (fetchError || !product) {
        console.error('Error fetching product stock:', fetchError);
        return false;
      }

      const currentStock = Number(product.current_stock) || 0;
      const newStock = currentStock - quantity;

      if (newStock < 0) {
        console.error('Insufficient stock');
        return false;
      }

      // Update stock
      const { error: updateError } = await supabase
        .from('products')
        .update({ current_stock: newStock, updated_at: new Date().toISOString() })
        .eq('id', productId);

      if (updateError) {
        console.error('Error updating stock:', updateError);
        return false;
      }

      // Create transaction record
      await supabase.from('product_transactions').insert({
        id: generateId(),
        product_id: productId,
        type: 'out',
        quantity: -quantity,
        reference_type: 'sale',
        reference_id: saleId,
        created_at: new Date().toISOString(),
      });

      return true;
    } catch (err) {
      console.error('Error deducting stock:', err);
      return false;
    }
  },

  // Restore stock (for cancel/refund)
  restoreStock: async (productId: string, quantity: number, reason: string): Promise<boolean> => {
    try {
      // Get current stock
      const { data: product, error: fetchError } = await supabase
        .from('products')
        .select('current_stock')
        .eq('id', productId)
        .single();
      
      if (fetchError || !product) {
        console.error('Error fetching product stock:', fetchError);
        return false;
      }

      const currentStock = Number(product.current_stock) || 0;
      const newStock = currentStock + quantity;

      // Update stock
      const { error: updateError } = await supabase
        .from('products')
        .update({ current_stock: newStock, updated_at: new Date().toISOString() })
        .eq('id', productId);

      if (updateError) {
        console.error('Error restoring stock:', updateError);
        return false;
      }

      // Create transaction record
      await supabase.from('product_transactions').insert({
        id: generateId(),
        product_id: productId,
        type: 'adjust',
        quantity: quantity,
        note: reason,
        created_at: new Date().toISOString(),
      });

      return true;
    } catch (err) {
      console.error('Error restoring stock:', err);
      return false;
    }
  },
};

// Daily summary operations
export const posSummaryStorage = {
  // Get daily summary
  getDailySummary: async (date?: string): Promise<DailySalesSummary> => {
    const targetDate = date || new Date().toISOString().slice(0, 10);
    const sales = await saleStorage.getByDate(targetDate);
    
    const completedSales = sales.filter(s => s.status === 'completed');
    
    // Calculate totals
    let totalSales = 0;
    let totalItems = 0;
    let productSales = 0;
    let serviceSales = 0;
    let discounts = 0;
    let taxes = 0;
    
    const fuelSales = {
      '95': 0,
      'B7': 0,
      'B10': 0,
      'Diesel': 0,
    };
    
    const paymentMethods: Record<Payment['method'], number> = {
      cash: 0,
      credit_card: 0,
      debit_card: 0,
      qr_code: 0,
      e_wallet: 0,
      bank_transfer: 0,
      credit: 0,
    };

    for (const sale of completedSales) {
      totalSales += sale.total;
      discounts += sale.discount;
      taxes += sale.tax;
      
      for (const item of sale.items) {
        totalItems += item.quantity;
        
        if (item.type === 'fuel' && item.fuelType) {
          fuelSales[item.fuelType] += item.totalPrice;
        } else if (item.type === 'product') {
          productSales += item.totalPrice;
        } else if (item.type === 'service') {
          serviceSales += item.totalPrice;
        }
      }
      
      for (const payment of sale.payments) {
        if (payment.status === 'completed') {
          paymentMethods[payment.method] += payment.amount;
        }
      }
    }

    return {
      date: targetDate,
      totalSales,
      totalTransactions: completedSales.length,
      totalItems,
      fuelSales,
      productSales,
      serviceSales,
      paymentMethods,
      discounts,
      taxes,
    };
  },
};

// Quick products for POS
export const quickProductStorage = {
  // Get quick products (can add popular products here)
  getQuickProducts: async (): Promise<QuickProduct[]> => {
    // Get products from database
    const { data, error } = await supabase
      .from('products')
      .select('id, name, barcode, selling_price, current_stock')
      .gt('current_stock', 0)
      .order('name')
      .limit(20);
    
    if (error) {
      console.error('Error fetching quick products:', error);
      return [];
    }

    return (data || []).map(p => ({
      id: p.id,
      name: p.name,
      price: Number(p.selling_price) || 0,
      type: 'product' as const,
      barcode: p.barcode,
      color: '#3b82f6',
    }));
  },

  // Get fuel types as quick products
  getFuelProducts: async (): Promise<QuickProduct[]> => {
    // Get current fuel prices
    const { data: priceData, error } = await supabase
      .from('fuel_prices')
      .select('"95", "B7", "B10", "Diesel"')
      .order('effectivedate', { ascending: false })
      .limit(1)
      .single();

    if (error || !priceData) {
      console.error('Error fetching fuel prices:', error);
      return [];
    }

    const fuelTypes: Array<{ type: '95' | 'B7' | 'B10' | 'Diesel'; name: string; color: string }> = [
      { type: '95', name: 'Gasohol 95', color: '#ef4444' },
      { type: 'B7', name: 'Gasohol B7', color: '#22c55e' },
      { type: 'B10', name: 'Gasohol B10', color: '#eab308' },
      { type: 'Diesel', name: 'Diesel B7', color: '#6b7280' },
    ];

    return fuelTypes.map(f => ({
      id: `fuel-${f.type}`,
      name: f.name,
      price: Number(priceData[f.type]) || 0,
      type: 'fuel' as const,
      fuelType: f.type,
      unit: 'ลิตร',
      color: f.color,
    }));
  },
};
