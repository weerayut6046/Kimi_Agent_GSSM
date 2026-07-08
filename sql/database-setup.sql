-- =====================================================
-- Gas Station Shift Manager - Database Setup Script
-- รันคำสั่งนี้ที่ Supabase Dashboard → SQL Editor
-- =====================================================

-- 1. ไม่มีการลบข้อมูลอัตโนมัติ (ป้องกันข้อมูลหายจากการรันสคริปต์ซ้ำ)
-- หากต้องการล้างข้อมูลทั้งหมดจริง ๆ ให้ใช้ไฟล์ sql/reset-all-data.sql (ระวัง!)

-- 2. สร้างตาราง (ถ้ายังไม่มี)
CREATE TABLE IF NOT EXISTS positions (
  id text PRIMARY KEY,
  name text NOT NULL,
  description text
);

CREATE TABLE IF NOT EXISTS skills (
  id text PRIMARY KEY,
  name text NOT NULL,
  code text NOT NULL
);

CREATE TABLE IF NOT EXISTS stations (
  id text PRIMARY KEY,
  name text NOT NULL,
  address text,
  phone text,
  managerid text
);

CREATE TABLE IF NOT EXISTS shifts (
  id text PRIMARY KEY,
  name text NOT NULL,
  starttime text NOT NULL,
  endtime text NOT NULL,
  minstaff int NOT NULL,
  requiredskills jsonb DEFAULT '[]',
  color text
);

CREATE TABLE IF NOT EXISTS profiles (
  id text PRIMARY KEY,
  userid text,
  firstname text,
  lastname text,
  fullname text NOT NULL,
  phone text,
  avatar text,
  positionid text REFERENCES positions(id),
  stationid text,
  status text NOT NULL,
  hiredate text
);

CREATE TABLE IF NOT EXISTS profile_skills (
  profileid text REFERENCES profiles(id) ON DELETE CASCADE,
  skillid text REFERENCES skills(id) ON DELETE CASCADE,
  PRIMARY KEY (profileid, skillid)
);

CREATE TABLE IF NOT EXISTS users (
  id text PRIMARY KEY,
  authuid text UNIQUE,
  email text UNIQUE NOT NULL,
  password text NOT NULL,
  role text NOT NULL,
  profileid text,
  createdat text NOT NULL,
  updatedat text NOT NULL
);

CREATE TABLE IF NOT EXISTS schedules (
  id text PRIMARY KEY,
  date text NOT NULL,
  shiftid text REFERENCES shifts(id),
  employeeid text REFERENCES profiles(id),
  stationid text,
  status text NOT NULL,
  note text,
  createdby text,
  createdat text NOT NULL
);

CREATE TABLE IF NOT EXISTS leave_requests (
  id text PRIMARY KEY,
  employeeid text REFERENCES profiles(id),
  type text NOT NULL,
  startdate text NOT NULL,
  enddate text NOT NULL,
  days int NOT NULL,
  reason text,
  status text NOT NULL,
  approvedby text,
  approvedat text,
  createdat text NOT NULL
);

CREATE TABLE IF NOT EXISTS swap_requests (
  id text PRIMARY KEY,
  requesterid text REFERENCES profiles(id),
  requestedid text REFERENCES profiles(id),
  scheduleid text REFERENCES schedules(id),
  targetscheduleid text REFERENCES schedules(id),
  status text NOT NULL,
  approvedby text,
  createdat text NOT NULL
);

CREATE TABLE IF NOT EXISTS attendances (
  id text PRIMARY KEY,
  employeeid text REFERENCES profiles(id),
  scheduleid text REFERENCES schedules(id),
  checkin text,
  checkout text,
  checkinlocation text,
  checkoutlocation text,
  note text,
  status text NOT NULL
);

CREATE TABLE IF NOT EXISTS fuel_prices (
  id text PRIMARY KEY,
  "95" numeric NOT NULL,
  "B7" numeric NOT NULL,
  "B10" numeric NOT NULL,
  "Diesel" numeric NOT NULL,
  effectivedate text NOT NULL,
  createdat text NOT NULL
);

