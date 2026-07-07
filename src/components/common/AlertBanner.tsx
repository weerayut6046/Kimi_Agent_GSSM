import React from 'react';
import { AlertTriangle, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useAlerts } from '@/contexts/AlertContext';

const AlertBanner: React.FC = () => {
  const { alerts, markAsRead } = useAlerts();

  const highAlerts = alerts.filter(
    (a) => !a.isRead && !a.isResolved && (a.severity === 'high' || a.severity === 'critical')
  );

  if (highAlerts.length === 0) return null;

  const topAlert = highAlerts[0];

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'bg-red-600 text-white';
      case 'high':
        return 'bg-orange-500 text-white';
      default:
        return 'bg-amber-400 text-white';
    }
  };

  return (
    <div className={cn('px-4 py-3', getSeverityColor(topAlert.severity))}>
      <div className="flex items-center justify-between max-w-7xl mx-auto gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <AlertTriangle className="w-5 h-5 shrink-0" />
          <div className="min-w-0">
            <p className="font-semibold text-sm truncate">{topAlert.title}</p>
            <p className="text-sm opacity-90 truncate">{topAlert.message}</p>
          </div>
          {highAlerts.length > 1 && (
            <span className="text-xs bg-white/20 px-2 py-0.5 rounded-full shrink-0">
              +{highAlerts.length - 1}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button
            variant="ghost"
            size="sm"
            className="text-white hover:bg-white/20 h-8 px-2 text-xs sm:text-sm"
            onClick={() => markAsRead(topAlert.id)}
          >
            อ่านแล้ว
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="text-white hover:bg-white/20 h-8 px-2 text-xs sm:text-sm hidden sm:inline-flex"
            onClick={() => markAsRead(topAlert.id)}
          >
            ดูทั้งหมด
            <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default AlertBanner;
