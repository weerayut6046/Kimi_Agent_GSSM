import React, { useState, useEffect, useCallback } from 'react';
import { ScrollText, Download, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useAudit } from '@/contexts/AuditContext';
import type { AuditLogFilter } from '@/types/audit';
import { getRecordLabel, getPerformerInfo } from '@/utils/auditUtils';

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
};

const actionLabels: Record<string, { label: string; color: string }> = {
  create: { label: 'สร้าง', color: 'bg-green-100 text-green-700' },
  update: { label: 'แก้ไข', color: 'bg-blue-100 text-blue-700' },
  delete: { label: 'ลบ', color: 'bg-red-100 text-red-700' },
};

const AuditLogSection: React.FC = () => {
  const { logs, isLoading, totalLogs, stats, fetchLogs, fetchStats, exportToCsv } = useAudit();

  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedTable, setSelectedTable] = useState('');
  const [selectedAction, setSelectedAction] = useState('');
  const [limit, setLimit] = useState(50);

  const loadLogs = useCallback(() => {
    const f: AuditLogFilter = {};
    if (selectedTable) f.tableName = selectedTable;
    if (selectedAction) f.action = selectedAction as AuditLogFilter['action'];
    if (startDate) f.startDate = startDate;
    if (endDate) f.endDate = endDate;
    fetchLogs(f, limit, 0);
    fetchStats(startDate, endDate);
  }, [selectedTable, selectedAction, startDate, endDate, limit, fetchLogs, fetchStats]);

  useEffect(() => {
    loadLogs();
  }, [loadLogs]);

  const handleExportCsv = async () => {
    try {
      const csv = await exportToCsv({ tableName: selectedTable || undefined, action: selectedAction as AuditLogFilter['action'], startDate: startDate || undefined, endDate: endDate || undefined });
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

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <ScrollText className="w-5 h-5" />
            ประวัติการเปลี่ยนแปลง (Audit Log)
          </h3>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={loadLogs}
              disabled={isLoading}
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              รีเฟรช
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={handleExportCsv}
            >
              <Download className="w-4 h-4 mr-2" />
              Export CSV
            </Button>
          </div>
        </div>

        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
            <div className="bg-slate-50 p-3 rounded-lg text-center">
              <div className="text-2xl font-bold text-slate-700">{stats.totalLogs}</div>
              <div className="text-xs text-slate-500">รายการทั้งหมด</div>
            </div>
            <div className="bg-green-50 p-3 rounded-lg text-center">
              <div className="text-2xl font-bold text-green-600">{stats.createCount}</div>
              <div className="text-xs text-green-600">สร้าง</div>
            </div>
            <div className="bg-blue-50 p-3 rounded-lg text-center">
              <div className="text-2xl font-bold text-blue-600">{stats.updateCount}</div>
              <div className="text-xs text-blue-600">แก้ไข</div>
            </div>
            <div className="bg-red-50 p-3 rounded-lg text-center">
              <div className="text-2xl font-bold text-red-600">{stats.deleteCount}</div>
              <div className="text-xs text-red-600">ลบ</div>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-4">
          <div>
            <Label className="text-xs">ตาราง</Label>
            <select
              className="w-full mt-1 px-3 py-2 border rounded-md text-sm"
              value={selectedTable}
              onChange={(e) => setSelectedTable(e.target.value)}
            >
              <option value="">ทั้งหมด</option>
              {Object.entries(tableLabels).map(([key, label]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>
          </div>
          <div>
            <Label className="text-xs">การกระทำ</Label>
            <select
              className="w-full mt-1 px-3 py-2 border rounded-md text-sm"
              value={selectedAction}
              onChange={(e) => setSelectedAction(e.target.value)}
            >
              <option value="">ทั้งหมด</option>
              <option value="create">สร้าง</option>
              <option value="update">แก้ไข</option>
              <option value="delete">ลบ</option>
            </select>
          </div>
          <div>
            <Label className="text-xs">ตั้งแต่วันที่</Label>
            <Input
              type="date"
              className="mt-1"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>
          <div>
            <Label className="text-xs">ถึงวันที่</Label>
            <Input
              type="date"
              className="mt-1"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-32">วันที่</TableHead>
                <TableHead className="w-24">ตาราง</TableHead>
                <TableHead className="w-20">การกระทำ</TableHead>
                <TableHead>รายการ</TableHead>
                <TableHead>ผู้ดำเนินการ</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-slate-400">
                    กำลังโหลด...
                  </TableCell>
                </TableRow>
              ) : logs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-slate-400">
                    ไม่พบข้อมูล
                  </TableCell>
                </TableRow>
              ) : (
                logs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="text-xs whitespace-nowrap">
                      {new Date(log.performedAt).toLocaleString('th-TH')}
                    </TableCell>
                    <TableCell className="text-xs">
                      {tableLabels[log.tableName] || log.tableName}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="secondary"
                        className={`text-xs ${actionLabels[log.action]?.color || 'bg-slate-100'}`}
                      >
                        {actionLabels[log.action]?.label || log.action}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs max-w-[200px] truncate">
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
                          <div className="flex flex-col">
                            <span className="font-medium">{perf.name}</span>
                            {perf.subtitle && (
                              <span className="text-slate-400 text-[10px]">{perf.subtitle}</span>
                            )}
                          </div>
                        );
                      })()}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        <div className="flex items-center justify-between mt-4">
          <div className="text-sm text-slate-500">
            แสดง {logs.length} จาก {totalLogs} รายการ
          </div>
          <div className="flex items-center gap-2">
            <Label className="text-xs">แสดง:</Label>
            <select
              className="px-2 py-1 border rounded text-sm"
              value={limit}
              onChange={(e) => setLimit(Number(e.target.value))}
            >
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default AuditLogSection;
