# Gas Station Shift Manager - แผนพัฒนาระบบเวอร์ชัน 2

> แผนพัฒนาระบบเวอร์ชัน 2.0 — ขยายจากระบบจัดการกะงานสู่ระบบบริหารธุรกิจปั๊มน้ำมันแบบ All-in-One
> อัปเดตล่าสุด: มิถุนายน 2568

---

## 📋 ภาพรวม V.2

### สถานะปัจจุบัน (V.1 → V.2 ที่เสร็จแล้ว)
✅ จัดการพนักงาน / ตารางกะ / ลงเวลา / บัญชีรายวัน / รายงาน / แจ้งเตือน / Backup / Inventory / POS / Offline-First / **Multi-Station (หลายสาขา)** / **Audit Log Viewer**

### เป้าหมาย V.2 ที่ยังไม่เสร็จ
🎯 **ระบบบริหารปั๊มน้ำมันครบวงจร** — เชื่อมโยงทุกภาคส่วนของธุรกิจ

---

## ✅ Phase V2.1: โมดูลธุรกิจหลัก (Core Business Modules)

### 1. ระบบคลังสินค้าและน้ำมัน (Inventory Management)
**Priority:** P0 | **ผลกระทบทางธุรกิจ:** สูงมาก | **สถานะ:** ✅ เสร็จสมบูรณ์ (มิถุนายน 2568)

#### ฟีเจอร์ที่พัฒนาเสร็จแล้ว
- [x] **บันทึกน้ำมันเข้า** - รับน้ำมันจากคลังกลาง/ซัพพลายเออร์
  - จำนวนลิตรต่อประเภท (95, B7, B10, Diesel)
  - เลขที่ใบส่งของ (DO - Delivery Order)
  - วันที่-เวลารับน้ำมัน
  - ตรวจสอบคุณภาพ (Density, Temperature)
  
- [x] **ติดตามสต็อกน้ำมัน**
  - สต็อกคงเหลือแบบ Real-time
  - แจ้งเตือนสต็อกต่ำกว่ากำหนด (Minimum Stock Alert)
  - คำนวณ "Book Stock" vs "Actual Stock"
  
- [x] **บันทึกน้ำมันสูญเสีย** (Loss/Gain)
  - การระเหย (Evaporation)
  - การรั่วซึม
  - ความผิดพลาดจากมิเตอร์

- [x] **สินค้าทั่วไปในร้านค้า**
  - น้ำดื่ม, ขนม, ของใช้รถยนต์
  - บาร์โค้ด/QR Code สินค้า
  - นับสต็อกประจำวัน/สัปดาห์

**ไฟล์ที่เกี่ยวข้อง:** `InventoryContext.tsx`, `inventoryStorage.ts`, `Inventory.tsx`, `Products.tsx`, `Suppliers.tsx`

---

### 2. ระบบ POS (Point of Sale) - ขายหน้าร้าน
**Priority:** P0 | **ผลกระทบทางธุรกิจ:** สูงมาก | **สถานะ:** ✅ เสร็จสมบูรณ์ (มิถุนายน 2568)

#### ฟีเจอร์ที่พัฒนาเสร็จแล้ว
- [x] **ขายน้ำมันผ่าน POS**
  - เลือกหัวจ่าย (Dispenser) → ระบบดึงยอดเงิน/ลิตรจากมิเตอร์
  - คำนวณเงินทอน
  - รองรับหลายช่องทางชำระ (เงินสด, โอน, บัตรเครดิต, QR, E-Wallet)
  
- [x] **ขายสินค้าร้านค้า (Shop)**
  - สแกนบาร์โค้ด/เลือกจากรายการ
  - ตะกร้าสินค้า (Shopping Cart)
  - ตัดสต็อกอัตโนมัติเมื่อขาย
  - ส่วนลดและภาษี VAT

- [x] **ใบเสร็จรับเงิน (Receipt)**
  - แสดงใบเสร็จบนหน้าจอ
  - พิมพ์ผ่านเครื่องพิมพ์ได้

**ไฟล์ที่เกี่ยวข้อง:** `POSContext.tsx`, `posStorage.ts`, `POS.tsx`

---

### 3. ระบบสมาชิกและคะแนนสะสม (Loyalty Program)
**Priority:** P1 | **ผลกระทบทางธุรกิจ:** สูง | **สถานะ:** ⏳ ยังไม่เริ่ม

