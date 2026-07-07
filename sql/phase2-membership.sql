-- ============================================
-- Phase 2A.2: Membership / Customer System
-- ============================================

-- Customers (ลูกค้าสมาชิก)
CREATE TABLE IF NOT EXISTS customers (
  id text PRIMARY KEY,
  member_code text UNIQUE NOT NULL,
  name text NOT NULL,
  phone text,
  email text,
  tier text DEFAULT 'bronze' CHECK (tier IN ('bronze', 'silver', 'gold')),
  points int DEFAULT 0,
  total_spent decimal(12,2) DEFAULT 0,
  birth_date text,
  is_active boolean DEFAULT true,
  created_at text DEFAULT CURRENT_TIMESTAMP,
  updated_at text DEFAULT CURRENT_TIMESTAMP
);

-- Customer Transactions (ประวัติการใช้จ่ายและแต้ม)
CREATE TABLE IF NOT EXISTS customer_transactions (
  id text PRIMARY KEY,
  customer_id text REFERENCES customers(id) ON DELETE CASCADE,
  sale_id text,
  type text NOT NULL CHECK (type IN ('earn', 'redeem', 'adjust', 'expire')),
  points int NOT NULL DEFAULT 0,
  amount decimal(12,2) DEFAULT 0,
  note text,
  created_at text DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone);
CREATE INDEX IF NOT EXISTS idx_customers_member_code ON customers(member_code);
CREATE INDEX IF NOT EXISTS idx_customer_transactions_customer ON customer_transactions(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_transactions_sale ON customer_transactions(sale_id);

-- RLS Policies
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all customers" ON customers;
CREATE POLICY "Allow all customers"
  ON customers FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all customer transactions" ON customer_transactions;
CREATE POLICY "Allow all customer transactions"
  ON customer_transactions FOR ALL USING (true) WITH CHECK (true);

-- ============================================
-- ✅ เสร็จสิ้น! รีเฟรชหน้าเว็บเพื่อใช้งาน
-- ============================================
