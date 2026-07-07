// Inventory Management Types

// Fuel inventory types
export type FuelType = '95' | 'B7' | 'B10' | 'Diesel';

export interface FuelInventory {
  id: string;
  date: string;
  fuelType: FuelType;
  tankNumber: number;
  openingStock: number;
  receivedQty: number;
  soldQty: number;
  adjustmentQty: number;
  closingStock: number;
  actualStock?: number;
  variance: number;
  temperature?: number;
  density?: number;
  recordedBy: string;
  note: string;
  createdAt: string;
}

export interface FuelDelivery {
  id: string;
  doNumber: string;
  supplierId: string;
  fuelType: FuelType;
  quantityLiters: number;
  pricePerLiter: number;
  totalAmount: number;
  deliveryDate: string;
  receivedDate?: string;
  receivedBy?: string;
  status: 'pending' | 'received' | 'rejected';
  note: string;
  createdAt: string;
  supplier?: Supplier;
}

// Product types
export type ProductCategory = 'beverage' | 'snack' | 'automotive' | 'misc';
export type TransactionType = 'in' | 'out' | 'adjust' | 'return';

export interface Product {
  id: string;
  barcode?: string;
  sku?: string;
  name: string;
  category: ProductCategory;
  unit: string;
  costPrice: number;
  sellingPrice: number;
  currentStock: number;
  minStock: number;
  maxStock: number;
  supplierId?: string;
  isActive: boolean;
  createdAt: string;
  supplier?: Supplier;
}

export interface ProductTransaction {
  id: string;
  productId: string;
  type: TransactionType;
  quantity: number;
  unitCost?: number;
  referenceType?: string;
  referenceId?: string;
  performedBy: string;
  note: string;
  createdAt: string;
  product?: Product;
}

export interface Supplier {
  id: string;
  name: string;
  contactPerson?: string;
  phone?: string;
  email?: string;
  address?: string;
  taxId?: string;
  paymentTerms: number;
  isActive: boolean;
  createdAt: string;
}

// Context types
export interface InventoryContextType {
  // Fuel inventory
  fuelInventory: FuelInventory[];
  fuelDeliveries: FuelDelivery[];
  lowFuelAlerts: { fuelType: FuelType; currentStock: number; minStock: number }[];
  
  // Products
  products: Product[];
  productTransactions: ProductTransaction[];
  lowStockProducts: Product[];
  
  // Suppliers
  suppliers: Supplier[];
  
  // Loading state
  isLoading: boolean;
  
  // Actions - Fuel
  recordFuelInventory: (data: Omit<FuelInventory, 'id' | 'variance' | 'createdAt'>) => Promise<void>;
  recordFuelDelivery: (data: Omit<FuelDelivery, 'id' | 'totalAmount' | 'createdAt'>) => Promise<void>;
  confirmFuelDelivery: (id: string, receivedBy: string) => Promise<void>;
  getFuelStockByType: (fuelType: FuelType) => FuelInventory | undefined;
  
  // Actions - Products
  addProduct: (product: Omit<Product, 'id' | 'createdAt'>) => Promise<void>;
  updateProduct: (id: string, updates: Partial<Product>) => Promise<void>;
  deleteProduct: (id: string) => Promise<void>;
  adjustStock: (productId: string, quantity: number, reason: string) => Promise<void>;
  getProductByBarcode: (barcode: string) => Product | undefined;
  
  // Actions - Suppliers
  addSupplier: (supplier: Omit<Supplier, 'id' | 'createdAt'>) => Promise<void>;
  updateSupplier: (id: string, updates: Partial<Supplier>) => Promise<void>;
  deleteSupplier: (id: string) => Promise<void>;
}
