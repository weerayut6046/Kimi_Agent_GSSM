import React, { useState, useMemo } from 'react';
import { useOutletContext } from 'react-router-dom';
import {
  AlertTriangle,
  RefreshCw,
  CheckCheck,
  CheckCircle,
  Clock,
  ShieldAlert,
  Shield,
  Info,
  Filter,
} from 'lucide-react';
import Header from '@/components/layout/Header';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

import { useAlerts } from '@/contexts/AlertContext';
import { formatThaiDate, getCurrentDate } from '@/utils/dateUtils';
import { cn } from '@/lib/utils';
import type { AlertSeverity } from '@/types';

interface LayoutContext {
  onMenuClick: () => void;
}

type TabValue = 'all' | 'unread' | 'resolved';

const severityConfig: Record<
  AlertSeverity,
  { label: string; color: string; icon: React.ElementType; bgColor: string }
> = {
  critical: {
    label: 'วิกฤต',
    color: 'text-red-700 border-red-300 bg-red-50',
    icon: ShieldAlert,
    bgColor: 'bg-red-500',
  },
  high: {
    label: 'สูง',
    color: 'text-orange-700 border-orange-300 bg-orange-50',
    icon: Shield,
    bgColor: 'bg-orange-500',
  },
  medium: {
    label: 'ปานกลาง',
    color: 'text-amber-700 border-amber-300 bg-amber-50',
    icon: AlertTriangle,
    bgColor: 'bg-amber-500',
  },
  low: {
    label: 'ต่ำ',
    color: 'text-blue-700 border-blue-300 bg-blue-50',
    icon: Info,
    bgColor: 'bg-blue-500',
  },
};

const alertTypeLabels: Record<string, string> = {
  low_fuel_stock: 'สต็อกน้ำมันต่ำ',
  low_product_stock: 'สินค้าใกล้หมด',
  consecutive_absence: 'ขาดงานติดต่อกัน',
  low_sales: 'ยอดขายผิดปกติ',
  cash_discrepancy: 'เงินสดผิดส่ง',
};

