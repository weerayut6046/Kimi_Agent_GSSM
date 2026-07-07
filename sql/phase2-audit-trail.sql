-- ============================================
-- Phase 2A.1: Audit Trail System
-- ============================================

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

-- Index สำหรับ query ที่ใช้บ่อย
CREATE INDEX IF NOT EXISTS idx_audit_logs_table ON audit_logs(table_name);
CREATE INDEX IF NOT EXISTS idx_audit_logs_record ON audit_logs(record_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_performed_by ON audit_logs(performed_by);
CREATE INDEX IF NOT EXISTS idx_audit_logs_performed_at ON audit_logs(performed_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);

-- เปิดใช้งาน RLS
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Admin/Manager ดูได้ทั้งหมด Staff ดูไม่ได้
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

-- อนุญาตให้ insert จากทุกคน (ผ่าน app)
DROP POLICY IF EXISTS "Allow insert audit logs" ON audit_logs;
CREATE POLICY "Allow insert audit logs"
  ON audit_logs
  FOR INSERT
  WITH CHECK (true);

-- ============================================
-- ✅ เสร็จสิ้น! รีเฟรชหน้าเว็บเพื่อใช้งาน
-- ============================================
