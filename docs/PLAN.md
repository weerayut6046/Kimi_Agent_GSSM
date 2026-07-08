# แผนพัฒนาและติดตามงาน — Gas Station Shift Manager

> เอกสารนี้ใช้ติดตามสถานะการพัฒนาระบบและวางแผนงานในอนาคต
> อัปเดตล่าสุด: กรกฎาคม 2568

---

## ✅ สถานะปัจจุบัน (พัฒนาเสร็จสมบูรณ์แล้ว)

### ระบบหลัก (Core Systems)
- [x] ระบบจัดการพนักงาน + บัญชีผู้ใช้ (1-to-1 Profile-User)
- [x] ตารางกะ + ระบบตัดกะอัตโนมัติ + ล้างตารางกะ
- [x] คำขอลา + อนุมัติการลา
- [x] คำขอสลับกะ + อนุมัติการสลับกะ
- [x] ลงเวลา (check-in/check-out) + สถานะ ปกติ/สาย/ออกก่อน
- [x] บัญชีรายวัน (มิเตอร์น้ำมัน 2 ตู้ ยอดเงินแยกตามประเภทน้ำมัน)
- [x] Dashboard + Reports พื้นฐาน + รายงานบัญชีรายเดือน/ปี
- [x] Settings (จัดการกะ ตำแหน่ง ทักษะ)
- [x] Authentication + Security (bcrypt, rate limit, DOMPurify)
- [x] Database: Supabase PostgreSQL พร้อม schema ครบถ้วน

### ระบบเสริม (V2 Features)
- [x] **ระบบคลังสินค้าและน้ำมัน** — สต็อกน้ำมัน, สินค้า, ซัพพลายเออร์, แจ้งเตือนสต็อกต่ำ
- [x] **POS System** — ขายหน้าร้าน (น้ำมัน, สินค้า), หลายวิธีชำระเงิน, ตัดสต็อกอัตโนมัติ
- [x] **Offline-First Architecture** — ทำงานได้แม้ไม่มีเน็ต, IndexedDB, Service Worker, Auto-sync
- [x] **ระบบสำรองและกู้คืนข้อมูล** — เลือกตารางได้ รองรับ 22 ตาราง พร้อมระบบสำรองฐานข้อมูลระดับ DB ผ่าน Supabase Edge Function
- [x] **ระบบแจ้งเตือนจริง** — Supabase-backed, auto-trigger, badge, dropdown
- [x] **Mobile-First Responsive** — Hamburger sidebar, touch-friendly, card layouts
- [x] **Supabase Auth Integration** — ย้ายจาก localStorage มาใช้ Supabase Auth
- [x] **ราคาน้ำมันอัตโนมัติ** — ดึงค่าล่าสุดจาก database มาแสดงในฟอร์ม

### ปรับปรุงคุณภาพโค้ด
- [x] Code Splitting + Performance (React.lazy, manualChunks)
- [x] Context Memoization (useMemo + useCallback ทุก provider)
- [x] Accessibility (a11y) — lang="th", ARIA labels, keyboard nav
- [x] Build & Lint ผ่านสะอาด (0 errors, 0 warnings)
- [x] Debug Console.log Cleanup
- [x] Import Path Consistency (@/ alias)
- [x] **Request Caching Layer** (`src/lib/cache.ts`) - localStorage cache สำหรับลด Supabase calls
- [x] **Staggered Context Loading** - โหลด context ทีละตัวแทน Promise.all พร้อมกัน
- [x] **Query Timeouts** - Timeout 1.5-2s บนทุก storage query ป้องกันการค้าง
- [x] **Database Index Optimization** - `idx_users_authuid`, `idx_users_email` และอื่นๆ

### กรกฎาคม 2568
- [x] **ระบบสำรองฐานข้อมูลระดับ DB** — Supabase Edge Function `backup-database`
  - สำรอง 22 ตารางหลักเป็น SQL INSERT statements บันทึกลง Supabase Storage bucket `backups`
  - รองรับการเรียกจากหน้า Settings และ cron-job.org อัตโนมัติ
  - สร้าง Storage bucket อัตโนมัติถ้ายังไม่มี
  - ส่งการแจ้งเตือน success ให้ Admin/Manager ทุกคนหลังสำรองสำเร็จ
