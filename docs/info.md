# Gas Station Shift Manager - Project Information

## Project Overview

A comprehensive web-based shift management system for gas stations built with React, TypeScript, and Supabase.

### Core Features
- **Employee Management**: Profile + User account management (1-to-1 relationship)
- **Multi-Station/Branch Management**: Multi-branch support with station-scoped data
- **Shift Scheduling**: Morning, afternoon, night shifts with auto-generation per branch
- **Leave Management**: Request and approval workflow
- **Shift Swapping**: Request and approval between employees
- **Attendance Tracking**: Check-in/out with GPS and status tracking (branch-filtered)
- **Daily Accounting**: Fuel sales tracking with meter readings (branch-filtered)
- **Inventory Management**: Fuel stock tracking, shop products, suppliers, low stock alerts
- **POS System**: Point of Sale for fuel and products with multiple payment methods
- **Offline-First Architecture**: Works without internet, auto-sync when reconnected
- **Reports**: Monthly/yearly accounting reports with charts (branch-filtered)
- **Notifications**: Real-time notifications for events
- **Mobile-First Design**: Responsive UI optimized for mobile

## Technology Stack

| Component | Technology |
|-----------|------------|
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
| Excel Export | `xlsx` (client-side generation) |
| PDF Export | `jspdf` + `jspdf-autotable` (client-side, Thai font support) |
| Offline Storage | IndexedDB (idb library) |
| Service Worker | Custom SW with cache versioning & error-tolerant caching |
| Background Sync | Periodic sync |

## Project Structure

```
src/
├── components/
│   ├── common/          # Shared components
│   ├── layout/          # Layout components
│   └── ui/              # shadcn/ui components
├── contexts/            # React Context providers
│   ├── AuthContext.tsx
│   ├── StationContext.tsx     # Branch/station management
│   ├── EmployeeContext.tsx
│   ├── ScheduleContext.tsx
│   ├── AttendanceContext.tsx
│   ├── DailyAccountingContext.tsx
│   ├── NotificationContext.tsx
│   └── InventoryContext.tsx
├── data/
│   ├── storage.ts       # Supabase CRUD operations (core)
│   ├── inventoryStorage.ts # Inventory CRUD
│   ├── posStorage.ts       # POS CRUD
│   ├── payrollStorage.ts   # Payroll CRUD
│   ├── backupStorage.ts    # Backup & restore
│   └── offlineStorage.ts   # IndexedDB operations
├── lib/
│   ├── supabase.ts      # Supabase client
│   ├── security.ts      # Security utilities
│   ├── utils.ts         # Utility functions
│   ├── analytics.ts      # Dashboard analytics
│   ├── alertRules.ts     # Smart alert rules
│   ├── offlineStorage.ts # IndexedDB wrapper
│   ├── syncEngine.ts     # Sync engine
│   └── serviceWorker.ts  # Service worker registration
├── pages/               # Route components (Lazy loaded)
├── types/
│   ├── index.ts         # TypeScript definitions
│   └── inventory.ts
└── utils/
    ├── dateUtils.ts
    └── scheduleUtils.ts

Root files:
├── sql/
│   ├── database-setup.sql       # SQL for DB initialization
│   ├── supabase-rls-setup.sql   # RLS policies
│   ├── fix-missing-tables.sql   # Fix missing tables
│   ├── phase2-payroll.sql       # Payroll tables
│   ├── phase2-audit-trail.sql   # Audit trail table
│   ├── phase2-alerts.sql        # Alert rules table
│   └── phase2-membership.sql    # Membership tables
├── SETUP.md            # Setup instructions
└── docs/USAGE_GUIDE.md # User guide
```

## Database Architecture

### Tables

1. **positions** - Job positions
2. **skills** - Employee skills
3. **stations** - Gas station branches
4. **shifts** - Work shifts (morning, afternoon, night)
5. **profiles** - Employee profiles
6. **profile_skills** - Many-to-many: profiles ↔ skills
7. **users** - User accounts (linked to Supabase Auth)
8. **schedules** - Shift assignments
9. **leave_requests** - Leave applications
10. **swap_requests** - Shift swap requests
11. **attendances** - Attendance records (FK: scheduleid → schedules)
12. **fuel_prices** - Fuel prices by date
13. **daily_accounting** - Daily accounting records
14. **notifications** - User notifications
15. **fuel_inventory** - Daily fuel stock tracking
16. **fuel_deliveries** - Fuel delivery orders (DO)
17. **products** - Shop products
18. **product_transactions** - Product stock transactions
19. **suppliers** - Fuel and product suppliers
20. **sales** - POS transactions (sales, payments)
21. **payroll_periods** - Payroll periods (year, month, status)
22. **payroll_records** - Employee payroll records (salary, deductions)
23. **audit_logs** - Audit trail (create/update/delete tracking) with `performed_by_name` for human-readable performer attribution