#### ฟีเจอร์ที่วางแผนไว้
- [ ] **ลงทะเบียนสมาชิก**
  - เบอร์โทรศัพท์เป็น Member ID
  - สแกน QR Code บัตรสมาชิก
  
- [ ] **คะแนนสะสม**
  - 1 บาท = 1 คะแนน (ปรับแต่งได้)
  - แลกคะแนนเป็นส่วนลด/ของรางวัล
  
- [x] **โปรโมชั่น (Promotions)**
  - เติมน้ำมันครบ X บาท ลด Y บาท
  - ซื้อสินค้าครบจำนวน แถมฟรี
  - Happy Hour (ลดราคาช่วงเวลาที่กำหนด)
  - ลดเปอร์เซ็นต์ / ลดตามจำนวน
  - กรองตามประเภทน้ำมันและช่วงเวลา
  - เปิด/ปิดการใช้งานได้

```sql
CREATE TABLE members (
  id text PRIMARY KEY,
  phone text UNIQUE NOT NULL,
  name text,
  email text,
  birthdate text,
  points_balance int DEFAULT 0,
  total_spent decimal DEFAULT 0,
  join_date text,
  last_visit text
);
```

---

### 4. ระบบจัดซื้อและซัพพลายเออร์ (Procurement)
**Priority:** P1 | **ผลกระทบทางธุรกิจ:** ปานกลาง-สูง | **สถานะ:** 🟡 บางส่วนเสร็จแล้ว

#### ฟีเจอร์ที่พัฒนาเสร็จแล้ว
- [x] **จัดการซัพพลายเออร์**
  - บันทึกข้อมูลบริษัทน้ำมัน/ผู้จำหน่าย
  - ติดต่อฉุกเฉิน

#### ฟีเจอร์ที่วางแผนไว้
- [ ] **ใบสั่งซื้อน้ำมัน (PO)**
  - สร้างใบสั่งซื้อ
  - ติดตามสถานะ (Pending → Confirmed → Delivered → Invoiced)
  - แจ้งเตือนกำหนดส่งมอบ

---

## 🔧 Phase V2.2: การเงินและบัญชี (Financial & Accounting)

### 5. ระบบบัญชีครบวงจร (Full Accounting)
**Priority:** P0 | **ผลกระทบทางธุรกิจ:** สูงมาก | **สถานะ:** ⏳ ยังไม่เริ่ม

#### ฟีเจอร์ที่วางแผนไว้
- [ ] **บัญชีรายรับ-รายจ่าย**
  - บันทึกค่าใช้จ่ายประจำวัน (น้ำไฟ, ค่าแรง, ค่าซ่อมบำรุง)
  - แยกประเภทรายรับ-รายจ่ายตามบัญชี (Chart of Accounts)
  
- [ ] **บัญชีเจ้าหนี้-ลูกหนี้**
  - ติดตามเจ้าหนี้น้ำมัน (จ่ายช้า/จ่ายตรงเวลา)
  - ลูกหนี้ลูกค้า (ถ้ามิเตอร์ให้เชื่อ)
  
- [ ] **งบการเงินอัตโนมัติ**
  - งบกำไรขาดทุน (P&L) รายวัน/เดือน/ปี
  - งบดุล (Balance Sheet)
  - รายงานกระแสเงินสด (Cash Flow)

- [ ] **ภาษีมูลค่าเพิ่ม (VAT)**
  - คำนวณ VAT ขาย (Output VAT)
  - บันทึก VAT ซื้อ (Input VAT)
  - รายงานภาษีซื้อ-ขาย (ภ.พ.30)

---

### 6. ระบบเงินเดือนและค่าจ้าง (Payroll System)
**Priority:** P1 | **ผลกระทบทางธุรกิจ:** สูง | **สถานะ:** ✅ เสร็จสมบูรณ์ (มิถุนายน 2568)

#### ฟีเจอร์ที่พัฒนาเสร็จแล้ว
- [x] **ตารางฐานข้อมูล** (`phase2-payroll.sql`)
  - `payroll_periods` - งวดเงินเดือน (year, month, start_date, end_date, status)
  - `payroll_records` - รายการเงินเดือน (base_salary, shift_count, overtime, deductions, net_salary)
  - Indexes และ RLS policies
- [x] **Storage Layer** (`payrollStorage.ts`)
  - CRUD สำหรับ payroll periods และ records
  - Mapping helpers (camelCase ↔ lowercase)
  - Graceful error handling (PGRST205)