- [x] **GitHub Actions Native Backup** — Workflow `database-backup.yml` สำหรับ `pg_dump` (paused เนื่องจาก GitHub billing lock)

---

## 📋 แผนงานอนาคต (Future Roadmap)

### Phase A: ระบบบุคคลและเงินเดือน (HR & Payroll) — ความสำคัญสูง

#### A.1 ระบบคำนวณเงินเดือน/ค่าแรง
**Priority:** P1 | **ความยาก:** ปานกลาง | **สถานะ:** 🟡 Backend เสร็จแล้ว รอ UI

- [x] สร้างตาราง `payroll_periods` และ `payroll_records` (`phase2-payroll.sql`)
- [x] สร้าง `payrollStorage.ts` พร้อม mapping helpers
- [x] รองรับ error กรณีตารางยังไม่มี (PGRST205)
- [ ] เพิ่มฟิลด์ `hourlyRate` หรือ `shiftRate` ใน `profiles` / `positions`
- [ ] อัปเดต `types/index.ts`
- [x] สร้างหน้า `Payroll.tsx` + route `/payroll` (admin/manager only)
- [x] เลือกช่วงเดือน → ดึง attendance + schedule
- [x] คำนวณ:
  - [x] ค่าแรงพื้นฐาน = จำนวนกะ × อัตราต่อกะ
  - [x] OT (คำนวณจากเวลา checkout หลังกะ)
  - [x] หักภาษีเงินได้ (progressive tax)
  - [x] หักประกันสังคม 5%
  - [x] ยอดสุทธิ
- [ ] Export สลิปเงินเดือนเป็น PDF

**ไฟล์ที่เกี่ยวข้อง:** `types/index.ts`, `payrollStorage.ts`, `EmployeeContext.tsx`, `pages/Payroll.tsx`, `App.tsx`, `Sidebar.tsx`

#### A.2 ระบบอัปโหลดเอกสารพนักงาน
**Priority:** P2 | **ความยาก:** ปานกลาง

- [ ] ตั้งค่า Supabase Storage bucket (`employee-documents`)
- [ ] สร้าง `src/lib/supabaseStorage.ts` helper
- [ ] อัปโหลดรูปโปรไฟล์ (avatar upload)
- [ ] อัปโหลดสำเนาบัตรประชาชน
- [ ] อัปโหลดใบขับขี่
- [ ] อัปโหลดใบรับรองแพทย์ (แนบตอนขอลาป่วย)

**ไฟล์ที่เกี่ยวข้อง:** `src/lib/supabaseStorage.ts`, `Employees.tsx`, `Profile.tsx`, `Leave.tsx`

---

### Phase B: รายงานและการวิเคราะห์ (Reports & Analytics)

#### B.1 Export Reports (PDF & Excel)
**Priority:** P1 | **ความยาก:** ปานกลาง | **สถานะ:** ✅ เสร็จสมบูรณ์ (มิถุนายน 2568)

- [x] ติดตั้ง library `xlsx` + `jspdf` + `jspdf-autotable` ฝั่ง client
- [x] `src/lib/exportUtils.ts` — สร้าง Excel/PDF ฝั่ง browser โดยตรง
- [x] รายงานบัญชีรายวัน → Export Excel
- [x] รายงาน attendance → Export Excel
- [x] รายงานตารางกะรายเดือน → Export Excel
- [x] ใบเสร็จ POS → Export PDF (พร้อมฟอนต์ไทย)
- [x] โหลดฟอนต์ไทย `THSarabunNew.ttf` จาก `/fonts/` มาใช้ใน PDF

**หมายเหตุ:** เปลี่ยนแผนจาก Edge Functions มาทำฝั่ง client เพื่อรองรับ Offline-First และหลีกเลี่ยงปัญหา CORS

**ไฟล์ที่เกี่ยวข้อง:** `src/lib/exportUtils.ts`, `src/domains/accounting/api.ts`, `Reports.tsx`, `DailyAccounting.tsx`, `Schedule.tsx`, `Attendance.tsx`, `POS.tsx`

