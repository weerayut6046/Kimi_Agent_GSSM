# Gas Station Shift Manager - Agent Guide

## Project Overview

A web-based shift management system for gas stations built with React, TypeScript, and Supabase. The application helps manage employee schedules, track attendance, handle leave and shift swap requests, and manage daily fuel sales accounting.

**Key Features:**
- Employee management with roles (admin, manager, staff)
- **Branch/Station Management** - Multi-branch support with station assignment for employees
- Shift scheduling (morning, afternoon, night shifts) per branch with per-employee removal
- Leave request and approval workflow
- Shift swap request system
- Attendance tracking with check-in/check-out
- Daily fuel sales accounting with meter readings
- **Inventory Management** - Fuel stock tracking, shop products, suppliers, low stock alerts
- **POS System** - Point of Sale for fuel and products with payment methods (cash, card, QR code)
- **Offline-First Architecture** - Works without internet, auto-sync when reconnected, background sync support
- Real-time notification system (leave, swap, schedule updates)
- Mobile-first responsive design (hamburger sidebar, card layouts, touch-friendly)
- Dashboard with statistics and reports
- Monthly/yearly accounting reports with charts (fuel sales, cash trends, difference analysis)
- Settings for shift, position, and skill management
- **Database Backup & Restore (Admin only)** - Export/import selected tables as JSON file + database-level SQL backup to Supabase Storage with admin/manager notifications
- **Payroll System** - Payroll period management, salary calculation, and payroll records
- **Audit Trail** - Track all create/update/delete operations with user attribution
- **Dashboard Analytics** - Stock prediction, sales trends, attendance analytics
- **Promotion Management** - Create and manage fuel promotions (threshold, happy hour, percentage, fixed amount discounts)
- **Audit Log Viewer** - Standalone page with diff view, search, filtering, pagination, and CSV export
- **Real-time Supabase Subscriptions** - Auto-update all contexts when data changes in any table (schedules, attendances, inventory, sales, payroll, promotions, audit_logs, etc.) without page refresh

**Language:** Thai (UI and documentation)

## Technology Stack

| Category | Technology |
|----------|------------|
| Framework | React 19.2.0 |
| Language | TypeScript 5.9.3 |
| Build Tool | Vite 7.2.4 |
| Styling | Tailwind CSS 3.4.19 |
| UI Components | shadcn/ui (New York style) |
| Icons | Lucide React |
| Routing | React Router DOM 7.13.2 |
| Forms | React Hook Form + Zod |
| Date Handling | date-fns (Thai locale) |
| Charts | Recharts |
| Database | Supabase (PostgreSQL) |
| Auth | Supabase Auth |
| Security | bcryptjs, DOMPurify |
| Notifications | Sonner |
| Real-time | Supabase Realtime (postgres_changes subscriptions) |
| Offline Storage | IndexedDB (idb library) |
| Service Worker | Custom SW for caching & sync |
| Background Sync | Periodic sync for pending data |
| PWA | Vite PWA Plugin (Workbox) |
| Mobile App | Capacitor (iOS & Android native wrappers) |
| Excel Export | `xlsx` (client-side) |
| PDF Export | `jspdf` + `jspdf-autotable` (client-side, with Thai font support) |

## Project Structure

```
app/
├── src/
│   ├── components/
│   │   ├── common/          # Shared components (StatCard, ProtectedRoute, PageLoader)
│   │   ├── layout/          # Layout components (Header, Sidebar, Layout)
│   │   └── ui/              # shadcn/ui components (50+ components)
│   ├── contexts/            # React Context providers
│   │   ├── AuthContext.tsx       # Authentication state (Supabase Auth) + auto-set currentStation
│   │   ├── StationContext.tsx    # Branch/station management with currentStation
│   │   ├── EmployeeContext.tsx   # Employee management + station filtering
│   │   ├── NotificationContext.tsx # Real-time notifications
│   │   ├── ScheduleContext.tsx   # Scheduling, leave & swap requests (station-filtered)
│   │   ├── AttendanceContext.tsx # Attendance tracking (station-filtered)
│   │   ├── DailyAccountingContext.tsx # Fuel sales accounting (station-filtered)
│   │   ├── InventoryContext.tsx  # Inventory management (fuel & products)
│   └── AuditContext.tsx      # Audit log management with realtime subscription
│   ├── data/
│   │   ├── storage.ts       # Supabase CRUD operations (core)
│   │   ├── inventoryStorage.ts # Inventory CRUD operations
│   │   ├── posStorage.ts       # POS CRUD operations
│   │   ├── payrollStorage.ts   # Payroll CRUD operations
│   │   ├── backupStorage.ts    # Backup & restore operations
│   │   ├── auditStorage.ts     # Audit log CRUD operations
│   │   └── offlineStorage.ts   # IndexedDB operations (offline queue & cache)
│   ├── hooks/               # Custom React hooks
│   │   └── useOfflineData.ts   # Hook for offline-first data operations
│   ├── lib/
│   │   ├── security.ts      # Security utilities (bcrypt, DOMPurify)
│   │   ├── supabase.ts      # Supabase client initialization
│   │   ├── utils.ts         # Utility functions (cn helper)
│   │   ├── analytics.ts      # Dashboard analytics (stock prediction, sales trends)
│   │   ├── alertRules.ts     # Smart alert rules engine
│   │   ├── cache.ts          # localStorage request cache for reducing Supabase calls
│   │   ├── offlineStorage.ts # IndexedDB wrapper (cache, pending ops, sync status)
│   │   ├── syncEngine.ts     # Sync engine for offline/online sync
│   │   └── serviceWorker.ts  # Service worker registration utilities
│   ├── pages/               # Route page components (Lazy loaded)
│   │   ├── Dashboard.tsx
│   │   ├── Employees.tsx    # Employee management with station selector
│   │   ├── Stations.tsx     # Branch/station management (admin only)
│   │   ├── Schedule.tsx
│   │   ├── Leave.tsx
│   │   ├── Swap.tsx
│   │   ├── Attendance.tsx
│   │   ├── DailyAccounting.tsx
│   │   ├── Reports.tsx      # Reports filtered by current station
│   │   ├── Settings.tsx
│   │   ├── AuditLogs.tsx    # Audit log viewer (admin/manager only)
│   │   ├── Login.tsx
│   │   ├── Inventory.tsx    # Fuel stock & delivery management
│   │   ├── Products.tsx     # Shop product management
│   │   └── Suppliers.tsx    # Supplier management
│   ├── types/
│   │   ├── index.ts         # TypeScript type definitions (core)
│   │   └── inventory.ts     # Inventory types (FuelInventory, Product, Supplier)
│   ├── utils/
│   │   ├── dateUtils.ts     # Date formatting utilities (Thai)
│   │   ├── scheduleUtils.ts # Schedule validation & generation
│   │   └── auditUtils.ts    # Audit log helpers (getRecordLabel, getPerformerInfo)
│   ├── App.tsx              # Root component with routes
│   ├── main.tsx             # Application entry point
│   └── index.css            # Global styles + Tailwind
├── sql/
│   ├── database-setup.sql       # SQL for initial database setup
│   ├── supabase-rls-setup.sql   # SQL for RLS policies
│   ├── fix-missing-tables.sql   # Fix missing tables (sales, inventory, etc.)
│   ├── phase2-payroll.sql       # Payroll tables (payroll_periods, payroll_records)
│   ├── phase2-audit-trail.sql   # Audit trail table
│   ├── phase2-membership.sql    # Membership/loyalty tables
│   ├── phase2-alerts.sql        # Alert rules table
│   └── ... (other SQL files)
├── dist/                    # Build output
├── docs/
│   └── USAGE_GUIDE.md       # User guide and calculation formulas
├── components.json          # shadcn/ui configuration
├── vite.config.ts           # Vite configuration
├── tailwind.config.js       # Tailwind CSS configuration
├── tsconfig.app.json        # TypeScript app config
├── docs/
│   ├── SETUP.md                 # Setup instructions
│   ├── PLAN.md                  # Implementation plan
│   ├── V2_ROADMAP.md            # V2 roadmap
│   └── USAGE_GUIDE.md           # User guide
└── package.json             # Dependencies
```