- [x] **หน้า Payroll UI** (`pages/Payroll.tsx`)
  - เลือกงวดเดือน/ปี
  - ดึงข้อมูล attendance + schedule มาคำนวณ
  - คำนวณอัตโนมัติ: ค่าแรงพื้นฐาน, OT, หักภาษี, ประกันสังคม
- [x] **สลิปเงินเดือน (Payslip)**
  - สร้าง print-ready สลิปเงินเดือน
  - คำนวณภาษีแบบ progressive
  - หักประกันสังคม 5%

---

## 📱 Phase V2.3: ประสบการณ์ลูกค้า (Customer Experience)

### 7. แอพพลิเคชันสำหรับลูกค้า (Customer App)
**Priority:** P1 | **ผลกระทบทางธุรกิจ:** สูง | **สถานะ:** ⏳ ยังไม่เริ่ม

#### ฟีเจอร์ที่วางแผนไว้
- [ ] **แอพลูกค้า (PWA/Flutter/React Native)**
  - สมัครสมาชิก / ล็อกอิน
  - ดูคะแนนสะสม / ประวัติการเติมน้ำมัน
  - ค้นหาปั๊มน้ำมันในสาขา
  - ดูโปรโมชั่น
  
- [ ] **จองคิวเติมน้ำมัน** (ถ้ามีระบบคิว)
- [ ] **ชำระเงินผ่านแอพ** (PromptPay / Credit Card)
- [ ] **แจ้งเตือนโปรโมชั่น** Push Notification

---

### 8. ระบบ QR Code & Digital Payment
**Priority:** P0 | **ผลกระทบทางธุรกิจ:** สูงมาก | **สถานะ:** ⏳ ยังไม่เริ่ม

#### ฟีเจอร์ที่วางแผนไว้
- [ ] **QR Code รับชำระ**
  - สร้าง QR Code สำหรับชำระเงินแต่ละรายการ
  - รองรับ PromptPay, Thai QR
  - ตรวจสอบสลิปอัตโนมัติ (Slip Verification API)
  
- [ ] **QR Code สมาชิก**
  - ลูกค้าแสดง QR Code สำหรับสะสมคะแนน
  - พนักงานสแกนเพื่อบันทึกคะแนน

---

## 🏢 Phase V2.4: หลายสาขาและการขยาย (Multi-Branch & Scale) ✅ เสร็จสิ้น

### 9. ระบบจัดการหลายสาขา (Multi-Station)
**Priority:** P1 | **ผลกระทบทางธุรกิจ:** สูง | **สถานะ:** ✅ เสร็จสมบูรณ์ (มิถุนายน 2026)

#### ฟีเจอร์ที่พัฒนาเสร็จแล้ว
- [x] **Admin สำหรับแฟรนไชส์**
  - จัดการหลายสาขาในบัญชีเดียว (หน้า `/stations`)
  - เปรียบเทียบยอดขายสาขา (Reports แยกตามสาขา)
  
- [x] **สิทธิ์ระดับสาขา**
  - Staff เห็นเฉพาะสาขาตัวเอง (lock ตาม `profile.stationId`)
  - Manager เห็นสาขาที่จัดการ (สลับสาขาได้)
  - Admin เห็นทุกสาขา (เลือก "ทุกสาขา" หรือสาขาเฉพาะได้)

- [x] **กรองข้อมูลทุก Context ตามสาขา**
  - `EmployeeContext` — `filteredEmployees` กรองตาม `currentStation`
  - `ScheduleContext` — กรอง schedules/leave/swap ตาม `stationId`
  - `AttendanceContext` — กรอง attendance ตาม employee station
  - `DailyAccountingContext` — กรอง accounting ตาม employee station
  - `Reports` — แสดงรายงานตามสาขาที่เลือก

- [x] **Auto-set station ตอน Login**
  - `AuthContext` อ่าน `stationId` จาก profile → บันทึก `localStorage`
  - `StationContext`  Restore `currentStation` จาก localStorage ตอน app load

```sql
-- Database Schema (มีอยู่แล้วใน database-setup.sql)
CREATE TABLE stations (
  id text PRIMARY KEY,
  name text NOT NULL,
  address text,
  phone text,
  managerid text
);

-- profiles มี stationid
-- schedules มี stationid
```

---

## 🤖 Phase V2.5: ฟีเจอร์อัจฉริยะ (Smart Features)

### 10. ระบบแจ้งเตือนอัจฉริยะ (Smart Alerts)
**Priority:** P1 | **ผลกระทบทางธุรกิจ:** ปานกลาง-สูง | **สถานะ:** 🟡 Backend เสร็จแล้ว รอ UI

