# แผนโครงการ: แอพจัดการกะปฏิบัติงานและบัญชีปั๊มน้ำมัน

> เอกสารฉบับสมบูรณ์ — อธิบายภาพรวมระบบ โครงสร้างข้อมูล และการออกแบบหน้าจอ
> อัปเดตล่าสุด: มิถุนายน 2568

---

## 1. ภาพรวมระบบ (System Overview)

### 1.1 วัตถุประสงค์
แอพพลิเคชันสำหรับจัดการตารางกะการทำงานของพนักงานปั๊มน้ำมัน รองรับการทำงานเป็นกะ (Shift) หลายกะต่อวัน ตรวจสอบความพร้อมของพนักงาน แจ้งเตือนการทำงาน และบัญชีรายวัน พร้อมระบบขายหน้าร้าน (POS) และจัดการคลังสินค้าแบบครบวงจร

### 1.2 ผู้ใช้งานระบบ (User Roles)

| บทบาท | สิทธิ์การใช้งาน |
|-------|---------------|
| **Admin** | จัดการพนักงานทั้งหมด, ตั้งค่ากะ, ดูรายงานทั้งหมด, สำรอง/กู้คืนข้อมูล, จัดการคลัง, **จัดการสาขา** |
| **Manager** | จัดการกะพนักงาน, อนุมัติการลา/สลับกะ, ดูรายงาน, จัดการคลัง, **สลับสาขาได้** |
| **Staff** | ดูตารางกะตัวเอง, ขอลา, ขอสลับกะ, ลงเวลาเข้า-ออก, บันทึกบัญชี, ขายหน้าร้าน (**เฉพาะสาขาตัวเอง**) |

---

## 2. ฟีเจอร์หลัก (Core Features)

### 2.1 จัดการพนักงาน (Employee Management)
- ✅ เพิ่ม/แก้ไข/ลบข้อมูลพนักงาน พร้อมสร้างบัญชีผู้ใช้ในครั้งเดียว
- ✅ กำหนดตำแหน่งงาน (พนักงานเติมน้ำมัน, แคชเชียร์, ผู้จัดการ)
- ✅ กำหนดทักษะพิเศษ (เติมน้ำมัน, รับเงิน, สต็อกสินค้า)
- ✅ **กำหนดสาขา (Station/Branch)** - แต่ละพนักงานสังกัดสาขาเดียว
- ✅ จัดการสถานะพนักงาน (Active/Inactive)

### 2.2 จัดการสาขา (Station/Branch Management)
- ✅ สร้าง/แก้ไข/ลบสาขา (ชื่อ, ที่อยู่, เบอร์โทร, ผู้จัดการ)
- ✅ กำหนดพนักงานให้สังกัดสาขา (`stationId` ใน `profiles`)
- ✅ กรองข้อมูลทุกหน้าตามสาขา (พนักงาน, ตารางกะ, ลงเวลา, บัญชี, รายงาน)
- ✅ Admin เห็นทุกสาขา (เลือก "ทุกสาขา" หรือสาขาเฉพาะได้)
- ✅ Manager สลับสาขาได้ (ผ่าน StationSelector ใน Header)
- ✅ Staff เห็นเฉพาะสาขาตัวเอง (ไม่สามารถเปลี่ยนสาขาได้)

### 2.3 จัดการกะการทำงาน (Shift Management)
- ✅ สร้างกะการทำงาน (เช้า, บ่าย, ดึก)
- ✅ กำหนดเวลาทำงานของแต่ละกะ
- ✅ กำหนดจำนวนพนักงันต่อกะขั้นต่ำ
- ✅ กำหนดทักษะที่ต้องการต่อกะ
- ✅ ล้างตารางงานทั้งหมด

### 2.4 ตัดกะอัตโนมัติ (Auto Scheduling)
- ✅ ตัดกะตามเงื่อนไขที่กำหนด
- ✅ ตรวจสอบความพร้อมของพนักงาน
- ✅ กระจายงานอย่างเท่าเทียมกัน
- ✅ ป้องกันการทำงานติดต่อกันเกินกำหนด