## Build and Development Commands

```bash
# Install dependencies
npm install

# Start development server
npm run dev
# Vite dev server runs on http://localhost:5173 (default)

# Build for production
npm run build
# Output: dist/ folder

# Preview production build
npm run preview

# Lint code
npm run lint
# Uses ESLint with TypeScript, React Hooks, and React Refresh rules

# Build for iOS (Capacitor)
npm run build
npx cap sync ios
npx cap open ios

# Build for Android (Capacitor)
npm run build
npx cap sync android
npx cap open android
```

## Code Style Guidelines

### TypeScript
- Strict mode enabled
- Path alias `@/` maps to `src/`
- All components typed with explicit React.FC
- Types defined in `src/types/index.ts`

### Component Structure
```typescript
import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card } from '@/components/ui/card';

interface Props {
  // Define props
}

const ComponentName: React.FC<Props> = ({ prop1, prop2 }) => {
  // Component logic
  return (
    // JSX
  );
};

export default ComponentName;
```

### Styling
- Use Tailwind CSS utility classes
- Component variants via `class-variance-authority` (cva)
- Use `cn()` utility from `@/lib/utils` for conditional classes
- shadcn/ui components use HSL color variables in CSS

### Naming Conventions
- Components: PascalCase (e.g., `Dashboard.tsx`)
- Utilities: camelCase (e.g., `dateUtils.ts`)
- Types/Interfaces: PascalCase (e.g., `EmployeeProfile`)
- Constants: UPPER_SNAKE_CASE for true constants

### UI Component Usage
Import from `@/components/ui/`:
```typescript
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader } from '@/components/ui/dialog';
```

## Key Architecture Decisions

### 1. State Management
- **React Context** for global state (Auth, Employees, Schedules, etc.)
- No Redux or external state management library
- Contexts are nested in App.tsx with specific provider order
- All Context providers wrap their `value` object with `useMemo` and all exposed functions with `useCallback`

### 2. Data Persistence
- **Supabase (PostgreSQL)** for all data storage via REST API
- Uses `@supabase/supabase-js` client in `src/lib/supabase.ts`
- Environment variables: `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`
- Storage utilities in `src/data/storage.ts` abstract all Supabase calls
- No localStorage for data storage (only session info from Supabase Auth)

### 3. Authentication
- **Supabase Auth** with email/password
- `syncAuthUser()` function maps Supabase Auth UUID to local users table
- Auto-updates `authuid` column when matching by email
- Rate limiting: 5 failed attempts → 15 min lockout

### 4. Employee-User Relationship & Branch Assignment
The system maintains a **1-to-1 relationship** between `EmployeeProfile` (profiles table) and `User` (users table):

- **profiles** table has `userId` field referencing the user
- **users** table has `profileId` field referencing the profile
- **profiles** table has `stationId` field for branch assignment
- When creating a new employee:
  1. Create profile record first (with `stationId`)
  2. Create user record with `profileId` set to the new profile's id
  3. Update profile's `userId` to link back to the user
- When deleting an employee:
  1. Find and delete all users with matching `profileId`
  2. Delete profile_skills records
  3. Delete the profile record
- This ensures referential integrity without foreign key constraints

**Station/Branch Assignment:**
- All employees are assigned to a `station` via `stationId` on the profile
- On login, `AuthContext` reads the user's `stationId` and sets it as `currentStation` via localStorage
- `StationContext` restores `currentStation` from localStorage on app load
- Admin can create/manage stations via `/stations` page
- Admin/manager can switch stations via `StationSelector` dropdown in Header
- Staff see a read-only station badge and cannot switch branches

