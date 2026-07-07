import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, CheckCheck, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useAlerts } from '@/contexts/AlertContext';
import { formatDistanceToNow } from 'date-fns';
import { th } from 'date-fns/locale';

const AlertBell: React.FC = () => {
  const navigate = useNavigate();
  const { alerts, unreadCount, markAsRead, markAllAsRead } = useAlerts();

  const recentAlerts = useMemo(
    () => alerts.filter((a) => !a.isRead && !a.isResolved).slice(0, 10),
    [alerts]
  );

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'bg-red-500';
      case 'high':
        return 'bg-orange-500';
      case 'medium':
        return 'bg-amber-500';
      default:
        return 'bg-blue-500';
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative min-w-[44px] min-h-[44px]"
          aria-label={`แจ้งเตือนภัย (${unreadCount} ใหม่)`}
        >
          <AlertTriangle className="w-5 h-5" aria-hidden="true" />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs bg-orange-500"
              aria-hidden="true"
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 max-h-[70vh] overflow-y-auto">
        <div className="px-3 py-2 border-b border-border flex items-center justify-between">
          <p className="font-medium text-sm">แจ้งเตือนภัย</p>
          {unreadCount > 0 && (
            <button
              onClick={markAllAsRead}
              className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1"
              aria-label="อ่านทั้งหมด"
            >
              <CheckCheck className="w-3 h-3" />
              อ่านทั้งหมด
            </button>
          )}
        </div>
        {recentAlerts.length > 0 ? (
          <>
            {recentAlerts.map((alert) => (
              <DropdownMenuItem
                key={alert.id}
                className={cn(
                  'flex flex-col items-start py-3 cursor-pointer border-b border-slate-50 last:border-b-0',
                  !alert.isRead && 'bg-muted'
                )}
                onClick={() => {
                  if (!alert.isRead) markAsRead(alert.id);
                }}
              >
                <div className="flex items-start gap-2 w-full">
                  <div
                    className={cn('w-2 h-2 rounded-full mt-1.5 shrink-0', getSeverityColor(alert.severity))}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm">{alert.title}</p>
                    <p className="text-sm text-muted-foreground break-words">{alert.message}</p>
                    <p className="text-xs text-muted-foreground/70 mt-1">
                      {formatDistanceToNow(new Date(alert.createdAt), { addSuffix: true, locale: th })}
                    </p>
                  </div>
                  {!alert.isRead && (
                    <span className="w-2 h-2 bg-orange-500 rounded-full shrink-0 mt-1.5" aria-hidden="true" />
                  )}
                </div>
              </DropdownMenuItem>
            ))}
            <div className="border-t border-slate-100">
              <DropdownMenuItem
                className="flex items-center justify-center py-2.5 text-sm text-blue-600 hover:text-blue-800 cursor-pointer"
                onClick={() => navigate('/alerts')}
              >
                ดูทั้งหมด
                <ArrowRight className="w-4 h-4 ml-1" aria-hidden="true" />
              </DropdownMenuItem>
            </div>
          </>
        ) : (
          <>
            <div className="px-3 py-4 text-center text-sm text-slate-500">ไม่มีแจ้งเตือนภัย</div>
            <div className="border-t border-slate-100">
              <DropdownMenuItem
                className="flex items-center justify-center py-2.5 text-sm text-blue-600 hover:text-blue-800 cursor-pointer"
                onClick={() => navigate('/alerts')}
              >
                ดูทั้งหมด
                <ArrowRight className="w-4 h-4 ml-1" aria-hidden="true" />
              </DropdownMenuItem>
            </div>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default AlertBell;