#### B.2 Advanced Dashboard & Analytics
**Priority:** P2 | **ความยาก:** ปานกลาง | **สถานะ:** 🟡 Backend เสร็จแล้ว รอ UI Integration

- [x] คาดการณ์สต็อกน้ำมัน (`predictFuelStock`) - ใช้ daily_accounting
- [x] คาดการณ์สต็อกสินค้า (`predictProductStock`) - ใช้ `sales.items` JSONB
- [x] กราฟยอดขายรายวัน (`getDailySalesTrend`)
- [x] เปรียบเทียบประเภทน้ำมัน (`getFuelTypeComparison`)
- [x] สถิติการลงเวลารายเดือน (`getAttendanceRate`)
- [x] Top employees (มาตรงเวลามากที่สุด) (`getTopEmployees`)
- [x] Dashboard Analytics สรุป (`getDashboardAnalytics`)
- [ ] แสดงกราฟใน UI (Recharts integration)
- [ ] Filter Dashboard ตามช่วงวันที่

**ไฟล์ที่เกี่ยวข้อง:** `src/lib/analytics.ts`, `Dashboard.tsx`, `Reports.tsx`

---

### Phase C: ประสบการณ์ผู้ใช้ (User Experience)

#### C.1 Dark Mode / Theme Switching
**Priority:** P2 | **ความยาก:** ง่าย

- [ ] สร้าง `ThemeProvider.tsx` (radix-based หรือ custom)
- [ ] บันทึก preference ใน `localStorage`
- [ ] ตรวจสอบ `prefers-color-scheme` เป็นค่าเริ่มต้น
- [ ] เพิ่ม Toggle ใน `Header.tsx` หรือ `Settings.tsx`
- [ ] ปรับ custom colors (logo, gradients) ให้รองรับ dark mode
- [ ] ตรวจสอบ contrast ratio ผ่าน Lighthouse

**ไฟล์ที่เกี่ยวข้อง:** `src/components/theme/ThemeProvider.tsx`, `index.css`, `Header.tsx`, `Settings.tsx`, `App.tsx`

#### C.2 PWA Enhancement
**Priority:** P2 | **ความยาก:** ปานกลาง

- [ ] ปรับปรุง `manifest.json` (icons, theme, display: standalone)
- [ ] เพิ่ม icon sizes (192x192, 512x512)
- [ ] หน้า offline fallback สวยงาม
- [ ] Push Notification สำหรับแจ้งเตือนสำคัญ
- [ ] Add to Home Screen prompt

**ไฟล์ที่เกี่ยวข้อง:** `manifest.json`, `vite.config.ts`, `index.html`, `service-worker.js`

---

### Phase D: Real-time และการเชื่อมต่อ (Real-time & Integration)

#### D.1 Real-time Updates (Supabase Realtime)
**Priority:** P2 | **ความยาก:** ปานกลาง | **สถานะ:** ✅ เสร็จสมบูรณ์ (มิถุนายน 2568)

- [x] ศึกษา Supabase Realtime subscriptions
- [x] Subscribe ตาราง `schedules` → อัปเดต context เมื่อมีการเปลี่ยนแปลง
- [x] Subscribe ตาราง `leave_requests` / `swap_requests`
- [x] Subscribe ตาราง `attendances`
- [x] Subscribe ตารางทั้งหมดในระบบ (รวม 20+ ตาราง ผ่าน 11 Contexts)
- [x] แสดง toast/snackbar เมื่อมีข้อมูลใหม่เข้ามา
- [x] Cleanup subscriptions ตอน unmount
- [x] Debounce 800ms ป้องกันการ fetch ซ้ำ
- [x] Cache invalidation + auto-reload เมื่อมีข้อมูลใหม่
- [x] Channel name unique (ป้องกันซ้ำระหว่าง Contexts)

**ไฟล์ที่เกี่ยวข้อง:**
- ใหม่: `src/lib/realtime.ts`, `src/hooks/useRealtime.ts`
- แก้ไข: ทุก `src/contexts/*Context.tsx` (11 Contexts)

#### D.2 API Integration
**Priority:** P3 | **ความยาก:** ปานกลาง-ยาก

