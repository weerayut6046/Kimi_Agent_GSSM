import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ScrollText,
  Download,
  RefreshCw,
  Search,
  Eye,
  ArrowLeft,
  FilePlus,
  FileEdit,
  Trash2,
  Database,
  ChevronRight,
  Cog,
  User,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
  PaginationEllipsis,
} from '@/components/ui/pagination';
import { useAudit } from '@/contexts/AuditContext';
import type { AuditLog, AuditLogFilter } from '@/types/audit';
import { getRecordLabel, getPerformerInfo } from '@/utils/auditUtils';
import { cn } from '@/lib/utils';

const tableLabels: Record<string, string> = {
  users: 'ผู้ใช้งาน',
  profiles: 'พนักงาน',
  positions: 'ตำแหน่ง',
  skills: 'ทักษะ',
  shifts: 'กะการทำงาน',
  schedules: 'ตารางงาน',
  leave_requests: 'คำขอลา',
  swap_requests: 'คำขอสลับกะ',
  attendances: 'การลงเวลา',
  daily_accounting: 'บัญชีรายวัน',
  fuel_prices: 'ราคาน้ำมัน',
  notifications: 'การแจ้งเตือน',
  fuel_inventory: 'สต็อกน้ำมัน',
  fuel_deliveries: 'การรับน้ำมัน',
  products: 'สินค้า',
  product_transactions: 'การเคลื่อนไหวสินค้า',
  suppliers: 'ซัพพลายเออร์',
  sales: 'การขาย',
  stations: 'สาขา',
  payroll_periods: 'รอบเงินเดือน',
  payroll_records: 'บันทึกเงินเดือน',
  promotions: 'โปรโมชั่น',
};

const actionConfig: Record<
  string,
  { label: string; color: string; icon: React.ElementType; bg: string }
> = {
  create: {
    label: 'สร้าง',
    color: 'text-emerald-700',
    icon: FilePlus,
    bg: 'bg-emerald-50 border-emerald-200',
  },
  update: {
    label: 'แก้ไข',
    color: 'text-blue-700',
    icon: FileEdit,
    bg: 'bg-blue-50 border-blue-200',
  },
  delete: {
    label: 'ลบ',
    color: 'text-red-700',
    icon: Trash2,
    bg: 'bg-red-50 border-red-200',
  },
};