### Foreign Key Constraints

| Table | Column | References | On Delete |
|-------|--------|------------|-----------|
| attendances | scheduleid | schedules(id) | CASCADE |
| attendances | employeeid | profiles(id) | - |
| swap_requests | scheduleid | schedules(id) | CASCADE |
| swap_requests | targetscheduleid | schedules(id) | CASCADE |
| schedules | shiftid | shifts(id) | - |
| schedules | employeeid | profiles(id) | - |
| profile_skills | profileid | profiles(id) | CASCADE |
| profile_skills | skillid | skills(id) | CASCADE |

**Note:** When deleting schedules, must delete related `attendances` and `swap_requests` first due to foreign key constraints.

### Auth Integration

```
Supabase Auth (auth.users)
       │
       │ (uuid in auth.users.id)
       ▼
users.authuid ←────────────── linked via email
       │
       │ (1-to-1)
       ▼
profiles.userId
```

**Key Process:**
1. Login via Supabase Auth
2. `syncAuthUser()` matches auth.users.email with users.email
3. Auto-updates users.authuid if not set
4. App loads user data from users table

## Setup Requirements

### 1. Environment Variables
```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

### 2. Database Setup
1. Run `database-setup.sql` in Supabase SQL Editor
2. Enable Email provider in Authentication settings
3. Create 6 auth users manually in Dashboard
4. Run UUID linking SQL

### 3. Demo Accounts
| Email | Password | Role |
|-------|----------|------|
| admin@gasstation.com | Admin@123 | admin |
| manager@gasstation.com | Manager@123 | manager |
| somchai@gasstation.com | Staff@123 | staff |
| somying@gasstation.com | Staff@123 | staff |
| mani@gasstation.com | Staff@123 | staff |
| prasit@gasstation.com | Staff@123 | staff |

## Key Implementation Details

### Column Name Mapping
PostgreSQL uses lowercase, TypeScript uses camelCase:

| TypeScript | PostgreSQL |
|------------|------------|
| authUid | authuid |
| profileId | profileid |
| createdAt | createdat |
| startTime | starttime |
| endTime | endtime |

### Storage Pattern
```typescript
// Map to DB (camelCase → lowercase)
const mapUserToDb = (user: User) => ({
  authuid: user.authUid,
  profileid: user.profileId,
  // ...
});

