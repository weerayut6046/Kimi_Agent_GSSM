-- =====================================================
-- POS System Setup Script
-- Run this in Supabase Dashboard → SQL Editor
-- =====================================================

-- 1. Create sales table
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
  change_amount decimal(12,2) DEFAULT 0,  -- เงินทอน (ใช้ change_amount แทน change เพราะ change เป็น reserved word)
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

-- 2. Enable RLS on sales table
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;

-- 3. Create RLS policy (Allow all for development)
DROP POLICY IF EXISTS "Allow all" ON sales;
CREATE POLICY "Allow all" ON sales
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- 4. Verify table creation
SELECT 
  schemaname,
  tablename,
  rowsecurity AS rls_enabled
FROM pg_tables
WHERE tablename = 'sales'
AND schemaname = 'public';

-- =====================================================
-- ✅ POS System Ready!
-- =====================================================
