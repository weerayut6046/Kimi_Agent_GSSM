# Plan: Gas Station Shift Manager V2 - Four Core Business Modules

> **สถานะปัจจุบัน (มิถุนายน 2568):**
> - ✅ Phase 1: Inventory Management - เสร็จสมบูรณ์แล้ว
> - ✅ Phase 2: POS System - เสร็จสมบูรณ์แล้ว
> - ⏳ Phase 3: Loyalty Program - ยังไม่เริ่ม
> - ⏳ Phase 4: Full Accounting - ยังไม่เริ่ม

## Overview
Implement four interconnected business modules for Version 2:
1. **Inventory Management** - Fuel stock tracking, shop products, low stock alerts
2. **POS System** - Point of Sale for fuel and shop products, receipt printing
3. **Loyalty Program** - Member management, points accumulation, promotions
4. **Full Accounting** - Complete accounting system with chart of accounts, P&L, VAT

---

## Phase 1: Inventory Management System

### 1.1 Database Schema (SQL)

```sql
-- Fuel tanks inventory (daily tracking)
CREATE TABLE fuel_inventory (
  id text PRIMARY KEY,
  date text NOT NULL,
  fuel_type text NOT NULL CHECK (fuel_type IN ('95', 'B7', 'B10', 'Diesel')),
  tank_number int DEFAULT 1,
  opening_stock decimal(12,2) NOT NULL,
  received_qty decimal(12,2) DEFAULT 0,
  sold_qty decimal(12,2) DEFAULT 0,
  adjustment_qty decimal(12,2) DEFAULT 0,
  closing_stock decimal(12,2) NOT NULL,
  actual_stock decimal(12,2),
  variance decimal(12,2) GENERATED ALWAYS AS (COALESCE(actual_stock, closing_stock) - closing_stock) STORED,
  temperature decimal(5,2),
  density decimal(5,2),
  recorded_by text,
  note text,
  created_at text DEFAULT CURRENT_TIMESTAMP
);

-- Fuel deliveries (purchase orders from suppliers)
CREATE TABLE fuel_deliveries (
  id text PRIMARY KEY,
  do_number text UNIQUE NOT NULL,
  supplier_id text,
  fuel_type text NOT NULL,
  quantity_liters decimal(12,2) NOT NULL,
  price_per_liter decimal(10,2) NOT NULL,
  total_amount decimal(12,2) GENERATED ALWAYS AS (quantity_liters * price_per_liter) STORED,
  delivery_date text NOT NULL,
  received_date text,
  received_by text,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'received', 'rejected')),
  note text,
  created_at text DEFAULT CURRENT_TIMESTAMP
);

-- Shop products
CREATE TABLE products (
  id text PRIMARY KEY,
  barcode text UNIQUE,
  sku text UNIQUE,
  name text NOT NULL,
  category text NOT NULL CHECK (category IN ('beverage', 'snack', 'automotive', 'misc')),
  unit text NOT NULL DEFAULT 'piece',
  cost_price decimal(10,2) NOT NULL,
  selling_price decimal(10,2) NOT NULL,
  current_stock int DEFAULT 0,
  min_stock int DEFAULT 10,
  max_stock int DEFAULT 100,
  supplier_id text,
  is_active boolean DEFAULT true,
  created_at text DEFAULT CURRENT_TIMESTAMP
);

-- Product stock transactions
CREATE TABLE product_transactions (
  id text PRIMARY KEY,
  product_id text REFERENCES products(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('in', 'out', 'adjust', 'return')),
  quantity int NOT NULL,
  unit_cost decimal(10,2),
  reference_type text,
  reference_id text,
  performed_by text,
  note text,
  created_at text DEFAULT CURRENT_TIMESTAMP
);

-- Suppliers
CREATE TABLE suppliers (
  id text PRIMARY KEY,
  name text NOT NULL,
  contact_person text,
  phone text,
  email text,
  address text,
  tax_id text,
  payment_terms int DEFAULT 15,
  is_active boolean DEFAULT true,
  created_at text DEFAULT CURRENT_TIMESTAMP
);
```

### 1.2 TypeScript Types (`src/types/inventory.ts`)

