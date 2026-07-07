-- =====================================================
-- SQL Script สำหรับตั้งค่า Supabase Database
-- Gas Station Shift Manager
-- =====================================================

-- =====================================================
-- 1. สร้างตาราง (Create Tables)
-- =====================================================

CREATE TABLE IF NOT EXISTS users (
  id text PRIMARY KEY,
  authUid text UNIQUE, -- Supabase Auth user UID (from auth.users.id)
  email text UNIQUE NOT NULL,
  password text NOT NULL,
  role text NOT NULL,
  profileId text,
  createdAt text NOT NULL,
  updatedAt text NOT NULL
);

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
  managerId text
);

CREATE TABLE IF NOT EXISTS profiles (
  id text PRIMARY KEY,
  userId text,
  firstName text,
  lastName text,
  fullName text NOT NULL,
  phone text,
  avatar text,
  positionId text REFERENCES positions(id),
  stationId text,
  status text NOT NULL,
  hireDate text
);

CREATE TABLE IF NOT EXISTS profile_skills (
  profileId text REFERENCES profiles(id) ON DELETE CASCADE,
  skillId text REFERENCES skills(id) ON DELETE CASCADE,
  PRIMARY KEY (profileId, skillId)
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

CREATE TABLE IF NOT EXISTS schedules (
  id text PRIMARY KEY,
  date text NOT NULL,
  shiftId text REFERENCES shifts(id),
  employeeId text REFERENCES profiles(id),
  stationId text,
  status text NOT NULL,
  note text,
  createdBy text,
  createdAt text NOT NULL
);

CREATE TABLE IF NOT EXISTS leave_requests (
  id text PRIMARY KEY,
  employeeId text REFERENCES profiles(id),
  type text NOT NULL,
  startDate text NOT NULL,
  endDate text NOT NULL,
  days int NOT NULL,
  reason text,
  status text NOT NULL,
  approvedBy text,
  approvedAt text,
  createdAt text NOT NULL
);

CREATE TABLE IF NOT EXISTS swap_requests (
  id text PRIMARY KEY,
  requesterId text REFERENCES profiles(id),
  requestedId text REFERENCES profiles(id),
  scheduleId text REFERENCES schedules(id),
  targetScheduleId text REFERENCES schedules(id),
  status text NOT NULL,
  approvedBy text,
  createdAt text NOT NULL
);

CREATE TABLE IF NOT EXISTS attendances (
  id text PRIMARY KEY,
  employeeId text REFERENCES profiles(id),
  scheduleId text REFERENCES schedules(id),
  checkIn text,
  checkOut text,
  checkInLocation text,
  checkOutLocation text,
  note text,
  status text NOT NULL
);

CREATE TABLE IF NOT EXISTS fuel_prices (
  id text PRIMARY KEY,
  "95" numeric NOT NULL,
  "B7" numeric NOT NULL,
  "B10" numeric NOT NULL,
  "Diesel" numeric NOT NULL,
  effectiveDate text NOT NULL,
  createdAt text NOT NULL
);

CREATE TABLE IF NOT EXISTS daily_accounting (
  id text PRIMARY KEY,
  date text NOT NULL,
  shiftId text REFERENCES shifts(id),
  employeeId text REFERENCES profiles(id),
  fuelMeter jsonb NOT NULL,
  fuelSales jsonb NOT NULL,
  fuelAmount jsonb NOT NULL,
  totalFuelAmount numeric NOT NULL,
  systemAmount numeric NOT NULL,
  cashAmount numeric NOT NULL,
  actualCashCounted numeric,
  dispenserCash jsonb NOT NULL,
  items jsonb NOT NULL,
  totalAmount numeric NOT NULL,
  difference numeric NOT NULL,
  note text,
  createdAt text NOT NULL,
  updatedAt text NOT NULL,
  isDeleted boolean DEFAULT false,
  deletedAt text,
  deletedBy text
);

CREATE TABLE IF NOT EXISTS notifications (
  id text PRIMARY KEY,
  userId text NOT NULL,
  title text NOT NULL,
  message text NOT NULL,
  type text NOT NULL,
  read boolean DEFAULT false,
  createdAt text NOT NULL
);

-- =====================================================
-- 2. สร้าง Index
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_users_authuid ON users(authUid);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_profiles_userid ON profiles(userId);
CREATE INDEX IF NOT EXISTS idx_schedules_date ON schedules(date);
CREATE INDEX IF NOT EXISTS idx_attendances_employeeid ON attendances(employeeId);
CREATE INDEX IF NOT EXISTS idx_notifications_userid ON notifications(userId);

-- =====================================================
-- 3. เปิดใช้งาน RLS (Row Level Security)
-- =====================================================

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

-- =====================================================
-- 4. สร้าง RLS Policies (สำหรับ Development)
-- =====================================================
-- ⚠️ คำเตือน: Policies เหล่านี้อนุญาติทุกการเข้าถึง ใช้สำหรับ Development เท่านั้น
-- สำหรับ Production ควรปรับให้เหมาะสมกับความปลอดภัย

-- Users table
CREATE POLICY "Allow all users" ON users FOR ALL USING (true) WITH CHECK (true);

-- Profiles table
CREATE POLICY "Allow all profiles" ON profiles FOR ALL USING (true) WITH CHECK (true);

-- Positions table
CREATE POLICY "Allow all positions" ON positions FOR ALL USING (true) WITH CHECK (true);

-- Skills table
CREATE POLICY "Allow all skills" ON skills FOR ALL USING (true) WITH CHECK (true);

-- Stations table
CREATE POLICY "Allow all stations" ON stations FOR ALL USING (true) WITH CHECK (true);

-- Profile Skills table
CREATE POLICY "Allow all profile_skills" ON profile_skills FOR ALL USING (true) WITH CHECK (true);

-- Shifts table
CREATE POLICY "Allow all shifts" ON shifts FOR ALL USING (true) WITH CHECK (true);

-- Schedules table
CREATE POLICY "Allow all schedules" ON schedules FOR ALL USING (true) WITH CHECK (true);

-- Leave Requests table
CREATE POLICY "Allow all leave_requests" ON leave_requests FOR ALL USING (true) WITH CHECK (true);

-- Swap Requests table
CREATE POLICY "Allow all swap_requests" ON swap_requests FOR ALL USING (true) WITH CHECK (true);

-- Attendances table
CREATE POLICY "Allow all attendances" ON attendances FOR ALL USING (true) WITH CHECK (true);

-- Fuel Prices table
CREATE POLICY "Allow all fuel_prices" ON fuel_prices FOR ALL USING (true) WITH CHECK (true);

-- Daily Accounting table (soft delete + จำกัดสิทธิ์ลบ)
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
      (isDeleted = false OR isDeleted IS NULL)
      OR public.user_has_role(ARRAY['admin', 'manager'])
    )
  );

