-- ============================================
-- สร้างตารางที่หายไปสำหรับระบบ POS
-- ============================================

-- ตาราง Sales (การขาย POS)
CREATE TABLE IF NOT EXISTS sales (
  id text PRIMARY KEY,
  sale_number text UNIQUE NOT NULL,
  date text NOT NULL,
  time text NOT NULL,
  employee_id text NOT NULL,
  shift_id text,
  items jsonb DEFAULT '[]',
  subtotal decimal(12,2) DEFAULT 0,
  discount decimal(12,2) DEFAULT 0,
  tax decimal(12,2) DEFAULT 0,
  total decimal(12,2) DEFAULT 0,
  payments jsonb DEFAULT '[]',
  paid_amount decimal(12,2) DEFAULT 0,
  change_amount decimal(12,2) DEFAULT 0,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'cancelled', 'refunded')),
  cancelled_at text,
  cancelled_by text,
  cancel_reason text,
  refunded_at text,
  refunded_by text,
  refund_reason text,
  original_sale_id text,
  customer_name text,
  customer_phone text,
  customer_type text DEFAULT 'general' CHECK (customer_type IN ('general', 'member', 'corporate')),
  member_id text,
  note text,
  created_at text DEFAULT CURRENT_TIMESTAMP,
  updated_at text DEFAULT CURRENT_TIMESTAMP
);

-- เปิดใช้งาน RLS
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;

-- ลบ Policies เก่า (ถ้ามี) แล้วสร้างใหม่
DROP POLICY IF EXISTS "Allow all" ON sales;
CREATE POLICY "Allow all" ON sales FOR ALL USING (true) WITH CHECK (true);

-- ============================================
-- ตรวจสอบว่าตารางอื่นๆ มีครบหรือยัง
-- ============================================

-- Suppliers
CREATE TABLE IF NOT EXISTS suppliers (
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

ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all" ON suppliers;
CREATE POLICY "Allow all" ON suppliers FOR ALL USING (true) WITH CHECK (true);

-- Fuel Inventory
CREATE TABLE IF NOT EXISTS fuel_inventory (
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

ALTER TABLE fuel_inventory ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all" ON fuel_inventory;
CREATE POLICY "Allow all" ON fuel_inventory FOR ALL USING (true) WITH CHECK (true);

-- Fuel Deliveries
CREATE TABLE IF NOT EXISTS fuel_deliveries (
  id text PRIMARY KEY,
  do_number text UNIQUE NOT NULL,
  supplier_id text REFERENCES suppliers(id),
  fuel_type text NOT NULL CHECK (fuel_type IN ('95', 'B7', 'B10', 'Diesel')),
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

ALTER TABLE fuel_deliveries ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all" ON fuel_deliveries;
CREATE POLICY "Allow all" ON fuel_deliveries FOR ALL USING (true) WITH CHECK (true);

-- Products
CREATE TABLE IF NOT EXISTS products (
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
  supplier_id text REFERENCES suppliers(id),
  is_active boolean DEFAULT true,
  created_at text DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE products ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all" ON products;
CREATE POLICY "Allow all" ON products FOR ALL USING (true) WITH CHECK (true);

-- Product Transactions
CREATE TABLE IF NOT EXISTS product_transactions (
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

ALTER TABLE product_transactions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all" ON product_transactions;
CREATE POLICY "Allow all" ON product_transactions FOR ALL USING (true) WITH CHECK (true);

-- ============================================
-- เพิ่มข้อมูลตัวอย่าง (Optional)
-- ============================================
INSERT INTO suppliers (id, name, contact_person, phone, email) VALUES
('sup1', 'บริษัท ปตท. จำกัด', 'คุณสมชาย', '02-123-4567', 'contact@ptt.com'),
('sup2', 'บริษัท บางจาก จำกัด', 'คุณมานี', '02-234-5678', 'contact@bangchak.com'),
('sup3', 'ผู้จัดจำหน่ายเครื่องดื่ม', 'คุณประสิทธิ', '081-234-5678', 'drinks@supplier.com')
ON CONFLICT (id) DO NOTHING;

INSERT INTO products (id, name, category, unit, cost_price, selling_price, current_stock, supplier_id) VALUES
('prod1', 'น้ำดื่ม 600ml', 'beverage', 'bottle', 8.00, 15.00, 50, 'sup3'),
('prod2', 'น้ำอัดลม', 'beverage', 'can', 12.00, 20.00, 30, 'sup3'),
('prod3', 'ขนมขบเคี้ยว', 'snack', 'pack', 15.00, 25.00, 40, 'sup3'),
('prod4', 'ผ้าเช็ดกระจก', 'automotive', 'piece', 35.00, 59.00, 20, null)
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- ✅ เสร็จสิ้น! รีเฟรชหน้าเว็บเพื่อใช้งาน
-- ============================================
