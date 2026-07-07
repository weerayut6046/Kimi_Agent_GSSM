-- =====================================================
-- DANGER: Reset All Data
-- Gas Station Shift Manager
--
-- ⚠️ ไฟล์นี้จะลบข้อมูลทั้งหมดในฐานข้อมูล (ยกเว้นโครงสร้างตาราง)
-- ใช้เฉพาะเมื่อต้องการเริ่มต้นระบบใหม่จริง ๆ เท่านั้น
-- ควรสำรองข้อมูลก่อนรันเสมอ
-- =====================================================

BEGIN;

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

-- เพิ่มตารางอื่น ๆ ถ้ามี
-- DELETE FROM sales;
-- DELETE FROM fuel_inventory;
-- DELETE FROM fuel_deliveries;
-- DELETE FROM products;
-- DELETE FROM product_transactions;
-- DELETE FROM suppliers;
-- DELETE FROM payroll_periods;
-- DELETE FROM payroll_records;
-- DELETE FROM promotions;
-- DELETE FROM audit_logs;

COMMIT;

-- หลังจากรันแล้วต้องรัน database-setup.sql อีกครั้งเพื่อ seed ข้อมูลเริ่มต้น