- [ ] เชื่อมต่อธนาคาร (ตรวจสอบสลิป)
- [ ] LINE Official Account (แจ้งเตือน)
- [ ] กรมธุรกิจพลังงาน (ดึงราคาน้ำมันอ้างอิง)

---

### Phase E: การขยายระบบ (Scale & Multi-Branch) ✅ เสร็จสิ้น

#### E.1 ระบบจัดการหลายสาขา (Multi-Station)
**Priority:** P3 | **ความยาก:** ยาก | **สถานะ:** ✅ เสร็จสมบูรณ์ (มิถุนายน 2026)

- [x] หน้า `/stations` → จัดการสาขา (เพิ่ม/แก้ไข/ลบ) - Admin only
- [x] Manager ผูกกับ `stationId` (ผ่าน `managerId` ในตาราง `stations`)
- [x] Staff เห็นข้อมูลเฉพาะสาขาตัวเอง (กรองผ่าน `EmployeeContext.filteredEmployees`)
- [x] Admin สลับสาขาได้ + เห็นทุกสาขา (ผ่าน `StationSelector` ใน Header)
- [x] กรองข้อมูลทุก context ตาม `stationId`:
  - `EmployeeContext` - `filteredEmployees` กรองตาม `currentStation`
  - `ScheduleContext` - กรอง schedules/leave/swap ตาม `stationId`
  - `AttendanceContext` - กรอง attendance ตาม employee station
  - `DailyAccountingContext` - กรอง accounting ตาม employee station
  - `Reports` - แสดงรายงานตามสาขาที่เลือก
- [x] `AuthContext` auto-set `currentStation` จาก profile ตอน login
- [x] `EmployeeContext` export ทั้ง `employees` (ทั้งหมด) และ `filteredEmployees` (กรองแล้ว)
- [x] รายงานแยกตามสาขา (subtitle แสดงชื่อสาขา)
- [x] Employees page มี dropdown เลือกสาขาใน form + คอลัมน์สาขาในตาราง

**ไฟล์ที่เกี่ยวข้อง:** `StationContext.tsx`, `Stations.tsx`, `AuthContext.tsx`, `EmployeeContext.tsx`, `ScheduleContext.tsx`, `AttendanceContext.tsx`, `DailyAccountingContext.tsx`, `Reports.tsx`, `Employees.tsx`, `Header.tsx`, `Settings.tsx`, `types/index.ts`

---

### Phase F: ระบบสมาชิกและโปรโมชั่น (Loyalty & Membership)

#### F.1 ระบบสมาชิกและคะแนนสะสม
**Priority:** P1 | **ความยาก:** ปานกลาง

- [ ] สร้างตาราง `members`, `loyalty_transactions`, `promotions`
- [ ] ลงทะเบียนสมาชิก (เบอร์โทรเป็น Member ID)
- [ ] คะแนนสะสม (1 บาท = 1 คะแนน)
- [ ] แลกคะแนนเป็นส่วนลด/ของรางวัล
- [ ] โปรโมชั่น (เติมน้ำมันครบ X บาท ลด Y บาท)
- [ ] Happy Hour (ลดราคาช่วงเวลาที่กำหนด)

**ไฟล์ที่เกี่ยวข้อง:** `types/index.ts`, `storage.ts`, `POS.tsx`, `pages/Members.tsx`, `pages/Promotions.tsx`

---

### Phase G: ระบบบัญชีครบวงจร (Full Accounting)

#### G.1 บัญชีรายรับ-รายจ่าย
**Priority:** P1 | **ความยาก:** ยาก

- [ ] สร้าง `chart_of_accounts` และ `general_ledger`
- [ ] บันทึกค่าใช้จ่ายประจำวัน (น้ำไฟ, ค่าแรง, ค่าซ่อมบำรุง)
- [ ] แยกประเภทรายรับ-รายจ่ายตามบัญชี
- [ ] งบกำไรขาดทุน (P&L) รายวัน/เดือน/ปี
- [ ] งบดุล (Balance Sheet)
- [ ] รายงานกระแสเงินสด (Cash Flow)

