# Gas Station Shift Manager

ระบบจัดการกะปฏิบัติงานและบัญชีรายวันสำหรับปั๊มน้ำมัน

## ฟีเจอร์หลัก

- **จัดการพนักงานและบัญชีผู้ใช้** - เพิ่ม/แก้ไข/ลบข้อมูลพนักงาน พร้อมสร้างบัญชีผู้ใช้ (email, password, role) ในครั้งเดียว
- **จัดการกะทำงาน** - กำหนดตารางกะ (เช้า/บ่าย/ดึก) และพนักงานประจำกะ พร้อมระบบตัดกะอัตโนมัติ และล้างตารางกะทั้งหมด
- **บันทึกการลา** - ระบบขอลาและอนุมัติการลา (ป่วย, กิจ, พักร้อน)
- **สลับกะ** - ระบบขอสลับกะและอนุมัติการสลับระหว่างพนักงาน
- **บันทึกเวลา** - เช็คอิน/เช็คเอาท์ พร้อมบันทึกตำแหน่งและสถานะ (ปกติ, สาย, ออกก่อน)
- **บัญชีรายวัน** - บันทึกยอดขายน้ำมัน คำนวณยอดเงิน และเปรียบเทียบยอดขาด/เกิน
- **รายงาน** - รายงานตารางกะ + รายงานบัญชีรายเดือน/ปี พร้อมแผนภาพ (ยอดเงิน, ยอดขายน้ำมัน, ขาด/เกิน) และส่งออก Excel/PDF
- **ส่งออกไฟล์ (Export)** - สร้างไฟล์ Excel และ PDF ฝั่ง browser โดยตรง รองรับฟอนต์ไทย ทำงานได้แม้ offline
- **ตั้งค่าระบบ** - จัดการกะ (เพิ่ม/แก้ไข/ลบ) ตำแหน่ง และทักษะ (เฉพาะ Admin/Manager)
- **คลังสินค้าและน้ำมัน** - ติดตามสต็อกน้ำมันรายวัน, บันทึกการรับน้ำมัน, แจ้งเตือนสต็อกต่ำ (เฉพาะ Admin/Manager)
- **สินค้าร้านค้า** - จัดการสินค้า, บาร์โค้ด, สต็อกสินค้า, ปรับสต็อก (เฉพาะ Admin/Manager)
- **ซัพพลายเออร์** - จัดการซัพพลายเออร์น้ำมันและสินค้า (เฉพาะ Admin/Manager)
- **สำรองและกู้คืนข้อมูล** - เลือกส่งออกเฉพาะตารางเป็นไฟล์ JSON หรือเลือกกู้คืนเฉพาะตารางจากไฟล์สำรอง (เฉพาะ Admin) รองรับ 22 ตาราง พร้อมระบบสำรองฐานข้อมูลระดับ DB เป็นไฟล์ SQL ผ่าน Supabase Edge Function บันทึกลง Storage และแจ้งเตือน Admin/Manager อัตโนมัติ
- **POS System** - ระบบขายหน้าร้านสำหรับน้ำมันและสินค้า รองรับหลายวิธีชำระเงิน (เงินสด, เครดิตการ์ด, QR Code, E-Wallet) พร้อมคำนวณเงินทอนและตัดสต็อกอัตโนมัติ
- **ระบบโปรโมชั่น (Promotions)** - จัดการโปรโมชั่นน้ำมัน: เติมครบลด, Happy Hour, ลดเปอร์เซ็นต์, ลดตามจำนวน กำหนดช่วงเวลาและประเภทน้ำมันได้ (เฉพาะ Admin/Manager)
- **ระบบเงินเดือน (Payroll)** - จัดการงวดเงินเดือนและบันทึกรายการเงินเดือนพนักงาน (เฉพาะ Admin/Manager)
- **ระบบ Audit Trail** - บันทึกการเปลี่ยนแปลงข้อมูลทั้งหมด (สร้าง/แก้ไข/ลบ) พร้อมระบุผู้กระทำด้วยชื่อจริง มีหน้าแยก `/audit-logs` รองรับค้นหา กรองตามตาราง/การกระทำ/วันที่ ดูรายละเอียดการเปลี่ยนแปลงแบบ Diff (ก่อน/หลัง) และ Export CSV แสดงชื่อรายการแทน UUID อ่านเข้าใจง่าย
- **ระบบแจ้งเตือน** - แจ้งเตือนอัตโนมัติเมื่อมีคำขอลา คำขอสลับกะ ตารางกะอัปเดต และสำรองข้อมูลสำเร็จ แสดง badge unread และ dropdown อ่านทั้งหมด
- **Real-time Supabase Subscriptions** - อัปเดตข้อมูลแบบ Real-time ในทุกตาราง (ตารางกะ การลงเวลา คลังสินค้า การขาย เงินเดือน ฯลฯ) ไม่ต้องรีเฟรชหน้า
- **Dashboard Analytics** - คาดการณ์สต็อกน้ำมัน/สินค้า กราฟยอดขาย สถิติการลงเวลา
- **ทำงานได้แม้ไม่มีอินเทอร์เน็ต** - Offline-First Architecture บันทึกข้อมูลในเครื่อง ซิงค์อัตโนมัติเมื่อออนไลน์
- **รองรับ Mobile-First / Responsive** - Sidebar เป็น hamburger menu บนมือถือ ปุ่มลงเวลาขนาดใหญ่กดง่าย Table แปลงเป็น Card บนหน้าจอเล็ก
- **โหลดเร็ว & ประหยัดแบนด์วิดธ์** - แบ่งโหลดหน้าแบบ Lazy Loading และแยก Vendor Chunks ทำให้ JS หลักเหลือ ~85KB (gzip)
- **ระบบ Cache อัจฉริยะ** - localStorage cache สำหรับลดการเรียก Supabase ซ้ำ พร้อม TTL ตามประเภทข้อมูล
- **โหลดข้อมูลแบบ Stagger** - Context โหลดทีละตัวแทนการเรียกพร้อมกันทั้งหมด ป้องกันการ overload
- **รองรับ Accessibility** - มี ARIA labels, keyboard navigation, และภาษาไทย (`lang="th"`)