### 2.5 การลาและสลับกะ (Leave & Swap)
- ✅ ยื่นคำขอลา (ลาป่วย, ลากิจ, ลาพักร้อน)
- ✅ ขอสลับกะกับพนักงานคนอื่น
- ✅ ระบบอนุมัติจากผู้จัดการ/แอดมิน
- ✅ แจ้งเตือนการอนุมัติ/ปฏิเสธแบบ Real-time
- ✅ **Real-time Supabase Subscriptions** — อัปเดตข้อมูลทุกตารางแบบ Real-time ผ่าน Supabase Realtime (postgres_changes) ไม่ต้องรีเฟรชหน้า

### 2.6 ลงเวลาเข้า-ออก (Time Attendance)
- ✅ ลงเวลาเข้างาน (เช็คอิน)
- ✅ ลงเวลาออกงาน (เช็คเอาท์)
- ✅ บันทึกหมายเหตุ (สาย, ออกก่อน)
- ✅ ดูประวัติการลงเวลา

### 2.7 บัญชีรายวัน (Daily Accounting)
- ✅ บันทึกยอดมิเตอร์น้ำมัน 2 ตู้ (4 หัวจ่าย)
- ✅ คำนวณยอดขายน้ำมันอัตโนมัติ
- ✅ ติดตามยอดเงินสดแยกตามประเภทน้ำมัน
- ✅ บันทึกรายการอื่นๆ (2T, เงินทุน, โอน, อื่นๆ)
- ✅ คำนวณยอดขาด/เกินอัตโนมัติ
- ✅ ตั้งราคาน้ำมัน (ดึงค่าล่าสุดอัตโนมัติ)
- ✅ **Auto-fill ค่าเริ่มต้น** - ดึงค่า "สิ้นสุด" ของรายการล่าสุดมาเป็น "เริ่มต้น" อัตโนมัติ
- ✅ **ล็อกค่าเริ่มต้น** - ฟิลด์ยอดเงินเริ่มต้นและยอดลิตรเริ่มต้นถูก disabled (แก้ไขไม่ได้)
- ✅ **คำนวณ cashAmount จาก dispenserCash โดยตรง** - ป้องกันค่า difference ไม่ตรงกับฟอร์ม

### 2.8 ระบบขายหน้าร้าน (POS System)
- ✅ ขายน้ำมัน (ตามจำนวนเงินหรือลิตร)
- ✅ ขายสินค้าร้านค้า (สแกนบาร์โค้ด)
- ✅ หลายวิธีชำระเงิน (เงินสด, เครดิตการ์ด, QR Code, E-Wallet)
- ✅ คำนวณเงินทอนและตัดสต็อกอัตโนมัติ
- ✅ ใบเสร็จรับเงิน

### 2.9 คลังสินค้าและน้ำมัน (Inventory Management)
- ✅ ติดตามสต็อกน้ำมันรายวัน
- ✅ บันทึกการรับน้ำมัน (DO)
- ✅ จัดการสินค้าร้านค้า (บาร์โค้ด, สต็อก)
- ✅ จัดการซัพพลายเออร์
- ✅ แจ้งเตือนสต็อกต่ำ

### 2.10 รายงาน (Reports)
- ✅ แดชบอร์ดภาพรวม
- ✅ รายงานบัญชีรายเดือน/ปี พร้อมกราฟ
- ✅ ส่งออกรายงานเป็น CSV
- ✅ **ส่งออก Excel/PDF** — สร้างไฟล์ `.xlsx` และ `.pdf` ฝั่ง browser ด้วย `xlsx` + `jspdf` รองรับฟอนต์ไทย ทำงานได้แม้ offline
- ✅ คาดการณ์สต็อกน้ำมัน/สินค้า (Stock Prediction)
- ✅ สถิติการลงเวลา (Attendance Analytics)

