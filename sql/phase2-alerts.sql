-- ============================================
-- Phase 2B.4: Alert System
-- ============================================

CREATE TABLE IF NOT EXISTS alerts (
  id text PRIMARY KEY,
  type text NOT NULL,
  title text NOT NULL,
  message text NOT NULL,
  severity text NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  is_read boolean DEFAULT false,
  is_resolved boolean DEFAULT false,
  related_table text,
  related_id text,
  created_at text DEFAULT CURRENT_TIMESTAMP,
  resolved_at text
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_alerts_severity ON alerts(severity);
CREATE INDEX IF NOT EXISTS idx_alerts_is_read ON alerts(is_read);
CREATE INDEX IF NOT EXISTS idx_alerts_created_at ON alerts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_alerts_type ON alerts(type);

-- RLS
ALTER TABLE alerts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all alerts" ON alerts;
CREATE POLICY "Allow all alerts"
  ON alerts FOR ALL USING (true) WITH CHECK (true);

-- ============================================
-- ✅ เสร็จสิ้น! รีเฟรชหน้าเว็บเพื่อใช้งาน
-- ============================================