#### ฟีเจอร์ที่พัฒนาเสร็จแล้ว
- [x] **ตาราง `alert_rules`** (`phase2-alerts.sql`)
  - กำหนดเงื่อนไขการแจ้งเตือน (entity, field, operator, threshold)
  - รองรับ severity (info, warning, critical)
- [x] **Stock Prediction** (`src/lib/analytics.ts`)
  - `predictFuelStock()` - คาดการณ์สต็อกน้ำมันหมดในกี่วัน (ใช้ยอดขายเฉลี่ย 7 วัน)
  - `predictProductStock()` - คาดการณ์สต็อกสินค้าหมด (ใช้ยอดขาย 14 วัน)
  - สถานะ: critical / warning / normal

#### ฟีเจอร์ที่วางแผนไว้
- [ ] **Anomaly Detection UI**
  - แจ้งเตือนยอดขายผิดปกติ
  - ตรวจจับการขาดน้ำมันกะทันหัน
  - แจ้งเตือนพนักงานลงเวลาผิดปกติ
- [ ] **Alert Settings Page**
  - ปรับแต่ง threshold ได้
  - เลือกช่องทางการแจ้งเตือน

---

### 11. ระบบ IoT & Hardware Integration
**Priority:** P2 | **ผลกระทบทางธุรกิจ:** ปานกลาง | **สถานะ:** ⏳ ยังไม่เริ่ม

#### ฟีเจอร์ที่วางแผนไว้
- [ ] **เชื่อมต่อมิเตอร์น้ำมันอัตโนมัติ**
  - อ่านค่ามิเตอร์ผ่าน Modbus/RS485
  - บันทึกยอดขาย Real-time ไม่ต้องกรอกมือ
  
- [ ] **เซ็นเซอร์ระดับน้ำมันในถัง**
  - Ultrasonic Level Sensor
  - แจ้งเตือนถังใกล้หมดอัตโนมัติ
  
- [ ] **CCTV AI**
  - ตรวจจับทะเบียนรถ (LPR)
  - นับจำนวนรถที่เข้ามาเติม
  - ตรวจจับเหตุการณ์ผิดปกติ

---

## 📊 Phase V2.6: รายงานและการวิเคราะห์ (Reports & Analytics)

### 12. Dashboard ระดับ CEO/Owner
**Priority:** P1 | **ผลกระทบทางธุรกิจ:** สูง | **สถานะ:** ⏳ ยังไม่เริ่ม

#### ฟีเจอร์ที่วางแผนไว้
- [ ] **KPI Dashboard**
  - ยอดขายรวมทุกสาขา Real-time
  - เปรียบเทียบยอดขายวันนี้ vs วันก่อนหน้า
  - อันดับสาขายอดขายสูงสุด
  - อันดับพนักงานขายเก่ง
  
- [ ] **Business Intelligence**
  - วิเคราะห์พฤติกรรมลูกค้า
  - วิเคราะห์กำไรต่อลิตร
  - วิเคราะห์ต้นทุนแฝง

---

### 13. รายงานภาษีและกฎหมาย
**Priority:** P1 | **ผลกระทบทางธุรกิจ:** สูง | **สถานะ:** ⏳ ยังไม่เริ่ม

#### ฟีเจอร์ที่วางแผนไว้
- [ ] **รายงานภาษีอัตโนมัติ**
  - ภ.พ.30 (ภาษีมูลค่าเพิ่ม)
  - ภ.ง.ด.1 (หัก ณ ที่จ่ายเงินได้)
  - ภ.ง.ด.51 (กำไรสุทธิ)
  
- [ ] **รายงานกรมธุรกิจพลังงาน**
  - รายงานปริมาณน้ำมันคงเหลือ
  - รายงานการขายน้ำมันรายเดือน

---

## 🛠️ การปรับปรุงทางเทคนิค (Technical Enhancements)

### 14. ปรับปรุงระบบพื้นฐาน
**Priority:** P0-P2

- [x] **Offline-First Architecture** ✅ เสร็จสมบูรณ์ (มิถุนายน 2568)
  - Service Worker เก็บข้อมูล local
  - Sync ขึ้น Supabase เมื่อมีเน็ต
  - ทำงานได้แม้เน็ตขัดข้อง