### 2.11 Real-time Subscriptions
- ✅ **Supabase Realtime** สำหรับทุกตาราง (schedules, attendances, inventory, sales, payroll, alerts, audit_logs, customers, ฯลฯ)
- ✅ อัปเดตข้อมูลทันทีที่มีการเปลี่ยนแปลงจากผู้ใช้คนอื่น
- ✅ Toast แจ้งเตือนเมื่อมี notification ใหม่
- ✅ Cache invalidation + auto-reload
- ✅ Debounce 800ms ป้องกันการ fetch ซ้ำ
- ✅ Cleanup subscriptions ตอน unmount

### 2.12 การทำงานแบบ Offline-First
- ✅ ใช้งานได้แม้ไม่มีอินเทอร์เน็ต
- ✅ บันทึกข้อมูลใน IndexedDB
- ✅ ซิงค์อัตโนมัติเมื่อออนไลน์
- ✅ Service Worker จัดการ cache

### 2.12 ระบบเงินเดือน (Payroll)
- ✅ ตารางฐานข้อมูล (`payroll_periods`, `payroll_records`)
- ✅ Storage layer (`payrollStorage.ts`)
- ✅ หน้า UI สำหรับจัดการเงินเดือน (`pages/Payroll.tsx`)
- ✅ คำนวณอัตโนมัติจาก attendance + schedule
- ✅ คำนวณภาษีเงินได้แบบ progressive
- ✅ หักประกันสังคม 5%
- ✅ สลิปเงินเดือนแบบ print-ready

### 2.13 Audit Trail
- ✅ ตาราง `audit_logs`
- ✅ RLS policies
- ✅ หน้า UI สำหรับดูประวัติการเปลี่ยนแปลง
- ✅ แสดงชื่อรายการแทน UUID (`getRecordLabel`)
- ✅ แสดงชื่อผู้กระทำจาก `performed_by_name`
- ✅ `AuditContext` ดึงชื่อจาก `profile.fullName` ใส่ log อัตโนมัติ

---

## 3. โครงสร้างข้อมูล (Data Structure)

### 3.1 Entities หลัก