CREATE TABLE IF NOT EXISTS daily_accounting (
  id text PRIMARY KEY,
  date text NOT NULL,
  shiftid text REFERENCES shifts(id),
  employeeid text REFERENCES profiles(id),
  fuelmeter jsonb NOT NULL,
  fuelsales jsonb NOT NULL,
  fuelamount jsonb NOT NULL,
  totalfuelamount numeric NOT NULL,
  systemamount numeric NOT NULL,
  cashamount numeric NOT NULL,
  actualcashcounted numeric,
  dispensercash jsonb NOT NULL,
  items jsonb NOT NULL,
  totalamount numeric NOT NULL,
  difference numeric NOT NULL,
  note text,
  createdat text NOT NULL,
  updatedat text NOT NULL,
  isdeleted boolean DEFAULT false,
  deletedat text,
  deletedby text
);

CREATE TABLE IF NOT EXISTS notifications (
  id text PRIMARY KEY,
  userid text NOT NULL,
  title text NOT NULL,
  message text NOT NULL,
  type text NOT NULL,
  read boolean DEFAULT false,
  createdat text NOT NULL
);

-- Audit Trail Table
CREATE TABLE IF NOT EXISTS audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name text NOT NULL,
  record_id text NOT NULL,
  action text NOT NULL CHECK (action IN ('create', 'update', 'delete')),
  old_value jsonb,
  new_value jsonb,
  performed_by text NOT NULL,
  performed_by_email text,
  performed_by_name text,
  performed_at timestamp with time zone DEFAULT now(),
  ip_address text
);