**ไฟล์ที่เกี่ยวข้อง:** `types/index.ts`, `storage.ts`, `pages/ChartOfAccounts.tsx`, `pages/GeneralLedger.tsx`, `pages/Expenses.tsx`, `pages/FinancialReports.tsx`

#### G.2 ภาษีมูลค่าเพิ่ม (VAT)
**Priority:** P2 | **ความยาก:** ปานกลาง

- [ ] คำนวณ VAT ขาย (Output VAT)
- [ ] บันทึก VAT ซื้อ (Input VAT)
- [ ] รายงานภาษีซื้อ-ขาย (ภ.พ.30)

---

## 🏗️ Phase H: ปรับปรุงสถาปัตยกรรม (Architecture Refactor)

> แนวทาง: **Modular Monolith + Supabase Edge Functions**
> ไม่แยก microservices เต็มรูปแบบ (over-engineering สำหรับระบบภายในปั้มน้ำมัน) แต่ย้าย logic ที่เหมาะสมไป Edge Functions และแยกโค้ดเป็น domain modules

### สถาปัตยกรรมปัจจุบัน
```
Frontend (React SPA)
  ↓ เรียกตรง
Supabase (Auth + DB + Storage)
```
- Frontend โหลด libraries หนัก (`xlsx` 429KB, `jspdf` 386KB, `html2canvas` 201KB, `recharts` 442KB)
- ไม่มี custom backend layer
- Contexts ทั้งหมดถูก bundle รวมกันใน main entry (356KB)
- Business logic บางส่วนอยู่บน client (คำนวณเงินเดือน, สร้าง PDF/Excel)

### เป้าหมาย
1. **ลด Bundle Size:** ย้าย libraries หนักไป Edge Functions
2. **Security:** ซ่อน sensitive business logic จาก client
3. **Maintainability:** แยกโค้ดเป็น domain modules ชัดเจน
4. **Scalability:** รองรับ multi-station ในอนาคต

### สถาปัตยกรรมเป้าหมาย
```
Frontend (React SPA)
  ↓ เรียก
Edge Functions / BFF (Supabase Deno Edge)
  ↓ เรียก
Supabase (Auth + DB + Storage)
```

---

#### H.1 Supabase Edge Functions — Export & Report Generation
**Priority:** P1 | **ความยาก:** ปานกลาง | **Impact:** สูงมาก (ลด bundle ~1MB) | **สถานะ:** ⛔ ยกเลิกแผน — กลับมาทำฝั่ง Client

**ปัญหาเดิม:**
- `exportUtils.ts` ใช้ `xlsx` + `jspdf` ทำให้ bundle ใหญ่
- PDF/Excel generation ทำบน client → โหลดช้าบนมือถือ

**สาเหตุที่ยกเลิก Edge Functions สำหรับ Export:**
- ❌ **CORS Error** — Supabase Edge Functions ไม่สามารถตอบ preflight (OPTIONS) ได้ในบางสภาพแวดล้อม ทำให้เรียกจาก localhost/production ไม่ผ่าน
- ❌ **ไม่รองรับ Offline-First** — ถ้าไม่มีเน็ตจะสร้างไฟล์ไม่ได้เลย ขัดกับ architecture หลักของระบบ
- ❌ **Cold Start + Latency** — ผู้ใช้ต้องรอ 100-300ms ขั้นต่ำ บนมือถืออาจช้ากว่านั้น

**แนวทางปัจจุบัน (Client-side Generation):**
- ✅ ติดตั้ง `xlsx` + `jspdf` + `jspdf-autotable` ฝั่ง client
- ✅ `src/lib/exportUtils.ts` สร้าง Excel/PDF โดยตรงบน browser
- ✅ โหลดฟอนต์ไทย `THSarabunNew.ttf` จาก `/fonts/` ผ่าน `fetch()` → base64 → ฝังใน PDF
- ✅ ทำงานได้แม้ไม่มีอินเทอร์เน็ต (สำคัญสำหรับ POS receipt)
- ✅ ไม่มีปัญหา CORS

**ข้อเสียที่ยอมรับได้:**
- Bundle size เพิ่ม ~700KB (ไม่ gzip) สำหรับ chunk `exportUtils` แต่ถูก lazy load เมื่อใช้งานเท่านั้น
- โทรศัพท์รุ่นเก่าอาจใช้เวลาสร้าง PDF นาน 1-2 วินาที