```typescript
// User (ผู้ใช้งานระบบ)
interface User {
  id: string;
  email: string;
  password: string;
  role: 'admin' | 'manager' | 'staff';
  profile: EmployeeProfile;
  createdAt: Date;
  updatedAt: Date;
}

// EmployeeProfile (ข้อมูลพนักงาน)
interface EmployeeProfile {
  id: string;
  userId: string;
  firstName: string;
  lastName: string;
  phone: string;
  avatar: string;
  position: Position;
  skills: Skill[];
  stationId: string;
  status: 'active' | 'inactive';
  hireDate: Date;
}

// Position (ตำแหน่งงาน)
interface Position {
  id: string;
  name: string;
  description: string;
}

// Skill (ทักษะ)
interface Skill {
  id: string;
  name: string;
  code: string;
}

// Station (สาขาปั๊มน้ำมัน)
interface Station {
  id: string;
  name: string;
  address: string;
  phone: string;
  managerId: string;
}

// Shift (กะการทำงาน)
interface Shift {
  id: string;
  name: string;
  startTime: string; // "06:00"
  endTime: string; // "14:00"
  minStaff: number;
  requiredSkills: Skill[];
  color: string;
}

// Schedule (ตารางกะ)
interface Schedule {
  id: string;
  date: Date;
  shiftId: string;
  employeeId: string;
  stationId: string;
  status: 'scheduled' | 'confirmed' | 'completed' | 'absent';
  note: string;
  createdBy: string;
  createdAt: Date;
}

// LeaveRequest (คำขอลา)
interface LeaveRequest {
  id: string;
  employeeId: string;
  type: 'sick' | 'personal' | 'vacation';
  startDate: Date;
  endDate: Date;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  approvedBy: string;
  approvedAt: Date;
  createdAt: Date;
}

// SwapRequest (คำขอสลับกะ)
interface SwapRequest {
  id: string;
  requesterId: string;
  requestedId: string;
  scheduleId: string;
  targetScheduleId: string;
  status: 'pending' | 'approved' | 'rejected';
  approvedBy: string;
  createdAt: Date;
}

// Attendance (การลงเวลา)
interface Attendance {
  id: string;
  employeeId: string;
  scheduleId: string;
  checkIn: Date;
  checkOut: Date;
  checkInLocation: string;
  checkOutLocation: string;
  note: string;
  status: 'normal' | 'late' | 'early_leave' | 'absent';
}

// DailyAccounting (บัญชีรายวัน)
interface DailyAccounting {
  id: string;
  date: string;
  shiftId: string;
  employeeId: string;
  fuelMeter: FuelMeterReading;
  fuelSales: FuelSales;
  fuelAmount: FuelAmount;
  totalFuelAmount: number;
  systemAmount: number;
  cashAmount: number;
  actualCashCounted: number;
  dispenserCash: CashAmountReading;
  items: { twoT: number; capital: number; transfer: number; others: number };
  totalAmount: number;
  difference: number;
}

// FuelInventory (สต็อกน้ำมัน)
interface FuelInventory {
  id: string;
  date: string;
  fuelType: '95' | 'B7' | 'B10' | 'Diesel';
  tankNumber: number;
  openingStock: number;
  receivedQty: number;
  soldQty: number;
  adjustmentQty: number;
  closingStock: number;
  actualStock?: number;
  variance: number;
}

// Product (สินค้าร้านค้า)
interface Product {
  id: string;
  barcode?: string;
  sku?: string;
  name: string;
  category: 'beverage' | 'snack' | 'automotive' | 'misc';
  unit: string;
  costPrice: number;
  sellingPrice: number;
  currentStock: number;
  minStock: number;
}

// Supplier (ซัพพลายเออร์)
interface Supplier {
  id: string;
  name: string;
  contactPerson?: string;
  phone?: string;
  email?: string;
  address?: string;
  taxId?: string;
  paymentTerms: number;
  isActive: boolean;
}

// POSSale (การขาย POS)
interface POSSale {
  id: string;
  saleNumber: string;
  date: string;
  items: SaleItem[];
  total: number;
  paymentMethod: 'cash' | 'credit_card' | 'qr_code' | 'e_wallet';
  status: 'pending' | 'completed' | 'cancelled' | 'refunded';
}
```

---

## 4. การออกแบบหน้าจอ (Screen Design)

### 4.1 หน้าจอหลัก

| หน้าจอ | รายละเอียด | สิทธิ์ |
|-------|-----------|--------|
| **Login** | หน้าเข้าสู่ระบบ | ทุกคน |
| **Dashboard** | ภาพรวมระบบ, สถิติ, การแจ้งเตือน | ทุกคน |
| **Schedule** | ดูและจัดการตารางกะ | Admin, Manager |
| **Employee List** | รายชื่อพนักงาน | Admin, Manager |
| **Leave Requests** | จัดการคำขอลา | ทุกคน |
| **Swap Requests** | จัดการคำขอสลับกะ | ทุกคน |
| **Attendance** | ลงเวลาเข้า-ออก | ทุกคน |
| **Daily Accounting** | บันทึกบัญชีรายวัน | ทุกคน |
| **Reports** | รายงานต่างๆ | Admin, Manager |
| **Settings** | ตั้งค่าระบบ | Admin, Manager |
| **Inventory** | จัดการคลังน้ำมัน | Admin, Manager |
| **Products** | จัดการสินค้า | Admin, Manager |
| **Suppliers** | จัดการซัพพลายเออร์ | Admin, Manager |
| **POS** | ระบบขายหน้าร้าน | ทุกคน |
| **Payroll** | จัดการเงินเดือน | Admin, Manager |
| **Audit Logs** | ประวัติการเปลี่ยนแปลง | Admin, Manager |
| **Stations** | จัดการสาขา | Admin |

### 4.2 Wireframe หลัก

