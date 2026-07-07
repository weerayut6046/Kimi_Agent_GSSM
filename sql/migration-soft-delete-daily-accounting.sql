-- =====================================================
-- Migration: Soft Delete + RLS Hardening for daily_accounting
-- Gas Station Shift Manager
--
-- รันไฟล์นี้ที่ Supabase Dashboard → SQL Editor
-- เพื่อเพิ่ม soft delete และจำกัดสิทธิ์ลบข้อมูลบัญชีรายวัน
-- =====================================================

-- 1. เพิ่มคอลัมน์สำหรับ soft delete
ALTER TABLE daily_accounting ADD COLUMN IF NOT EXISTS isdeleted boolean DEFAULT false;
ALTER TABLE daily_accounting ADD COLUMN IF NOT EXISTS deletedat text;
ALTER TABLE daily_accounting ADD COLUMN IF NOT EXISTS deletedby text;

-- 2. กำหนดค่าเริ่มต้นให้ข้อมูลเก่าทั้งหมดไม่ถูกลบ
UPDATE daily_accounting SET isdeleted = false WHERE isdeleted IS NULL;

-- 3. สร้าง helper function สำหรับตรวจสอบ role (SECURITY DEFINER เพื่อให้อ่าน users ได้แม้ RLS เปลี่ยน)
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

-- 4. ลบ policy ที่อนุญาตทุกการเข้าถึงของตาราง daily_accounting
DROP POLICY IF EXISTS "Allow all" ON daily_accounting;
DROP POLICY IF EXISTS "Allow all daily_accounting" ON daily_accounting;
DROP POLICY IF EXISTS "Allow select" ON daily_accounting;
DROP POLICY IF EXISTS "Allow insert" ON daily_accounting;
DROP POLICY IF EXISTS "Allow update" ON daily_accounting;
DROP POLICY IF EXISTS "Allow delete" ON daily_accounting;
DROP POLICY IF EXISTS "daily_accounting_select" ON daily_accounting;
DROP POLICY IF EXISTS "daily_accounting_insert" ON daily_accounting;
DROP POLICY IF EXISTS "daily_accounting_update" ON daily_accounting;
DROP POLICY IF EXISTS "daily_accounting_delete" ON daily_accounting;

-- 5. สร้าง policy ใหม่ที่ปลอดภัยขึ้น
CREATE POLICY "daily_accounting_select"
  ON daily_accounting
  FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "daily_accounting_insert"
  ON daily_accounting
  FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "daily_accounting_update"
  ON daily_accounting
  FOR UPDATE
  USING (auth.role() = 'authenticated')
  WITH CHECK (
    auth.role() = 'authenticated'
    AND (
      (isdeleted = false OR isdeleted IS NULL)
      OR public.user_has_role(ARRAY['admin', 'manager'])
    )
  );

CREATE POLICY "daily_accounting_delete"
  ON daily_accounting
  FOR DELETE
  USING (public.user_has_role(ARRAY['admin', 'manager']));

-- 6. ตรวจสอบว่า RLS เปิดใช้งาน
ALTER TABLE daily_accounting FORCE ROW LEVEL SECURITY;

-- =====================================================
-- ✅ เสร็จสิ้น!
--
-- หมายเหตุ: หลังจากรัน migration นี้แล้ว ต้องอัปเดตไฟล์
-- src/data/baseStorage.ts และ DailyAccountingContext.tsx
-- ให้กรองข้อมูลด้วย isdeleted = false (โค้ดใน repo ได้อัปเดตแล้ว)
-- =====================================================
