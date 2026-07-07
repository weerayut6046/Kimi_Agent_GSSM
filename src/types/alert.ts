export type AlertSeverity = 'low' | 'medium' | 'high' | 'critical';

export interface Alert {
  id: string;
  type: string;
  title: string;
  message: string;
  severity: AlertSeverity;
  isRead: boolean;
  isResolved: boolean;
  relatedTable?: string;
  relatedId?: string;
  createdAt: string;
  resolvedAt?: string;
}