```
┌─────────────────────────────────────────────────────────────┐
│  Sidebar Navigation    │  Main Content Area                 │
│                        │                                    │
│  [Logo]                │  ┌─────────────────────────────┐   │
│                        │  │  Header (Title + Actions)   │   │
│  📊 Dashboard          │  └─────────────────────────────┘   │
│  📅 ตารางกะ           │                                    │
│  👥 พนักงาน            │  ┌─────────────────────────────┐   │
│  📝 คำขอลา            │  │                             │   │
│  🔄 สลับกะ             │  │    Content Area             │   │
│  ⏰ ลงเวลา             │  │    (Table/Form/Calendar)    │   │
│  💰 บัญชีรายวัน        │  │                             │   │
│  📈 รายงาน            │  └─────────────────────────────┘   │
│  🛒 POS               │                                    │
│  📦 คลังสินค้า        │                                    │
│  💰 เงินเดือน          │                                    │
│  📋 Audit Logs         │                                    │
│  ⚙️ ตั้งค่า            │                                    │
│                        │                                    │
└────────────────────────┴────────────────────────────────────┘
```

---

## 5. เทคโนโลยีที่ใช้ (Tech Stack)

| ส่วน | เทคโนโลยี |
|-----|----------|
| **Frontend Framework** | React 19.2.0 + TypeScript 5.9.3 |
| **Build Tool** | Vite 7.2.4 |
| **Styling** | Tailwind CSS 3.4.19 + shadcn/ui |
| **State Management** | React Context + useReducer |
| **Analytics** | Custom analytics engine (`src/lib/analytics.ts`) |
| **Database** | Supabase PostgreSQL (Production) |
| **Offline Storage** | IndexedDB (idb library) |
| **Authentication** | Supabase Auth |
| **Icons** | Lucide React |
| **Charts** | Recharts |
| **Date Handling** | date-fns (Thai locale) |
| **Routing** | React Router DOM 7.13.2 |
| **Forms** | React Hook Form + Zod |
| **Security** | bcryptjs, DOMPurify |
| **Service Worker** | Custom SW with cache versioning |

---

## 6. ขั้นตอนการพัฒนา (Development Phases)

### Phase 1: โครงสร้างพื้นฐาน (Foundation)
- [x] ตั้งค่าโปรเจค React + TypeScript + Vite
- [x] ติดตั้ง Tailwind CSS และ shadcn/ui
- [x] สร้างโครงสร้างโฟลเดอร์
- [x] สร้าง Type Definitions
- [x] สร้าง Mock Data

### Phase 2: ระบบ Authentication
- [x] หน้า Login
- [x] ระบบจัดการ Session (Supabase Auth)
- [x] การควบคุมสิทธิ์ตาม Role

### Phase 3: จัดการพนักงาน
- [x] หน้ารายชื่อพนักงาน
- [x] หน้าเพิ่ม/แก้ไขพนักงาน
- [x] ระบบสร้างบัญชีผู้ใช้พร้อมกัน

### Phase 4: ตารางกะ
- [x] หน้าปฏิทินแสดงกะ
- [x] ระบบสร้างกะ
- [x] ระบบตัดกะอัตโนมัติ
- [x] ระบบแก้ไขกะด้วยตนเอง

### Phase 5: ลาและสลับกะ
- [x] ระบบขอลา
- [x] ระบบสลับกะ
- [x] ระบบอนุมัติ
- [x] ระบบแจ้งเตือนอัตโนมัติ

### Phase 6: ลงเวลา
- [x] หน้าลงเวลาเข้า-ออก
- [x] ประวัติการลงเวลา

### Phase 7: บัญชีรายวัน
- [x] บันทึกมิเตอร์น้ำมัน
- [x] คำนวณยอดขายอัตโนมัติ
- [x] ติดตามยอดเงินสด
- [x] คำนวณยอดขาด/เกิน

### Phase 8: รายงาน
- [x] แดชบอร์ด
- [x] รายงานบัญชีรายเดือน/ปี
- [x] ส่งออก CSV
- [x] ส่งออก Excel/PDF (client-side with Thai font support)

