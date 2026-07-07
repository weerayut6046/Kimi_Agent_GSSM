-- =====================================================
-- SQL Script: Enable RLS + Create Policies for ALL Tables
-- Gas Station Shift Manager
-- =====================================================

-- =====================================================
-- 1. ENABLE RLS ON ALL TABLES
-- =====================================================

-- Core tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE positions ENABLE ROW LEVEL SECURITY;
ALTER TABLE skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE stations ENABLE ROW LEVEL SECURITY;
ALTER TABLE profile_skills ENABLE ROW LEVEL SECURITY;

-- Schedule tables
ALTER TABLE shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE leave_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE swap_requests ENABLE ROW LEVEL SECURITY;

-- Attendance & Accounting tables
ALTER TABLE attendances ENABLE ROW LEVEL SECURITY;
ALTER TABLE fuel_prices ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_accounting ENABLE ROW LEVEL SECURITY;

-- Notification table
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- POS tables
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- 2. DROP EXISTING POLICIES (ถ้ามี) - เพื่อป้องกัน duplicate
-- =====================================================

-- Users
DROP POLICY IF EXISTS "Allow all" ON users;
DROP POLICY IF EXISTS "Allow select" ON users;
DROP POLICY IF EXISTS "Allow insert" ON users;
DROP POLICY IF EXISTS "Allow update" ON users;
DROP POLICY IF EXISTS "Allow delete" ON users;
DROP POLICY IF EXISTS "Enable all for authenticated users only" ON users;
DROP POLICY IF EXISTS "Enable read access for all users" ON users;

-- Profiles
DROP POLICY IF EXISTS "Allow all" ON profiles;
DROP POLICY IF EXISTS "Allow select" ON profiles;
DROP POLICY IF EXISTS "Allow insert" ON profiles;
DROP POLICY IF EXISTS "Allow update" ON profiles;
DROP POLICY IF EXISTS "Allow delete" ON profiles;

-- Positions
DROP POLICY IF EXISTS "Allow all" ON positions;
DROP POLICY IF EXISTS "Allow select" ON positions;
DROP POLICY IF EXISTS "Allow insert" ON positions;
DROP POLICY IF EXISTS "Allow update" ON positions;
DROP POLICY IF EXISTS "Allow delete" ON positions;

-- Skills
DROP POLICY IF EXISTS "Allow all" ON skills;
DROP POLICY IF EXISTS "Allow select" ON skills;
DROP POLICY IF EXISTS "Allow insert" ON skills;
DROP POLICY IF EXISTS "Allow update" ON skills;
DROP POLICY IF EXISTS "Allow delete" ON skills;

-- Stations
DROP POLICY IF EXISTS "Allow all" ON stations;
DROP POLICY IF EXISTS "Allow select" ON stations;
DROP POLICY IF EXISTS "Allow insert" ON stations;
DROP POLICY IF EXISTS "Allow update" ON stations;
DROP POLICY IF EXISTS "Allow delete" ON stations;

-- Profile Skills
DROP POLICY IF EXISTS "Allow all" ON profile_skills;
DROP POLICY IF EXISTS "Allow select" ON profile_skills;
DROP POLICY IF EXISTS "Allow insert" ON profile_skills;
DROP POLICY IF EXISTS "Allow update" ON profile_skills;
DROP POLICY IF EXISTS "Allow delete" ON profile_skills;

-- Shifts
DROP POLICY IF EXISTS "Allow all" ON shifts;
DROP POLICY IF EXISTS "Allow select" ON shifts;
DROP POLICY IF EXISTS "Allow insert" ON shifts;
DROP POLICY IF EXISTS "Allow update" ON shifts;
DROP POLICY IF EXISTS "Allow delete" ON shifts;

-- Schedules
DROP POLICY IF EXISTS "Allow all" ON schedules;
DROP POLICY IF EXISTS "Allow select" ON schedules;
DROP POLICY IF EXISTS "Allow insert" ON schedules;
DROP POLICY IF EXISTS "Allow update" ON schedules;
DROP POLICY IF EXISTS "Allow delete" ON schedules;

-- Leave Requests
DROP POLICY IF EXISTS "Allow all" ON leave_requests;
DROP POLICY IF EXISTS "Allow select" ON leave_requests;
DROP POLICY IF EXISTS "Allow insert" ON leave_requests;
DROP POLICY IF EXISTS "Allow update" ON leave_requests;
DROP POLICY IF EXISTS "Allow delete" ON leave_requests;