```typescript
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
  
  // Actions
  recordFuelInventory: (data: Omit<FuelInventory, 'id' | 'variance' | 'createdAt'>) => Promise<void>;
  recordFuelDelivery: (data: Omit<FuelDelivery, 'id' | 'totalAmount' | 'createdAt'>) => Promise<void>;
  confirmFuelDelivery: (id: string, receivedBy: string) => Promise<void>;
  
  addProduct: (product: Omit<Product, 'id' | 'createdAt'>) => Promise<void>;
  updateProduct: (id: string, updates: Partial<Product>) => Promise<void>;
  adjustStock: (productId: string, quantity: number, reason: string) => Promise<void>;
  
  addSupplier: (supplier: Omit<Supplier, 'id' | 'createdAt'>) => Promise<void>;
  
  getFuelStockByType: (fuelType: FuelType) => FuelInventory | undefined;
  getProductByBarcode: (barcode: string) => Product | undefined;
}
```

### 1.3 Storage Functions (`src/data/inventoryStorage.ts`)

```typescript
// Map functions for camelCase ↔ lowercase
const mapFuelInventoryToDb = (item: Partial<FuelInventory>) => ({...});
const mapFuelInventoryFromDb = (row: Record<string, unknown>) => ({...});
const mapProductToDb = (product: Partial<Product>) => ({...});
const mapProductFromDb = (row: Record<string, unknown>) => ({...});

export const fuelInventoryStorage = {
  getByDateRange: async (start: string, end: string) => {...},
  getLatestByType: async (fuelType: FuelType) => {...},
  create: async (data: FuelInventory) => {...},
  updateActualStock: async (id: string, actualStock: number) => {...},
};

export const productStorage = {
  getAll: async () => {...},
  getById: async (id: string) => {...},
  getByBarcode: async (barcode: string) => {...},
  create: async (product: Product) => {...},
  update: async (id: string, updates: Partial<Product>) => {...},
  adjustStock: async (productId: string, quantity: number, type: TransactionType, note: string) => {...},
};

export const supplierStorage = {
  getAll: async () => {...},
  create: async (supplier: Supplier) => {...},
  update: async (id: string, updates: Partial<Supplier>) => {...},
};
```

### 1.4 Context Provider (`src/contexts/InventoryContext.tsx`)

```typescript
export const InventoryProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [fuelInventory, setFuelInventory] = useState<FuelInventory[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  
  // Auto-calculate low stock alerts
  const lowFuelAlerts = useMemo(() => {...}, [fuelInventory]);
  const lowStockProducts = useMemo(() => {...}, [products]);
  
  // Actions with useCallback
  const recordFuelInventory = useCallback(async (data) => {...}, []);
  const addProduct = useCallback(async (product) => {...}, []);
  const adjustStock = useCallback(async (productId, quantity, reason) => {...}, []);
  
  const value = useMemo(() => ({...}), [...]);
  
  return <InventoryContext.Provider value={value}>{children}</InventoryContext.Provider>;
};
```

### 1.5 UI Pages

#### Inventory Dashboard (`src/pages/Inventory.tsx`)
- Summary cards: Current fuel stock by type, low stock alerts, total products
- Fuel stock table with variance highlighting
- Product stock table with search and filter
- Low stock warning badges