-- Index สำหรับ query ประวัติการเปลี่ยนแปลง
CREATE INDEX IF NOT EXISTS idx_audit_logs_table ON audit_logs(table_name);
CREATE INDEX IF NOT EXISTS idx_audit_logs_record ON audit_logs(record_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_performed_by ON audit_logs(performed_by);
CREATE INDEX IF NOT EXISTS idx_audit_logs_performed_at ON audit_logs(performed_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);

-- Inventory Management Tables

-- Fuel tanks inventory (daily tracking)
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

-- Fuel deliveries (purchase orders from suppliers)
CREATE TABLE IF NOT EXISTS fuel_deliveries (
  id text PRIMARY KEY,
  do_number text UNIQUE NOT NULL,
  supplier_id text,
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

-- Shop products
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
  supplier_id text,
  is_active boolean DEFAULT true,
  created_at text DEFAULT CURRENT_TIMESTAMP
);

-- Product stock transactions
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

-- Sales (POS transactions)
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

-- 3. เพิ่มข้อมูล Positions
INSERT INTO positions (id, name, description) VALUES
('pos1', 'พนักงานเติมน้ำมัน', 'เติมน้ำมันและดูแลลูกค้าที่ปั๊ม'),
('pos2', 'แคชเชียร์', 'รับเงินและให้บริการที่เคาน์เตอร์'),
('pos3', 'ผู้จัดการสาขา', 'ดูแลการดำเนินงานทั้งหมดของสาขา'),
('pos4', 'พนักงานอเนกประสงค์', 'ช่วยงานทุกแผนกตามต้องการ');

-- 4. เพิ่มข้อมูล Skills
INSERT INTO skills (id, name, code) VALUES
('skill1', 'เติมน้ำมัน', 'FUEL'),
('skill2', 'รับเงิน', 'CASHIER'),
('skill3', 'สต็อกสินค้า', 'STOCK'),
('skill4', 'ซ่อมบำรุง', 'MAINTENANCE');

-- 5. เพิ่มข้อมูล Stations
INSERT INTO stations (id, name, address, phone, managerid) VALUES
('station1', 'ปั๊มน้ำมันสาขาหลัก', '123 ถนนสุขุมวิท กรุงเทพฯ', '02-123-4567', 'emp3');

-- 6. เพิ่มข้อมูล Shifts
INSERT INTO shifts (id, name, starttime, endtime, minstaff, requiredskills, color) VALUES
('shift1', 'กะเช้า', '06:00', '14:00', 3, '["skill1", "skill2"]', '#22c55e'),
('shift2', 'กะบ่าย', '14:00', '22:00', 3, '["skill1", "skill2"]', '#3b82f6'),
('shift3', 'กะดึก', '22:00', '06:00', 2, '["skill1", "skill2"]', '#8b5cf6');

-- 7. เพิ่มข้อมูล Profiles
INSERT INTO profiles (id, userid, firstname, lastname, fullname, phone, avatar, positionid, stationid, status, hiredate) VALUES
('emp1', 'user1', 'แอดมิน', 'ระบบ', 'แอดมิน ระบบ', '081-111-1111', '', 'pos3', 'station1', 'active', '2020-01-01'),
('emp2', 'user2', 'สมชาย', 'ใจดี', 'สมชาย ใจดี', '082-222-2222', '', 'pos1', 'station1', 'active', '2022-03-15'),
('emp3', 'user3', 'มานะ', 'พยายาม', 'มานะ พยายาม', '083-333-3333', '', 'pos3', 'station1', 'active', '2019-06-01'),
('emp4', 'user4', 'สมหญิง', 'รักงาน', 'สมหญิง รักงาน', '084-444-4444', '', 'pos2', 'station1', 'active', '2021-08-20'),
('emp5', 'user5', 'มานี', 'ขยันทำ', 'มานี ขยันทำ', '085-555-5555', '', 'pos4', 'station1', 'active', '2023-01-10'),
('emp6', 'user6', 'ประสิทธิ', 'เก่งกาจ', 'ประสิทธิ เก่งกาจ', '086-666-6666', '', 'pos1', 'station1', 'active', '2022-11-15');

-- 8. เพิ่มข้อมูล Profile Skills
INSERT INTO profile_skills (profileid, skillid) VALUES
('emp1', 'skill1'), ('emp1', 'skill2'), ('emp1', 'skill3'),
('emp2', 'skill1'),
('emp3', 'skill1'), ('emp3', 'skill2'), ('emp3', 'skill3'),
('emp4', 'skill2'),
('emp5', 'skill1'), ('emp5', 'skill2'),
('emp6', 'skill1');

-- 9. เพิ่มข้อมูล Users (password: Admin@123, Manager@123, Staff@123)
-- รหัสผ่านถูก hash ด้วย bcrypt (12 rounds)
INSERT INTO users (id, authuid, email, password, role, profileid, createdat, updatedat) VALUES
('user1', NULL, 'admin@gasstation.com', '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewKyNiAYMyzJ/I5K', 'admin', 'emp1', '2024-01-01T00:00:00Z', '2024-01-01T00:00:00Z'),
('user2', NULL, 'somchai@gasstation.com', '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewKyNiAYMyzJ/I5K', 'staff', 'emp2', '2024-01-01T00:00:00Z', '2024-01-01T00:00:00Z'),
('user3', NULL, 'manager@gasstation.com', '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewKyNiAYMyzJ/I5K', 'manager', 'emp3', '2024-01-01T00:00:00Z', '2024-01-01T00:00:00Z'),
('user4', NULL, 'somying@gasstation.com', '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewKyNiAYMyzJ/I5K', 'staff', 'emp4', '2024-01-01T00:00:00Z', '2024-01-01T00:00:00Z'),
('user5', NULL, 'mani@gasstation.com', '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewKyNiAYMyzJ/I5K', 'staff', 'emp5', '2024-01-01T00:00:00Z', '2024-01-01T00:00:00Z'),
('user6', NULL, 'prasit@gasstation.com', '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewKyNiAYMyzJ/I5K', 'staff', 'emp6', '2024-01-01T00:00:00Z', '2024-01-01T00:00:00Z');

-- 10. เพิ่มข้อมูล Fuel Prices
INSERT INTO fuel_prices (id, "95", "B7", "B10", "Diesel", effectivedate, createdat) VALUES
('fp1', 39.99, 36.99, 37.99, 34.99, '2024-01-01', '2024-01-01T00:00:00Z');

-- 11. เปิดใช้งาน RLS (Row Level Security)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE positions ENABLE ROW LEVEL SECURITY;
ALTER TABLE skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE stations ENABLE ROW LEVEL SECURITY;
ALTER TABLE profile_skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE leave_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE swap_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendances ENABLE ROW LEVEL SECURITY;
ALTER TABLE fuel_prices ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_accounting ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE fuel_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE fuel_deliveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;

-- 12. สร้าง Policies สำหรับ Development (อนุญาติทุกการเข้าถึง)
-- สำหรับ Production ควรปรับให้เหมาะสม
DROP POLICY IF EXISTS "Allow all" ON users;
DROP POLICY IF EXISTS "Allow all" ON profiles;
DROP POLICY IF EXISTS "Allow all" ON fuel_inventory;
DROP POLICY IF EXISTS "Allow all" ON fuel_deliveries;
DROP POLICY IF EXISTS "Allow all" ON products;
DROP POLICY IF EXISTS "Allow all" ON product_transactions;
DROP POLICY IF EXISTS "Allow all" ON suppliers;
DROP POLICY IF EXISTS "Allow all" ON positions;
DROP POLICY IF EXISTS "Allow all" ON skills;
DROP POLICY IF EXISTS "Allow all" ON stations;
DROP POLICY IF EXISTS "Allow all" ON profile_skills;
DROP POLICY IF EXISTS "Allow all" ON shifts;
DROP POLICY IF EXISTS "Allow all" ON schedules;
DROP POLICY IF EXISTS "Allow all" ON leave_requests;
DROP POLICY IF EXISTS "Allow all" ON swap_requests;
DROP POLICY IF EXISTS "Allow all" ON attendances;
DROP POLICY IF EXISTS "Allow all" ON fuel_prices;
DROP POLICY IF EXISTS "Allow all" ON daily_accounting;
DROP POLICY IF EXISTS "Allow all" ON notifications;

-- Helper function สำหรับตรวจสอบ role (SECURITY DEFINER)
CREATE OR REPLACE FUNCTION public.user_has_role(allowed_roles text[])
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.users
    WHERE authuid = auth.uid()::text
      AND role = ANY(allowed_roles)
  );