**ไฟล์ที่เกี่ยวข้อง:**
- ใช้งาน: `src/lib/exportUtils.ts`, `src/domains/accounting/api.ts`
- Edge Functions ที่สร้างไว้แต่ไม่ใช้แล้ว: `supabase/functions/export-excel/`, `supabase/functions/export-pdf/`, `supabase/functions/generate-receipt/` (เก็บไว้เป็น reference)

---

#### H.2 Backend-for-Frontend (BFF) API Layer
**Priority:** P2 | **ความยาก:** ปานกลาง | **Impact:** ปานกลาง

**ปัญหา:**
- Frontend เรียก Supabase ตรง → `anon key` ติดอยู่บน client
- บาง API ต้องรวมหลายตาราง (aggregation) → waterfall requests บน client
- ไม่มี caching layer

**แนวทางแก้ไข:**
- [ ] สร้าง Edge Functions เป็น BFF สำหรับ API ที่ซับซ้อน:
  - `api/payroll-calculate` — รับ period + employeeIds → คำนวณเงินเดือนฝั่ง server → ส่งกลับผลลัพธ์
  - `api/dashboard-summary` — รวมข้อมูลจากหลายตาราง → ส่งกลับ JSON สำหรับแสดง dashboard
  - `api/accounting-validate` — ตรวจสอบความถูกต้องของบัญชีรายวัน (cross-check meter readings)
  - `api/report-aggregate` — สร้างรายงานสรุปรายเดือน/ปี
- [ ] สร้าง `src/lib/api.ts` (Frontend client) เป็น abstraction layer เรียก Edge Functions
- [ ] เก็บ `anon key` ไว้เฉพาะ Edge Functions (ผ่าน Environment Variables)
- [ ] Frontend เรียก Edge Functions ด้วย JWT token จาก Supabase Auth

**ไฟล์ที่เกี่ยวข้อง:**
- ใหม่: `supabase/functions/api-payroll-calculate/index.ts`, `supabase/functions/api-dashboard-summary/index.ts`, `supabase/functions/api-accounting-validate/index.ts`, `src/lib/api.ts`
- แก้ไข: `src/contexts/PayrollContext.tsx`, `src/pages/Dashboard.tsx`, `src/pages/DailyAccounting.tsx`, `src/pages/Reports.tsx`

**ข้อควรระวัง:**
- BFF เพิ่ม latency 1 hop (แต่ลด waterfall ได้)
- ต้องจัดการ CORS ถ้าเรียกจาก client โดยตรง
- ต้อง validate JWT ในแต่ละ Edge Function

---

#### H.3 Frontend Modularization (Domain-Based)
**Priority:** P2 | **ความยาก:** ปานกลาง | **Impact:** ระยะยาว

**ปัญหา:**
- `src/contexts/` มี 15+ files ทั้งหมดถูก import ใน `App.tsx`
- `src/data/` มี storage files หลายไฟล์ แต่ไม่มี boundary ชัดเจนระหว่าง domain
- `src/pages/` ผสมกับ `src/components/` โดยไม่มีกฎการ import ที่ชัดเจน

**แนวทางแก้ไข:**
- [ ] สร้างโครงสร้าง `src/domains/` แยกตาม business domain:
  ```
  src/domains/
  ├── accounting/
  │   ├── api.ts          # API calls (Edge Functions หรือ Supabase)
  │   ├── hooks.ts        # React hooks เฉพาะ domain
  │   ├── types.ts        # TypeScript types เฉพาะ domain
  │   ├── context.tsx     # React Context (แทนที่ DailyAccountingContext)
  │   ├── storage.ts      # Supabase CRUD operations
  │   └── components/     # Components เฉพาะ domain
  ├── payroll/
  ├── inventory/
  ├── pos/
  ├── schedule/
  ├── attendance/
  └── employees/
  ```
