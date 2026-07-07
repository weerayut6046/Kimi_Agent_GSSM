import type { AuditLog } from '@/types/audit';

export const getRecordLabel = (log: AuditLog): string => {
  const data = log.newValue || log.oldValue;
  if (!data || typeof data !== 'object') {
    return log.recordId.length > 20 ? log.recordId.slice(0, 18) + '…' : log.recordId;
  }

  const d = data as Record<string, unknown>;
  const table = log.tableName;

  const first = (keys: string[]): string | null => {
    for (const k of keys) {
      if (d[k] !== undefined && d[k] !== null && d[k] !== '') {
        return String(d[k]);
      }
    }
    return null;
  };

  switch (table) {
    case 'profiles':
      return first(['fullname', 'fullName', 'name']) ||
        `${d.firstname || ''} ${d.lastname || ''}`.trim() ||
        log.recordId;
    case 'users':
      return first(['email', 'name']) || log.recordId;
    case 'shifts':
    case 'positions':
    case 'skills':
    case 'stations':
    case 'products':
    case 'suppliers':
      return first(['name', 'title']) || log.recordId;
    case 'schedules':
      return first(['date']) || log.recordId;
    case 'leave_requests':
      return first(['reason', 'startdate', 'startDate']) || log.recordId;
    case 'swap_requests':
      return `คำขอสลับกะ #${log.recordId.slice(-6)}`;
    case 'attendances': {
      const checkin = d.checkin || d.checkIn;
      if (checkin) {
        try {
          return `ลงเวลา ${new Date(String(checkin)).toLocaleDateString('th-TH')}`;
        } catch { /* noop */ }
      }
      return `ลงเวลา #${log.recordId.slice(-6)}`;
    }
    case 'daily_accounting':
      return first(['date']) ? `บัญชีรายวัน ${d.date}` : log.recordId;
    case 'fuel_prices':
      return first(['effectivedate', 'effectiveDate']) ? `ราคาน้ำมัน ${d.effectivedate || d.effectiveDate}` : log.recordId;
    case 'sales':
      return first(['receiptnumber', 'receiptNumber', 'total', 'date']) || `ขาย #${log.recordId.slice(-6)}`;
    case 'promotions':
      return first(['name', 'title']) || log.recordId;
    case 'payroll_periods':
      return first(['name']) || (d.startdate || d.startDate ? `รอบ ${d.startdate || d.startDate}` : log.recordId);
    case 'payroll_records':
      return `บันทึกเงินเดือน #${log.recordId.slice(-6)}`;
    case 'fuel_inventory':
      return first(['fueltype', 'fuel_type', 'date']) || `สต็อก #${log.recordId.slice(-6)}`;
    case 'fuel_deliveries':
      return first(['fueltype', 'fuel_type', 'date']) || `รับน้ำมัน #${log.recordId.slice(-6)}`;
    case 'product_transactions':
      return first(['productid', 'date']) || `เคลื่อนไหว #${log.recordId.slice(-6)}`;
    case 'notifications':
      return first(['title', 'message']) || log.recordId;
    default:
      return log.recordId.length > 20 ? log.recordId.slice(0, 18) + '…' : log.recordId;
  }
};

export const getPerformerInfo = (log: AuditLog): { name: string; subtitle?: string; isSystem: boolean } => {
  if (log.performedByName) {
    return { name: log.performedByName, subtitle: log.performedByEmail || undefined, isSystem: false };
  }
  if (log.performedBy === 'system') {
    return { name: 'ระบบอัตโนมัติ', subtitle: log.performedByEmail || undefined, isSystem: true };
  }
  if (log.performedByEmail) {
    return { name: log.performedByEmail, subtitle: log.performedBy !== log.performedByEmail ? log.performedBy : undefined, isSystem: false };
  }
  return { name: `ผู้ใช้ ${log.performedBy.slice(0, 12)}${log.performedBy.length > 12 ? '…' : ''}`, isSystem: false };
};