### 5. Routing Structure
```
/login          - Login page
/               - Dashboard (protected)
/schedule       - Schedule management (protected; admin/manager can remove employees from shifts)
/employees      - Employee list (admin/manager only)
/leave          - Leave requests (protected)
/swap           - Shift swap requests (protected)
/attendance     - Attendance tracking (protected)
/accounting     - Daily accounting (protected)
/reports        - Reports (admin/manager only)
/settings       - Settings (admin/manager only)
/stations       - Branch/Station management (admin only)
/inventory      - Inventory management (admin/manager only)
/products       - Shop products (admin/manager only)
/suppliers      - Suppliers (admin/manager only)
/pos            - Point of Sale (protected)
/customers      - Membership/loyalty (protected)
/promotions     - Promotion management (admin/manager only)
/payroll        - Payroll management (admin/manager only)
/alerts         - Smart alerts (admin/manager only)
/audit-logs     - Audit log viewer (admin/manager only)
```

Note: Notifications are shown via a dropdown in the Header rather than a dedicated route.

All pages (except Login) are lazy-loaded with `React.lazy()` and `Suspense`.

### 6. Date Handling
- All dates stored in ISO format (`YYYY-MM-DD`)
- Thai locale for display via `date-fns/locale/th`
- Utility functions in `src/utils/dateUtils.ts`

### 7. Fuel Sales Accounting
- **Two dispensers tracked:**
  - **Dispenser 1:** Nozzle 1 (Gas 95), Nozzle 2 (Diesel)
  - **Dispenser 2:** Nozzle 1 (Gas 95), Nozzle 2 (B7)
- **Meter readings** recorded per shift (start/end values)
- **Cash tracking per nozzle** (separate start/end amounts by fuel type):
  - Track cash amounts separately for each fuel type
  - Auto-calculate actual cash: `end - start`
  - Compare with system-calculated amounts from meter readings
- **Fuel types:** '95', 'B7', 'B10', 'Diesel'
- **Soft delete enabled** for `daily_accounting` via `isDeleted`/`deletedAt`/`deletedBy` columns
  - Records are not physically removed; they are filtered from queries by `isdeleted = false`
  - Only `admin` and `manager` can delete (soft delete) daily accounting records
  - Deleted records can be recovered by restoring `isdeleted = false` from backup or Supabase Dashboard
- **Cash Amount Data Structure:**
  ```typescript
  dispenserCash: {
    dispenser1: {
      nozzle1: { start: number, end: number }, // 95
      nozzle2: { start: number, end: number }  // Diesel
    },
    dispenser2: {
      nozzle1: { start: number, end: number }, // 95
      nozzle2: { start: number, end: number }  // B7
    }
  }
  ```

### 8. Settings & Station Management
The Settings page (`/settings`) allows admin/manager to:
- **View and manage shifts** (add, edit, delete) with name, time, min staff, and color
- **Clear all schedules** from the shift management section
- **Remove employees from shifts** - From `/schedule`, admin/manager can click the X on an employee badge to remove that person from the shift (with confirmation dialog)
- **Backup & Restore database** (Admin only) - Export selected tables to JSON file or restore specific tables from backup
- View positions and skills
- View system information (shows current station name dynamically)
- **Link to Audit Logs** - Card linking to the standalone `/audit-logs` page

The Audit Logs page (`/audit-logs`) allows admin/manager to:
- **View all audit logs** with filtering by table, action, date range, and search term
- **Human-readable record labels** - Extracts names from stored data instead of showing raw UUIDs (e.g., employee names, product names, dates)
- **Performer identification** - Shows actual user name from `performedByName` (or email / "ระบบอัตโนมัติ" for system actions)
- **View detailed changes** - Diff view showing old vs new values for updates
- **Export to CSV** - Download filtered results as CSV with Thai Excel BOM
- **Pagination** - Navigate through results with page numbers and configurable page size (10/25/50/100)
- **Mobile-friendly** - Card layout on mobile, table layout on desktop

The Stations page (`/stations`) allows admin to:
- **View and manage branches/stations** (add, edit, delete) with name, address, phone, and manager

**Role-based permissions:** 
- Only `admin` and `manager` can add, edit, or delete shifts
- Only `admin` can backup and restore database
- Only `admin` and `manager` can view audit logs
- Only `admin` can manage stations (create, edit, delete)
- Only `admin` and `manager` can delete daily accounting records (soft delete)
- Only `admin` and `manager` can remove employees from shifts
- Staff can view but cannot delete daily accounting records

### 9. Notification System
`NotificationContext.tsx` manages user notifications stored in Supabase:
- **Creation:** `addNotification({ userId, title, message, type, read })`
- **Fetch by user:** `getByUser(userId)` with `userid` lowercase column mapping
- **Mark as read:** Single item or mark all as read for a user
- **Auto-notify triggers in `ScheduleContext`:**
  - New leave request → all managers/admins
  - Leave approved/rejected → requesting employee
  - New swap request → managers/admins + requested employee
  - Swap approved/rejected → both requester and requested
  - Schedule generated/updated → all affected employees

### 10. Mobile-First Responsive Design
The app is optimized for mobile usage (staff primarily use phones for attendance):
- **Sidebar:** Fixed `w-64` on desktop; slides in/out with overlay on `< lg`. Navigation is organized into groups: หลัก, งานและบุคคล, คลังและสินค้า, บัญชีและเงิน, สมาชิก, แจ้งเตือน, ตั้งค่าระบบ
- **Header:** Hamburger menu button (`lg:hidden`) triggers sidebar open; notification badge scales for mobile
- **Tables on mobile:** 
  - `Employees.tsx`, `DailyAccounting.tsx`, and `AuditLogs.tsx` render card layouts on small screens (`md:hidden` / `hidden md:block`)
  - Other tables use horizontal scroll (`overflow-x-auto`) with negative margin padding
- **Touch targets:** All interactive buttons have `min-w-[44px] min-h-[44px]` or larger
- **Attendance page:** Check-in/check-out buttons are `min-h-[56px] text-lg` for easy tapping
- **Login page:** Reduced logo size, full-width inputs, and comfortable tap areas on small screens

### 11. Performance Optimizations
- **Route-based code splitting** with `React.lazy()` and `Suspense`
- **Vite `manualChunks`** configured in `vite.config.ts` to split vendors:
  - `vendor-react`, `vendor-ui`, `vendor-data`, `vendor-charts`
