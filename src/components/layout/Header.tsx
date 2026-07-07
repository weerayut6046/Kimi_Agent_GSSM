import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, Menu, CheckCheck, ArrowRight, Building } from 'lucide-react';
import AlertBell from '@/components/common/AlertBell';
import StationSelector from '@/components/common/StationSelector';
import ThemeToggle from '@/components/common/ThemeToggle';
import { useStations } from '@/contexts/StationContext';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { useNotifications } from '@/contexts/NotificationContext';
import { formatDistanceToNow } from 'date-fns';
import { th } from 'date-fns/locale';

interface HeaderProps {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  onMenuClick?: () => void;
  className?: string;
}

const Header: React.FC<HeaderProps> = ({
  title,
  subtitle,
  actions,
  onMenuClick,
  className,
}) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { currentStation } = useStations();
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();

  const recentNotifications = useMemo(() => notifications.slice(0, 10), [notifications]);

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'success': return 'bg-green-500';
      case 'warning': return 'bg-amber-500';
      case 'error': return 'bg-red-500';
      default: return 'bg-blue-500';
    }
  };

  return (
    <header className={cn(
      'bg-background border-b border-border px-4 sm:px-6 py-4 sticky top-0 z-40',
      className
    )}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 sm:gap-4">
          {onMenuClick && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onMenuClick}
              className="lg:hidden min-w-[44px] min-h-[44px]"
              aria-label="เปิดเมนู"
            >
              <Menu className="w-5 h-5" aria-hidden="true" />
            </Button>
          )}
          
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-foreground">{title}</h1>
            {subtitle && (
              <p className="text-sm text-muted-foreground mt-0.5 hidden sm:block">{subtitle}</p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          {actions}

          {/* Station Selector (admin/manager only) */}
          {(user?.role === 'admin' || user?.role === 'manager') && <StationSelector />}

          {/* Station Badge (staff only) */}
          {user?.role === 'staff' && currentStation && (
            <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-100 rounded-md text-sm text-slate-600">
              <Building className="w-3.5 h-3.5" />
              <span className="hidden sm:inline max-w-[120px] truncate">{currentStation.name}</span>
            </div>
          )}

          {/* Theme Toggle */}
          <ThemeToggle />

          {/* Alert Bell */}
          <AlertBell />
          
          {/* Notifications */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="relative min-w-[44px] min-h-[44px]"
                aria-label={`การแจ้งเตือน (${unreadCount} ใหม่)`}
              >
                <Bell className="w-5 h-5" aria-hidden="true" />
                {unreadCount > 0 && (
                  <Badge
                    variant="destructive"
                    className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
                    aria-hidden="true"
                  >
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </Badge>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80 max-h-[70vh] overflow-y-auto">
              <div className="px-3 py-2 border-b border-border flex items-center justify-between">
                <p className="font-medium text-sm">การแจ้งเตือน</p>
                {unreadCount > 0 && (
                  <button
                    onClick={markAllAsRead}
                    className="text-xs text-primary hover:text-primary/80 flex items-center gap-1"
                    aria-label="อ่านทั้งหมด"
                  >
                    <CheckCheck className="w-3 h-3" />
                    อ่านทั้งหมด
                  </button>
                )}
              </div>
              {recentNotifications.length > 0 ? (
                <>
                  {recentNotifications.map((notif) => (
                    <DropdownMenuItem
                      key={notif.id}
                      className={cn(
                        'flex flex-col items-start py-3 cursor-pointer border-b border-border/50 last:border-b-0',
                        !notif.read && 'bg-muted'
                      )}
                      onClick={() => {
                        if (!notif.read) markAsRead(notif.id);
                      }}
                    >
                      <div className="flex items-start gap-2 w-full">
                        <div className={cn('w-2 h-2 rounded-full mt-1.5 shrink-0', getTypeColor(notif.type))} />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm">{notif.title}</p>
                          <p className="text-sm text-muted-foreground break-words">{notif.message}</p>
                          <p className="text-xs text-muted-foreground/70 mt-1">
                            {formatDistanceToNow(new Date(notif.createdAt), { addSuffix: true, locale: th })}
                          </p>
                        </div>
                        {!notif.read && (
                          <span className="w-2 h-2 bg-blue-500 rounded-full shrink-0 mt-1.5" aria-hidden="true" />
                        )}
                      </div>
                    </DropdownMenuItem>
                  ))}
                  <div className="border-t border-border">
                    <DropdownMenuItem
                      className="flex items-center justify-center py-2.5 text-sm text-primary hover:text-primary/80 cursor-pointer"
                      onClick={() => navigate('/notifications')}
                    >
                      ดูทั้งหมด
                      <ArrowRight className="w-4 h-4 ml-1" aria-hidden="true" />
                    </DropdownMenuItem>
                  </div>
                </>
              ) : (
                <>
                  <div className="px-3 py-4 text-center text-sm text-muted-foreground">
                    ไม่มีการแจ้งเตือน
                  </div>
                  <div className="border-t border-border">
                    <DropdownMenuItem
                      className="flex items-center justify-center py-2.5 text-sm text-primary hover:text-primary/80 cursor-pointer"
                      onClick={() => navigate('/notifications')}
                    >
                      ดูทั้งหมด
                      <ArrowRight className="w-4 h-4 ml-1" aria-hidden="true" />
                    </DropdownMenuItem>
                  </div>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
};

export default Header;
