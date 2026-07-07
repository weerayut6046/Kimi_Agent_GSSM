// Audit Trail Types

export type AuditAction = 'create' | 'update' | 'delete';

export interface AuditLog {
  id: string;
  tableName: string;
  recordId: string;
  action: AuditAction;
  oldValue: Record<string, unknown> | null;
  newValue: Record<string, unknown> | null;
  performedBy: string;
  performedByEmail: string | null;
  performedByName: string | null;
  performedAt: string;
  ipAddress: string | null;
}

export interface AuditLogFilter {
  tableName?: string;
  action?: AuditAction;
  performedBy?: string;
  startDate?: string;
  endDate?: string;
  searchTerm?: string;
}

export interface AuditLogStats {
  totalLogs: number;
  createCount: number;
  updateCount: number;
  deleteCount: number;
  topTables: { tableName: string; count: number }[];
}