const Alerts: React.FC = () => {
  const { onMenuClick } = useOutletContext<LayoutContext>();
  const { alerts, isLoading, unreadCount, markAsRead, markAllAsRead, resolveAlert, checkRules } =
    useAlerts();

  const [activeTab, setActiveTab] = useState<TabValue>('all');
  const [severityFilter, setSeverityFilter] = useState<AlertSeverity | 'all'>('all');
  const [isChecking, setIsChecking] = useState(false);

  const handleCheckRules = async () => {
    setIsChecking(true);
    await checkRules();
    setIsChecking(false);
  };

  const filteredAlerts = useMemo(() => {
    let result = [...alerts];

    if (activeTab === 'unread') {
      result = result.filter((a) => !a.isRead && !a.isResolved);
    } else if (activeTab === 'resolved') {
      result = result.filter((a) => a.isResolved);
    }

    if (severityFilter !== 'all') {
      result = result.filter((a) => a.severity === severityFilter);
    }

    return result.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }, [alerts, activeTab, severityFilter]);

  const stats = useMemo(() => {
    const total = alerts.length;
    const unread = alerts.filter((a) => !a.isRead && !a.isResolved).length;
    const critical = alerts.filter((a) => a.severity === 'critical' && !a.isResolved).length;
    const high = alerts.filter((a) => a.severity === 'high' && !a.isResolved).length;
    return { total, unread, critical, high };
  }, [alerts]);

  const getSeverityConfig = (severity: AlertSeverity) =>
    severityConfig[severity] || severityConfig.low;

  return (
    <div>
      <Header
        title="แจ้งเตือนอัจฉริยะ"
        subtitle={`วันที่ ${formatThaiDate(getCurrentDate())}`}
        onMenuClick={onMenuClick}
        actions={
          <Button
            variant="outline"
            size="sm"
            onClick={handleCheckRules}
            disabled={isChecking}
            className="gap-2"
          >
            <RefreshCw className={cn('w-4 h-4', isChecking && 'animate-spin')} />
            ตรวจสอบใหม่
          </Button>
        }
      />

      <div className="p-6 space-y-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5 text-muted-foreground" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.total}</p>
                <p className="text-sm text-muted-foreground">ทั้งหมด</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
                <Clock className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.unread}</p>
                <p className="text-sm text-muted-foreground">ยังไม่อ่าน</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-red-50 flex items-center justify-center shrink-0">
                <ShieldAlert className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.critical}</p>
                <p className="text-sm text-muted-foreground">วิกฤต</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-orange-50 flex items-center justify-center shrink-0">
                <Shield className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.high}</p>
                <p className="text-sm text-muted-foreground">สูง</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as TabValue)}>
            <TabsList>
              <TabsTrigger value="all">ทั้งหมด</TabsTrigger>
              <TabsTrigger value="unread">
                ยังไม่อ่าน
                {stats.unread > 0 && (
                  <Badge variant="destructive" className="ml-2 h-5 px-1.5">
                    {stats.unread}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="resolved">แก้ไขแล้ว</TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Filter className="w-4 h-4 text-muted-foreground shrink-0" />
            <Select
              value={severityFilter}
              onValueChange={(v) => setSeverityFilter(v as AlertSeverity | 'all')}
            >
              <SelectTrigger className="w-full sm:w-[160px]">
                <SelectValue placeholder="ระดับความรุนแรง" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">ทั้งหมด</SelectItem>
                <SelectItem value="critical">วิกฤต</SelectItem>
                <SelectItem value="high">สูง</SelectItem>
                <SelectItem value="medium">ปานกลาง</SelectItem>
                <SelectItem value="low">ต่ำ</SelectItem>
              </SelectContent>
            </Select>

            {unreadCount > 0 && (
              <Button variant="ghost" size="sm" onClick={markAllAsRead} className="gap-1 shrink-0">
                <CheckCheck className="w-4 h-4" />
                <span className="hidden sm:inline">อ่านทั้งหมด</span>
              </Button>
            )}
          </div>
        </div>

        {/* Alerts List */}
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-24 w-full" />
            ))}
          </div>
        ) : filteredAlerts.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <AlertTriangle className="w-12 h-12 text-muted-foreground/40 mx-auto mb-4" />
              <p className="text-muted-foreground font-medium">ไม่พบการแจ้งเตือน</p>
              <p className="text-sm text-muted-foreground/70 mt-1">
                {activeTab === 'unread'
                  ? 'ไม่มีการแจ้งเตือนที่ยังไม่อ่าน'
                  : activeTab === 'resolved'
                    ? 'ไม่มีการแจ้งเตือนที่แก้ไขแล้ว'
                    : 'คลิก "ตรวจสอบใหม่" เพื่อสแกนหาการแจ้งเตือน'}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {filteredAlerts.map((alert) => {
              const config = getSeverityConfig(alert.severity);
              const SeverityIcon = config.icon;

              return (
                <Card
                  key={alert.id}
                  className={cn(
                    'transition-all duration-200',
                    !alert.isRead && !alert.isResolved && 'border-l-4 border-l-orange-400'
                  )}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      {/* Severity Icon */}
                      <div
                        className={cn(
                          'w-9 h-9 rounded-lg flex items-center justify-center shrink-0 mt-0.5',
                          config.color
                        )}
                      >
                        <SeverityIcon className="w-4 h-4" />
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          <h3
                            className={cn(
                              'font-semibold text-sm',
                              alert.isRead || alert.isResolved
                                ? 'text-muted-foreground'
                                : 'text-foreground'
                            )}
                          >
                            {alert.title}
                          </h3>
                          <Badge variant="outline" className={cn('text-xs', config.color)}>
                            {config.label}
                          </Badge>
                          <Badge variant="secondary" className="text-xs">
                            {alertTypeLabels[alert.type] || alert.type}
                          </Badge>
                          {alert.isResolved && (
                            <Badge
                              variant="outline"
                              className="text-xs text-green-700 border-green-300 bg-green-50"
                            >
                              <CheckCircle className="w-3 h-3 mr-1" />
                              แก้ไขแล้ว
                            </Badge>
                          )}
                        </div>

                        <p className="text-sm text-muted-foreground break-words">{alert.message}</p>

                        <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground/70">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {formatThaiDate(alert.createdAt)}
                          </span>
                          {alert.relatedTable && (
                            <span>ตาราง: {alert.relatedTable}</span>
                          )}
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex flex-col gap-1.5 shrink-0">
                        {!alert.isRead && !alert.isResolved && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => markAsRead(alert.id)}
                            className="h-8 px-2 text-xs"
                          >
                            <CheckCheck className="w-3.5 h-3.5 mr-1" />
                            อ่านแล้ว
                          </Button>
                        )}
                        {!alert.isResolved && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => resolveAlert(alert.id)}
                            className="h-8 px-2 text-xs text-green-600 hover:text-green-700 hover:bg-green-50"
                          >
                            <CheckCircle className="w-3.5 h-3.5 mr-1" />
                            แก้ไขแล้ว
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default Alerts;