- Reduced main JS chunk from ~1.4MB to ~284KB (gzipped 85KB)
- **Request Caching Layer** (`src/lib/cache.ts`) - localStorage-based cache with TTL for all context loaders
- **Staggered Context Loading** - Contexts load sequentially rather than all at once to avoid flooding Supabase
- **Supabase Query Timeouts** - `dailyAccountingStorage.getAll()` and `getByDateRange()` use a 5s timeout wrapper (`withTimeout` in `src/data/baseStorage.ts`) to prevent indefinite loading hangs
- **Database Index Optimization** - `idx_users_authuid` and `idx_users_email` indexes for fast auth lookups

### 12. Accessibility (a11y)
- `index.html`: `lang="th"`, `<meta name="description">`, `<meta name="theme-color">`
- `Sidebar.tsx`: `aria-label` on navigation elements
- `Header.tsx`: `aria-label` on mobile menu and notifications
- `Login.tsx`: `aria-label` on password toggle and quick-login buttons
- `PageLoader`: `animate-in fade-in` transition

## Offline-First Architecture

The application implements offline-first architecture for reliable operation in areas with poor connectivity.

### Architecture Components

#### 1. Network Status Monitoring (`NetworkStatusContext.tsx`)
- Real-time online/offline detection using `navigator.onLine`
- Periodic connectivity checks via ping to server
- Connection type detection (WiFi, cellular, etc.)
- Manual offline mode toggle for testing

#### 2. IndexedDB Storage (`lib/offlineStorage.ts`)
Uses `idb` library for structured local storage:

**Stores:**
- `pendingOperations`: Queue of create/update/delete operations
- `cache`: Cached entity data with expiration
- `syncStatus`: Last sync timestamp and pending count per entity

**API:**
```typescript
// Queue operations for later sync
await pendingOperations.add({
  type: 'create', // 'create' | 'update' | 'delete'
  entity: 'employees',
  data: employeeData,
});

// Cache data with expiration
await cache.setEntityList('products', products, 1); // 1 hour expiry

// Get sync status
const status = await syncStatus.get('employees');
```

#### 3. Sync Engine (`lib/syncEngine.ts`)
Manages synchronization between local and server:

**Features:**
- Automatic sync when connectivity restored
- Retry with exponential backoff for failed operations
- Conflict resolution (last-write-wins)
- Entity-specific sync handlers

**Usage:**
```typescript
// Register sync handler for an entity
registerSyncHandler({
  entity: 'employees',
  create: async (data) => employeeStorage.create(data),
  update: async (id, data) => employeeStorage.update(id, data),
  delete: async (id) => employeeStorage.delete(id),
  fetchAll: async () => employeeStorage.getAll(),
});

// Trigger manual sync
await syncPendingOperations();
```

#### 4. Offline Data Hook (`hooks/useOfflineData.ts`)
React hook for offline-first data operations:

```typescript
const {
  data,
  isLoading,
  isOffline,
  hasPendingChanges,
  create,
  update,
  remove,
  sync,
} = useOfflineData({
  entity: 'products',
  fetchAll: () => productStorage.getAll(),
  create: (data) => productStorage.create(data),
  update: (id, data) => productStorage.update(id, data),
  remove: (id) => productStorage.delete(id),
});
```

#### 5. Service Worker (`public/service-worker.js`)
- **Cache Versioning**: Uses `CACHE_VERSION = 'v2'` to force browser update on changes
- **Error-Tolerant Caching**: Assets cached individually - missing files don't fail the entire install
- **Static Asset Caching**: `/`, `/index.html`, `/manifest.json` (optional files excluded from required list)
- **API Response Caching**: Network first, cache fallback for offline API access
- **Background Sync**: Triggers sync when connectivity restored
- **Push Notification**: Support for future push notifications

**Clearing Old Service Worker:**
```javascript
// Run in browser console to force update
navigator.serviceWorker.getRegistrations().then(regs => {
  for (let reg of regs) reg.unregister();
  location.reload();
});
```

#### 6. Offline Banner (`components/common/OfflineBanner.tsx`)
- Shows current connectivity status
- Displays pending operation count
- Manual sync button when online
- Storage usage statistics

### Offline Behavior by Feature

| Feature | Offline Behavior | Sync Strategy |
|---------|------------------|---------------|
| **POS Sales** | Queue sales locally, print receipt | Auto-sync when online |
| **Attendance** | Store check-in/out locally | Sync on reconnect |
| **Daily Accounting** | Save to pending queue | Sync when online |
| **Leave Requests** | Queue for later submission | Sync on reconnect |
| **Employee Data** | Use cached data (24h expiry) | Pull on reconnect |
| **Products** | Use cached data (1h expiry) | Pull on reconnect |
| **Promotions** | Use cached data (1h expiry) | Pull on reconnect |
| **Reports** | Show cached data with warning | N/A |

### Implementation Best Practices

1. **Optimistic UI Updates**: Update UI immediately, queue for sync
2. **Error Handling**: Show toast when operation queued for later
3. **Sync Indicators**: Show sync status in relevant pages
4. **Conflict Resolution**: Last-write-wins for most entities
5. **Data Expiration**: Different expiry times per entity type
6. **Storage Limits**: Monitor IndexedDB usage, clear old data

### Testing Offline Mode

1. **Browser DevTools**: Network tab → "Offline" checkbox
2. **Application Tab**: IndexedDB inspection
3. **Manual Test**: Disable WiFi, perform operations, re-enable

## Supabase Setup