#### Fuel Inventory Form
- Date picker
- Fuel type selector (tabs or dropdown)
- Opening stock (auto-fill from yesterday's closing)
- Received quantity input
- Sold quantity (auto-calculate from POS/daily accounting)
- Actual stock input (for variance calculation)
- Temperature & density inputs (optional)

#### Product Management (`src/pages/Products.tsx`)
- Product list with barcode, name, stock, min/max
- Add/Edit product dialog
- Stock adjustment dialog with reason
- Category filter tabs

---

## Phase 2: POS (Point of Sale) System

### 2.1 Database Schema

```sql
-- POS sales header
CREATE TABLE pos_sales (
  id text PRIMARY KEY,
  receipt_no text UNIQUE NOT NULL,
  sale_type text NOT NULL CHECK (sale_type IN ('fuel', 'product', 'service', 'mixed')),
  shift_id text REFERENCES shifts(id),
  employee_id text REFERENCES profiles(id),
  
  -- Totals
  subtotal decimal(12,2) NOT NULL,
  discount_amount decimal(12,2) DEFAULT 0,
  tax_amount decimal(12,2) DEFAULT 0,
  total_amount decimal(12,2) NOT NULL,
  
  -- Payment
  payment_method text NOT NULL CHECK (payment_method IN ('cash', 'transfer', 'credit_card', 'promptpay', 'wallet')),
  received_amount decimal(12,2) NOT NULL,
  change_amount decimal(12,2) DEFAULT 0,
  
  -- Member
  member_id text,
  points_earned int DEFAULT 0,
  points_used int DEFAULT 0,
  
  status text DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'cancelled', 'refunded')),
  note text,
  created_at text DEFAULT CURRENT_TIMESTAMP
);

-- POS sale items (line items)
CREATE TABLE pos_sale_items (
  id text PRIMARY KEY,
  sale_id text REFERENCES pos_sales(id) ON DELETE CASCADE,
  item_type text NOT NULL CHECK (item_type IN ('fuel', 'product', 'service')),
  item_id text NOT NULL,
  
  -- Fuel specific
  dispenser_no int,
  nozzle_no int,
  fuel_type text,
  liters decimal(10,2),
  
  -- Product/Service
  quantity int DEFAULT 1,
  unit_price decimal(10,2) NOT NULL,
  total_price decimal(10,2) NOT NULL,
  
  discount_amount decimal(10,2) DEFAULT 0,
  note text
);

-- Services (car wash, oil change, etc.)
CREATE TABLE services (
  id text PRIMARY KEY,
  code text UNIQUE,
  name text NOT NULL,
  description text,
  price decimal(10,2) NOT NULL,
  duration_minutes int,
  is_active boolean DEFAULT true
);
```

### 2.2 TypeScript Types

```typescript
export type SaleType = 'fuel' | 'product' | 'service' | 'mixed';
export type PaymentMethod = 'cash' | 'transfer' | 'credit_card' | 'promptpay' | 'wallet';

export interface POSSale {
  id: string;
  receiptNo: string;
  saleType: SaleType;
  shiftId: string;
  employeeId: string;
  
  subtotal: number;
  discountAmount: number;
  taxAmount: number;
  totalAmount: number;
  
  paymentMethod: PaymentMethod;
  receivedAmount: number;
  changeAmount: number;
  
  memberId?: string;
  pointsEarned: number;
  pointsUsed: number;
  
  status: 'pending' | 'completed' | 'cancelled' | 'refunded';
  note: string;
  createdAt: string;
  
  items: POSSaleItem[];
  employee?: EmployeeProfile;
  member?: Member;
}

export interface POSSaleItem {
  id: string;
  saleId: string;
  itemType: 'fuel' | 'product' | 'service';
  itemId: string;
  
  // Fuel
  dispenserNo?: number;
  nozzleNo?: number;
  fuelType?: FuelType;
  liters?: number;
  
  // Product/Service
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  
  discountAmount: number;
  note?: string;
  
  // Joined data
  product?: Product;
  service?: Service;
}

export interface Service {
  id: string;
  code?: string;
  name: string;
  description?: string;
  price: number;
  durationMinutes?: number;
  isActive: boolean;
}

// Cart item for POS UI
export interface CartItem {
  id: string;
  type: 'fuel' | 'product' | 'service';
  name: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  
  // Fuel specific
  dispenserNo?: number;
  nozzleNo?: number;
  fuelType?: FuelType;
  liters?: number;
  
  // Reference
  productId?: string;
  serviceId?: string;
}
```

### 2.3 POS Context

```typescript
export interface POSContextType {
  currentCart: CartItem[];
  currentMember: Member | null;
  
  // Cart actions
  addToCart: (item: Omit<CartItem, 'id' | 'totalPrice'>) => void;
  removeFromCart: (id: string) => void;
  updateQuantity: (id: string, quantity: number) => void;
  clearCart: () => void;
  
  // Member
  scanMember: (phoneOrBarcode: string) => Promise<Member | null>;
  clearMember: () => void;
  
  // Checkout
  checkout: (paymentMethod: PaymentMethod, receivedAmount: number) => Promise<POSSale>;
  
  // History
  todaySales: POSSale[];
  shiftSales: POSSale[];
}
```

### 2.4 UI Components

#### POS Page (`src/pages/POS.tsx`)
Layout: Split screen (responsive)
- **Left/Center**: Product grid, Fuel dispenser selector, Service list
- **Right**: Cart panel with totals, payment buttons

Components:
- `FuelDispenserSelector` - Visual representation of 2 dispensers with 4 nozzles
- `ProductGrid` - Category tabs + product cards with images
- `CartPanel` - Line items, quantities, delete buttons
- `PaymentModal` - Payment method selection, cash calculator, change display
- `MemberScanner` - Phone input or barcode scanner

#### Receipt Component (`src/components/pos/Receipt.tsx`)
- Thermal printer format (58mm or 80mm)
- Logo, receipt number, date/time
- Line items with prices
- Totals, discount, tax
- Payment details
- QR code for verification
- Thank you message

---

## Phase 3: Loyalty Program

### 3.1 Database Schema

```sql
-- Members
CREATE TABLE members (
  id text PRIMARY KEY,
  card_number text UNIQUE,
  phone text UNIQUE NOT NULL,
  email text,
  first_name text,
  last_name text,
  birthdate text,
  
  -- Points
  points_balance int DEFAULT 0,
  points_lifetime int DEFAULT 0,
  
  -- Stats
  total_spent decimal(12,2) DEFAULT 0,
  total_visits int DEFAULT 0,
  last_visit text,
  
  tier text DEFAULT 'bronze' CHECK (tier IN ('bronze', 'silver', 'gold', 'platinum')),
  
  is_active boolean DEFAULT true,
  created_at text DEFAULT CURRENT_TIMESTAMP,
  updated_at text DEFAULT CURRENT_TIMESTAMP
);

-- Points transactions
CREATE TABLE points_transactions (
  id text PRIMARY KEY,
  member_id text REFERENCES members(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('earn', 'redeem', 'expire', 'adjust', 'bonus')),
  points int NOT NULL,
  balance_after int NOT NULL,
  
  reference_type text,
  reference_id text,
  description text,
  
  created_at text DEFAULT CURRENT_TIMESTAMP
);

-- Promotions
CREATE TABLE promotions (
  id text PRIMARY KEY,
  code text UNIQUE,
  name text NOT NULL,
  description text,
  
  type text NOT NULL CHECK (type IN ('discount_amount', 'discount_percent', 'free_product', 'bonus_points', 'bundle')),
  
  -- Conditions
  conditions jsonb DEFAULT '{}',
  -- e.g., {"min_purchase": 500, "fuel_types": ["95", "B7"], "time_range": {"start": "08:00", "end": "10:00"}}
  
  -- Rewards
  rewards jsonb DEFAULT '{}',
  -- e.g., {"discount_amount": 50, "discount_percent": 10, "bonus_points": 100, "free_product_id": "xxx"}
  
  -- Validity
  start_date text,
  end_date text,
  start_time text,
  end_time text,
  
  days_of_week int[], -- [0,1,2,3,4,5,6] for Sun-Sat
  
  usage_limit int,
  usage_count int DEFAULT 0,
  
  is_active boolean DEFAULT true,
  created_at text DEFAULT CURRENT_TIMESTAMP
);

-- Member tier configuration
CREATE TABLE tier_config (
  tier text PRIMARY KEY,
  name text NOT NULL,
  min_spent decimal(12,2),
  min_visits int,
  points_multiplier decimal(3,2) DEFAULT 1.00,
  benefits jsonb DEFAULT '[]'
);
```

### 3.2 TypeScript Types

```typescript
export type MemberTier = 'bronze' | 'silver' | 'gold' | 'platinum';
export type PointsTransactionType = 'earn' | 'redeem' | 'expire' | 'adjust' | 'bonus';
export type PromotionType = 'discount_amount' | 'discount_percent' | 'free_product' | 'bonus_points' | 'bundle';

export interface Member {
  id: string;
  cardNumber?: string;
  phone: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  birthdate?: string;
  
  pointsBalance: number;
  pointsLifetime: number;
  
  totalSpent: number;
  totalVisits: number;
  lastVisit?: string;
  
  tier: MemberTier;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  
  fullName: string;
}

export interface PointsTransaction {
  id: string;
  memberId: string;
  type: PointsTransactionType;
  points: number;
  balanceAfter: number;
  referenceType?: string;
  referenceId?: string;
  description?: string;
  createdAt: string;
}

export interface Promotion {
  id: string;
  code?: string;
  name: string;
  description?: string;
  type: PromotionType;
  
  conditions: {
    minPurchase?: number;
    fuelTypes?: FuelType[];
    productCategories?: string[];
    memberTiers?: MemberTier[];
    timeRange?: { start: string; end: string };
  };
  
  rewards: {
    discountAmount?: number;
    discountPercent?: number;
    bonusPoints?: number;
    freeProductId?: string;
  };
  
  startDate?: string;
  endDate?: string;
  startTime?: string;
  endTime?: string;
  daysOfWeek?: number[];
  
  usageLimit?: number;
  usageCount: number;
  
  isActive: boolean;
  createdAt: string;
}

export interface TierConfig {
  tier: MemberTier;
  name: string;
  minSpent?: number;
  minVisits?: number;
  pointsMultiplier: number;
  benefits: string[];
}
```

### 3.3 Loyalty Context

```typescript
export interface LoyaltyContextType {
  members: Member[];
  promotions: Promotion[];
  tierConfigs: TierConfig[];
  
  // Member management
  addMember: (data: Omit<Member, 'id' | 'pointsBalance' | 'pointsLifetime' | 'totalSpent' | 'totalVisits' | 'tier' | 'createdAt' | 'updatedAt'>) => Promise<Member>;
  updateMember: (id: string, updates: Partial<Member>) => Promise<void>;
  getMemberByPhone: (phone: string) => Member | undefined;
  getMemberById: (id: string) => Member | undefined;
  
  // Points
  calculatePoints: (purchaseAmount: number, tier: MemberTier) => number;
  addPoints: (memberId: string, points: number, reference: { type: string; id: string }) => Promise<void>;
  redeemPoints: (memberId: string, points: number, reference: { type: string; id: string }) => Promise<boolean>;
  getPointsHistory: (memberId: string) => PointsTransaction[];
  
  // Promotions
  getActivePromotions: () => Promotion[];
  checkPromotionEligibility: (promotion: Promotion, cart: CartItem[], member?: Member) => boolean;
  applyPromotion: (promotion: Promotion, cart: CartItem[]) => { discount: number; bonusPoints: number };
  
  // Tier
  checkTierUpgrade: (memberId: string) => Promise<MemberTier | null>;
}
```

### 3.4 UI Pages

#### Member Management (`src/pages/Members.tsx`)
- Member list with search (phone/name)
- Member detail view with points history
- Add member form
- Card/QR code display

#### Promotion Management (`src/pages/Promotions.tsx`)
- Promotion list with status
- Create promotion wizard
  - Step 1: Basic info (name, type, period)
  - Step 2: Conditions (min purchase, fuel types, time)
  - Step 3: Rewards (discount, bonus points)
- Enable/disable toggle

---

## Phase 4: Full Accounting System

### 4.1 Database Schema

```sql
-- Chart of accounts
CREATE TABLE chart_of_accounts (
  id text PRIMARY KEY,
  code text UNIQUE NOT NULL,
  name text NOT NULL,
  type text NOT NULL CHECK (type IN ('asset', 'liability', 'equity', 'revenue', 'expense')),
  subtype text,
  parent_id text REFERENCES chart_of_accounts(id),
  is_active boolean DEFAULT true,
  created_at text DEFAULT CURRENT_TIMESTAMP
);

-- Initial accounts
INSERT INTO chart_of_accounts (id, code, name, type) VALUES
('acc_001', '1-1000', 'สินทรัพย์หมุนเวียน', 'asset'),
('acc_002', '1-1100', 'เงินสด', 'asset'),
('acc_003', '1-1200', 'ลูกหนี้การค้า', 'asset'),
('acc_004', '1-1300', 'สต็อกน้ำมัน', 'asset'),
('acc_005', '1-1400', 'สต็อกสินค้า', 'asset'),
('acc_006', '2-1000', 'หนี้สินหมุนเวียน', 'liability'),
('acc_007', '2-1100', 'เจ้าหนี้การค้า', 'liability'),
('acc_008', '2-1200', 'ภาษีขาย', 'liability'),
('acc_009', '3-1000', 'ทุน', 'equity'),
('acc_010', '4-1000', 'รายได้', 'revenue'),
('acc_011', '4-1100', 'รายได้จากการขายน้ำมัน', 'revenue'),
('acc_012', '4-1200', 'รายได้จากการขายสินค้า', 'revenue'),
('acc_013', '4-1300', 'รายได้จากค่าบริการ', 'revenue'),
('acc_014', '5-1000', 'ค่าใช้จ่าย', 'expense'),
('acc_015', '5-1100', 'ต้นทุนขายน้ำมัน', 'expense'),
('acc_016', '5-1200', 'ต้นทุนขายสินค้า', 'expense'),
('acc_017', '5-1300', 'ค่าใช้จ่ายบุคลากร', 'expense'),
('acc_018', '5-1400', 'ค่าเช่า', 'expense'),
('acc_019', '5-1500', 'ค่าสาธารณูปโภค', 'expense'),
('acc_020', '5-1600', 'ค่าใช้จ่ายเบ็ดเตล็ด', 'expense');

-- General ledger entries
CREATE TABLE general_ledger (
  id text PRIMARY KEY,
  entry_no text UNIQUE NOT NULL,
  date text NOT NULL,
  
  account_id text REFERENCES chart_of_accounts(id),
  debit decimal(12,2) DEFAULT 0,
  credit decimal(12,2) DEFAULT 0,
  
  description text,
  reference_type text, -- 'sale', 'purchase', 'expense', 'journal', 'adjustment'
  reference_id text,
  
  created_by text,
  created_at text DEFAULT CURRENT_TIMESTAMP
);

-- Expenses (for easy entry)
CREATE TABLE expenses (
  id text PRIMARY KEY,
  date text NOT NULL,
  expense_no text UNIQUE,
  
  category text NOT NULL CHECK (category IN ('salary', 'rent', 'utility', 'maintenance', 'fuel_delivery', 'office', 'marketing', 'tax', 'other')),
  description text,
  amount decimal(12,2) NOT NULL,
  
  payment_method text,
  receipt_no text,
  
  vendor text,
  approved_by text,
  
  created_by text,
  created_at text DEFAULT CURRENT_TIMESTAMP
);

-- Journal entries (manual adjustments)
CREATE TABLE journal_entries (
  id text PRIMARY KEY,
  entry_no text UNIQUE NOT NULL,
  date text NOT NULL,
  description text,
  
  lines jsonb NOT NULL, -- [{account_id, debit, credit, description}]
  
  total_debit decimal(12,2) NOT NULL,
  total_credit decimal(12,2) NOT NULL,
  
  status text DEFAULT 'draft' CHECK (status IN ('draft', 'posted', 'reversed')),
  
  created_by text,
  posted_at text,
  posted_by text,
  created_at text DEFAULT CURRENT_TIMESTAMP
);

-- Tax records
CREATE TABLE tax_records (
  id text PRIMARY KEY,
  period text NOT NULL, -- YYYY-MM format
  tax_type text NOT NULL CHECK (tax_type IN ('vat_output', 'vat_input', 'withholding')),
  
  amount decimal(12,2) NOT NULL,
  document_no text,
  
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'filed', 'paid')),
  filed_at text,
  
  created_at text DEFAULT CURRENT_TIMESTAMP
);
```

### 4.2 TypeScript Types

```typescript
export type AccountType = 'asset' | 'liability' | 'equity' | 'revenue' | 'expense';
export type ExpenseCategory = 'salary' | 'rent' | 'utility' | 'maintenance' | 'fuel_delivery' | 'office' | 'marketing' | 'tax' | 'other';
export type TaxType = 'vat_output' | 'vat_input' | 'withholding';

export interface ChartOfAccount {
  id: string;
  code: string;
  name: string;
  type: AccountType;
  subtype?: string;
  parentId?: string;
  isActive: boolean;
  createdAt: string;
  parent?: ChartOfAccount;
  children?: ChartOfAccount[];
}

export interface GeneralLedgerEntry {
  id: string;
  entryNo: string;
  date: string;
  accountId: string;
  debit: number;
  credit: number;
  description?: string;
  referenceType?: string;
  referenceId?: string;
  createdBy?: string;
  createdAt: string;
  account?: ChartOfAccount;
}

export interface Expense {
  id: string;
  date: string;
  expenseNo?: string;
  category: ExpenseCategory;
  description: string;
  amount: number;
  paymentMethod?: string;
  receiptNo?: string;
  vendor?: string;
  approvedBy?: string;
  createdBy?: string;
  createdAt: string;
}

export interface JournalEntry {
  id: string;
  entryNo: string;
  date: string;
  description: string;
  lines: JournalLine[];
  totalDebit: number;
  totalCredit: number;
  status: 'draft' | 'posted' | 'reversed';
  createdBy?: string;
  postedAt?: string;
  postedBy?: string;
  createdAt: string;
}

export interface JournalLine {
  accountId: string;
  debit: number;
  credit: number;
  description?: string;
  account?: ChartOfAccount;
}

export interface TaxRecord {
  id: string;
  period: string;
  taxType: TaxType;
  amount: number;
  documentNo?: string;
  status: 'pending' | 'filed' | 'paid';
  filedAt?: string;
  createdAt: string;
}

// Financial reports
export interface ProfitLossReport {
  period: string;
  revenue: {
    fuel: number;
    products: number;
    services: number;
    total: number;
  };
  costOfSales: {
    fuel: number;
    products: number;
    total: number;
  };
  grossProfit: number;
  operatingExpenses: {
    [category: string]: number;
    total: number;
  };
  netProfit: number;
}

export interface BalanceSheet {
  date: string;
  assets: {
    current: { [code: string]: number };
    total: number;
  };
  liabilities: {
    current: { [code: string]: number };
    total: number;
  };
  equity: {
    capital: number;
    retainedEarnings: number;
    total: number;
  };
}
```

### 4.3 Accounting Context

```typescript
export interface AccountingContextType {
  accounts: ChartOfAccount[];
  expenses: Expense[];
  journalEntries: JournalEntry[];
  taxRecords: TaxRecord[];
  
  // Chart of accounts
  getAccountByCode: (code: string) => ChartOfAccount | undefined;
  getAccountsByType: (type: AccountType) => ChartOfAccount[];
  
  // General ledger
  getLedgerEntries: (filters: { accountId?: string; startDate?: string; endDate?: string }) => GeneralLedgerEntry[];
  
  // Expenses
  addExpense: (expense: Omit<Expense, 'id' | 'expenseNo' | 'createdAt'>) => Promise<void>;
  getExpensesByDateRange: (start: string, end: string) => Expense[];
  
  // Journal entries
  createJournalEntry: (entry: Omit<JournalEntry, 'id' | 'entryNo' | 'status' | 'createdAt'>) => Promise<void>;
  postJournalEntry: (id: string) => Promise<void>;
  
  // Reports
  getProfitLoss: (period: string) => Promise<ProfitLossReport>;
  getBalanceSheet: (date: string) => Promise<BalanceSheet>;
  getCashFlow: (start: string, end: string) => Promise<{ inflow: number; outflow: number; net: number }>;
  
  // Tax
  calculateVAT: (period: string) => Promise<{ output: number; input: number; payable: number }>;
  getTaxReport: (period: string, taxType: TaxType) => TaxRecord[];
}
```

### 4.4 UI Pages

#### Chart of Accounts (`src/pages/ChartOfAccounts.tsx`)
- Tree view of accounts by type
- Account balance display
- Add/Edit account modal
- Drill-down to ledger

#### General Ledger (`src/pages/GeneralLedger.tsx`)
- Filter by account and date range
- Ledger entries table with running balance
- Export to Excel

#### Expense Entry (`src/pages/Expenses.tsx`)
- Expense list with filters
- Quick expense form
- Receipt upload
- Approval workflow

#### Journal Entries (`src/pages/JournalEntries.tsx`)
- Entry list with status
- Create/Edit journal entry (multi-line)
- Debit/Credit validation
- Post/Revert actions

#### Financial Reports (`src/pages/FinancialReports.tsx`)
- P&L Statement
- Balance Sheet
- Cash Flow
- VAT Report (ภ.พ.30)
- Export PDF

---

## Integration Points

### 1. POS → Inventory
When POS sale is completed:
1. Deduct product stock from `products.current_stock`
2. Record transaction in `product_transactions`
3. Update fuel inventory `sold_qty`

### 2. POS → Loyalty
When member purchase:
1. Calculate points based on tier multiplier
2. Record in `points_transactions`
3. Update `members.points_balance`
4. Check tier upgrade eligibility

### 3. POS → Accounting
When sale completed:
1. Create GL entries:
   - Debit: Cash/Bank
   - Credit: Revenue accounts
   - Credit: VAT Output
2. If member redeemed points, record as discount

### 4. Fuel Delivery → Inventory + Accounting
When fuel delivery received:
1. Update `fuel_inventory.received_qty`
2. Create GL entries:
   - Debit: Fuel Inventory
   - Credit: Accounts Payable
3. Create expense record for payment

### 5. Expense → Accounting
When expense recorded:
1. Create GL entry:
   - Debit: Expense account
   - Credit: Cash/Bank

---

## Implementation Order

### Week 1-2: Inventory Management
1. Database schema
2. Types and storage functions
3. InventoryContext
4. UI pages (Inventory, Products, Suppliers)

### Week 3-4: POS System
1. Database schema
2. POSContext with cart management
3. Fuel dispenser UI
4. Product grid UI
5. Payment modal
6. Receipt printing

### Week 5-6: Loyalty Program
1. Database schema
2. LoyaltyContext
3. Member management UI
4. Promotion engine
5. Points calculation

### Week 7-8: Accounting System
1. Database schema (COA, GL, Expenses)
2. AccountingContext
3. Chart of accounts UI
4. Expense entry
5. Journal entries
6. Financial reports

### Week 9-10: Integration & Polish
1. Connect all modules
2. Auto-generate GL entries from POS
3. Auto-update inventory from POS
4. Auto-calculate points
5. Testing & bug fixes

---

## New Dependencies

```json
{
  "dependencies": {
    "react-barcode-reader": "^2.0.0",
    "jspdf": "^2.5.1",
    "html2canvas": "^1.4.1",
    "xlsx": "^0.18.5",
    "qrcode.react": "^3.1.0",
    "react-thermal-printer": "^0.18.0"
  }
}
```

---

## File Structure

```
src/
├── contexts/
│   ├── InventoryContext.tsx
│   ├── POSContext.tsx
│   ├── LoyaltyContext.tsx
│   └── AccountingContext.tsx
├── data/
│   ├── inventoryStorage.ts
│   ├── posStorage.ts
│   ├── loyaltyStorage.ts
│   └── accountingStorage.ts
├── types/
│   ├── inventory.ts
│   ├── pos.ts
│   ├── loyalty.ts
│   └── accounting.ts
├── pages/
│   ├── Inventory.tsx
│   ├── Products.tsx
│   ├── POS.tsx
│   ├── Members.tsx
│   ├── Promotions.tsx
│   ├── ChartOfAccounts.tsx
│   ├── GeneralLedger.tsx
│   ├── Expenses.tsx
│   ├── JournalEntries.tsx
│   └── FinancialReports.tsx
└── components/
    ├── inventory/
    ├── pos/
    ├── loyalty/
    └── accounting/
```

---

## Testing Strategy

1. **Unit Tests**: Storage functions, calculations
2. **Integration Tests**: Context providers, data flow
3. **E2E Tests**: Complete sale flow (POS → Inventory → Accounting → Loyalty)
4. **Edge Cases**: 
   - Negative stock prevention
   - Points calculation rounding
   - VAT calculation precision
   - Concurrent transactions