- [x] **Performance Optimization** ✅ เสร็จสมบูรณ์ (มิถุนายน 2568)
  - localStorage cache layer (`src/lib/cache.ts`)
  - Staggered context loading (ไม่ใช้ Promise.all พร้อมกัน)
  - Query timeouts (5s สำหรับ `daily_accounting`) ป้องกันการค้าง
  - `.maybeSingle()` แทน `.single()` สำหรับ user lookups
  - Database indexes: `idx_users_authuid`, `idx_users_email`
  
- [x] **Real-time Subscriptions** ✅ เสร็จสมบูรณ์ (มิถุนายน 2568)
  - Supabase Realtime สำหรับทุกตาราง (20+ ตาราง ผ่าน 11 Contexts)
  - อัปเดตข้อมูลทันทีที่มีการเปลี่ยนแปลง
  - Debounce 800ms + cache invalidation
  - Toast แจ้งเตือนเมื่อมีข้อมูลใหม่
  - Cleanup subscriptions ตอน unmount
  
- [ ] **Mobile App (Native)**
  - React Native หรือ Flutter
  - รองรับ iOS/Android
  - Push Notification
  
- [ ] **API Integration**
  - ธนาคาร (ตรวจสอบสลิป)
  - LINE Official Account (แจ้งเตือน)
  - กรมธุรกิจพลังงาน (ดึงราคาน้ำมันอ้างอิง)

---

## 📅 Timeline แนะนำ

### ✅ เสร็จสมบูรณ์แล้ว (Q1-Q2 2568)
- ✅ Inventory Management (คลังน้ำมัน)
- ✅ POS System ระดับพื้นฐาน
- ✅ สินค้าร้านค้า
- ✅ Offline-First Architecture
- ✅ Backup & Restore System
- ✅ Notification System
- ✅ Payroll System (เงินเดือน)
- ✅ Performance Optimization (Cache, Stagger Loading, Indexes)
- ✅ **Multi-Station / Multi-Branch (ระบบหลายสาขา)**

### Quarter 3 (เดือน 7-9 2568)
- ✅ Export Reports (PDF & Excel) — ทำฝั่ง client ด้วย `xlsx` + `jspdf` (มิถุนายน 2568)
- ✅ ระบบโปรโมชั่น (Promotions) — เติมครบลด, Happy Hour, ลดเปอร์เซ็นต์ (มิถุนายน 2568)
- ระบบสมาชิกและคะแนนสะสม (ระดับพื้นฐาน)
- Dark Mode

### Quarter 4 (เดือน 10-12 2568)
- ระบบบัญชีครบวงจร (Full Accounting)
- QR Code & Digital Payment
- PWA Enhancement + Push Notification
- ~~Real-time Subscriptions~~ ✅ เสร็จสมบูรณ์แล้ว (มิถุนายน 2568)

### ปี 2569 (เดือน 1-12)
- แอพพลิเคชันสำหรับลูกค้า
- Dashboard ระดับ CEO (ยอดขายรวมทุกสาขา)
- Smart Alerts / AI
- IoT Integration (ถ้าลงทุนฮาร์ดแวร์)

---

## 💰 ประมาณการลงทุน (Rough Estimate)

| รายการ | ระดับพื้นฐาน | ระดับมาตรฐาน | ระดับ Enterprise |
|--------|-------------|--------------|------------------|
| **Development** | 3-5 แสน | 8-12 แสน | 15-25 แสน |
| **Hardware** (POS, Printer, Scanner) | 2-3 หมื่น/จุด | 5-8 หมื่น/จุด | 1-2 แสน/จุด |
| **IoT Sensors** | - | 3-5 หมื่น | 1-2 แสน |
| **Cloud/Hosting** | 1-2 พัน/เดือน | 3-5 พัน/เดือน | 8-15 พัน/เดือน |
| **Maintenance** | 1 หมื่น/เดือน | 2-3 หมื่น/เดือน | 5 หมื่น+/เดือน |

---

## 🎯 ตัวชี้วัดความสำเร็จ (Success Metrics)

| ตัวชี้วัด | เป้าหมาย |
|-----------|----------|
| ยอดขายต่อวัน | เพิ่มขึ้น 10-15% |
| สต็อกขาด | ลดลง 90% |
| เวลาทำบัญชี | ลดลง 70% |
| ความผิดพลาดในการคิดเงิน | ลดลง 95% |
| ลูกค้าประจำ | เพิ่มขึ้น 20% |

---

*เอกสารจัดทำเมื่อ: มิถุนายน 2568*
*Version: 2.2 (Released)*
