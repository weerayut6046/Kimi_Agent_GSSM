-- =====================================================
-- Fix: Add authuid column to users table
-- Run this in Supabase Dashboard → SQL Editor
-- =====================================================

-- 1. Add authuid column if not exists
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS authuid text UNIQUE;

-- 2. Verify column was added
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'users'
ORDER BY ordinal_position;

-- 3. Update RLS policies for users table (recreate)
DROP POLICY IF EXISTS "Allow all" ON users;
DROP POLICY IF EXISTS "Allow select" ON users;
DROP POLICY IF EXISTS "Allow insert" ON users;
DROP POLICY IF EXISTS "Allow update" ON users;
DROP POLICY IF EXISTS "Allow delete" ON users;

CREATE POLICY "Allow all" ON users
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- 4. Enable RLS (if not already)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- 5. Link existing auth users to users table
-- รันคำสั่งนี้เพื่อเชื่อม auth.users กับ users table
UPDATE users u
SET authuid = a.id
FROM auth.users a
WHERE u.email = a.email
  AND (u.authuid IS NULL OR u.authuid = '');

-- 6. Verify the link
SELECT u.id, u.email, u.authuid, a.id as auth_id
FROM users u
LEFT JOIN auth.users a ON u.authuid = a.id
LIMIT 10;

-- ✅ เสร็จสิ้น! ลอง login ใหม่อีกครั้ง