### 1. Create Project
1. Create a project at [supabase.com](https://supabase.com)
2. Copy the Project URL and `anon` public API key into `.env`:
   ```
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key
   ```

### 2. Database Schema
Run `sql/database-setup.sql` in the Supabase SQL Editor to create all tables and initial data.

### 3. Authentication Setup
1. Go to **Authentication → Settings**
2. Enable Email provider
3. Disable "Confirm email" for development (or enable for production)
4. Create users manually in **Authentication → Users** (due to rate limits)

### 4. Link Auth Users
After creating auth users, run:
```sql
UPDATE users u
SET authuid = a.id
FROM auth.users a
WHERE u.email = a.email;
```

## PostgreSQL Column Naming Convention

PostgreSQL converts unquoted identifiers to lowercase. The application handles this by mapping between TypeScript camelCase and PostgreSQL lowercase column names:

### Example: Users Table
| TypeScript (camelCase) | PostgreSQL (lowercase) |
|------------------------|------------------------|
| `authUid` | `authuid` |
| `profileId` | `profileid` |
| `createdAt` | `createdat` |

### Storage Helper Functions (`src/data/storage.ts`)
```typescript
// Map camelCase to lowercase before sending to Supabase
const mapUserToDb = (user: User): Record<string, unknown> => ({
  id: user.id,
  authuid: user.authUid,  // ← lowercase in DB
  email: user.email,
  password: user.password,
  role: user.role,
  profileid: user.profileId,  // ← lowercase in DB
  createdat: user.createdAt,  // ← lowercase in DB
  updatedat: user.updatedAt,
});

// Map lowercase back to camelCase when receiving from Supabase
const mapUserFromDb = (row: Record<string, unknown>): User => ({
  id: row.id as string,
  authUid: row.authuid as string,  // ← lowercase from DB
  email: row.email as string,
  password: row.password as string,
  role: row.role as 'admin' | 'manager' | 'staff',
  profileId: row.profileid as string,
  createdAt: row.createdat as string,
  updatedAt: row.updatedat as string,
});
```

## Data Safety & Legacy Compatibility

When working with nested data structures like `dispenserCash`:

### Always Use Safe Access Pattern
```typescript
// ✅ Good - with fallback
const value = formData.dispenserCash?.dispenser2?.nozzle1?.start ?? 0;

// ❌ Bad - may crash if undefined
const value = formData.dispenserCash.dispenser2.nozzle1.start;
```

### Safe State Updates
```typescript
// ✅ Good - preserve sibling values
setFormData({
  ...formData,
  dispenserCash: {
    ...formData.dispenserCash,
    dispenser2: {
      nozzle1: { 
        start: Number(e.target.value),
        end: formData.dispenserCash?.dispenser2?.nozzle1?.end ?? 0
      },
      nozzle2: {
        start: formData.dispenserCash?.dispenser2?.nozzle2?.start ?? 0,
        end: formData.dispenserCash?.dispenser2?.nozzle2?.end ?? 0
      }
    }
  }
});
```

## Security Features

The application implements several security measures:

### 1. Password Security
- **bcrypt hashing** (12 rounds) for all passwords
- **Password strength requirements:**
  - Minimum 8 characters
  - At least one uppercase letter (A-Z)
  - At least one lowercase letter (a-z)
  - At least one number (0-9)
  - At least one special character (!@#$%^&*...)
- Real-time password strength indicator in forms

### 2. Brute Force Protection
- **Rate limiting:** 5 failed login attempts
- **Account lockout:** 15 minutes after max attempts
- Failed attempts counter resets on successful login

### 3. Input Sanitization
- All user inputs sanitized with DOMPurify
- Prevents XSS (Cross-Site Scripting) attacks
- Email validation with regex pattern

### 4. Security Utilities (`src/lib/security.ts`)
```typescript
// Password hashing
const hashedPassword = await hashPassword(password);
const isValid = await verifyPassword(password, hashedPassword);

// Password strength validation
const { valid, message } = validatePasswordStrength(password);

// Input sanitization
const cleanInput = sanitizeInput(userInput);

// Rate limiting
const { locked, remainingTime } = isAccountLocked(email);
recordFailedLogin(email);
clearLoginAttempts(email);
```

### 5. Row Level Security (RLS)
All tables have RLS policies enabled. For development, most tables use "Allow all" policies, but `daily_accounting` has restricted policies:
- `SELECT`/`INSERT`: allowed for authenticated users
- `UPDATE`: allowed for authenticated users, but setting `isdeleted = true` requires `admin` or `manager`
- `DELETE`: only `admin` or `manager` (hard delete)
- A `public.user_has_role()` helper function (SECURITY DEFINER) is used for role checks
- For production, restrict other tables similarly based on user roles.

### Database Index Recommendations
For optimal performance, create these indexes in Supabase SQL Editor:
```sql
-- Critical indexes for auth lookups (prevents query hanging)
CREATE INDEX IF NOT EXISTS idx_users_authuid ON users(authuid);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- Recommended indexes for frequently filtered tables
CREATE INDEX IF NOT EXISTS idx_profiles_userid ON profiles(userid);
CREATE INDEX IF NOT EXISTS idx_profiles_positionid ON profiles(positionid);
CREATE INDEX IF NOT EXISTS idx_schedules_date ON schedules(date);
CREATE INDEX IF NOT EXISTS idx_schedules_employeeid ON schedules(employeeid);
CREATE INDEX IF NOT EXISTS idx_attendances_employeeid ON attendances(employeeid);
CREATE INDEX IF NOT EXISTS idx_leave_requests_employeeid ON leave_requests(employeeid);
CREATE INDEX IF NOT EXISTS idx_daily_accounting_date ON daily_accounting(date);
CREATE INDEX IF NOT EXISTS idx_notifications_userid ON notifications(userid);
```

## Adding New shadcn/ui Components

```bash
# Using shadcn CLI (if available)
npx shadcn add <component-name>

# Or manually copy from shadcn/ui registry to src/components/ui/
```

## Default Demo Credentials

| Email | Password | Role |
|-------|----------|------|
| admin@gasstation.com | Admin@123 | admin |
| manager@gasstation.com | Manager@123 | manager |
| somchai@gasstation.com | Staff@123 | staff |
| somying@gasstation.com | Staff@123 | staff |
| mani@gasstation.com | Staff@123 | staff |
| prasit@gasstation.com | Staff@123 | staff |

**Note:** Passwords must be at least 8 characters with uppercase, lowercase, number, and special character.

## Backup & Restore System

### Overview
The backup system allows Admin users to export selected database tables to a JSON file and restore from a backup file with table selection. This is implemented in `src/data/storage.ts` as `backupStorage`.

### Backup Table Names
```typescript
type BackupTableName = 
  | 'users' | 'profiles' | 'positions' | 'skills' | 'profile_skills'
  | 'shifts' | 'schedules' | 'leave_requests' | 'swap_requests'
  | 'attendances' | 'daily_accounting' | 'fuel_prices' | 'notifications'
  | 'fuel_inventory' | 'fuel_deliveries' | 'products' 
  | 'product_transactions' | 'suppliers' | 'sales'
  | 'payroll_periods' | 'payroll_records' | 'promotions';
```

### Backup Data Structure
```typescript
interface BackupData {
  version: string;        // Backup format version
  exportedAt: string;     // ISO timestamp
  exportedBy: string;     // Admin email
  selectedTables: BackupTableName[];  // Tables included in this backup
  tables: {
    users?: User[];
    profiles?: EmployeeProfile[];
    positions?: Position[];
    skills?: Skill[];
    profile_skills?: { profileid: string; skillid: string }[];
    shifts?: Shift[];
    schedules?: Schedule[];
    leave_requests?: LeaveRequest[];
    swap_requests?: SwapRequest[];
    attendances?: Attendance[];
    daily_accounting?: DailyAccounting[];
    fuel_prices?: FuelPrice[];
    notifications?: Notification[];
    fuel_inventory?: unknown[];
    fuel_deliveries?: unknown[];
    products?: unknown[];
    product_transactions?: unknown[];
    suppliers?: unknown[];
    sales?: unknown[];
  };
}
```

### Backup Functions
```typescript
// Export selected tables
const selectedTables: BackupTableName[] = ['users', 'profiles', 'shifts'];
const backupData = await backupStorage.exportSelected(userEmail, selectedTables);

// Export all data (legacy)
const backupData = await backupStorage.exportAll(userEmail);

// Download as file
backupStorage.downloadBackup(backupData);
// File name: backup-gasstation-YYYY-MM-DDTHH-mm-ss.json

// Validate backup file
const isValid = backupStorage.validateBackup(jsonData);

// Restore all tables from backup
const result = await backupStorage.restoreFromBackup(backupData);

// Restore selected tables only
const tablesToRestore: BackupTableName[] = ['users', 'profiles'];
const result = await backupStorage.restoreFromBackup(backupData, tablesToRestore);
// Returns: { success: boolean; error?: string }
```

### Table Dependencies
Tables are automatically sorted by dependencies during restore:
- **No dependencies**: positions, skills, shifts, fuel_prices, suppliers
- **Depends on profiles**: users, leave_requests, attendances, daily_accounting, sales
- **Depends on profiles + skills**: profile_skills
- **Depends on shifts + profiles**: schedules, swap_requests, attendances
- **Depends on suppliers**: products, fuel_deliveries
- **Depends on products**: product_transactions
- **Depends on payroll_periods**: payroll_records

### Restore Process
1. Tables are sorted by dependencies (topological sort)
2. Each table is restored in order using `upsert()`
3. Only selected tables are restored (if specified)
4. Foreign key constraints are respected automatically

### UI Features
- **Backup Dialog**: Checkbox list of all 21 tables with "Select All" / "Deselect All" buttons
- **Restore Dialog**: Shows only tables present in the backup file with record counts
- **Progress Indication**: Shows number of selected tables in button labels

### Database-Level Backup
In addition to the in-app JSON backup/restore, the project includes two options for **database-level backup**:

#### Option 1: Edge Function Logical Backup (Recommended for free tier)
This is the default backup method triggered from the Settings page. It runs entirely on Supabase and does not require GitHub Actions.

**Files:**
- `supabase/functions/backup-database/index.ts` - Edge Function that queries all tables and generates SQL INSERT statements
- `sql/create-backups-bucket.sql` - SQL to create the private `backups` Storage bucket (optional; the function also auto-creates the bucket)
- `src/lib/api.ts` - Frontend API client with `backupApi.triggerDatabaseBackup()`
- `src/pages/Settings.tsx` - UI button for admin users to trigger the backup

**What it does:**
1. Validates the user JWT (admin/manager) or `x-backup-secret` (cron jobs)
2. Queries data from all major tables using the service role key
3. Generates a `.sql` file with `TRUNCATE` and `INSERT` statements
4. Creates the `backups` Storage bucket if it does not exist and uploads the `.sql` file
5. Sends a success notification to all admin/manager users
6. Can be triggered manually from the Settings page or automatically via cron-job.org

**Required Supabase Edge Function Secrets:**
- `SUPABASE_URL` - Project URL
- `SUPABASE_SERVICE_ROLE_KEY` - Service role key
- `BACKUP_SECRET_KEY` - Random secret key for cron job authentication

**Setup:**
1. (Optional) Run `sql/create-backups-bucket.sql` in the Supabase SQL Editor, or let the Edge Function create the bucket automatically on first run
2. Set the required Supabase secrets:
   ```bash
   supabase secrets set SUPABASE_URL=https://your-project.supabase.co
   supabase secrets set SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
   supabase secrets set BACKUP_SECRET_KEY=your-random-secret-key
   ```
3. Deploy the Edge Function with JWT verification disabled so cron jobs can call it directly:
   ```bash
   supabase functions deploy backup-database --no-verify-jwt
   ```

**Automated scheduling with cron-job.org:**
1. Sign up at https://cron-job.org
2. Create a new cron job with URL:
   ```
   https://your-project.supabase.co/functions/v1/backup-database
   ```
3. Method: `POST`
4. Headers:
   - `Content-Type: application/json`
   - `x-backup-secret: your-random-secret-key`
5. Body: empty or `{}`
6. Schedule: daily at your preferred time (e.g., 02:00 Thailand time)
7. Notifications: all admin/manager users will receive a realtime notification after each successful backup

#### Option 2: GitHub Actions + pg_dump (Paused)
This method provides a true native `pg_dump` backup including schema, indexes, constraints, and functions. It requires a working GitHub Actions account.

**Status:** Currently paused because the GitHub account is locked due to a billing issue. The workflow will resume automatically once the billing lock is resolved.

**Files:**
- `.github/workflows/database-backup.yml` - Scheduled workflow that runs daily at 02:00 AM (Thailand time) or when triggered from the web app
- `scripts/upload-backup.py` - Python script that uploads the compressed backup to Supabase Storage
- `supabase/functions/trigger-database-backup/index.ts` - Edge Function that triggers the backup from the web app

**Required GitHub Secrets:**
- `SUPABASE_URL` - Project URL
- `SUPABASE_SERVICE_ROLE_KEY` - Service role key (for uploading to Storage)
- `SUPABASE_DB_URL` - PostgreSQL connection string for `pg_dump`

**Required Supabase Edge Function Secrets (for web trigger):**
- `GITHUB_PAT` - GitHub Personal Access Token with `repo` or `actions:write` permission
- `GITHUB_REPO_OWNER` - GitHub username or organization that owns the repo
- `GITHUB_REPO_NAME` - Repository name

**Restore from a database backup:**
```bash
# For GitHub Actions pg_dump backup
gunzip gasstation-backup-YYYYmmdd-HHMMSS.sql.gz
psql "${SUPABASE_DB_URL}" < gasstation-backup-YYYYmmdd-HHMMSS.sql

# For Edge Function logical backup
psql "${SUPABASE_DB_URL}" < logical-backup-YYYY-MM-DD-HH-mm-ss.sql
```

**Note:** The GitHub Actions backup contains the full database schema and data (including indexes, constraints, and functions). The Edge Function logical backup contains data only as INSERT statements and assumes the schema already exists.

## Common Development Tasks

### Adding a New Page
1. Create component in `src/pages/NewPage.tsx`
2. Add route in `src/App.tsx` within Layout
3. Add to sidebar navigation in `src/components/layout/Sidebar.tsx`
4. Protect with ProtectedRoute if needed

### Adding a New Context
1. Create context in `src/contexts/NewContext.tsx`
2. Add Provider wrapper in `src/App.tsx` (outer to inner order matters)
3. Export custom hook from context file
4. Use hook in components

### Modifying Types
1. Update interfaces in `src/types/index.ts`
2. Update storage operations in `src/data/storage.ts` if needed

### Resetting Database Data
1. Delete data from Supabase tables via Dashboard
2. Re-run `sql/database-setup.sql` if needed
3. Re-create auth users in Authentication → Users
4. Re-run UUID linking SQL

## iOS & Mobile App Support

The application supports installation on iOS through two methods:

### 1. PWA (Progressive Web App) - Recommended for immediate use

Install directly from Safari without App Store:
1. Open Safari and navigate to the deployed web app
2. Tap the Share button (⟰)
3. Select "Add to Home Screen"
4. The app will appear on the home screen with full-screen experience

**PWA Assets generated:**
- Icons: 72×72, 96×96, 128×128, 144×144, 152×152, 192×192, 384×384, 512×512
- iOS Splash Screens: All iPhone and iPad sizes (13 variants)
- Screenshots: Wide (1280×720) and Narrow (720×1280) for install prompts

**iOS-specific features:**
- `apple-mobile-web-app-capable`: Enables full-screen mode
- `apple-mobile-web-app-status-bar-style`: Translucent status bar
- Apple Touch Icons for all device sizes
- Startup splash images for instant visual feedback

### 2. Native iOS App (Capacitor)

Build a native iOS app for App Store distribution:

**Prerequisites:**
- macOS with Xcode installed
- Apple Developer Account ($99/year)

**Build steps:**
```bash
# 1. Build the web app
npm run build

# 2. Sync web assets to iOS project
npx cap sync ios

# 3. Open in Xcode
npx cap open ios

# 4. In Xcode: Product → Archive → Distribute App
```

**Capacitor configuration:**
- App ID: `com.gasstation.shiftmanager`
- Status bar: Blue (#3b82f6) with dark text
- Keyboard: Body resize mode
- Splash screen: 2 seconds with spinner

### Generating PWA Assets

If you update the app icon (`public/favicon.svg`), regenerate all assets:

```bash
node scripts/generate-pwa-assets.cjs
```

This uses `sharp` to generate icons and splash screens from the SVG source.

## Deployment

This is a static SPA (Single Page Application):

```bash
# Build
npm run build

# Deploy dist/ folder to:
# - Netlify
# - Vercel
# - GitHub Pages
# - Any static hosting
```

Note: `vite.config.ts` has `base: './'` for relative path deployment.

### iOS App Store Deployment

After building with Capacitor:
1. Open `ios/App/App.xcworkspace` in Xcode
2. Configure signing with your Apple Developer Team
3. Update version and build numbers in Xcode
4. Product → Archive
5. Distribute App → App Store Connect
6. Submit for review in App Store Connect

## Recent Updates

### Latest Updates (July 2026)
- **Reports Page Loading Fix** - Fixed infinite loading spinner on the Reports → Accounting tab
  - Root cause: `loadAccountsByDateRange` in `DailyAccountingContext` depended on `dailyAccounts`, causing an infinite loop when the effect updated state
  - Fix: Removed `dailyAccounts` from the callback dependency array and used a ref for fallback data
  - Added `try/catch/finally` in `Reports.tsx` to ensure `isAccountingLoading` is always reset
  - Added 5s timeout wrapper to `dailyAccountingStorage.getAll()` and `getByDateRange()` as a safety net
- **Branch/Station Filtering** - Multi-branch support with station-scoped data
  - `AuthContext` auto-sets `currentStation` from profile on login
  - `EmployeeContext` provides `filteredEmployees` by station
  - `ScheduleContext` filters schedules, leave, and swap requests by station
  - `AttendanceContext` filters attendance records by employee station
  - `DailyAccountingContext` filters accounting records by employee station
  - `Reports` page shows station name in subtitle
  - Employees page has station selector in add/edit forms + station column
  - Header shows station badge for staff, dropdown selector for admin/manager
- **Performance & Loading Fixes** - Fixed infinite loading spinner on page refresh
  - Added `src/lib/cache.ts` - localStorage cache with TTL for all Supabase queries
  - Staggered context loading - loads one entity at a time instead of Promise.all flooding
  - Timeout fallbacks (1.5-2s) on all storage queries to prevent indefinite hangs
  - Changed `.single()` to `.maybeSingle()` for user lookups to prevent 406/timeout errors
  - StationSelector no longer triggers full page reload on branch change
  - Database indexes added: `idx_users_authuid`, `idx_users_email`
- **iOS & Mobile App Support** - Full PWA and native iOS app capabilities
  - PWA assets: Icons (8 sizes), iOS splash screens (13 sizes), screenshots
  - Safari "Add to Home Screen" support with full-screen experience
  - Capacitor iOS platform configured for App Store distribution
  - `vite-plugin-pwa` with Workbox for automatic service worker generation
  - Asset generation script: `scripts/generate-pwa-assets.cjs`
- **Payroll System (Phase 2)** - Payroll period and record tables with salary calculation support
  - Tables: `payroll_periods`, `payroll_records`
  - Graceful handling when tables don't exist (PGRST205)
- **Audit Trail (Phase 2)** - Track all data changes with user attribution
  - Table: `audit_logs` with RLS policies
  - Columns: `performed_by`, `performed_by_email`, `performed_by_name` (human-readable name)
  - Requires `auth.uid()::text` cast for UUID comparison
- **Dashboard Analytics** - Stock prediction and sales analytics
  - `predictFuelStock()` - Predict days until fuel stock runs out
  - `predictProductStock()` - Predict product stock depletion
  - `getDailySalesTrend()` - Daily sales comparison
  - `getAttendanceRate()` - Monthly attendance statistics
- **Smart Alerts** - Configurable alert rules for low stock and anomalies
  - Table: `alert_rules`
- **Offline-First Architecture** - Complete offline support with IndexedDB, Service Worker, and background sync
  - Works without internet connection
  - Auto-queues operations for later sync
  - Background sync when connectivity restored
  - Optimistic UI updates with conflict resolution
- **POS System** - Full Point of Sale with offline support
  - Sell fuel by amount or liters
  - Product sales with barcode support
  - Multiple payment methods (Cash, Card, QR, E-Wallet)
  - Offline sale queue with auto-sync
- **Inventory Management System** - Complete fuel stock tracking, shop products, and supplier management
- **Database Backup & Restore** - Admin can export selected database tables to JSON file and restore specific tables from backup file
- **Export Excel & PDF (Client-side)** - Generate reports and receipts directly in the browser using `xlsx` and `jspdf` with Thai font support. Works offline without calling server-side Edge Functions.
- **Debug Console.log Cleanup** - Removed all debug console.log statements from production code
- **Fuel Price Form Enhancement** - Price form now auto-populates with the latest saved fuel prices
- **Import Path Fix** - Fixed NotificationContext import path to use `@/` alias consistently
- **Audit Log Page (Standalone)** - New `/audit-logs` page with full-featured audit trail viewer:
  - Diff dialog showing field-by-field changes for updates
  - Human-readable record labels extracted from `old_value`/`new_value` (names, dates, etc.)
  - Performer display with name, email, and system indicator (ไอคอน + "ระบบอัตโนมัติ")
  - Search by record ID, performer, or email
  - Filter by table, action (create/update/delete), and date range
  - Pagination with page numbers and configurable page size
  - Mobile card layout + desktop table layout
  - CSV export with Thai Excel BOM
- **Audit Log Record Label Enhancement** - Replaces raw UUIDs with meaningful names/dates using `getRecordLabel()` helper
- **Audit Log Performer Name Enhancement** - Auto-captures `profile.fullName` as `performedByName` via `AuditContext`
- **Sidebar Navigation Grouping** - Menu organized into 7 business groups: หลัก, งานและบุคคล, คลังและสินค้า, บัญชีและเงิน, สมาชิก, แจ้งเตือน, ตั้งค่าระบบ
- **Promotion Management** - Create/manage fuel promotions (threshold, happy hour, percentage, fixed amount) with time-based and fuel-type filtering
- **Daily Accounting Auto-fill** - Opening meter and cash values are now auto-populated from the previous record's closing values (`getPreviousMeterReading`, `getPreviousDispenserCash`)
- **Daily Accounting Start Values Locked** - Start meter and start cash fields are now disabled (read-only) in both add and edit dialogs to prevent accidental changes to carried-forward values
- **Daily Accounting CashAmount Calculation Fix** - `cashAmount` is now always calculated directly from `dispenserCash` (end - start) in both `addDailyAccount` and `updateDailyAccount`. This ensures `difference` always matches the form calculation.
- **Daily Accounting DB Mapping Fix** - `mapDailyAccountingFromDb` now uses `??` (nullish coalescing) instead of `||` to correctly handle zero values (`cashAmount=0`, `difference=0`)
- **Accessibility Improvements** - Added `id` and `htmlFor` attributes to all Label/Input pairs in `DailyAccounting.tsx` (46 fields) to fix Lighthouse accessibility warnings
- **Audit Log 400 Bad Request Fix** - Added `sanitizeForJsonb()` helper to strip undefined values and circular references before inserting into `audit_logs`. Also improved error logging with message, code, and details.
- **Bug Fixes**:
  - `sale_items` table removed - queries now use `sales.items` JSONB
  - `fuel_inventory` 406 error fixed - removed `.single()` to prevent 406 on empty results
  - `payroll_periods` 404 handled gracefully - no console errors when table missing

### Phase 1: Mobile & Notifications (Completed)
- **Real Notifications System** - Supabase-backed notifications with auto-triggers
- **Mobile-First Responsive** - Hamburger sidebar, card layouts, touch-friendly UI
- **Supabase Auth Integration** - Migrated from localStorage to Supabase Auth
- **Performance Optimizations** - Lazy loading, code splitting, context memoization
- **Accessibility Improvements** - ARIA labels, Thai locale, keyboard navigation

### Database & Security
- **Foreign Key Constraints** - Proper ON DELETE CASCADE for related tables
- **RLS Policies** - Row Level Security enabled on all tables
- **Password Security** - bcrypt hashing with strength validation
- **Rate Limiting** - 5 attempts with 15-minute lockout