### Phase 9: คลังสินค้าและน้ำมัน
- [x] หน้าจัดการคลังน้ำมัน
- [x] หน้าจัดการสินค้า
- [x] หน้าจัดการซัพพลายเออร์

### Phase 10: POS System
- [x] หน้าขายหน้าร้าน (POS)
- [x] ตะกร้าสินค้าและการชำระเงิน
- [x] ใบเสร็จรับเงิน

### Phase 11: Real-time Subscriptions
- [x] Supabase Realtime setup (`src/lib/realtime.ts`)
- [x] Subscribe ทุกตารางผ่าน 11 Contexts
- [x] Debounce + cache invalidation
- [x] Toast notifications

### Phase 12: Offline-First & Sync
- [x] IndexedDB storage
- [x] Service Worker
- [x] Background sync

### Phase 12: ระบบแจ้งเตือนและ Backup
- [x] Notification system
- [x] Backup & Restore database

### Phase 13: Real-time Subscriptions
- [x] Supabase Realtime subscriptions สำหรับทุกตาราง
- [x] Auto-update contexts เมื่อมีข้อมูลใหม่
- [x] Toast แจ้งเตือน realtime

### Phase 14: Payroll & Audit Trail
- [x] Payroll tables schema
- [x] Payroll storage layer
- [x] Audit logs table
- [x] Audit logs viewer (with human-readable labels & performer names)
- [ ] Payroll UI page

### Phase 15: Dashboard Analytics
- [x] Fuel stock prediction
- [x] Product stock prediction
- [x] Daily sales trend
- [x] Attendance rate analytics
- [x] Top employees ranking

---

## 7. โครงสร้างโฟลเดอร์ (Folder Structure)

```
src/
├── components/
│   ├── common/          # Shared components (StatCard, ProtectedRoute, PageLoader)
│   ├── layout/          # Layout components (Header, Sidebar, Layout)
│   └── ui/              # shadcn/ui components (50+ components)
├── contexts/            # React Context providers
│   ├── AuthContext.tsx       # Authentication state
│   ├── EmployeeContext.tsx   # Employee management
│   ├── ScheduleContext.tsx   # Scheduling, leave & swap
│   ├── AttendanceContext.tsx # Attendance tracking
│   ├── DailyAccountingContext.tsx # Fuel sales accounting
│   ├── NotificationContext.tsx # Real-time notifications
│   └── InventoryContext.tsx  # Inventory management
├── data/
│   ├── storage.ts       # Supabase CRUD operations (core)
│   ├── inventoryStorage.ts # Inventory CRUD
│   ├── posStorage.ts       # POS CRUD operations
│   └── offlineStorage.ts   # IndexedDB operations
├── hooks/
│   └── useOfflineData.ts   # Offline-first data hook
├── lib/
│   ├── security.ts      # Security utilities (bcrypt, DOMPurify)
│   ├── supabase.ts      # Supabase client
│   ├── utils.ts         # Utility functions
│   ├── offlineStorage.ts # IndexedDB wrapper
│   ├── syncEngine.ts     # Sync engine for offline/online
│   └── serviceWorker.ts  # Service worker registration
├── pages/               # Route page components (Lazy loaded)
│   ├── Dashboard.tsx
│   ├── Employees.tsx
│   ├── Schedule.tsx
│   ├── Leave.tsx
│   ├── Swap.tsx
│   ├── Attendance.tsx
│   ├── DailyAccounting.tsx
│   ├── Reports.tsx
│   ├── Settings.tsx
│   ├── Login.tsx
│   ├── Inventory.tsx    # Fuel stock & delivery
│   ├── Products.tsx     # Shop product management
│   ├── Suppliers.tsx    # Supplier management
│   └── POS.tsx          # Point of Sale
├── types/
│   ├── index.ts         # Core TypeScript types
│   └── inventory.ts     # Inventory types
├── utils/
│   ├── dateUtils.ts     # Date formatting (Thai)
│   └── scheduleUtils.ts # Schedule validation
├── App.tsx
├── main.tsx
└── index.css
```

---

