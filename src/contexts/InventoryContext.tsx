import React, { createContext, useContext, useState, useEffect, useMemo, useCallback, useRef, type ReactNode } from 'react';
import type { InventoryContextType } from '@/types/inventory';
import {
  fuelInventoryStorage,
  fuelDeliveryStorage,
  productStorage,
  supplierStorage,
} from '@/data/inventoryStorage';
import type {
  FuelInventory,
  FuelDelivery,
  FuelType,
  Product,
  ProductTransaction,
  Supplier,
} from '@/types/inventory';
import { useAuth } from './AuthContext';
import { toast } from 'sonner';
import { subscribeToTables } from '@/lib/realtime';

const InventoryContext = createContext<InventoryContextType | undefined>(undefined);

export const InventoryProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { user, profile } = useAuth();
  
  // State
  const [fuelInventory, setFuelInventory] = useState<FuelInventory[]>([]);
  const [fuelDeliveries, setFuelDeliveries] = useState<FuelDelivery[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [productTransactions, setProductTransactions] = useState<ProductTransaction[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const realtimeDebounceRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  // ==========================================================================
  // Load Initial Data
  // ==========================================================================
  
  // Load data only once on mount
  useEffect(() => {
    let isMounted = true;
    
    const loadData = async () => {
      if (!isMounted) return;
      setIsLoading(true);
      
      try {
        // ใช้ Promise.allSettled เพื่อให้โหลดข้อมูลที่สำเร็จได้ แม้บางตารางจะ error
        const results = await Promise.allSettled([
          // Load last 30 days of fuel inventory
          fuelInventoryStorage.getByDateRange(
            new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            new Date().toISOString().split('T')[0]
          ),
          fuelDeliveryStorage.getAll(),
          productStorage.getAll(),
          productStorage.getTransactions(undefined, 100),
          supplierStorage.getAll(),
        ]);

        if (!isMounted) return;

        // ตรวจสอบผลลัพธ์แต่ละอัน
        if (results[0].status === 'fulfilled') {
          setFuelInventory(results[0].value);
        } else {
          console.error('Error loading fuel inventory:', results[0].reason);
          setFuelInventory([]);
        }

        if (results[1].status === 'fulfilled') {
          setFuelDeliveries(results[1].value);
        } else {
          console.error('Error loading fuel deliveries:', results[1].reason);
          setFuelDeliveries([]);
        }

        if (results[2].status === 'fulfilled') {
          setProducts(results[2].value);
        } else {
          console.error('Error loading products:', results[2].reason);
          setProducts([]);
        }

        if (results[3].status === 'fulfilled') {
          setProductTransactions(results[3].value);
        } else {
          console.error('Error loading transactions:', results[3].reason);
          setProductTransactions([]);
        }

        if (results[4].status === 'fulfilled') {
          setSuppliers(results[4].value);
        } else {
          console.error('Error loading suppliers:', results[4].reason);
          setSuppliers([]);
        }

        // แสดง warning ถ้ามีบางอย่างโหลดไม่ได้
        const hasErrors = results.some(r => r.status === 'rejected');
        if (hasErrors) {
          console.warn('Some inventory data failed to load. Tables may not exist yet.');
        }
      } catch (error) {
        if (!isMounted) return;
        console.error('Error loading inventory data:', error);
        toast.error('ไม่สามารถโหลดข้อมูลคลังสินค้าได้');
        // Set empty arrays on error
        setFuelInventory([]);
        setFuelDeliveries([]);
        setProducts([]);
        setProductTransactions([]);
        setSuppliers([]);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    loadData();
    
    return () => {
      isMounted = false;
    };
  }, []);

  // Realtime subscriptions
  useEffect(() => {
    const unsubscribes = subscribeToTables([
      {
        table: 'fuel_inventory',
        onEvent: () => {
          if (realtimeDebounceRef.current['fuel_inventory']) clearTimeout(realtimeDebounceRef.current['fuel_inventory']);
          realtimeDebounceRef.current['fuel_inventory'] = setTimeout(async () => {
            try {
              const loaded = await fuelInventoryStorage.getByDateRange(
                new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                new Date().toISOString().split('T')[0]
              );
              setFuelInventory(loaded);
            } catch (error) {
              console.error('Error reloading fuel inventory from realtime:', error);
            }
          }, 800);
        },
      },
      {
        table: 'fuel_deliveries',
        onEvent: () => {
          if (realtimeDebounceRef.current['fuel_deliveries']) clearTimeout(realtimeDebounceRef.current['fuel_deliveries']);
          realtimeDebounceRef.current['fuel_deliveries'] = setTimeout(async () => {
            try {
              const loaded = await fuelDeliveryStorage.getAll();
              setFuelDeliveries(loaded);
            } catch (error) {
              console.error('Error reloading fuel deliveries from realtime:', error);
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
              const loaded = await productStorage.getAll();
              setProducts(loaded);
            } catch (error) {
              console.error('Error reloading products from realtime:', error);
            }
          }, 800);
        },
      },
      {
        table: 'product_transactions',
        onEvent: () => {
          if (realtimeDebounceRef.current['product_transactions']) clearTimeout(realtimeDebounceRef.current['product_transactions']);
          realtimeDebounceRef.current['product_transactions'] = setTimeout(async () => {
            try {
              const loaded = await productStorage.getTransactions(undefined, 100);
              setProductTransactions(loaded);
            } catch (error) {
              console.error('Error reloading product transactions from realtime:', error);
            }
          }, 800);
        },
      },
      {
        table: 'suppliers',
        onEvent: () => {
          if (realtimeDebounceRef.current['suppliers']) clearTimeout(realtimeDebounceRef.current['suppliers']);
          realtimeDebounceRef.current['suppliers'] = setTimeout(async () => {
            try {
              const loaded = await supplierStorage.getAll();
              setSuppliers(loaded);
            } catch (error) {
              console.error('Error reloading suppliers from realtime:', error);
            }
          }, 800);
        },
      },
    ]);
    return unsubscribes;
  }, [profile]);

  // ==========================================================================
  // Computed Values - Low Stock Alerts
  // ==========================================================================
  
  const lowFuelAlerts = useMemo(() => {
    // Group by fuel type and get latest
    const latestByType: Record<FuelType, FuelInventory | undefined> = {
      '95': undefined,
      'B7': undefined,
      'B10': undefined,
      'Diesel': undefined,
    };

    fuelInventory.forEach((item) => {
      if (!latestByType[item.fuelType] || item.date > latestByType[item.fuelType]!.date) {
        latestByType[item.fuelType] = item;
      }
    });

    const alerts: { fuelType: FuelType; currentStock: number; minStock: number }[] = [];
    const minStockLevels: Record<FuelType, number> = {
      '95': 1000,    // 1000 liters minimum
      'B7': 1000,
      'B10': 500,
      'Diesel': 800,
    };

    (Object.keys(latestByType) as FuelType[]).forEach((fuelType) => {
      const item = latestByType[fuelType];
      if (item) {
        const currentStock = item.actualStock !== undefined ? item.actualStock : item.closingStock;
        if (currentStock < minStockLevels[fuelType]) {
          alerts.push({
            fuelType,
            currentStock,
            minStock: minStockLevels[fuelType],
          });
        }
      }
    });

    return alerts;
  }, [fuelInventory]);

  const lowStockProducts = useMemo(() => {
    return products.filter((p) => p.currentStock < p.minStock && p.isActive);
  }, [products]);

  // ==========================================================================
  // Actions - Fuel Inventory
  // ==========================================================================
  
  const recordFuelInventory = useCallback(async (
    data: Omit<FuelInventory, 'id' | 'variance' | 'createdAt'>
  ) => {
    try {
      const newRecord = await fuelInventoryStorage.create(data);
      if (newRecord) {
        setFuelInventory((prev) => [newRecord, ...prev]);
        toast.success('บันทึกข้อมูลน้ำมันสำเร็จ');
      } else {
        toast.error('ไม่สามารถบันทึกข้อมูลน้ำมันได้');
      }
    } catch (error) {
      console.error('Error recording fuel inventory:', error);
      toast.error('เกิดข้อผิดพลาดในการบันทึกข้อมูลน้ำมัน');
    }
  }, []);

  const recordFuelDelivery = useCallback(async (
    data: Omit<FuelDelivery, 'id' | 'totalAmount' | 'createdAt'>
  ) => {
    try {
      const newDelivery = await fuelDeliveryStorage.create(data);
      if (newDelivery) {
        setFuelDeliveries((prev) => [newDelivery, ...prev]);
        toast.success('บันทึกใบส่งน้ำมันสำเร็จ');
      } else {
        toast.error('ไม่สามารถบันทึกใบส่งน้ำมันได้');
      }
    } catch (error) {
      console.error('Error recording fuel delivery:', error);
      toast.error('เกิดข้อผิดพลาดในการบันทึกใบส่งน้ำมัน');
    }
  }, []);

  const confirmFuelDelivery = useCallback(async (id: string, receivedBy: string) => {
    try {
      const success = await fuelDeliveryStorage.confirm(id, receivedBy);
      if (success) {
        // Update local state
        setFuelDeliveries((prev) =>
          prev.map((d) =>
            d.id === id
              ? { ...d, status: 'received', receivedBy, receivedDate: new Date().toISOString() }
              : d
          )
        );
        // Reload fuel inventory to reflect changes
        const updatedInventory = await fuelInventoryStorage.getByDateRange(
          new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          new Date().toISOString().split('T')[0]
        );
        setFuelInventory(updatedInventory);
        toast.success('ยืนยันการรับน้ำมันสำเร็จ');
      } else {
        toast.error('ไม่สามารถยืนยันการรับน้ำมันได้');
      }
    } catch (error) {
      console.error('Error confirming fuel delivery:', error);
      toast.error('เกิดข้อผิดพลาดในการยืนยันการรับน้ำมัน');
    }
  }, []);

  const getFuelStockByType = useCallback((fuelType: FuelType) => {
    return fuelInventory
      .filter((i) => i.fuelType === fuelType)
      .sort((a, b) => b.date.localeCompare(a.date))[0];
  }, [fuelInventory]);

  // ==========================================================================
  // Actions - Products
  // ==========================================================================
  
  const addProduct = useCallback(async (product: Omit<Product, 'id' | 'createdAt'>) => {
    try {
      const newProduct = await productStorage.create(product);
      if (newProduct) {
        setProducts((prev) => [...prev, newProduct]);
        toast.success('เพิ่มสินค้าสำเร็จ');
      } else {
        toast.error('ไม่สามารถเพิ่มสินค้าได้');
      }
    } catch (error) {
      console.error('Error adding product:', error);
      toast.error('เกิดข้อผิดพลาดในการเพิ่มสินค้า');
    }
  }, []);

  const updateProduct = useCallback(async (id: string, updates: Partial<Product>) => {
    try {
      const success = await productStorage.update(id, updates);
      if (success) {
        setProducts((prev) =>
          prev.map((p) => (p.id === id ? { ...p, ...updates } : p))
        );
        toast.success('อัปเดตสินค้าสำเร็จ');
      } else {
        toast.error('ไม่สามารถอัปเดตสินค้าได้');
      }
    } catch (error) {
      console.error('Error updating product:', error);
      toast.error('เกิดข้อผิดพลาดในการอัปเดตสินค้า');
    }
  }, []);

  const deleteProduct = useCallback(async (id: string) => {
    try {
      const success = await productStorage.delete(id);
      if (success) {
        setProducts((prev) => prev.filter((p) => p.id !== id));
        toast.success('ลบสินค้าสำเร็จ');
      } else {
        toast.error('ไม่สามารถลบสินค้าได้');
      }
    } catch (error) {
      console.error('Error deleting product:', error);
      toast.error('เกิดข้อผิดพลาดในการลบสินค้า');
    }
  }, []);

  const adjustStock = useCallback(async (
    productId: string,
    quantity: number,
    reason: string
  ) => {
    if (!user) {
      toast.error('กรุณาเข้าสู่ระบบ');
      return;
    }

    try {
      const success = await productStorage.adjustStock(
        productId,
        quantity,
        'adjust',
        reason,
        profile?.fullName || user.email
      );
      if (success) {
        // Reload products and transactions
        const [updatedProducts, updatedTransactions] = await Promise.all([
          productStorage.getAll(),
          productStorage.getTransactions(undefined, 100),
        ]);
        setProducts(updatedProducts);
        setProductTransactions(updatedTransactions);
        toast.success('ปรับสต็อกสำเร็จ');
      } else {
        toast.error('ไม่สามารถปรับสต็อกได้');
      }
    } catch (error) {
      console.error('Error adjusting stock:', error);
      toast.error('เกิดข้อผิดพลาดในการปรับสต็อก');
    }
  }, [user, profile]);

  const getProductByBarcode = useCallback((barcode: string) => {
    return products.find((p) => p.barcode === barcode);
  }, [products]);

  // ==========================================================================
  // Actions - Suppliers
  // ==========================================================================
  
  const addSupplier = useCallback(async (supplier: Omit<Supplier, 'id' | 'createdAt'>) => {
    try {
      const newSupplier = await supplierStorage.create(supplier);
      if (newSupplier) {
        setSuppliers((prev) => [...prev, newSupplier]);
        toast.success('เพิ่มซัพพลายเออร์สำเร็จ');
      } else {
        toast.error('ไม่สามารถเพิ่มซัพพลายเออร์ได้');
      }
    } catch (error) {
      console.error('Error adding supplier:', error);
      toast.error('เกิดข้อผิดพลาดในการเพิ่มซัพพลายเออร์');
    }
  }, []);

  const updateSupplier = useCallback(async (id: string, updates: Partial<Supplier>) => {
    try {
      const success = await supplierStorage.update(id, updates);
      if (success) {
        setSuppliers((prev) =>
          prev.map((s) => (s.id === id ? { ...s, ...updates } : s))
        );
        toast.success('อัปเดตซัพพลายเออร์สำเร็จ');
      } else {
        toast.error('ไม่สามารถอัปเดตซัพพลายเออร์ได้');
      }
    } catch (error) {
      console.error('Error updating supplier:', error);
      toast.error('เกิดข้อผิดพลาดในการอัปเดตซัพพลายเออร์');
    }
  }, []);

  const deleteSupplier = useCallback(async (id: string) => {
    try {
      const success = await supplierStorage.delete(id);
      if (success) {
        setSuppliers((prev) => prev.filter((s) => s.id !== id));
        toast.success('ลบซัพพลายเออร์สำเร็จ');
      } else {
        toast.error('ไม่สามารถลบซัพพลายเออร์ได้');
      }
    } catch (error) {
      console.error('Error deleting supplier:', error);
      toast.error('เกิดข้อผิดพลาดในการลบซัพพลายเออร์');
    }
  }, []);

  // ==========================================================================
  // Context Value
  // ==========================================================================
  
  const value = useMemo<InventoryContextType>(
    () => ({
      fuelInventory,
      fuelDeliveries,
      lowFuelAlerts,
      products,
      productTransactions,
      lowStockProducts,
      suppliers,
      isLoading,
      recordFuelInventory,
      recordFuelDelivery,
      confirmFuelDelivery,
      getFuelStockByType,
      addProduct,
      updateProduct,
      deleteProduct,
      adjustStock,
      getProductByBarcode,
      addSupplier,
      updateSupplier,
      deleteSupplier,
    }),
    [
      fuelInventory,
      fuelDeliveries,
      lowFuelAlerts,
      products,
      productTransactions,
      lowStockProducts,
      suppliers,
      isLoading,
      recordFuelInventory,
      recordFuelDelivery,
      confirmFuelDelivery,
      getFuelStockByType,
      addProduct,
      updateProduct,
      deleteProduct,
      adjustStock,
      getProductByBarcode,
      addSupplier,
      updateSupplier,
      deleteSupplier,
    ]
  );

  return (
    <InventoryContext.Provider value={value}>
      {children}
    </InventoryContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useInventory = (): InventoryContextType => {
  const context = useContext(InventoryContext);
  if (context === undefined) {
    throw new Error('useInventory must be used within an InventoryProvider');
  }
  return context;
};