## เทคโนโลยี

| หมวดหมู่ | เทคโนโลยี |
|----------|-----------|
| Frontend Framework | React 19.2.0 |
| Language | TypeScript 5.9.3 |
| Build Tool | Vite 7.2.4 |
| Styling | Tailwind CSS 3.4.19 |
| UI Components | shadcn/ui |
| State Management | React Context |
| Database | Supabase (PostgreSQL) |
| Authentication | Supabase Auth |
| Icons | Lucide React |
| Routing | React Router DOM 7.13.2 |
| Forms | React Hook Form + Zod |
| Date Handling | date-fns (Thai locale) |
| Charts | Recharts |
| Security | bcryptjs, DOMPurify |
| Excel Export | `xlsx` (client-side) |
| PDF Export | `jspdf` + `jspdf-autotable` (client-side, Thai font) |
| Real-time | Supabase Realtime (postgres_changes) |
| Offline Storage | IndexedDB (idb library) |
| Service Worker | Custom SW for caching |
| Background Sync | Auto-sync when online |

## การติดตั้งและรัน

```bash
# ติดตั้ง dependencies
npm install

# รัน development server
npm run dev
# Server จะรันที่ http://localhost:5173

# Build สำหรับ production
npm run build

# Preview production build
npm run preview

# Lint code
npm run lint
```

## การตั้งค่า Supabase (สำคัญ!)

