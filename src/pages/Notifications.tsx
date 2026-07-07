import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bell,
  CheckCheck,
  Trash2,
  ArrowLeft,
  Info,
  CheckCircle2,
  XCircle,
  AlertTriangle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { useNotifications } from '@/contexts/NotificationContext';
import { formatDistanceToNow, format } from 'date-fns';
import { th } from 'date-fns/locale';
import { cn } from '@/lib/utils';

const Notifications: React.FC = () => {
  const navigate = useNavigate();
  const {
    notifications,
    unreadCount,
    isLoading,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    deleteAllRead,
    deleteAll,
  } = useNotifications();

  const [activeTab, setActiveTab] = useState<'all' | 'unread' | 'read'>('all');

  const filteredNotifications = useMemo(() => {
    if (activeTab === 'unread') return notifications.filter(n => !n.read);
    if (activeTab === 'read') return notifications.filter(n => n.read);
    return notifications;
  }, [notifications, activeTab]);

  const readCount = useMemo(() => notifications.filter(n => n.read).length, [notifications]);

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'success':
        return <CheckCircle2 className="w-5 h-5 text-green-500" aria-hidden="true" />;
      case 'warning':
        return <AlertTriangle className="w-5 h-5 text-amber-500" aria-hidden="true" />;
      case 'error':
        return <XCircle className="w-5 h-5 text-red-500" aria-hidden="true" />;
      default:
        return <Info className="w-5 h-5 text-blue-500" aria-hidden="true" />;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'success':
        return 'bg-green-500';
      case 'warning':
        return 'bg-amber-500';
      case 'error':
        return 'bg-red-500';
      default:
        return 'bg-blue-500';
    }
  };

  const handleMarkAsRead = async (id: string) => {
    await markAsRead(id);
  };

  const handleDelete = async (id: string) => {
    await deleteNotification(id);
  };

  return (
    <div className="space-y-4 lg:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="icon"
            onClick={() => navigate(-1)}
            className="min-w-[44px] min-h-[44px]"
            aria-label="กลับ"
          >
            <ArrowLeft className="w-5 h-5" aria-hidden="true" />
          </Button>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900">การแจ้งเตือน</h1>
            <p className="text-sm text-slate-500">
              จัดการการแจ้งเตือนทั้งหมดของคุณ
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {unreadCount > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={markAllAsRead}
              className="min-h-[40px]"
            >
              <CheckCheck className="w-4 h-4 mr-1.5" aria-hidden="true" />
              อ่านทั้งหมด
            </Button>
          )}

          {readCount > 0 && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="min-h-[40px] text-amber-600 border-amber-200 hover:bg-amber-50"
                >
                  <Trash2 className="w-4 h-4 mr-1.5" aria-hidden="true" />
                  ลบที่อ่านแล้ว
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>ลบการแจ้งเตือนที่อ่านแล้ว?</AlertDialogTitle>
                  <AlertDialogDescription>
                    การแจ้งเตือนที่อ่านแล้วทั้งหมดจะถูกลบอย่างถาวร และไม่สามารถกู้คืนได้
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>ยกเลิก</AlertDialogCancel>
                  <AlertDialogAction onClick={() => deleteAllRead()}>
                    ยืนยันลบ
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}

          {notifications.length > 0 && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="min-h-[40px] text-red-600 border-red-200 hover:bg-red-50"
                >
                  <Trash2 className="w-4 h-4 mr-1.5" aria-hidden="true" />
                  ลบทั้งหมด
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>ลบการแจ้งเตือนทั้งหมด?</AlertDialogTitle>
                  <AlertDialogDescription>
                    การแจ้งเตือนทั้งหมดของคุณจะถูกลบอย่างถาวร และไม่สามารถกู้คืนได้
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>ยกเลิก</AlertDialogCancel>
                  <AlertDialogAction onClick={() => deleteAll()}>
                    ยืนยันลบ
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
      </div>

      {/* Tabs */}
      <Tabs
        value={activeTab}
        onValueChange={(value) => setActiveTab(value as 'all' | 'unread' | 'read')}
        className="w-full"
      >
        <TabsList className="grid w-full grid-cols-3 sm:w-fit sm:grid-cols-none sm:inline-flex">
          <TabsTrigger value="all" className="min-h-[40px]">
            ทั้งหมด
            <Badge variant="secondary" className="ml-2 text-xs">
              {notifications.length}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="unread" className="min-h-[40px]">
            ยังไม่อ่าน
            {unreadCount > 0 && (
              <Badge variant="destructive" className="ml-2 text-xs">
                {unreadCount}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="read" className="min-h-[40px]">
            อ่านแล้ว
            {readCount > 0 && (
              <Badge variant="outline" className="ml-2 text-xs">
                {readCount}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-4">
          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <Card key={i} className="animate-pulse">
                  <CardContent className="p-4">
                    <div className="h-16 bg-slate-100 rounded" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : filteredNotifications.length > 0 ? (
            <div className="space-y-3">
              {filteredNotifications.map((notif) => (
                <Card
                  key={notif.id}
                  className={cn(
                    'transition-colors',
                    !notif.read && 'bg-slate-50 border-slate-200'
                  )}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3 sm:gap-4">
                      <div className="shrink-0 mt-0.5">
                        <div
                          className={cn(
                            'w-10 h-10 rounded-full flex items-center justify-center',
                            notif.type === 'success' && 'bg-green-100',
                            notif.type === 'warning' && 'bg-amber-100',
                            notif.type === 'error' && 'bg-red-100',
                            (!notif.type || notif.type === 'info') && 'bg-blue-100'
                          )}
                        >
                          {getTypeIcon(notif.type)}
                        </div>
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <h3 className="font-semibold text-slate-900">{notif.title}</h3>
                              {!notif.read && (
                                <Badge variant="default" className="text-[10px] px-1.5 py-0 h-5">
                                  ใหม่
                                </Badge>
                              )}
                            </div>
                            <p className="text-sm text-slate-600 mt-1 break-words">
                              {notif.message}
                            </p>
                            <div className="flex items-center gap-2 mt-2 text-xs text-slate-400">
                              <span
                                className={cn('w-2 h-2 rounded-full', getTypeColor(notif.type))}
                                aria-hidden="true"
                              />
                              <span>
                                {formatDistanceToNow(new Date(notif.createdAt), {
                                  addSuffix: true,
                                  locale: th,
                                })}
                              </span>
                              <span>•</span>
                              <span>{format(new Date(notif.createdAt), 'dd MMM yyyy HH:mm', { locale: th })}</span>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            {!notif.read && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleMarkAsRead(notif.id)}
                                className="min-h-[36px] text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                              >
                                <CheckCheck className="w-4 h-4 mr-1" aria-hidden="true" />
                                อ่านแล้ว
                              </Button>
                            )}
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="min-w-[36px] min-h-[36px] text-slate-400 hover:text-red-600 hover:bg-red-50"
                                  aria-label="ลบการแจ้งเตือน"
                                >
                                  <Trash2 className="w-4 h-4" aria-hidden="true" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>ลบการแจ้งเตือนนี้?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    การแจ้งเตือนจะถูกลบอย่างถาวร
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>ยกเลิก</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => handleDelete(notif.id)}
                                    className="bg-red-600 hover:bg-red-700"
                                  >
                                    ลบ
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="p-8 sm:p-12 text-center">
                <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Bell className="w-8 h-8 text-slate-400" aria-hidden="true" />
                </div>
                <h3 className="text-lg font-medium text-slate-900 mb-1">
                  ไม่มีการแจ้งเตือน
                </h3>
                <p className="text-sm text-slate-500">
                  {activeTab === 'unread'
                    ? 'คุณอ่านการแจ้งเตือนทั้งหมดแล้ว'
                    : activeTab === 'read'
                    ? 'ยังไม่มีการแจ้งเตือนที่อ่านแล้ว'
                    : 'ยังไม่มีการแจ้งเตือนในขณะนี้'}
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Notifications;
