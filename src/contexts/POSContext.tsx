// POS Context - Manage POS state and operations
import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef, type ReactNode } from 'react';
import type { CartItem, Sale, Payment, DailySalesSummary, QuickProduct, POSContextType } from '@/types/pos';
import { saleStorage, posStockStorage, posSummaryStorage, quickProductStorage } from '@/data/posStorage';
import { generateId } from '@/lib/utils';
import { toast } from 'sonner';
import { subscribeToTables } from '@/lib/realtime';

const POSContext = createContext<POSContextType | undefined>(undefined);

export const POSProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // Cart state
  const [cart, setCart] = useState<CartItem[]>([]);
  
  // Current sale
  const [currentSale, setCurrentSale] = useState<Sale | null>(null);
  
  // Sales history
  const [sales, setSales] = useState<Sale[]>([]);
  const [todaySales, setTodaySales] = useState<Sale[]>([]);
  
  // Quick products
  const [quickProducts, setQuickProducts] = useState<QuickProduct[]>([]);
  
  // Daily summary
  const [dailySummary, setDailySummary] = useState<DailySalesSummary | null>(null);
  
  // Loading state
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const realtimeDebounceRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  // Calculate cart totals
  const cartTotal = useMemo(() => {
    return cart.reduce((sum, item) => {
      // ถ้ามี targetAmount (ขายน้ำมันตามเงิน) ใช้ค่านั้นเลย ไม่ต้องคำนวณ
      if (item.targetAmount !== undefined) {
        return sum + item.targetAmount;
      }
      return sum + (item.unitPrice * item.quantity);
    }, 0);
  }, [cart]);

  const cartDiscount = useMemo(() => {
    return cart.reduce((sum, item) => sum + (item.discount || 0), 0);
  }, [cart]);

  const cartTax = useMemo(() => {
    // Tax calculation (7% VAT) - only for products and services, not fuel
    const taxableAmount = cart
      .filter(item => item.type !== 'fuel')
      .reduce((sum, item) => sum + (item.unitPrice * item.quantity) - (item.discount || 0), 0);
    return Math.round(taxableAmount * 0.07 * 100) / 100;
  }, [cart]);

  const cartNetTotal = useMemo(() => {
    return cartTotal - cartDiscount + cartTax;
  }, [cartTotal, cartDiscount, cartTax]);

  // Realtime subscriptions
  useEffect(() => {
    const unsubscribes = subscribeToTables([
      {
        table: 'sales',
        onEvent: () => {
          if (realtimeDebounceRef.current['sales']) clearTimeout(realtimeDebounceRef.current['sales']);
          realtimeDebounceRef.current['sales'] = setTimeout(async () => {
            try {
              const today = await saleStorage.getToday();
              setTodaySales(today);
              const summary = await posSummaryStorage.getDailySummary();
              setDailySummary(summary);
            } catch (err) {
              console.error('Error reloading sales from realtime:', err);
            }
          }, 800);
        },
      },
      {
        table: 'products',
        onEvent: () => {
          if (realtimeDebounceRef.current['products']) clearTimeout(realtimeDebounceRef.current['products']);
          realtimeDebounceRef.current['products'] = setTimeout(async () => {
            try {
              const [products, fuelProducts] = await Promise.all([
                quickProductStorage.getQuickProducts(),
                quickProductStorage.getFuelProducts(),
              ]);
              setQuickProducts([...fuelProducts, ...products]);
            } catch (err) {
              console.error('Error reloading quick products from realtime:', err);
            }
          }, 800);
        },
      },
    ]);
    return unsubscribes;
  }, []);

  // Cart actions
  const addToCart = useCallback((item: Omit<CartItem, 'id'>) => {
    setCart(prev => {
      // Check if same product exists
      const existingIndex = prev.findIndex(
        i => i.productId === item.productId && 
             i.fuelType === item.fuelType &&
             i.pumpNumber === item.pumpNumber
      );
      
      if (existingIndex >= 0) {
        // Update quantity
        const updated = [...prev];
        updated[existingIndex] = {
          ...updated[existingIndex],
          quantity: updated[existingIndex].quantity + item.quantity,
        };
        return updated;
      }
      
      // Add new item
      return [...prev, { ...item, id: generateId() }];
    });
  }, []);

  const updateCartItem = useCallback((id: string, updates: Partial<CartItem>) => {
    setCart(prev => prev.map(item => 
      item.id === id ? { ...item, ...updates } : item
    ));
  }, []);

  const removeFromCart = useCallback((id: string) => {
    setCart(prev => prev.filter(item => item.id !== id));
  }, []);

  const clearCart = useCallback(() => {
    setCart([]);
    setCurrentSale(null);
  }, []);

  // Create new sale
  const createSale = useCallback(async (saleData: Partial<Sale>): Promise<Sale> => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Calculate totals from cart
      const subtotal = cartTotal;
      const discount = cartDiscount;
      const tax = cartTax;
      const total = cartNetTotal;
      
      const now = new Date().toISOString();
      
      // Convert cart items to sale items
      const items = cart.map(cartItem => ({
        id: generateId(),
        saleId: '', // Will be set after sale creation
        type: cartItem.type,
        productId: cartItem.productId,
        fuelType: cartItem.fuelType,
        serviceName: cartItem.serviceName,
        name: cartItem.name,
        barcode: cartItem.barcode,
        quantity: cartItem.quantity,
        unit: cartItem.unit,
        unitPrice: cartItem.unitPrice,
        discount: cartItem.discount || 0,
        totalPrice: (cartItem.unitPrice * cartItem.quantity) - (cartItem.discount || 0),
        pumpNumber: cartItem.pumpNumber,
        nozzleNumber: cartItem.nozzleNumber,
        meterStart: cartItem.meterStart,
        meterEnd: cartItem.meterEnd,
        createdAt: now,
      }));
      
      const newSale = await saleStorage.create({
        employeeId: saleData.employeeId || '',
        shiftId: saleData.shiftId,
        date: now.slice(0, 10),
        time: now.slice(11, 19),
        items,
        subtotal,
        discount,
        tax,
        total,
        payments: [],
        paidAmount: 0,
        change: 0,
        status: 'pending',
        customerName: saleData.customerName,
        customerPhone: saleData.customerPhone,
        customerType: saleData.customerType || 'general',
        memberId: saleData.memberId,
        note: saleData.note,
      });
      
      // Update items with saleId
      newSale.items = newSale.items.map(item => ({
        ...item,
        saleId: newSale.id,
      }));
      
      setCurrentSale(newSale);
      toast.success('Created new sale: ' + newSale.saleNumber);
      
      return newSale;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create sale';
      setError(message);
      toast.error(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [cart, cartTotal, cartDiscount, cartTax, cartNetTotal]);

  // Complete sale with payments
  const completeSale = useCallback(async (sale: Sale, payments: Payment[]): Promise<Sale> => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Calculate payment totals
      const paidAmount = payments.reduce((sum, p) => sum + p.amount, 0);
      const change = Math.max(0, paidAmount - sale.total);
      
      if (paidAmount < sale.total) {
        throw new Error('Insufficient payment amount');
      }
      
      // Update sale with payments
      const updatedSale = await saleStorage.update(sale.id, {
        payments: payments.map(p => ({ ...p, saleId: sale.id })),
        paidAmount,
        change,
        status: 'completed',
      });
      
      if (!updatedSale) {
        throw new Error('Failed to complete sale');
      }
      
      // Deduct stock for products
      for (const item of sale.items) {
        if (item.type === 'product' && item.productId) {
          const success = await posStockStorage.deductStock(
            item.productId,
            item.quantity,
            sale.id
          );
          if (!success) {
            toast.warning(`Failed to deduct stock for ${item.name}`);
          }
        }
      }
      
      // Clear cart
      setCart([]);
      setCurrentSale(null);
      
      // Refresh today's sales
      const today = await saleStorage.getToday();
      setTodaySales(today);
      
      // Refresh daily summary
      const summary = await posSummaryStorage.getDailySummary();
      setDailySummary(summary);
      
      toast.success('Sale completed successfully!');
      
      return updatedSale;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to complete sale';
      setError(message);
      toast.error(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Cancel sale
  const cancelSale = useCallback(async (reason: string): Promise<void> => {
    if (!currentSale) {
      throw new Error('No active sale');
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      const cancelledSale = await saleStorage.cancel(
        currentSale.id,
        currentSale.employeeId,
        reason
      );
      
      if (!cancelledSale) {
        throw new Error('Failed to cancel sale');
      }
      
      setCart([]);
      setCurrentSale(null);
      
      toast.success('Sale cancelled');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to cancel sale';
      setError(message);
      toast.error(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [currentSale]);

  // Refund sale
  const refundSale = useCallback(async (saleId: string, reason: string): Promise<Sale> => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Get original sale
      const originalSale = await saleStorage.getById(saleId);
      if (!originalSale) {
        throw new Error('Sale not found');
      }
      
      if (originalSale.status === 'refunded') {
        throw new Error('Sale already refunded');
      }
      
      const now = new Date().toISOString();
      
      // Create refund record
      const refundSale = await saleStorage.create({
        employeeId: originalSale.employeeId,
        shiftId: originalSale.shiftId,
        date: now.slice(0, 10),
        time: now.slice(11, 19),
        items: originalSale.items.map(item => ({
          ...item,
          id: generateId(),
          saleId: '',
          quantity: -item.quantity,
          totalPrice: -item.totalPrice,
          createdAt: now,
        })),
        subtotal: -originalSale.subtotal,
        discount: -originalSale.discount,
        tax: -originalSale.tax,
        total: -originalSale.total,
        payments: originalSale.payments.map(p => ({
          ...p,
          id: generateId(),
          saleId: '',
          amount: -p.amount,
          status: 'refunded' as const,
          createdAt: now,
        })),
        paidAmount: -originalSale.paidAmount,
        change: 0,
        status: 'refunded',
        customerName: originalSale.customerName,
        customerPhone: originalSale.customerPhone,
        originalSaleId: originalSale.id,
        note: `Refund: ${reason}`,
      });
      
      // Mark original sale as refunded
      await saleStorage.refund(originalSale.id, originalSale.employeeId, reason);
      
      // Restore stock
      for (const item of originalSale.items) {
        if (item.type === 'product' && item.productId) {
          await posStockStorage.restoreStock(
            item.productId,
            item.quantity,
            `Refund for sale ${originalSale.saleNumber}`
          );
        }
      }
      
      // Refresh sales
      const today = await saleStorage.getToday();
      setTodaySales(today);
      
      toast.success('Refund processed successfully');
      
      return refundSale;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to process refund';
      setError(message);
      toast.error(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Load sales
  const loadSales = useCallback(async (date?: string): Promise<void> => {
    setIsLoading(true);
    try {
      const data = date 
        ? await saleStorage.getByDate(date)
        : await saleStorage.getAll();
      setSales(data);
    } catch (err) {
      console.error('Error loading sales:', err);
      setError('Failed to load sales');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Get sale by ID
  const getSaleById = useCallback(async (id: string): Promise<Sale | undefined> => {
    return saleStorage.getById(id);
  }, []);

  // Load quick products
  const loadQuickProducts = useCallback(async (): Promise<void> => {
    try {
      const [products, fuelProducts] = await Promise.all([
        quickProductStorage.getQuickProducts(),
        quickProductStorage.getFuelProducts(),
      ]);
      
      setQuickProducts([...fuelProducts, ...products]);
    } catch (err) {
      console.error('Error loading quick products:', err);
    }
  }, []);

  // Load daily summary
  const loadDailySummary = useCallback(async (date?: string): Promise<void> => {
    try {
      const summary = await posSummaryStorage.getDailySummary(date);
      setDailySummary(summary);
    } catch (err) {
      console.error('Error loading daily summary:', err);
    }
  }, []);

  // Print receipt (mock - will integrate with actual printer)
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const printReceipt = useCallback((_sale: Sale): void => {
    toast.info('Receipt sent to printer');
    // TODO: Integrate with actual printer
  }, []);

  // Reprint receipt
  const reprintReceipt = useCallback(async (saleId: string): Promise<void> => {
    const sale = await saleStorage.getById(saleId);
    if (sale) {
      printReceipt(sale);
    } else {
      toast.error('Sale not found');
    }
  }, [printReceipt]);

  // Context value
  const value = useMemo(() => ({
    cart,
    cartTotal,
    cartDiscount,
    cartTax,
    cartNetTotal,
    addToCart,
    updateCartItem,
    removeFromCart,
    clearCart,
    currentSale,
    createSale,
    completeSale,
    cancelSale,
    refundSale,
    sales,
    todaySales,
    loadSales,
    getSaleById,
    quickProducts,
    loadQuickProducts,
    dailySummary,
    loadDailySummary,
    printReceipt,
    reprintReceipt,
    isLoading,
    error,
  }), [
    cart, cartTotal, cartDiscount, cartTax, cartNetTotal,
    addToCart, updateCartItem, removeFromCart, clearCart,
    currentSale, createSale, completeSale, cancelSale, refundSale,
    sales, todaySales, loadSales, getSaleById,
    quickProducts, loadQuickProducts,
    dailySummary, loadDailySummary,
    printReceipt, reprintReceipt,
    isLoading, error,
  ]);

  return (
    <POSContext.Provider value={value}>
      {children}
    </POSContext.Provider>
  );
};

// Custom hook
export const usePOS = (): POSContextType => {
  const context = useContext(POSContext);
  if (context === undefined) {
    throw new Error('usePOS must be used within a POSProvider');
  }
  return context;
};