- [ ] แยก `src/types/index.ts` ออกเป็น domain types (`domains/accounting/types.ts`, `domains/payroll/types.ts`)
- [ ] สร้าง barrel exports (`domains/accounting/index.ts`) เพื่อง่ายต่อการ import
- [ ] ห้าม import ข้าม domain (เช่น `domains/accounting` ห้าม import จาก `domains/payroll` โดยตรง)
- [ ] ใช้ `src/shared/` สำหรับ utilities ที่ใช้ร่วมกัน (dateUtils, cn, etc.)

**ไฟล์ที่เกี่ยวข้อง:**
- ใหม่: `src/domains/*/`, `src/shared/`
- แก้ไข: เกือบทุกไฟล์ใน `src/` (เป็นการ refactor ใหญ่)

**ข้อควรระวัง:**
- เป็น breaking change ต้องทำเป็นขั้นตอน ทีละ domain
- ต้อง update import paths ทั้งหมด
- แนะนำให้ทำทีละ domain (เริ่มจาก `accounting` หรือ `payroll`)

---

#### H.4 Lazy Load Contexts (Optional Enhancement)
**Priority:** P3 | **ความยาก:** ยาก | **Impact:** สูง (ลด main bundle)

**แนวทาง:**
- [ ] สร้าง `AppProviders.tsx` ที่ lazy load contexts ที่ไม่จำเป็นตั้งแต่หน้าแรก:
  - โหลดทันที: `AuthProvider`, `NetworkStatusProvider`
  - Lazy load: `PayrollProvider`, `AuditProvider`, `InventoryProvider`, `POSProvider`
- [ ] ใช้ React.lazy() + Suspense สำหรับ provider wrapping
- [ ] หรือใช้ pattern "import-on-mount" ใน contexts ที่หนัก

**ข้อควรระวัง:**
- Contexts ต้องพร้อมก่อน children render → ต้องจัดการ loading state ให้ดี
- อาจทำให้ code ซับซ้อนขึ้นมาก

---

### ไทม์ไลน์แนะนำ (Architecture Refactor)

| สัปดาห์ | งาน | ลำดับ |
|--------|-----|--------|
| 1 | B.1 — ติดตั้ง `xlsx` + `jspdf` + `jspdf-autotable` ฝั่ง client | 1 |
| 1 | B.1 — สร้าง `src/lib/exportUtils.ts` สำหรับ client-side export | 2 |
| 1 | B.1 — แก้ไขหน้า Reports, DailyAccounting, Attendance, POS ให้เรียก export ฝั่ง client | 3 |
| 2 | H.2 — สร้าง BFF `api/dashboard-summary` + `api/accounting-validate` | 4 |
| 2 | H.2 — สร้าง `src/lib/api.ts` abstraction layer | 5 |
| 3-4 | H.3 — Refactor domain `accounting` (ย้ายไป `src/domains/accounting/`) | 6 |
| 4-5 | H.3 — Refactor domain `payroll` | 7 |
| 5-6 | H.3 — Refactor domains อื่นๆ (inventory, pos, schedule) | 8 |
| 7 | ทดสอบ end-to-end + Performance audit (Lighthouse) | 9 |

---

### ความเสี่ยงและ Mitigation

| ความเสี่ยง | ผลกระทบ | Mitigation |
|-----------|---------|-----------|
| Bundle size ใหญ่จาก `xlsx`+`jspdf` | โหลดช้าครั้งแรก | Lazy load export chunk; โหลดเฉพาะตอนใช้ |
| Refactor ทำให้ features เดิมพัง | Regression | ทำทีละ domain; มี integration tests |
| POS receipt ไม่พิมพ์ตอน offline | ขายไม่ได้ | ย้าย PDF generation มาฝั่ง client |
| Supabase free tier limits | Functions ถูก pause | ไม่ใช้ Edge Functions สำหรับ export แล้ว |
| Font ไทยใน PDF ไม่แสดง | เอกสารอ่านไม่ออก | ฝัง font base64 จาก `/fonts/THSarabunNew.ttf` ใน client |

---

## 🗂️ สรุปไฟล์สำคัญตามระบบ