### 1. สร้างโปรเจค
1. สร้างโปรเจคที่ [supabase.com](https://supabase.com)
2. คัดลอก Project URL และ `anon` key ใส่ในไฟล์ `.env`:
   ```
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key
   ```

### 2. ตั้งค่าฐานข้อมูล
1. ไปที่ **Supabase Dashboard → SQL Editor**
2. รันคำสั่งตามลำดับ:
   - `database-setup.sql` - ตารางหลักทั้งหมด
   - `fix-missing-tables.sql` - ตาราง POS และ Inventory (ถ้าขาดหาย)
   - `phase2-payroll.sql` - ระบบเงินเดือน (ถ้าต้องการใช้)
   - `phase2-audit-trail.sql` - ระบบ Audit Trail (ถ้าต้องการใช้)
   - `phase2-alerts.sql` - ระบบแจ้งเตือนอัจฉริยะ
   - `phase2-membership.sql` - ระบบสมาชิก (ถ้าต้องการใช้)
   - `promotions.sql` - ระบบโปรโมชั่น (ถ้าต้องการใช้)

### 3. สร้าง Index สำหรับ Performance (สำคัญ!)
รันคำสั่งนี้เพื่อสร้าง index ที่จำเป็นสำหรับความเร็ว:
```sql
-- Index สำคัญสำหรับ auth lookups (ป้องกันการโหลดช้า/ค้าง)
CREATE INDEX IF NOT EXISTS idx_users_authuid ON users(authuid);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- Index แนะนำสำหรับตารางอื่นๆ
CREATE INDEX IF NOT EXISTS idx_profiles_userid ON profiles(userid);
CREATE INDEX IF NOT EXISTS idx_schedules_date ON schedules(date);
CREATE INDEX IF NOT EXISTS idx_schedules_employeeid ON schedules(employeeid);
CREATE INDEX IF NOT EXISTS idx_attendances_employeeid ON attendances(employeeid);
CREATE INDEX IF NOT EXISTS idx_daily_accounting_date ON daily_accounting(date);
CREATE INDEX IF NOT EXISTS idx_notifications_userid ON notifications(userid);
```

### 4. ตั้งค่า Authentication
1. ไปที่ **Authentication → Settings**
2. ตั้งค่า:
   - ✅ **Enable Email provider**
   - ❌ **Confirm email**: OFF (สำหรับ development)
   - ✅ **Secure email change**: ON
   - ✅ **Secure password reset**: ON

### 5. สร้าง Auth Users
1. ไปที่ **Authentication → Users**
2. คลิก **"Add user"** → **"Create new user"**
3. สร้าง 6 users:
   - admin@gasstation.com / Admin@123
   - manager@gasstation.com / Manager@123
   - somchai@gasstation.com / Staff@123
   - somying@gasstation.com / Staff@123
   - mani@gasstation.com / Staff@123
   - prasit@gasstation.com / Staff@123

### 6. เชื่อมโยง UUID อัตโนมัติ
รันคำสั่งนี้ที่ **SQL Editor**:
```sql
UPDATE users u
SET authuid = a.id
FROM auth.users a
WHERE u.email = a.email;
```

## โครงสร้างฐานข้อมูล (Database Schema)

```sql
-- ตำแหน่งงาน
CREATE TABLE positions (
  id text PRIMARY KEY,
  name text NOT NULL,
  description text
);

-- ทักษะ
CREATE TABLE skills (
  id text PRIMARY KEY,
  name text NOT NULL,
  code text NOT NULL
);

-- สาขาปั๊มน้ำมัน
CREATE TABLE stations (
  id text PRIMARY KEY,
  name text NOT NULL,
  address text,
  phone text,
  managerid text
);

-- กะการทำงาน
CREATE TABLE shifts (
  id text PRIMARY KEY,
  name text NOT NULL,
  starttime text NOT NULL,
  endtime text NOT NULL,
  minstaff int NOT NULL,
  requiredskills jsonb DEFAULT '[]',
  color text
);

-- ข้อมูลพนักงาน
CREATE TABLE profiles (
  id text PRIMARY KEY,
  userid text,
  firstname text,
  lastname text,
  fullname text NOT NULL,
  phone text,
  avatar text,
  positionid text REFERENCES positions(id),
  stationid text,
  status text NOT NULL,
  hiredate text
);

-- ทักษะพนักงาน
CREATE TABLE profile_skills (
  profileid text REFERENCES profiles(id) ON DELETE CASCADE,
  skillid text REFERENCES skills(id) ON DELETE CASCADE,
  PRIMARY KEY (profileid, skillid)
);

-- บัญชีผู้ใช้ (เชื่อมกับ Supabase Auth)
CREATE TABLE users (
  id text PRIMARY KEY,
  authuid text UNIQUE,  -- เชื่อมกับ auth.users
  email text UNIQUE NOT NULL,
  password text NOT NULL,
  role text NOT NULL,
  profileid text,
  createdat text NOT NULL,
  updatedat text NOT NULL
);

-- ตารางกะ
CREATE TABLE schedules (
  id text PRIMARY KEY,
  date text NOT NULL,
  shiftid text REFERENCES shifts(id),
  employeeid text REFERENCES profiles(id),
  stationid text,
  status text NOT NULL,
  note text,
  createdby text,
  createdat text NOT NULL
);

-- คำขอลา
CREATE TABLE leave_requests (
  id text PRIMARY KEY,
  employeeid text REFERENCES profiles(id),
  type text NOT NULL,
  startdate text NOT NULL,
  enddate text NOT NULL,
  days int NOT NULL,
  reason text,
  status text NOT NULL,
  approvedby text,
  approvedat text,
  createdat text NOT NULL
);

-- คำขอสลับกะ
CREATE TABLE swap_requests (
  id text PRIMARY KEY,
  requesterid text REFERENCES profiles(id),
  requestedid text REFERENCES profiles(id),
  scheduleid text REFERENCES schedules(id) ON DELETE CASCADE,
  targetscheduleid text REFERENCES schedules(id) ON DELETE CASCADE,
  status text NOT NULL,
  approvedby text,
  createdat text NOT NULL
);

-- การลงเวลา
CREATE TABLE attendances (
  id text PRIMARY KEY,
  employeeid text REFERENCES profiles(id),
  scheduleid text REFERENCES schedules(id) ON DELETE CASCADE,
  checkin text,
  checkout text,
  checkinlocation text,
  checkoutlocation text,
  note text,
  status text NOT NULL
);

-- ราคาน้ำมัน
CREATE TABLE fuel_prices (
  id text PRIMARY KEY,
  "95" numeric NOT NULL,
  "B7" numeric NOT NULL,
  "B10" numeric NOT NULL,
  "Diesel" numeric NOT NULL,
  effectivedate text NOT NULL,
  createdat text NOT NULL
);

-- บัญชีรายวัน
CREATE TABLE daily_accounting (
  id text PRIMARY KEY,
  date text NOT NULL,
  shiftid text REFERENCES shifts(id),
  employeeid text REFERENCES profiles(id),
  fuelmeter jsonb NOT NULL,
  fuelsales jsonb NOT NULL,
  fuelamount jsonb NOT NULL,
  totalfuelamount numeric NOT NULL,
  systemamount numeric NOT NULL,
  cashamount numeric NOT NULL,
  actualcashcounted numeric,
  dispensercash jsonb NOT NULL,
  items jsonb NOT NULL,
  totalamount numeric NOT NULL,
  difference numeric NOT NULL,
  note text,
  createdat text NOT NULL,
  updatedat text NOT NULL
);

-- การแจ้งเตือน
CREATE TABLE notifications (
  id text PRIMARY KEY,
  userid text NOT NULL,
  title text NOT NULL,
  message text NOT NULL,
  type text NOT NULL,
  read boolean DEFAULT false,
  createdat text NOT NULL
);

-- คลังสินค้าและน้ำมัน (Inventory Management)
CREATE TABLE fuel_inventory (
  id text PRIMARY KEY,
  date text NOT NULL,
  fuel_type text NOT NULL CHECK (fuel_type IN ('95', 'B7', 'B10', 'Diesel')),
  tank_number int DEFAULT 1,
  opening_stock decimal(12,2) NOT NULL,
  received_qty decimal(12,2) DEFAULT 0,
  sold_qty decimal(12,2) DEFAULT 0,
  adjustment_qty decimal(12,2) DEFAULT 0,
  closing_stock decimal(12,2) NOT NULL,
  actual_stock decimal(12,2),
  variance decimal(12,2) GENERATED ALWAYS AS (COALESCE(actual_stock, closing_stock) - closing_stock) STORED,
  temperature decimal(5,2),
  density decimal(5,2),
  recorded_by text,
  note text,
  created_at text DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE fuel_deliveries (
  id text PRIMARY KEY,
  do_number text UNIQUE NOT NULL,
  supplier_id text,
  fuel_type text NOT NULL CHECK (fuel_type IN ('95', 'B7', 'B10', 'Diesel')),
  quantity_liters decimal(12,2) NOT NULL,
  price_per_liter decimal(10,2) NOT NULL,
  total_amount decimal(12,2) GENERATED ALWAYS AS (quantity_liters * price_per_liter) STORED,
  delivery_date text NOT NULL,
  received_date text,
  received_by text,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'received', 'rejected')),
  note text,
  created_at text DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE products (
  id text PRIMARY KEY,
  barcode text UNIQUE,
  sku text UNIQUE,
  name text NOT NULL,
  category text NOT NULL CHECK (category IN ('beverage', 'snack', 'automotive', 'misc')),
  unit text NOT NULL DEFAULT 'piece',
  cost_price decimal(10,2) NOT NULL,
  selling_price decimal(10,2) NOT NULL,
  current_stock int DEFAULT 0,
  min_stock int DEFAULT 10,
  max_stock int DEFAULT 100,
  supplier_id text,
  is_active boolean DEFAULT true,
  created_at text DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE product_transactions (
  id text PRIMARY KEY,
  product_id text REFERENCES products(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('in', 'out', 'adjust', 'return')),
  quantity int NOT NULL,
  unit_cost decimal(10,2),
  reference_type text,
  reference_id text,
  performed_by text,
  note text,
  created_at text DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE suppliers (
  id text PRIMARY KEY,
  name text NOT NULL,
  contact_person text,
  phone text,
  email text,
  address text,
  tax_id text,
  payment_terms int DEFAULT 15,
  is_active boolean DEFAULT true,
  created_at text DEFAULT CURRENT_TIMESTAMP
);

-- POS System (Sales transactions)
CREATE TABLE sales (
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
  change_amount decimal(12,2) DEFAULT 0,
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

-- Audit Trail
CREATE TABLE audit_logs (
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

-- Payroll Periods
CREATE TABLE payroll_periods (
  id text PRIMARY KEY,
  year int NOT NULL,
  month int NOT NULL,
  start_date text NOT NULL,
  end_date text NOT NULL,
  pay_date text,
  status text DEFAULT 'open' CHECK (status IN ('open', 'processing', 'closed'))
);

-- Payroll Records
CREATE TABLE payroll_records (
  id text PRIMARY KEY,
  period_id text NOT NULL REFERENCES payroll_periods(id),
  employee_id text NOT NULL REFERENCES profiles(id),
  base_salary decimal DEFAULT 0,
  shift_count int DEFAULT 0,
  shift_rate decimal DEFAULT 0,
  overtime_hours decimal DEFAULT 0,
  overtime_rate decimal DEFAULT 0,
  total_income decimal DEFAULT 0,
  tax_deduction decimal DEFAULT 0,
  social_security decimal DEFAULT 0,
  other_deductions decimal DEFAULT 0,
  net_salary decimal DEFAULT 0,
  status text DEFAULT 'draft' CHECK (status IN ('draft', 'approved', 'paid'))
);
```

## การทำงานแบบ Offline-First

ระบบรองรับการทำงานแบบ **Offline-First** สามารถใช้งานได้แม้ไม่มีอินเทอร์เน็ต:

### ฟีเจอร์ที่รองรับ Offline
- **POS** - ขายสินค้า/น้ำมันได้ตามปกติ ข้อมูลจะถูกเก็บในเครื่องและซิงค์เมื่อออนไลน์
- **ลงเวลา** - เช็คอิน/เช็คเอาท์ได้ แม้ไม่มีเน็ต
- **บัญชีรายวัน** - บันทึกข้อมูลได้ ซิงค์ภายหลัง
- **ขอลา** - ส่งคำขอลาได้ จะส่งเมื่อออนไลน์

### วิธีการทำงาน
1. เมื่อออฟไลน์ ข้อมูลจะถูกบันทึกลง **IndexedDB** ใน browser
2. UI อัปเดตทันที (Optimistic UI)
3. เมื่อกลับมาออนไลน์ ระบบจะซิงค์ข้อมูลอัตโนมัติ
4. แสดงสถานะการซิงค์ใน Offline Banner ด้านบน

### ติดตั้งเป็น PWA
- รองรับการติดตั้งเป็น Progressive Web App
- มี Service Worker จัดการ cache
- แสดง banner แจ้งเตือนเมื่อมีเวอร์ชันใหม่

## บัญชีทดลอง

| อีเมล | รหัสผ่าน | บทบาท |
|--------|----------|--------|
| admin@gasstation.com | Admin@123 | admin |
| manager@gasstation.com | Manager@123 | manager |
| somchai@gasstation.com | Staff@123 | staff |
| somying@gasstation.com | Staff@123 | staff |
| mani@gasstation.com | Staff@123 | staff |
| prasit@gasstation.com | Staff@123 | staff |

**หมายเหตุ:** รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร ประกอบด้วยตัวพิมพ์ใหญ่ พิมพ์เล็ก ตัวเลข และอักขระพิเศษ

## คู่มือการใช้งาน

- ดู `SETUP.md` สำหรับขั้นตอนการตั้งค่าละเอียด
- ดู `docs/USAGE_GUIDE.md` สำหรับคู่มือการใช้งานและสูตรคำนวณ
- ดู `AGENTS.md` สำหรับคู่มือการพัฒนา

## ความสัมพันธ์ระหว่างตาราง

```
profiles (employee)
    ↓ positionid
positions

profile_skills
    ↓ profileid → profiles(id) ON DELETE CASCADE
    ↓ skillid → skills(id) ON DELETE CASCADE

users
    ↓ profileid → profiles(id)
    ↓ authuid → auth.users(id)

schedules
    ↓ shiftid → shifts(id)
    ↓ employeeid → profiles(id)

attendances
    ↓ scheduleid → schedules(id) ON DELETE CASCADE
    ↓ employeeid → profiles(id)

swap_requests
    ↓ scheduleid → schedules(id) ON DELETE CASCADE
    ↓ targetscheduleid → schedules(id) ON DELETE CASCADE
```

## การแก้ปัญหาเบื้องต้น

### ❌ หน้าเว็บโหลดนาน / ค้างที่ Loading
**สาเหตุ**: ไม่มี index บนตาราง users หรือ Browser extensions บล็อกการเชื่อมต่อ Supabase

**แก้ไข**:
1. รันคำสั่งสร้าง index ใน Supabase SQL Editor (ดูขั้นตอนที่ 3)
2. ลองเปิดใน **Incognito/Private mode** เพื่อตรวจสอบว่า extensions เป็นตัวบล็อก
3. ถ้า Incognito เร็วขึ้น → Disable extensions ที่น่าสงสัย (Bitwarden, AdBlock, Privacy Badger)
4. Clear cache: กด F12 → Application → Local Storage → ลบ key ที่ขึ้นต้นด้วย `cache_`

### ❌ "Database is empty"
- รันคำสั่งใน `database-setup.sql`
- สร้าง Auth Users
- อัพเดท authuid

### ❌ "Invalid login credentials"
- ตรวจสอบว่าอีเมลใน `auth.users` ตรงกับ `public.users`
- รันคำสั่ง SQL เชื่อมโยง authuid

### ❌ "column xxxx does not exist"
- Column names ไม่ตรงกัน (camelCase vs lowercase)
- รัน SQL setup script ใหม่

## License

MIT License