const formatThaiDateTime = (iso: string) => {
  const d = new Date(iso);
  return d.toLocaleString('th-TH', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const formatThaiDate = (iso: string) => {
  const d = new Date(iso);
  return d.toLocaleDateString('th-TH', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

const getChangedFields = (
  oldValue: Record<string, unknown> | null,
  newValue: Record<string, unknown> | null
) => {
  const changes: { key: string; old: unknown; next: unknown }[] = [];
  const keys = new Set([
    ...Object.keys(oldValue || {}),
    ...Object.keys(newValue || {}),
  ]);
  keys.forEach((key) => {
    const o = oldValue?.[key];
    const n = newValue?.[key];
    if (JSON.stringify(o) !== JSON.stringify(n)) {
      changes.push({ key, old: o, next: n });
    }
  });
  return changes;
};

const PaginationNumbers: React.FC<{
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}> = ({ currentPage, totalPages, onPageChange }) => {
  const pages: (number | 'ellipsis')[] = [];
  if (totalPages <= 7) {
    for (let i = 1; i <= totalPages; i++) pages.push(i);
  } else {
    if (currentPage <= 4) {
      for (let i = 1; i <= 5; i++) pages.push(i);
      pages.push('ellipsis');
      pages.push(totalPages);
    } else if (currentPage >= totalPages - 3) {
      pages.push(1);
      pages.push('ellipsis');
      for (let i = totalPages - 4; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      pages.push('ellipsis');
      for (let i = currentPage - 1; i <= currentPage + 1; i++) pages.push(i);
      pages.push('ellipsis');
      pages.push(totalPages);
    }
  }

  return (
    <>
      {pages.map((p, idx) =>
        p === 'ellipsis' ? (
          <PaginationItem key={`ellipsis-${idx}`}>
            <PaginationEllipsis />
          </PaginationItem>
        ) : (
          <PaginationItem key={p}>
            <PaginationLink
              isActive={p === currentPage}
              onClick={(e) => {
                e.preventDefault();
                onPageChange(p);
              }}
              href="#"
            >
              {p}
            </PaginationLink>
          </PaginationItem>
        )
      )}
    </>
  );
};

const AuditLogs: React.FC = () => {
  const navigate = useNavigate();
  const { logs, isLoading, totalLogs, stats, fetchLogs, fetchStats, exportToCsv } =
    useAudit();

  const [searchTerm, setSearchTerm] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedTable, setSelectedTable] = useState('all');
  const [selectedAction, setSelectedAction] = useState('all');
  const [pageSize, setPageSize] = useState(25);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);

  const totalPages = Math.max(1, Math.ceil(totalLogs / pageSize));
  const offset = (currentPage - 1) * pageSize;

  const loadLogs = useCallback(() => {
    const f: AuditLogFilter = {};
    if (selectedTable !== 'all') f.tableName = selectedTable;
    if (selectedAction !== 'all') f.action = selectedAction as AuditLogFilter['action'];
    if (startDate) f.startDate = startDate;
    if (endDate) f.endDate = endDate;
    if (searchTerm.trim()) f.searchTerm = searchTerm.trim();
    fetchLogs(f, pageSize, offset);
    fetchStats(startDate, endDate);
  }, [
    selectedTable,
    selectedAction,
    startDate,
    endDate,
    searchTerm,
    pageSize,
    offset,
    fetchLogs,
    fetchStats,
  ]);

  useEffect(() => {
    loadLogs();
  }, [loadLogs]);

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      setCurrentPage(1);
      loadLogs();
    }
  };

  const handleExportCsv = async () => {
    try {
      const f: AuditLogFilter = {};
      if (selectedTable !== 'all') f.tableName = selectedTable;
      if (selectedAction !== 'all') f.action = selectedAction as AuditLogFilter['action'];
      if (startDate) f.startDate = startDate;
      if (endDate) f.endDate = endDate;
      if (searchTerm.trim()) f.searchTerm = searchTerm.trim();
      const csv = await exportToCsv(f);
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `audit-log-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast.success('ดาวน์โหลดไฟล์ CSV สำเร็จ');
    } catch {
      toast.error('ไม่สามารถส่งออกไฟล์ได้');
    }
  };

  const statCards = [
    {
      title: 'รายการทั้งหมด',
      value: stats?.totalLogs ?? 0,
      icon: Database,
      bg: 'bg-slate-50',
      text: 'text-slate-700',
    },
    {
      title: 'สร้าง',
      value: stats?.createCount ?? 0,
      icon: FilePlus,
      bg: 'bg-emerald-50',
      text: 'text-emerald-700',
    },
    {
      title: 'แก้ไข',
      value: stats?.updateCount ?? 0,
      icon: FileEdit,
      bg: 'bg-blue-50',
      text: 'text-blue-700',
    },
    {
      title: 'ลบ',
      value: stats?.deleteCount ?? 0,
      icon: Trash2,
      bg: 'bg-red-50',
      text: 'text-red-700',
    },
  ];

  const changes = selectedLog
    ? getChangedFields(selectedLog.oldValue, selectedLog.newValue)
    : [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/settings')}
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            ย้อนกลับ
          </Button>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <ScrollText className="w-6 h-6 text-slate-600" />
              ประวัติการเปลี่ยนแปลง
            </h1>
            <p className="text-sm text-slate-500">
              ตรวจสอบและติดตามการเปลี่ยนแปลงทั้งหมดในระบบ
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={loadLogs}
            disabled={isLoading}
          >
            <RefreshCw
              className={cn('w-4 h-4 mr-2', isLoading && 'animate-spin')}
            />
            รีเฟรช
          </Button>
          <Button variant="outline" size="sm" onClick={handleExportCsv}>
            <Download className="w-4 h-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((s) => (
          <Card key={s.title} className={cn('border', s.bg)}>
            <CardContent className="p-4 flex items-center gap-4">
              <div
                className={cn(
                  'w-10 h-10 rounded-lg flex items-center justify-center',
                  s.bg.replace('50', '100')
                )}
              >
                <s.icon className={cn('w-5 h-5', s.text)} />
              </div>
              <div>
                <div className={cn('text-2xl font-bold', s.text)}>{s.value}</div>
                <div className="text-xs text-slate-500">{s.title}</div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
            <div className="lg:col-span-2">
              <Label className="text-xs mb-1 block">ค้นหา</Label>
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 w-4 h-4 text-slate-400" />
                <Input
                  placeholder="ค้นหา ID, ผู้ดำเนินการ, อีเมล..."
                  className="pl-9"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyDown={handleSearchKeyDown}
                />
              </div>
            </div>
            <div>
              <Label className="text-xs mb-1 block">ตาราง</Label>
              <Select
                value={selectedTable}
                onValueChange={(v) => {
                  setSelectedTable(v);
                  setCurrentPage(1);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="ทั้งหมด" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">ทั้งหมด</SelectItem>
                  {Object.entries(tableLabels).map(([key, label]) => (
                    <SelectItem key={key} value={key}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs mb-1 block">การกระทำ</Label>
              <Select
                value={selectedAction}
                onValueChange={(v) => {
                  setSelectedAction(v);
                  setCurrentPage(1);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="ทั้งหมด" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">ทั้งหมด</SelectItem>
                  <SelectItem value="create">สร้าง</SelectItem>
                  <SelectItem value="update">แก้ไข</SelectItem>
                  <SelectItem value="delete">ลบ</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs mb-1 block">ตั้งแต่วันที่</Label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  setCurrentPage(1);
                }}
              />
            </div>
            <div>
              <Label className="text-xs mb-1 block">ถึงวันที่</Label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => {
                  setEndDate(e.target.value);
                  setCurrentPage(1);
                }}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Desktop Table */}
      <div className="hidden md:block border rounded-lg overflow-hidden bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-36">วันที่</TableHead>
              <TableHead className="w-28">ตาราง</TableHead>
              <TableHead className="w-24">การกระทำ</TableHead>
              <TableHead>รายการ</TableHead>
              <TableHead>ผู้ดำเนินการ</TableHead>
              <TableHead className="w-16 text-center">ดู</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="text-center py-10 text-slate-400"
                >
                  กำลังโหลด...
                </TableCell>
              </TableRow>
            ) : logs.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="text-center py-10 text-slate-400"
                >
                  ไม่พบข้อมูล
                </TableCell>
              </TableRow>
            ) : (
              logs.map((log) => {
                const cfg = actionConfig[log.action] || actionConfig.update;
                const Icon = cfg.icon;
                return (
                  <TableRow
                    key={log.id}
                    className="cursor-pointer hover:bg-slate-50"
                    onClick={() => setSelectedLog(log)}
                  >
                    <TableCell className="text-xs whitespace-nowrap">
                      {formatThaiDateTime(log.performedAt)}
                    </TableCell>
                    <TableCell className="text-xs">
                      {tableLabels[log.tableName] || log.tableName}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="secondary"
                        className={cn(
                          'text-xs gap-1',
                          cfg.bg,
                          cfg.color
                        )}
                      >
                        <Icon className="w-3 h-3" />
                        {cfg.label}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs max-w-[240px] truncate">
                      <span className="font-medium text-slate-700">
                        {getRecordLabel(log)}
                      </span>
                      <span className="text-slate-300 ml-1 font-mono text-[10px]">
                        #{log.recordId.slice(-6)}
                      </span>
                    </TableCell>
                    <TableCell className="text-xs">
                      {(() => {
                        const perf = getPerformerInfo(log);
                        return (
                          <div className="flex items-center gap-1.5">
                            {perf.isSystem ? (
                              <Cog className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            ) : (
                              <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            )}
                            <div className="flex flex-col min-w-0">
                              <span className="font-medium truncate">
                                {perf.name}
                              </span>
                              {perf.subtitle && (
                                <span className="text-slate-400 text-[10px] truncate">
                                  {perf.subtitle}
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })()}
                    </TableCell>
                    <TableCell className="text-center">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedLog(log);
                        }}
                      >
                        <Eye className="w-4 h-4 text-slate-500" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Mobile Cards */}
      <div className="md:hidden space-y-3">
        {isLoading ? (
          <div className="text-center py-10 text-slate-400">กำลังโหลด...</div>
        ) : logs.length === 0 ? (
          <div className="text-center py-10 text-slate-400">ไม่พบข้อมูล</div>
        ) : (
          logs.map((log) => {
            const cfg = actionConfig[log.action] || actionConfig.update;
            const Icon = cfg.icon;
            return (
              <Card
                key={log.id}
                className="overflow-hidden"
                onClick={() => setSelectedLog(log)}
              >
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <Badge
                      variant="secondary"
                      className={cn('text-xs gap-1', cfg.bg, cfg.color)}
                    >
                      <Icon className="w-3 h-3" />
                      {cfg.label}
                    </Badge>
                    <span className="text-xs text-slate-400">
                      {formatThaiDate(log.performedAt)}
                    </span>
                  </div>
                  <div>
                    <div className="text-xs text-slate-500">ตาราง</div>
                    <div className="text-sm font-medium">
                      {tableLabels[log.tableName] || log.tableName}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-slate-500">รายการ</div>
                    <div className="text-sm font-medium text-slate-700 truncate">
                      {getRecordLabel(log)}
                    </div>
                    <div className="text-[10px] text-slate-400 font-mono truncate">
                      ID: {log.recordId}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-slate-500">ผู้ดำเนินการ</div>
                    {(() => {
                      const perf = getPerformerInfo(log);
                      return (
                        <div className="flex items-center gap-1.5">
                          {perf.isSystem ? (
                            <Cog className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          ) : (
                            <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          )}
                          <div>
                            <div className="text-sm">{perf.name}</div>
                            {perf.subtitle && (
                              <div className="text-[10px] text-slate-400">{perf.subtitle}</div>
                            )}
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                  <div className="flex justify-end">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 text-xs gap-1 text-slate-600"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedLog(log);
                      }}
                    >
                      <Eye className="w-3.5 h-3.5" />
                      ดูรายละเอียด
                      <ChevronRight className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      {/* Pagination */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="text-sm text-slate-500">
          แสดง {logs.length} จาก {totalLogs} รายการ (หน้า {currentPage} จาก{' '}
          {totalPages})
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Label className="text-xs whitespace-nowrap">แสดงต่อหน้า:</Label>
            <Select
              value={String(pageSize)}
              onValueChange={(v) => {
                setPageSize(Number(v));
                setCurrentPage(1);
              }}
            >
              <SelectTrigger className="w-[70px] h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="10">10</SelectItem>
                <SelectItem value="25">25</SelectItem>
                <SelectItem value="50">50</SelectItem>
                <SelectItem value="100">100</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Pagination>
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    if (currentPage > 1) setCurrentPage(currentPage - 1);
                  }}
                  className={
                    currentPage <= 1 ? 'pointer-events-none opacity-50' : ''
                  }
                />
              </PaginationItem>
              <PaginationNumbers
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
              />
              <PaginationItem>
                <PaginationNext
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    if (currentPage < totalPages)
                      setCurrentPage(currentPage + 1);
                  }}
                  className={
                    currentPage >= totalPages
                      ? 'pointer-events-none opacity-50'
                      : ''
                  }
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      </div>

      {/* Detail Dialog */}
      <Dialog open={!!selectedLog} onOpenChange={() => setSelectedLog(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ScrollText className="w-5 h-5" />
              รายละเอียดการเปลี่ยนแปลง
            </DialogTitle>
          </DialogHeader>

          {selectedLog && (
            <div className="space-y-4">
              {/* Meta */}
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="bg-slate-50 p-3 rounded-lg">
                  <div className="text-xs text-slate-500">ตาราง</div>
                  <div className="font-medium">
                    {tableLabels[selectedLog.tableName] ||
                      selectedLog.tableName}
                  </div>
                </div>
                <div className="bg-slate-50 p-3 rounded-lg">
                  <div className="text-xs text-slate-500">การกระทำ</div>
                  <div className="font-medium">
                    <Badge
                      variant="secondary"
                      className={cn(
                        actionConfig[selectedLog.action]?.bg,
                        actionConfig[selectedLog.action]?.color
                      )}
                    >
                      {actionConfig[selectedLog.action]?.label ||
                        selectedLog.action}
                    </Badge>
                  </div>
                </div>
                <div className="bg-slate-50 p-3 rounded-lg">
                  <div className="text-xs text-slate-500">รายการ</div>
                  <div className="font-medium text-sm">
                    {getRecordLabel(selectedLog)}
                  </div>
                  <div className="font-mono text-[10px] text-slate-400 break-all">
                    {selectedLog.recordId}
                  </div>
                </div>
                <div className="bg-slate-50 p-3 rounded-lg">
                  <div className="text-xs text-slate-500">วันที่</div>
                  <div className="font-medium">
                    {formatThaiDateTime(selectedLog.performedAt)}
                  </div>
                </div>
                <div className="bg-slate-50 p-3 rounded-lg col-span-2">
                  <div className="text-xs text-slate-500">ผู้ดำเนินการ</div>
                  {(() => {
                    const perf = getPerformerInfo(selectedLog);
                    return (
                      <div className="flex items-center gap-2">
                        {perf.isSystem ? (
                          <Cog className="w-4 h-4 text-slate-400" />
                        ) : (
                          <User className="w-4 h-4 text-slate-400" />
                        )}
                        <div>
                          <div className="font-medium">{perf.name}</div>
                          {perf.subtitle && (
                            <div className="text-xs text-slate-400">{perf.subtitle}</div>
                          )}
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </div>

              {/* Diff for update */}
              {selectedLog.action === 'update' && changes.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold mb-2">
                    ฟิลด์ที่เปลี่ยนแปลง ({changes.length})
                  </h4>
                  <div className="space-y-2">
                    {changes.map((c) => (
                      <div
                        key={c.key}
                        className="border rounded-lg overflow-hidden"
                      >
                        <div className="bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-600">
                          {c.key}
                        </div>
                        <div className="grid grid-cols-2 divide-x">
                          <div className="p-3 bg-red-50">
                            <div className="text-[10px] text-red-500 font-medium mb-1">
                              ก่อนแก้ไข
                            </div>
                            <div className="text-xs text-red-900 break-all font-mono">
                              {c.old === undefined
                                ? '-'
                                : JSON.stringify(c.old)}
                            </div>
                          </div>
                          <div className="p-3 bg-emerald-50">
                            <div className="text-[10px] text-emerald-600 font-medium mb-1">
                              หลังแก้ไข
                            </div>
                            <div className="text-xs text-emerald-900 break-all font-mono">
                              {c.next === undefined
                                ? '-'
                                : JSON.stringify(c.next)}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Old value for delete */}
              {selectedLog.action === 'delete' && selectedLog.oldValue && (
                <div>
                  <h4 className="text-sm font-semibold mb-2">ข้อมูลก่อนลบ</h4>
                  <pre className="bg-slate-50 p-3 rounded-lg text-xs overflow-x-auto">
                    {JSON.stringify(selectedLog.oldValue, null, 2)}
                  </pre>
                </div>
              )}

              {/* New value for create */}
              {selectedLog.action === 'create' && selectedLog.newValue && (
                <div>
                  <h4 className="text-sm font-semibold mb-2">
                    ข้อมูลที่สร้าง
                  </h4>
                  <pre className="bg-slate-50 p-3 rounded-lg text-xs overflow-x-auto">
                    {JSON.stringify(selectedLog.newValue, null, 2)}
                  </pre>
                </div>
              )}

              {/* Raw values if no structured diff */}
              {selectedLog.action === 'update' && changes.length === 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {selectedLog.oldValue && (
                    <div>
                      <h4 className="text-sm font-semibold mb-2">
                        ข้อมูลก่อนแก้ไข
                      </h4>
                      <pre className="bg-red-50 p-3 rounded-lg text-xs overflow-x-auto">
                        {JSON.stringify(selectedLog.oldValue, null, 2)}
                      </pre>
                    </div>
                  )}
                  {selectedLog.newValue && (
                    <div>
                      <h4 className="text-sm font-semibold mb-2">
                        ข้อมูลหลังแก้ไข
                      </h4>
                      <pre className="bg-emerald-50 p-3 rounded-lg text-xs overflow-x-auto">
                        {JSON.stringify(selectedLog.newValue, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AuditLogs;