-- Swap Requests
DROP POLICY IF EXISTS "Allow all" ON swap_requests;
DROP POLICY IF EXISTS "Allow select" ON swap_requests;
DROP POLICY IF EXISTS "Allow insert" ON swap_requests;
DROP POLICY IF EXISTS "Allow update" ON swap_requests;
DROP POLICY IF EXISTS "Allow delete" ON swap_requests;

-- Attendances
DROP POLICY IF EXISTS "Allow all" ON attendances;
DROP POLICY IF EXISTS "Allow select" ON attendances;
DROP POLICY IF EXISTS "Allow insert" ON attendances;
DROP POLICY IF EXISTS "Allow update" ON attendances;
DROP POLICY IF EXISTS "Allow delete" ON attendances;

-- Fuel Prices
DROP POLICY IF EXISTS "Allow all" ON fuel_prices;
DROP POLICY IF EXISTS "Allow select" ON fuel_prices;
DROP POLICY IF EXISTS "Allow insert" ON fuel_prices;
DROP POLICY IF EXISTS "Allow update" ON fuel_prices;
DROP POLICY IF EXISTS "Allow delete" ON fuel_prices;

-- Daily Accounting
DROP POLICY IF EXISTS "Allow all" ON daily_accounting;
DROP POLICY IF EXISTS "Allow all daily_accounting" ON daily_accounting;
DROP POLICY IF EXISTS "Allow select" ON daily_accounting;
DROP POLICY IF EXISTS "Allow insert" ON daily_accounting;
DROP POLICY IF EXISTS "Allow update" ON daily_accounting;
DROP POLICY IF EXISTS "Allow delete" ON daily_accounting;

-- Notifications
DROP POLICY IF EXISTS "Allow all" ON notifications;
DROP POLICY IF EXISTS "Allow select" ON notifications;
DROP POLICY IF EXISTS "Allow insert" ON notifications;
DROP POLICY IF EXISTS "Allow update" ON notifications;
DROP POLICY IF EXISTS "Allow delete" ON notifications;

-- Sales
DROP POLICY IF EXISTS "Allow all" ON sales;
DROP POLICY IF EXISTS "Allow select" ON sales;
DROP POLICY IF EXISTS "Allow insert" ON sales;
DROP POLICY IF EXISTS "Allow update" ON sales;
DROP POLICY IF EXISTS "Allow delete" ON sales;

-- =====================================================
-- 3. CREATE POLICIES - Allow All (สำหรับ Development)
-- =====================================================

-- Users
CREATE POLICY "Allow all" ON users
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Profiles
CREATE POLICY "Allow all" ON profiles
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Positions
CREATE POLICY "Allow all" ON positions
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Skills
CREATE POLICY "Allow all" ON skills
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Stations
CREATE POLICY "Allow all" ON stations
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Profile Skills
CREATE POLICY "Allow all" ON profile_skills
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Shifts
CREATE POLICY "Allow all" ON shifts
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Schedules
CREATE POLICY "Allow all" ON schedules
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Leave Requests
CREATE POLICY "Allow all" ON leave_requests
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Swap Requests
CREATE POLICY "Allow all" ON swap_requests
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Attendances
CREATE POLICY "Allow all" ON attendances
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Fuel Prices
CREATE POLICY "Allow all" ON fuel_prices
  FOR ALL
  USING (true)
  WITH CHECK (true);

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

-- Daily Accounting (soft delete + จำกัดสิทธิ์ลบ)
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

ALTER TABLE daily_accounting FORCE ROW LEVEL SECURITY;

-- Notifications
CREATE POLICY "Allow all" ON notifications
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Sales
CREATE POLICY "Allow all" ON sales
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- =====================================================
-- 4. VERIFY RLS STATUS (ตรวจสอบสถานะ)
-- =====================================================

SELECT 
  schemaname,
  tablename,
  rowsecurity AS rls_enabled
FROM pg_tables
WHERE tablename IN (
  'users', 'profiles', 'positions', 'skills', 'stations', 
  'profile_skills', 'shifts', 'schedules', 'leave_requests', 
  'swap_requests', 'attendances', 'fuel_prices', 
  'daily_accounting', 'notifications', 'sales'
)
AND schemaname = 'public'
ORDER BY tablename;

-- =====================================================
-- 5. VERIFY POLICIES (ตรวจสอบ Policies)
-- =====================================================

SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- =====================================================
-- ✅ เสร็จสิ้น!
-- =====================================================
-- หมายเหตุ: Policies เหล่านี้อนุญาติทุกการเข้าถึง
-- ใช้สำหรับ DEVELOPMENT เท่านั้น
-- สำหรับ Production ควรปรับให้เหมาะสมกับความปลอดภัย