## 8. ตารางเวลาการทำงาน (Work Schedule Template)

### 8.1 กะการทำงานมาตรฐานปั๊มน้ำมัน

| กะ | เวลา | จำนวนพนักงันขั้นต่ำ | ทักษะที่ต้องการ |
|---|------|------------------|---------------|
| **กะเช้า** | 06:00 - 14:00 | 3 คน | เติมน้ำมัน x2, แคชเชียร์ x1 |
| **กะบ่าย** | 14:00 - 22:00 | 3 คน | เติมน้ำมัน x2, แคชเชียร์ x1 |
| **กะดึก** | 22:00 - 06:00 | 2 คน | เติมน้ำมัน x1, แคชเชียร์ x1 |

### 8.2 ตัวอย่างตารางกะ 1 สัปดาห์

| พนักงาน | จันทร์ | อังคาร | พุธ | พฤหัส | ศุกร์ | เสาร์ | อาทิตย์ |
|---------|-------|--------|-----|-------|-------|-------|---------|
| สมชาย | เช้า | เช้า | บ่าย | บ่าย | ดึก | หยุด | หยุด |
| สมหญิง | บ่าย | บ่าย | เช้า | เช้า | เช้า | ดึก | หยุด |
| มานี | ดึก | ดึก | ดึก | หยุด | หยุด | เช้า | เช้า |

---

## 9. กฎการตัดกะ (Scheduling Rules)

### 9.1 กฎทั่วไป
1. พนักงาน 1 คนทำงานไม่เกิน 6 วันต่อสัปดาห์
2. หลังจากทำกะดึก ต้องหยุดอย่างน้อย 1 วันก่อนทำกะเช้า
3. กระจายกะให้เท่าเทียมกัน (ไม่มีใครทำกะดึกบ่อยกว่าคนอื่น)
4. ตรวจสอบว่ามีพนักงานครบตามจำนวนขั้นต่ำในแต่ละกะ
5. ตรวจสอบทักษะที่ต้องการในแต่ละกะ

### 9.2 ความสามารถพนักงาน
- พนักงานเติมน้ำมัน: มีทักษะเติมน้ำมัน
- แคชเชียร์: มีทักษะรับเงิน
- พนักงานอเนกประสงค์: มีทักษะครบทุกอย่าง

---

## 10. การแจ้งเตือน (Notifications)

| เหตุการณ์ | การแจ้งเตือน |
|----------|------------|
| ตารางกะออกแล้ว | แจ้งเตือนทุกคน |
| มีคนขอสลับกะ | แจ้งเตือนผู้ถูกขอ + ผู้จัดการ |
| คำขอสลับกะได้รับอนุมัติ | แจ้งเตือนทั้งสองฝ่าย |
| มีคนขอลา | แจ้งเตือนผู้จัดการ |
| คำขอลาอนุมัติ | แจ้งเตือนผู้ขอ |
| ใกล้ถึงเวลาเข้ากะ | แจ้งเตือนล่วงหน้า 1 ชั่วโมง |

---

## 11. สรุป

แอพพลิเคชันตัดกะการทำงานพนักงานปั๊มน้ำมันนี้ ออกแบบมาเพื่อช่วยให้การจัดการตารางงานเป็นระบบ ยุติธรรม และมีประสิทธิภาพ รองรับการทำงานหลายกะ มีระบบอนุมัติที่ชัดเจน สามารถตรวจสอบประวัติการทำงานได้ พร้อมระบบขายหน้าร้าน (POS) และจัดการคลังสินค้าแบบครบวงจร

**ขั้นตอนต่อไป:** 
1. ระบบสมาชิก/คะแนนสะสม (Membership/Loyalty)
2. ✅ รายงาน PDF/Excel Export (เสร็จแล้ว — ทำฝั่ง client ด้วย `xlsx` + `jspdf`)
3. Dark Mode
4. ~~Real-time Subscriptions (Supabase Realtime)~~ ✅ เสร็จสมบูรณ์แล้ว (มิถุนายน 2568)