// Map from DB (lowercase → camelCase)
const mapUserFromDb = (row: Record<string, unknown>) => ({
  authUid: row.authuid as string,
  profileId: row.profileid as string,
  // ...
});
```

### Safe Data Access
```typescript
// Always use optional chaining with fallbacks
const value = formData.dispenserCash?.dispenser2?.nozzle1?.start ?? 0;
```

## Performance Optimizations

- **Lazy Loading**: All pages lazy-loaded except Login
- **Code Splitting**: Vite manualChunks for vendors
- **Context Memoization**: useMemo + useCallback in all providers
- **Reduced Bundle**: Main chunk ~85KB (gzip)

## Security Measures

- bcrypt password hashing (12 rounds)
- Rate limiting (5 attempts / 15 min lockout)
- DOMPurify input sanitization
- Row Level Security (RLS) on all tables
- No localStorage for sensitive data

## Mobile-First Design

- Hamburger sidebar on mobile
- Card layouts replace tables on small screens
- Large touch targets (min 44px)
- Responsive charts and forms

## Build Commands

```bash
npm install      # Install dependencies
npm run dev      # Development server
npm run build    # Production build
npm run preview  # Preview production
npm run lint     # Lint code
```

## Documentation

- **SETUP.md** - Detailed setup instructions
- **AGENTS.md** - Development guide for agents
- **docs/USAGE_GUIDE.md** - User guide and calculation formulas
- **PLAN.md** - Development roadmap

## Recent Updates

### กรกฎาคม 2026
- **Database-Level Backup (Edge Function)** - `supabase/functions/backup-database/index.ts`
  - Queries 22 main tables and generates a SQL dump (`TRUNCATE` + `INSERT`)
  - Uploads the `.sql` file to the private Supabase Storage bucket `backups`
  - Auto-creates the `backups` bucket if it does not exist
  - Can be triggered manually from the Settings page or automatically via cron-job.org
  - Sends a success notification to all admin/manager users after each backup
- **GitHub Actions Native Backup** - `.github/workflows/database-backup.yml` created for native `pg_dump` backups, currently paused due to GitHub account billing lock

### มิถุนายน 2026
- **Multi-Station/Branch Filtering** - Complete multi-branch support
  - `AuthContext` auto-sets `currentStation` from profile on login
  - `EmployeeContext` provides `filteredEmployees` by station
  - All contexts filter data by station: Schedule, Attendance, DailyAccounting, Reports
  - Staff sees only their branch (read-only badge in Header)
  - Admin/Manager can switch branches via StationSelector dropdown
  - Employees page has station selector in forms + station column in table
- **Payroll System** - Payroll period and record tables with storage layer (`payrollStorage.ts`). Supports salary calculation, deductions, and payslip generation (UI in progress).
- **Audit Trail** - `audit_logs` table with RLS policies to track all create/update/delete operations with user attribution. Supports `performed_by_name` for human-readable performer names and `getRecordLabel()` helper to display meaningful record labels instead of raw UUIDs.
- **Dashboard Analytics** - Stock prediction (`predictFuelStock`, `predictProductStock`), sales trends (`getDailySalesTrend`), attendance analytics (`getAttendanceRate`, `getTopEmployees`).
- **Smart Alerts** - `alert_rules` table for configurable low-stock and anomaly alerts.
- **Offline-First Architecture** - Complete offline support with IndexedDB, Service Worker, and background sync. Works without internet, auto-sync when reconnected, optimistic UI updates.
- **POS System** - Full Point of Sale with fuel sales (by amount/liters), product sales, multiple payment methods (Cash, Card, QR, E-Wallet), change calculation, and auto stock deduction.
- **Inventory Management System** - Complete inventory system with fuel stock tracking, shop products, and supplier management (new tables: fuel_inventory, fuel_deliveries, products, product_transactions, suppliers)
- **Export Excel & PDF (Client-side)** - Generate reports and receipts directly in the browser using `xlsx` and `jspdf` with Thai font (`THSarabunNew.ttf`) support. Works offline without server-side Edge Functions.
- **Database Backup & Restore** - Admin can export selected tables to JSON file and restore specific tables from backup. Supports 22 tables with dependency-aware restore order.
- **Real-time Supabase Subscriptions** - Auto-update all data when any table changes via Supabase Realtime (postgres_changes). Covers 20+ tables across 11 Contexts with debounce, cache invalidation, and toast notifications.
- **Debug Console.log Cleanup** - Removed all debug console.log statements from production code
- **Real-time Supabase Subscriptions** - Complete realtime integration for all tables via Supabase Realtime. Includes `src/lib/realtime.ts` utility, `src/hooks/useRealtime.ts` hooks, and subscriptions in all 11 Contexts. Features debounce (800ms), cache invalidation, auto-reload, and toast notifications for new data.
- **Fuel Price Form Enhancement** - Price form now auto-populates with the latest saved fuel prices from database
- **Import Path Fix** - Fixed NotificationContext to use `@/` alias consistently
- **Bug Fixes**:
  - Fixed `sale_items` query to use `sales.items` JSONB (table no longer exists)
  - Fixed `fuel_inventory` 406 error by removing `.single()` from `getLatestByType`
  - Fixed `auth.uid()` UUID comparison in RLS policies with `::text` cast

### Previous Updates
- **Foreign Key Constraint Handling** - Fixed 409 Conflict error when clearing/deleting schedules
- **Employee Creation Enhancement** - Creates both profile and user record simultaneously
- **Accessibility Fixes** - Added missing `DialogDescription` to Edit dialogs
- **Real Notifications** - Supabase-backed notifications with auto-triggers
- **Mobile Responsive** - Hamburger sidebar, touch-friendly buttons, card layouts
- **Supabase Auth** - Migrated from localStorage to Supabase Auth

## Important Notes

1. **No Mock Data**: System requires database setup before use
2. **Manual Auth Setup**: Auth users must be created in Dashboard
3. **UUID Linking**: Critical step after creating auth users
4. **Rate Limits**: Supabase Auth has strict rate limits
5. **RLS Required**: Tables need RLS policies for security
6. **Foreign Key Constraints**: Deleting schedules requires deleting attendances and swap_requests first

## License

MIT License