CREATE POLICY "daily_accounting_delete"
  ON daily_accounting FOR DELETE
  USING (public.user_has_role(ARRAY['admin', 'manager']));

ALTER TABLE daily_accounting FORCE ROW LEVEL SECURITY;

-- Notifications table
CREATE POLICY "Allow all notifications" ON notifications FOR ALL USING (true) WITH CHECK (true);

-- =====================================================
-- 5. ตั้งค่า Storage Bucket (ถ้าต้องการใช้ Storage)
-- =====================================================
-- ไปที่ Storage → New bucket → สร้าง bucket ชื่อ "avatars"
-- แล้วตั้งค่า Public bucket: ON

-- =====================================================
-- 6. เปิดใช้งาน Email Provider
-- =====================================================
-- ไปที่ Authentication → Providers → Email → เปิดใช้งาน
-- ตั้งค่า:
--   - Confirm email: OFF (สำหรับ development)
--   - Secure email change: ON
--   - Secure password reset: ON

-- =====================================================
-- 7. สร้าง Trigger สำหรับอัพเดท updatedAt (Optional)
-- =====================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updatedAt = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- สร้าง trigger สำหรับ users table
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- คำสั่งสำหรับลบข้อมูลทั้งหมด (ใช้ระวัง!)
-- =====================================================
/*
-- ลบข้อมูลทั้งหมด (รันทีละบรรทัด)
DELETE FROM daily_accounting;
DELETE FROM attendances;
DELETE FROM swap_requests;
DELETE FROM leave_requests;
DELETE FROM schedules;
DELETE FROM fuel_prices;
DELETE FROM notifications;
DELETE FROM profile_skills;
DELETE FROM profiles;
DELETE FROM users;
DELETE FROM shifts;
DELETE FROM stations;
DELETE FROM skills;
DELETE FROM positions;
*/

-- =====================================================
-- คำสั่งสำหรับลบ RLS Policies (ถ้าต้องการเปลี่ยน)
-- =====================================================
/*
DROP POLICY IF EXISTS "Allow all users" ON users;
DROP POLICY IF EXISTS "Allow all profiles" ON profiles;
-- ... (ทำกับทุกตาราง)
*/

-- =====================================================
-- คำสั่งสำหรับปิด RLS (ถ้าต้องการ)
-- =====================================================
/*
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;
-- ... (ทำกับทุกตาราง)
*/