END;
$$;

CREATE POLICY "Allow all" ON users FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON profiles FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON positions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON skills FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON stations FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON profile_skills FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON shifts FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON schedules FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON leave_requests FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON swap_requests FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON attendances FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON fuel_prices FOR ALL USING (true) WITH CHECK (true);

-- daily_accounting: ปลอดภัยขึ้น (soft delete + จำกัดสิทธิ์ลบ)
CREATE POLICY "daily_accounting_select"
  ON daily_accounting FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "daily_accounting_insert"
  ON daily_accounting FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "daily_accounting_update"
  ON daily_accounting FOR UPDATE
  USING (auth.role() = 'authenticated')
  WITH CHECK (
    auth.role() = 'authenticated'
    AND (
      (isdeleted = false OR isdeleted IS NULL)
      OR public.user_has_role(ARRAY['admin', 'manager'])
    )
  );

CREATE POLICY "daily_accounting_delete"
  ON daily_accounting FOR DELETE
  USING (public.user_has_role(ARRAY['admin', 'manager']));

CREATE POLICY "Allow all" ON notifications FOR ALL USING (true) WITH CHECK (true);

-- Audit logs: Admin/Manager ดูได้ทั้งหมด Staff ดูไม่ได้
DROP POLICY IF EXISTS "Audit logs viewable by admin and manager" ON audit_logs;
CREATE POLICY "Audit logs viewable by admin and manager"
  ON audit_logs
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.authuid = auth.uid()::text
      AND users.role IN ('admin', 'manager')
    )
  );

-- อนุญาตให้ insert audit logs จากทุกคน (ผ่าน app)
DROP POLICY IF EXISTS "Allow insert audit logs" ON audit_logs;
CREATE POLICY "Allow insert audit logs"
  ON audit_logs
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Allow all" ON fuel_inventory FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON fuel_deliveries FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON products FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON product_transactions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON suppliers FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE daily_accounting FORCE ROW LEVEL SECURITY;

-- =====================================================
-- ✅ เสร็จสิ้น!
-- 
-- ขั้นตอนต่อไป:
-- 1. ไปที่ Authentication → Users (ใน Supabase Dashboard)
-- 2. เพิ่ม Users 6 คนด้วยอีเมลและรหัสผ่านด้านล่าง:
--    - admin@gasstation.com / Admin@123
--    - manager@gasstation.com / Manager@123  
--    - somchai@gasstation.com / Staff@123
--    - somying@gasstation.com / Staff@123
--    - mani@gasstation.com / Staff@123
--    - prasit@gasstation.com / Staff@123
-- 3. รันคำสั่งนี้เพื่อเชื่อมโยง UUID อัตโนมัติ:
--
--    UPDATE users u SET authuid = a.id FROM auth.users a WHERE u.email = a.email;
--
-- 4. รีเฟรชหน้าเว็บแล้วลองเข้าสู่ระบบ
-- =====================================================
