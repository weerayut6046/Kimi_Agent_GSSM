// Barrel file - re-exports everything from storage modules
// This preserves backward compatibility for imports like:
//   import { employeeStorage } from '@/data/storage';

export * from './baseStorage';
export * from './alertStorage';
export * from './auditStorage';
export * from './customerStorage';
export * from './inventoryStorage';
export * from './payrollStorage';
export * from './posStorage';
export * from './backupStorage';