| ระบบ | ไฟล์หลัก |
|------|----------|
| Routing | `App.tsx` |
| Auth | `AuthContext.tsx`, `security.ts`, `Login.tsx` |
| Station/Branch | `StationContext.tsx`, `Stations.tsx`, `StationSelector.tsx` |
| Employees | `EmployeeContext.tsx`, `Employees.tsx` |
| Schedule | `ScheduleContext.tsx`, `Schedule.tsx` |
| Leave | `ScheduleContext.tsx`, `Leave.tsx` |
| Swap | `ScheduleContext.tsx`, `Swap.tsx` |
| Attendance | `AttendanceContext.tsx`, `Attendance.tsx` |
| Daily Accounting | `DailyAccountingContext.tsx`, `DailyAccounting.tsx` |
| Reports | `Reports.tsx`, `Dashboard.tsx` |
| Settings | `Settings.tsx` |
| Audit Logs | `AuditContext.tsx`, `auditStorage.ts`, `AuditLogs.tsx`, `AuditLogSection.tsx`, `auditUtils.ts` |
| Backup & Restore | `storage.ts` (backupStorage), `Settings.tsx` |
| Inventory | `InventoryContext.tsx`, `inventoryStorage.ts`, `Inventory.tsx`, `Products.tsx`, `Suppliers.tsx` |
| POS | `POSContext.tsx`, `posStorage.ts`, `POS.tsx` |
| Promotions | `PromotionContext.tsx`, `promotionStorage.ts`, `Promotions.tsx` |
| Offline | `offlineStorage.ts`, `syncEngine.ts`, `NetworkStatusContext.tsx`, `OfflineBanner.tsx` |
| Notifications | `NotificationContext.tsx`, `Header.tsx`, `ScheduleContext.tsx` |
| Analytics | `analytics.ts`, `Dashboard.tsx` |
| Database | `storage.ts`, `supabase.ts` |
| UI Common | `Sidebar.tsx`, `Header.tsx`, `Layout.tsx`, `LoadingPage.tsx` |

---

## 💡 หลักการเขียนโค้ดต่อ (Conventions)

1. **Hooks Rules:** `useState`/`useEffect`/`useMemo`/`useCallback` ต้องอยู่ก่อน early return เสมอ
2. **Context Performance:** ห่อ `value` ด้วย `useMemo` และฟังก์ชันด้วย `useCallback`
3. **Storage Helper:** ใช้ `omit()` helper ใน `storage.ts` แทน `delete` บน typed object
4. **Safe Access:** ใช้ optional chaining (`?.`) + nullish coalescing (`??`) กับ nested data เสมอ
5. **A11y:** เพิ่ม `aria-label` ให้ปุ่มที่ไม่มีข้อความ ซ่อน icon ด้วย `aria-hidden`
6. **Thai Locale:** ใช้ `date-fns/locale/th` สำหรับแสดงวันที่ทั้งหมด
7. **Lint:** รัน `npm run lint` ก่อน commit ทุกครั้ง

---

## 🚀 แนะนำลำดับการทำ (Quick Start)

ถ้าต้องการ **impact สูงสุดในเวลาสั้นสุด**:

1. **เริ่มที่ A.1 Payroll** — ตอบโจทย์ HR โดยตรง
2. **ทำ B.1 Export PDF/Excel** — รายงานสวยงาม ใช้งานจริงได้
3. **ต่อด้วย C.1 Dark Mode** — UX สมัยใหม่
4. **ทำ C.2 PWA Enhancement** — ติดตั้งเป็นแอพบนมือถือได้
5. ~~**ทำ D.1 Real-time** — อัปเดต realtime ไม่ต้อง refresh~~ ✅ เสร็จสมบูรณ์แล้ว (มิถุนายน 2568)

ถ้าต้องการ **ปรับปรุงสถาปัตยกรรม (Phase H)**:

1. ~~**H.1 Edge Functions (Export)** — ยกเลิกแผน กลับมาทำฝั่ง client เพื่อรองรับ Offline-First และหลีกเลี่ยง CORS~~ ✅ แก้ไขแล้ว — ใช้ `xlsx` + `jspdf` ฝั่ง client
2. **H.2 BFF API Layer** — ซ่อน logic จาก client, ลด waterfall
3. **H.3 Frontend Modularization** — แยก domain ทีละส่วน
4. **H.4 Lazy Load Contexts** — ลด main bundle อีกระดับ
