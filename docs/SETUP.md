# Gas Station Shift Manager - คู่มือการตั้งค่า

## ภาพรวม

ระบบนี้ใช้ **Supabase** (PostgreSQL + Auth) เป็นฐานข้อมูลหลัก ไม่มีการเก็บข้อมูลใน browser ทั้งหมดอยู่ในฐานข้อมูล

---

## ขั้นตอนการตั้งค่า

### 1. สร้าง Supabase Project

1. ไปที่ [supabase.com](https://supabase.com)
2. สร้าง Project ใหม่
3. รอให้สร้างเสร็จ (ประมาณ 1-2 นาที)

---

### 2. ตั้งค่า Database

1. ไปที่ **Supabase Dashboard → SQL Editor**
2. รันคำสั่งตามลำดับ (ถ้ามี error ให้รันไฟล์ถัดไป):

**ขั้นตอนที่ 1 - ตารางหลัก:**
- เปิดไฟล์ `database-setup.sql`
- Copy ทั้งหมดแล้ววาง → กด **Run**

**ขั้นตอนที่ 2 - ตาราง POS และ Inventory (ถ้าขาดหาย):**
- เปิดไฟล์ `fix-missing-tables.sql` → กด **Run**

**ขั้นตอนที่ 3 - Phase 2 Features (optional - ตามความต้องการ):**
- `phase2-payroll.sql` - ระบบเงินเดือน
- `phase2-audit-trail.sql` - ระบบ Audit Trail
- `phase2-alerts.sql` - ระบบแจ้งเตือนอัจฉริยะ
- `phase2-membership.sql` - ระบบสมาชิก
- `promotions.sql` - ระบบโปรโมชั่น

**ขั้นตอนที่ 4 - RLS Policies:**
- เปิดไฟล์ `supabase-rls-setup.sql` → กด **Run**

**ขั้นตอนที่ 5 - เปิดใช้งาน Realtime (สำคัญ!):**
ไปที่ **Database → Replication → Realtime** แล้วเปิดใช้งาน (Enable) สำหรับตารางที่ต้องการ:
- `schedules`, `shifts`, `leave_requests`, `swap_requests`
- `attendances`, `profiles`, `users`, `positions`, `skills`
- `daily_accounting`, `fuel_prices`, `stations`
- `fuel_inventory`, `fuel_deliveries`, `products`, `product_transactions`, `suppliers`
- `sales`, `notifications`, `alerts`, `audit_logs`
- `payroll_periods`, `payroll_records`, `customers`, `customer_transactions`
- `promotions`

หรือรันคำสั่ง SQL นี้เพื่อเปิดใช้งาน Realtime สำหรับทุกตาราง:
```sql
-- เปิดใช้งาน realtime สำหรับตารางทั้งหมด
ALTER PUBLICATION supabase_realtime ADD TABLE schedules;
ALTER PUBLICATION supabase_realtime ADD TABLE shifts;
ALTER PUBLICATION supabase_realtime ADD TABLE leave_requests;
ALTER PUBLICATION supabase_realtime ADD TABLE swap_requests;
ALTER PUBLICATION supabase_realtime ADD TABLE attendances;
ALTER PUBLICATION supabase_realtime ADD TABLE profiles;
ALTER PUBLICATION supabase_realtime ADD TABLE users;
ALTER PUBLICATION supabase_realtime ADD TABLE positions;
ALTER PUBLICATION supabase_realtime ADD TABLE skills;
ALTER PUBLICATION supabase_realtime ADD TABLE daily_accounting;
ALTER PUBLICATION supabase_realtime ADD TABLE fuel_prices;
ALTER PUBLICATION supabase_realtime ADD TABLE stations;
ALTER PUBLICATION supabase_realtime ADD TABLE fuel_inventory;
ALTER PUBLICATION supabase_realtime ADD TABLE fuel_deliveries;
ALTER PUBLICATION supabase_realtime ADD TABLE products;
ALTER PUBLICATION supabase_realtime ADD TABLE product_transactions;
ALTER PUBLICATION supabase_realtime ADD TABLE suppliers;
ALTER PUBLICATION supabase_realtime ADD TABLE sales;
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE alerts;
ALTER PUBLICATION supabase_realtime ADD TABLE audit_logs;
ALTER PUBLICATION supabase_realtime ADD TABLE payroll_periods;
ALTER PUBLICATION supabase_realtime ADD TABLE payroll_records;
ALTER PUBLICATION supabase_realtime ADD TABLE customers;
ALTER PUBLICATION supabase_realtime ADD TABLE customer_transactions;
ALTER PUBLICATION supabase_realtime ADD TABLE promotions;
```

**ขั้นตอนที่ 6 - สร้าง Index (สำคัญสำหรับความเร็ว):**
รันคำสั่งนี้เพื่อสร้าง index ที่จำเป็นสำหรับความเร็ว:
```sql
-- Index สำคัญสำหรับ auth lookups (ป้องกันการโหลดช้า/ค้าง)
CREATE INDEX IF NOT EXISTS idx_users_authuid ON users(authuid);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- Index แนะนำสำหรับตารางอื่นๆ
CREATE INDEX IF NOT EXISTS idx_profiles_userid ON profiles(userid);
CREATE INDEX IF NOT EXISTS idx_profiles_positionid ON profiles(positionid);
CREATE INDEX IF NOT EXISTS idx_schedules_date ON schedules(date);
CREATE INDEX IF NOT EXISTS idx_schedules_employeeid ON schedules(employeeid);
CREATE INDEX IF NOT EXISTS idx_attendances_employeeid ON attendances(employeeid);
CREATE INDEX IF NOT EXISTS idx_leave_requests_employeeid ON leave_requests(employeeid);
CREATE INDEX IF NOT EXISTS idx_daily_accounting_date ON daily_accounting(date);
CREATE INDEX IF NOT EXISTS idx_notifications_userid ON notifications(userid);
```

---

### 3. ตั้งค่า Authentication

1. ไปที่ **Authentication → Settings**
2. ตั้งค่า:
   - ✅ **Enable Email provider**
   - ❌ **Confirm email**: OFF (สำหรับ development)
   - ✅ **Secure email change**: ON
   - ✅ **Secure password reset**: ON

---

### 4. สร้าง Auth Users (สำคัญ!)

1. ไปที่ **Authentication → Users**
2. คลิก **"Add user"** (ปุ่มสีเขียว)
3. เลือก **"Create new user"**
4. สร้าง 6 users ตามนี้:

| Email | Password | บทบาท |
|-------|----------|-------|
| admin@gasstation.com | Admin@123 | Admin |
| manager@gasstation.com | Manager@123 | Manager |
| somchai@gasstation.com | Staff@123 | Staff |
| somying@gasstation.com | Staff@123 | Staff |
| mani@gasstation.com | Staff@123 | Staff |
| prasit@gasstation.com | Staff@123 | Staff |

⚠️ **สำคัญ**: ปิด "Auto confirm email" (ไม่ต้องติ๊ก)

---

### 5. เชื่อมโยง Auth Users กับ Database (อัตโนมัติ)

รันคำสั่งนี้ที่ **SQL Editor** เพื่อเชื่อมโยง UUID อัตโนมัติ:

```sql
-- เชื่อมโยง authuid อัตโนมัติโดยใช้ email เป็นตัวเชื่อม
UPDATE users u
SET authuid = a.id
FROM auth.users a
WHERE u.email = a.email;

-- ตรวจสอบว่าเชื่อมโยงสำเร็จ
SELECT u.email, u.authuid, a.id as auth_id
FROM users u
LEFT JOIN auth.users a ON u.email = a.email;
```

✅ **เสร็จสิ้น!** ไม่ต้องคัดลอก UUID manual

**หมายเหตุ:** ถ้าบาง user ไม่มี authuid หลังรันคำสั่ง แสดงว่า:
- ยังไม่ได้สร้าง auth user นั้นใน Authentication → Users
- หรือ email ไม่ตรงกัน (ตัวพิมพ์เล็ก/ใหญ่)

---

### 6. ตั้งค่า Environment Variables

1. สร้างไฟล์ `.env` ใน root โปรเจค:

```
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

2. หาค่าจาก **Supabase Dashboard → Settings → API**

---

### 7. รันแอพพลิเคชัน

```bash
npm install
npm run dev
```

เปิด http://localhost:5173

---

### 8. ทดสอบเข้าสู่ระบบ

ใช้อีเมลและรหัสผ่าน:
- **admin@gasstation.com / Admin@123**

---

## การแก้ปัญหา

### ❌ หน้าเว็บโหลดนาน / ค้างที่ Loading
**สาเหตุ**: ไม่มี index บนตาราง users หรือ Browser extensions บล็อกการเชื่อมต่อ Supabase

**แก้ไข**:
1. รันคำสั่งสร้าง index ใน Supabase SQL Editor (ดูขั้นตอนที่ 5 ด้านบน)
2. ลองเปิดใน **Incognito/Private mode** เพื่อตรวจสอบว่า extensions เป็นตัวบล็อก
3. ถ้า Incognito เร็วขึ้น → Disable extensions ที่น่าสงสัย (Bitwarden, AdBlock, Privacy Badger)
4. Clear cache: กด F12 → Application → Local Storage → ลบ key ที่ขึ้นต้นด้วย `cache_`

### ❌ "Database is empty"

**สาเหตุ**: ยังไม่ได้รัน SQL setup script

**แก้ไข**: 
1. รันคำสั่งใน `database-setup.sql`
2. สร้าง Auth Users
3. อัพเดท authuid

---

### ❌ "Email rate limit exceeded"

**สาเหตุ**: Supabase Auth จำกัดการสร้าง user

**แก้ไข**:
- รอ 1 ชั่วโมงแล้วลองใหม่
- หรือสร้าง users ผ่าน Dashboard แทน

---

### ❌ "Invalid login credentials"

**สาเหตุ**: 
1. authuid ไม่ตรงกัน หรือ
2. รหัสผ่านไม่ถูกต้อง

**แก้ไข**:
1. ตรวจสอบว่าอีเมลใน `auth.users` ตรงกับ `public.users`
2. รันคำสั่ง SQL เชื่อมโยง authuid:
```sql
UPDATE users u SET authuid = a.id FROM auth.users a WHERE u.email = a.email;
```
3. หรือให้ระบบเชื่อมโยงอัตโนมัติ: ลอง login ครั้งแรกจะเชื่อมโยง authuid อัตโนมัติ (ถ้า email ตรงกัน)

---

### ❌ "column xxxx does not exist"

**สาเหตุ**: Column names ไม่ตรงกัน (camelCase vs lowercase)

**แก้ไข**: รัน SQL setup script ใหม่

---

### ❌ Audit log 400 Bad Request (`performed_by_name` column not found)

**สาเหตุ**: ตาราง `audit_logs` ยังไม่มีคอลัมน์ `performed_by_name` หรือ `performed_by_email` (มักเกิดขึ้นกับฐานข้อมูลที่สร้างก่อนรัน `migrate-audit-add-performer-name.sql`)

**แก้ไข**:
1. รันคำสั่งนี้ใน Supabase SQL Editor:
```sql
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS performed_by_name text;
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS performed_by_email text;
NOTIFY pgrst, 'reload schema';
```
2. หรือรันไฟล์ `sql/migrate-audit-add-performer-name.sql`

**หมายเหตุ**: แอพมี fallback อัตโนมัติ ถ้าคอลัมน์ขาดระบบจะบันทึก audit log แบบ minimal โดยไม่ crash แต่ชื่อผู้กระทำจะไม่ถูกบันทึกจนกว่าจะเพิ่มคอลัมน์

---

## โครงสร้าง Database

```
auth.users (Supabase Auth)
    ↓ authuid
public.users
    ↓ profileid
public.profiles
    ↓ positionid
public.positions
    ↓ stationid
public.stations

public.sales (POS transactions)
    ↓ employee_id
public.profiles

public.schedules
    ↓ stationid
public.stations
```

## การตั้งค่าสาขา (Branch/Station)

### 1. สร้างสาขา
หลังจากรัน `database-setup.sql` จะมีสาขาเริ่มต้น 1 สาขา:
- **ปั๊มน้ำมันสาขาหลัก** (`station1`)

ถ้าต้องการเพิ่มสาขา ให้เข้าไปที่หน้า **สาขา** (`/stations`) ในฐานะ Admin

### 2. กำหนดสาขาให้พนักงาน
- เข้าหน้า **พนักงาน** (`/employees`)
- เพิ่มหรือแก้ไขพนักงาน → เลือก **สาขา** จาก dropdown
- พนักงานแต่ละคนจะสังกัดสาขาเดียวเท่านั้น

### 3. สิทธิ์ตามสาขา
| บทบาท | สิทธิ์ |
|-------|--------|
| **Admin** | เห็นทุกสาขา (เลือก "ทุกสาขา" หรือเลือกสาขาเฉพาะได้) |
| **Manager** | เห็นเฉพาะสาขาที่ตัวเองจัดการ |
| **Staff** | เห็นเฉพาะสาขาของตัวเอง (ไม่สามารถเปลี่ยนสาขาได้) |

---

## ข้อมูลติดต่อ

หากมีปัญหา ตรวจสอบ:
1. Console log ใน browser (F12)
2. Supabase Dashboard → Logs
3. SQL Editor สำหรับตรวจสอบข้อมูล

---

## อัพเดทล่าสุด

### มิถุนายน 2026
- **ระบบแยกสาขา (Branch/Station Filtering)** - รองรับหลายสาขา
  - พนักงานแต่ละคนมี `stationId` ระบุสาขาที่สังกัด
  - เมื่อ Login ระบบจะเลือกสาขาอัตโนมัติตาม profile
  - Admin/Manager สามารถสลับสาขาได้ผ่าน dropdown ใน Header
  - Staff เห็นเฉพาะสาขาตัวเอง (แสดง badge ใน Header)
  - ข้อมูลทุกหน้ากรองตามสาขาอัตโนมัติ: พนักงาน, ตารางกะ, ลงเวลา, บัญชีรายวัน, รายงาน
  - หน้า Employees มี dropdown เลือกสาขาใน form + แสดงคอลัมน์สาขา
- **Performance & Loading Fixes** - แก้ไขปัญหาหน้าเว็บโหลดนาน/ค้างที่ Loading
  - เพิ่ม `src/lib/cache.ts` - localStorage cache ลดการเรียก Supabase ซ้ำ
  - Staggered loading - Context โหลดทีละตัวแทน Promise.all พร้อมกัน
  - Timeout fallbacks 1.5-2 วินาที ป้องกันการค้าง
  - เปลี่ยน `.single()` เป็น `.maybeSingle()` สำหรับ user lookups
  - StationSelector ไม่ reload หน้าแล้ว
  - Database indexes: `idx_users_authuid`, `idx_users_email`
- **ระบบทำงานแบบ Offline-First** - ใช้งานได้แม้ไม่มีอินเทอร์เน็ต ข้อมูลจะถูกเก็บใน IndexedDB และซิงค์อัตโนมัติเมื่อออนไลน์ มี Service Worker และ Background Sync
- **POS System** - ระบบขายหน้าร้านสำหรับน้ำมันและสินค้า รองรับการขายตามจำนวนเงินหรือลิตร หลายวิธีชำระเงิน (เงินสด, บัตรเครดิต, QR Code, E-Wallet) พร้อมคำนวณเงินทอนและตัดสต็อกอัตโนมัติ
- **ระบบโปรโมชั่น (Promotions)** - จัดการโปรโมชั่นน้ำมัน: เติมครบลด, Happy Hour, ลดเปอร์เซ็นต์, ลดตามจำนวน กำหนดช่วงเวลาและประเภทน้ำมันได้ (เฉพาะ Admin/Manager)
- **ระบบคลังสินค้าและน้ำมัน** - จัดการสต็อกน้ำมัน, สินค้าร้านค้า, ซัพพลายเออร์, แจ้งเตือนสต็อกต่ำ (เฉพาะ Admin/Manager)
- **ระบบสำรองและกู้คืนข้อมูล** - Admin สามารถเลือกส่งออกเฉพาะตารางเป็นไฟล์ JSON และเลือกกู้คืนเฉพาะตารางจากไฟล์สำรองได้ รองรับ 22 ตาราง พร้อมระบบจัดการความสัมพันธ์ระหว่างตารางอัตโนมัติ และระบบสำรองฐานข้อมูลระดับ DB เป็นไฟล์ SQL ผ่าน Supabase Edge Function
- **ส่งออก Excel & PDF (ฝั่ง Client)** - สร้างไฟล์รายงาน `.xlsx` และ `.pdf` โดยตรงบน browser ด้วย `xlsx` และ `jspdf` รองรับฟอนต์ไทย (โหลดจาก `/fonts/THSarabunNew.ttf`) ทำงานได้แม้ไม่มีอินเทอร์เน็ต
- **ระบบเงินเดือน (Payroll)** - ตาราง `payroll_periods` และ `payroll_records` พร้อม storage layer (`payrollStorage.ts`)
- **ระบบ Audit Trail** - ตาราง `audit_logs` บันทึกการเปลี่ยนแปลงข้อมูลทั้งหมด พร้อม RLS policies รองรับ `performed_by_name` สำหรับเก็บชื่อผู้กระทำแบบอ่านเข้าใจได้
- **Dashboard Analytics** - คาดการณ์สต็อกน้ำมัน/สินค้า กราฟยอดขาย สถิติการลงเวลา (`src/lib/analytics.ts`)
- **Debug Console.log Cleanup** - ลบ console.log ที่ไม่จำเป็นทั้งหมด
- **Fuel Price Auto-fill** - ฟอร์มตั้งราคาน้ำมันดึงค่าล่าสุดจาก database อัตโนมัติ
- **Import Path Consistency** - แก้ไข import path ให้ใช้ `@/` alias ทั้งหมด
- **Bug Fixes** - แก้ไข `sale_items` ไม่มีตาราง, `fuel_inventory` 406 error, `auth.uid()` UUID cast

### กรกฎาคม 2026
- **ลบพนักงานออกจากกะ** - หน้า `/schedule` รองรับการลบพนักงานออกจากกะเฉพาะรายการ พร้อม Dialog ยืนยัน (เฉพาะ Admin/Manager)
- **Audit Log Fallback** - รองรับฐานข้อมูลที่ไม่มีคอลัมน์ `performed_by_name` โดยบันทึก audit log แบบ minimal อัตโนมัติ ป้องกัน 400 Bad Request
- **ระบบสำรองฐานข้อมูลระดับ DB (Database-Level Backup)** - สำรองข้อมูลทั้งหมดเป็นไฟล์ SQL ผ่าน Supabase Edge Function `backup-database`
  - สำรอง 22 ตารางหลักเป็น SQL INSERT statements บันทึกลง Supabase Storage bucket `backups`
  - รองรับการเรียกจากหน้า Settings และจาก cron-job.org อัตโนมัติ
  - สร้าง Storage bucket อัตโนมัติถ้ายังไม่มี
  - ส่งการแจ้งเตือน success ให้ Admin/Manager ทุกคนหลังสำรองสำเร็จ
