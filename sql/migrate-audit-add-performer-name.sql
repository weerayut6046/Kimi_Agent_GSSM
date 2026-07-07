-- ============================================
-- Migration: Add performed_by_name to audit_logs
-- Run this if audit_logs table already exists
-- ============================================

ALTER TABLE audit_logs
ADD COLUMN IF NOT EXISTS performed_by_name text;

-- Optional: Update existing logs with names from profiles (best effort)
-- UPDATE audit_logs al
-- SET performed_by_name = p.fullname
-- FROM profiles p
-- JOIN users u ON u.profileid = p.id
-- WHERE al.performed_by = u.id
-- AND al.performed_by_name IS NULL;
