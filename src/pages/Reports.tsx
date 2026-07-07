import React, { useEffect, useMemo, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import {
  BarChart3,
  Download,
  Calendar,
  Users,
  Clock,
  DollarSign,
  Fuel,
  TrendingUp,
  TrendingDown,
  FileText,
  FileSpreadsheet,
} from 'lucide-react';
import { startOfMonth, endOfMonth, format } from 'date-fns';
import Header from '@/components/layout/Header';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  ComposedChart,
  Line,
} from 'recharts';
import { useSchedule } from '@/contexts/ScheduleContext';
import { useEmployee } from '@/contexts/EmployeeContext';
import { useAttendance } from '@/contexts/AttendanceContext';
import { useDailyAccounting } from '@/contexts/DailyAccountingContext';
import { useStations } from '@/contexts/StationContext';
import { getShiftStatistics, exportToCSV } from '@/utils/scheduleUtils';
import { exportReportToPdf } from '@/lib/exportUtils';
import { calculateDuration, formatThaiDate, getMonthName } from '@/utils/dateUtils';
import type { DailyAccounting } from '@/types';

interface LayoutContext {
  onMenuClick: () => void;
}

const COLORS = ['#ef4444', '#eab308', '#22c55e', '#64748b'];

const Reports: React.FC = () => {
  const { onMenuClick } = useOutletContext<LayoutContext>();
  const { schedules, shifts } = useSchedule();
  const { employees } = useEmployee();
  const { attendances } = useAttendance();
  const { loadAccountsByDateRange } = useDailyAccounting();
  const { currentStation } = useStations();

  const [activeTab, setActiveTab] = useState<'schedule' | 'accounting'>('schedule');

  // Schedule report dates
  const [startDate, setStartDate] = useState(
    startOfMonth(new Date()).toISOString().split('T')[0]
  );
  const [endDate, setEndDate] = useState(
    endOfMonth(new Date()).toISOString().split('T')[0]
  );

  // Accounting report month/year
  const [accountingMonth, setAccountingMonth] = useState(
    format(new Date(), 'yyyy-MM')
  );
  const [accountingYear, setAccountingYear] = useState(
    format(new Date(), 'yyyy')
  );
  const [accountingView, setAccountingView] = useState<'month' | 'year'>('month');
  const [accountingData, setAccountingData] = useState<DailyAccounting[]>([]);
  const [isAccountingLoading, setIsAccountingLoading] = useState(false);

  // Load accounting data when month/year changes
  useEffect(() => {
    const load = async () => {
      setIsAccountingLoading(true);
      let start: string;
      let end: string;
      if (accountingView === 'month') {
        const [year, month] = accountingMonth.split('-').map(Number);
        const d = new Date(year, month - 1, 1);
        start = startOfMonth(d).toISOString().split('T')[0];
        end = endOfMonth(d).toISOString().split('T')[0];
      } else {
        start = `${accountingYear}-01-01`;
        end = `${accountingYear}-12-31`;
      }
      const data = await loadAccountsByDateRange(start, end);
      setAccountingData(data);
      setIsAccountingLoading(false);
    };
    load();
  }, [accountingMonth, accountingYear, accountingView, loadAccountsByDateRange]);

  // ===== SCHEDULE REPORT CALCULATIONS =====
  const filteredSchedules = schedules.filter(
    s => s.date >= startDate && s.date <= endDate
  );
  const filteredAttendances = attendances.filter(
    a => a.schedule && a.schedule.date >= startDate && a.schedule.date <= endDate
  );
  const stats = getShiftStatistics(filteredSchedules, startDate, endDate);
  const shiftDistribution = shifts.map(shift => ({
    name: shift.name,
    value: filteredSchedules.filter(s => s.shiftId === shift.id).length,
    color: shift.color,
  }));
  const employeeWorkload = employees
    .filter(e => e.status === 'active')
    .map(emp => {
      const empSchedules = filteredSchedules.filter(s => s.employeeId === emp.id);
      const totalMinutes = empSchedules.reduce((total, s) => {
        return total + calculateDuration(s.shift.startTime, s.shift.endTime);
      }, 0);
      return {
        name: emp.fullName,
        shifts: empSchedules.length,
        hours: Math.round(totalMinutes / 60 * 10) / 10,
      };
    })
    .sort((a, b) => b.shifts - a.shifts);
  const attendanceStats = {
    total: filteredAttendances.length,
    normal: filteredAttendances.filter(a => a.status === 'normal').length,
    late: filteredAttendances.filter(a => a.status === 'late').length,
    earlyLeave: filteredAttendances.filter(a => a.status === 'early_leave').length,
    absent: filteredAttendances.filter(a => a.status === 'absent').length,
  };
  const exportScheduleReport = () => {
    const csvContent = exportToCSV(filteredSchedules);
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `รายงานตารางกะ_${startDate}_${endDate}.csv`;
    link.click();
  };

  // ===== ACCOUNTING REPORT CALCULATIONS =====
  const accountingSummary = useMemo(() => {
    const totalCash = accountingData.reduce((sum, a) => sum + (a.cashAmount ?? 0), 0);
    const totalActual = accountingData.reduce((sum, a) => sum + (a.actualCashCounted ?? 0) + a.items.twoT + a.items.capital + a.items.transfer + a.items.others, 0);
    const totalDifference = accountingData.reduce((sum, a) => sum + (a.difference ?? 0), 0);
    const totalLiters = accountingData.reduce((sum, a) =>
      sum + (a.fuelSales?.['95'] ?? 0) + (a.fuelSales?.['B7'] ?? 0) + (a.fuelSales?.['B10'] ?? 0) + (a.fuelSales?.['Diesel'] ?? 0), 0
    );
    return { totalCash, totalActual, totalDifference, totalLiters };
  }, [accountingData]);

  const fuelTypeData = useMemo(() => {
    return [
      {
        name: '95',
        value: accountingData.reduce((sum, a) => sum + (a.fuelSales?.['95'] ?? 0), 0),
        color: COLORS[0],
      },
      {
        name: 'B7',
        value: accountingData.reduce((sum, a) => sum + (a.fuelSales?.['B7'] ?? 0), 0),
        color: COLORS[1],
      },
      {
        name: 'B10',
        value: accountingData.reduce((sum, a) => sum + (a.fuelSales?.['B10'] ?? 0), 0),
        color: COLORS[2],
      },
      {
        name: 'Diesel',
        value: accountingData.reduce((sum, a) => sum + (a.fuelSales?.['Diesel'] ?? 0), 0),
        color: COLORS[3],
      },
    ].filter(d => d.value > 0);
  }, [accountingData]);

  const dailyTrendData = useMemo(() => {
    const grouped = new Map<string, { date: string; cash: number; actual: number; difference: number; liters: number }>();
    accountingData.forEach(a => {
      const existing = grouped.get(a.date);
      const liters = (a.fuelSales?.['95'] ?? 0) + (a.fuelSales?.['B7'] ?? 0) + (a.fuelSales?.['B10'] ?? 0) + (a.fuelSales?.['Diesel'] ?? 0);
      const actual = (a.actualCashCounted ?? 0) + a.items.twoT + a.items.capital + a.items.transfer + a.items.others;
      if (existing) {
        existing.cash += a.cashAmount ?? 0;
        existing.actual += actual;
        existing.difference += a.difference ?? 0;
        existing.liters += liters;
      } else {
        grouped.set(a.date, {
          date: a.date,
          cash: a.cashAmount ?? 0,
          actual,
          difference: a.difference ?? 0,
          liters,
        });
      }
    });
    return Array.from(grouped.values()).sort((a, b) => a.date.localeCompare(b.date));
  }, [accountingData]);

  const monthlyTrendData = useMemo(() => {
    const grouped = new Map<string, { month: string; cash: number; actual: number; difference: number; liters: number }>();
    accountingData.forEach(a => {
      const month = a.date.substring(0, 7);
      const label = getMonthName(`${month}-01`);
      const existing = grouped.get(month);
      const liters = (a.fuelSales?.['95'] ?? 0) + (a.fuelSales?.['B7'] ?? 0) + (a.fuelSales?.['B10'] ?? 0) + (a.fuelSales?.['Diesel'] ?? 0);
      const actual = (a.actualCashCounted ?? 0) + a.items.twoT + a.items.capital + a.items.transfer + a.items.others;
      if (existing) {
        existing.cash += a.cashAmount ?? 0;
        existing.actual += actual;
        existing.difference += a.difference ?? 0;
        existing.liters += liters;
      } else {
        grouped.set(month, {
          month: label,
          cash: a.cashAmount ?? 0,
          actual,
          difference: a.difference ?? 0,
          liters,
        });
      }
    });
    return Array.from(grouped.values()).sort((a, b) => a.month.localeCompare(b.month));
  }, [accountingData]);

  const exportAccountingReport = () => {
    const headers = [
      'วันที่', 'กะ', 'พนักงาน', '95 (ลิตร)', 'B7 (ลิตร)', 'B10 (ลิตร)', 'Diesel (ลิตร)',
      'ยอดเงินตู้', 'เงินสดนับได้', '2T', 'เงินทุน', 'เงินโอน', 'อื่นๆ', 'ยอดรวม', 'ขาด/เกิน', 'หมายเหตุ'
    ].join(',');
    const rows = accountingData.map(a => [
      a.date,
      a.shift?.name || '',
      a.employee?.fullName || '',
      a.fuelSales?.['95'] || 0,
      a.fuelSales?.['B7'] || 0,
      a.fuelSales?.['B10'] || 0,
      a.fuelSales?.['Diesel'] || 0,
      a.cashAmount || 0,
      a.actualCashCounted || 0,
      a.items.twoT,
      a.items.capital,
      a.items.transfer,
      a.items.others,
      (a.actualCashCounted || 0) + a.items.twoT + a.items.capital + a.items.transfer + a.items.others,
      a.difference || 0,
      `"${(a.note || '').replace(/"/g, '""')}"`,
    ].join(','));
    const csvContent = [headers, ...rows].join('\n');
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    const period = accountingView === 'month' ? accountingMonth : accountingYear;
    link.download = `รายงานบัญชี_${period}.csv`;
    link.click();
  };

  const formatNumber = (num: number) => num.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const formatInt = (num: number) => num.toLocaleString('th-TH');

  return (
    <div>
      <Header
        title="รายงาน"
        subtitle={currentStation ? `ดูรายงานและสถิติการทำงาน - ${currentStation.name}` : 'ดูรายงานและสถิติการทำงานทุกสาขา'}
        onMenuClick={onMenuClick}
        actions={
          activeTab === 'schedule' ? (
            <div className="flex gap-2">
              <Button variant="outline" onClick={exportScheduleReport}>
                <Download className="w-4 h-4 mr-2" />
                ส่งออก CSV
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  const data = filteredSchedules.map((s) => ({
                    วันที่: s.date,
                    กะ: s.shift?.name || '-',
                    พนักงาน: s.employee?.fullName || '-',
                    สถานะ: s.status,
                  }));
                  exportReportToPdf(
                    'รายงานตารางกะ',
                    data,
                    ['วันที่', 'กะ', 'พนักงาน', 'สถานะ'],
                    `รายงานตารางกะ_${startDate}_${endDate}`
                  );
                }}
              >
                <FileSpreadsheet className="w-4 h-4 mr-2" />
                Export PDF
              </Button>
            </div>
          ) : (
            <div className="flex gap-2">
              <Button variant="outline" onClick={exportAccountingReport}>
                <Download className="w-4 h-4 mr-2" />
                ส่งออก CSV
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  const data = accountingData.map((a) => ({
                    วันที่: a.date,
                    กะ: a.shift?.name || '-',
                    พนักงาน: a.employee?.fullName || '-',
                    '95 (ลิตร)': a.fuelSales?.['95'] ?? 0,
                    'B7 (ลิตร)': a.fuelSales?.['B7'] ?? 0,
                    'B10 (ลิตร)': a.fuelSales?.['B10'] ?? 0,
                    'Diesel (ลิตร)': a.fuelSales?.['Diesel'] ?? 0,
                    'ยอดเงินตู้ (บาท)': a.cashAmount ?? 0,
                    'ยอดรวม (บาท)':
                      (a.actualCashCounted ?? 0) +
                      a.items.twoT +
                      a.items.capital +
                      a.items.transfer +
                      a.items.others,
                    'ขาด/เกิน (บาท)': a.difference ?? 0,
                  }));
                  const period = accountingView === 'month' ? accountingMonth : accountingYear;
                  exportReportToPdf(
                    'รายงานบัญชี',
                    data,
                    ['วันที่', 'กะ', 'พนักงาน', '95 (ลิตร)', 'B7 (ลิตร)', 'B10 (ลิตร)', 'Diesel (ลิตร)', 'ยอดเงินตู้ (บาท)', 'ยอดรวม (บาท)', 'ขาด/เกิน (บาท)'],
                    `รายงานบัญชี_${period}`
                  );
                }}
              >
                <FileSpreadsheet className="w-4 h-4 mr-2" />
                Export PDF
              </Button>
            </div>
          )
        }
      />

      <div className="p-4 lg:p-6 space-y-4 lg:space-y-6">
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'schedule' | 'accounting')}>
          <TabsList className="grid w-full grid-cols-2 sm:w-fit sm:inline-flex">
            <TabsTrigger value="schedule" className="min-h-[40px]">
              <Calendar className="w-4 h-4 mr-2" />
              รายงานตารางกะ
            </TabsTrigger>
            <TabsTrigger value="accounting" className="min-h-[40px]">
              <FileText className="w-4 h-4 mr-2" />
              รายงานบัญชี
            </TabsTrigger>
          </TabsList>

          {/* ========== SCHEDULE REPORT ========== */}
          <TabsContent value="schedule" className="mt-4 space-y-4 lg:space-y-6">
            {/* Date Range Filter */}
            <Card>
              <CardContent className="p-4">
                <div className="flex flex-wrap items-end gap-4">
                  <div className="space-y-2">
                    <Label>วันที่เริ่มต้น</Label>
                    <Input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>วันที่สิ้นสุด</Label>
                    <Input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Summary Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                      <Calendar className="w-6 h-6 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-sm text-slate-500">จำนวนกะทั้งหมด</p>
                      <p className="text-2xl font-bold">{stats.totalShifts}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                      <Users className="w-6 h-6 text-green-600" />
                    </div>
                    <div>
                      <p className="text-sm text-slate-500">พนักงานที่มีกะ</p>
                      <p className="text-2xl font-bold">
                        {Object.keys(stats.shiftsByEmployee).length}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                      <Clock className="w-6 h-6 text-purple-600" />
                    </div>
                    <div>
                      <p className="text-sm text-slate-500">ลงเวลาแล้ว</p>
                      <p className="text-2xl font-bold">{attendanceStats.total}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                      <BarChart3 className="w-6 h-6 text-orange-600" />
                    </div>
                    <div>
                      <p className="text-sm text-slate-500">มาสาย</p>
                      <p className="text-2xl font-bold">{attendanceStats.late}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
              <Card>
                <CardContent className="p-4 lg:p-6">
                  <h3 className="text-lg font-semibold mb-4">สัดส่วนกะการทำงาน</h3>
                  <div className="h-64 lg:h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={shiftDistribution}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, value }) => `${name}: ${value}`}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {shiftDistribution.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4 lg:p-6">
                  <h3 className="text-lg font-semibold mb-4">ภาระงานพนักงาน (ชั่วโมง)</h3>
                  <div className="h-64 lg:h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={employeeWorkload}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" hide />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="hours" name="ชั่วโมงทำงาน" fill="#3b82f6" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Attendance Summary */}
            <Card>
              <CardContent className="p-4 lg:p-6">
                <h3 className="text-lg font-semibold mb-4">สรุปการลงเวลา</h3>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 sm:gap-4">
                  <div className="text-center p-4 bg-slate-50 rounded-lg">
                    <p className="text-sm text-slate-500">ทั้งหมด</p>
                    <p className="text-2xl font-bold">{attendanceStats.total}</p>
                  </div>
                  <div className="text-center p-4 bg-green-50 rounded-lg">
                    <p className="text-sm text-green-600">ปกติ</p>
                    <p className="text-2xl font-bold text-green-600">{attendanceStats.normal}</p>
                  </div>
                  <div className="text-center p-4 bg-yellow-50 rounded-lg">
                    <p className="text-sm text-yellow-600">มาสาย</p>
                    <p className="text-2xl font-bold text-yellow-600">{attendanceStats.late}</p>
                  </div>
                  <div className="text-center p-4 bg-orange-50 rounded-lg">
                    <p className="text-sm text-orange-600">ออกก่อน</p>
                    <p className="text-2xl font-bold text-orange-600">{attendanceStats.earlyLeave}</p>
                  </div>
                  <div className="text-center p-4 bg-red-50 rounded-lg">
                    <p className="text-sm text-red-600">ขาดงาน</p>
                    <p className="text-2xl font-bold text-red-600">{attendanceStats.absent}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Shifts by Type */}
            <Card>
              <CardContent className="p-4 lg:p-6">
                <h3 className="text-lg font-semibold mb-4">จำนวนกะแต่ละประเภท</h3>
                <div className="flex flex-wrap gap-3">
                  {Object.entries(stats.shiftsByType).map(([type, count]) => (
                    <div key={type} className="flex items-center gap-2 px-4 py-2 bg-slate-50 rounded-lg">
                      <span className="font-medium">{type}:</span>
                      <Badge>{count} กะ</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ========== ACCOUNTING REPORT ========== */}
          <TabsContent value="accounting" className="mt-4 space-y-4 lg:space-y-6">
            {/* Filter */}
            <Card>
              <CardContent className="p-4">
                <div className="flex flex-wrap items-end gap-4">
                  <div className="flex gap-2">
                    <Button
                      variant={accountingView === 'month' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setAccountingView('month')}
                    >
                      รายเดือน
                    </Button>
                    <Button
                      variant={accountingView === 'year' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setAccountingView('year')}
                    >
                      รายปี
                    </Button>
                  </div>
                  {accountingView === 'month' ? (
                    <div className="space-y-2">
                      <Label>เดือน</Label>
                      <Input
                        type="month"
                        value={accountingMonth}
                        onChange={(e) => setAccountingMonth(e.target.value)}
                        className="w-48"
                      />
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <Label>ปี</Label>
                      <Input
                        type="number"
                        min={2000}
                        max={2100}
                        value={accountingYear}
                        onChange={(e) => setAccountingYear(e.target.value)}
                        className="w-32"
                      />
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Summary Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                      <DollarSign className="w-6 h-6 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-sm text-slate-500">ยอดเงินจากตู้รวม</p>
                      <p className="text-2xl font-bold">{formatNumber(accountingSummary.totalCash)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                      <DollarSign className="w-6 h-6 text-green-600" />
                    </div>
                    <div>
                      <p className="text-sm text-slate-500">ยอดรวมทั้งหมด</p>
                      <p className="text-2xl font-bold">{formatNumber(accountingSummary.totalActual)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                      <Fuel className="w-6 h-6 text-purple-600" />
                    </div>
                    <div>
                      <p className="text-sm text-slate-500">ยอดขายน้ำมันรวม</p>
                      <p className="text-2xl font-bold">{formatInt(accountingSummary.totalLiters)} <span className="text-sm font-normal">ลิตร</span></p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${accountingSummary.totalDifference >= 0 ? 'bg-green-100' : 'bg-red-100'}`}>
                      {accountingSummary.totalDifference >= 0 ?
                        <TrendingUp className="w-6 h-6 text-green-600" /> :
                        <TrendingDown className="w-6 h-6 text-red-600" />
                      }
                    </div>
                    <div>
                      <p className="text-sm text-slate-500">ขาด/เกินรวม</p>
                      <p className={`text-2xl font-bold ${accountingSummary.totalDifference >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {accountingSummary.totalDifference >= 0 ? '+' : ''}{formatNumber(accountingSummary.totalDifference)}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
              {/* Trend Chart */}
              <Card className="lg:col-span-2">
                <CardContent className="p-4 lg:p-6">
                  <h3 className="text-lg font-semibold mb-4">
                    {accountingView === 'month' ? 'แนวโน้มรายวัน' : 'แนวโน้มรายเดือน'}
                  </h3>
                  <div className="h-64 lg:h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <ComposedChart data={accountingView === 'month' ? dailyTrendData : monthlyTrendData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey={accountingView === 'month' ? 'date' : 'month'} />
                        <YAxis yAxisId="left" orientation="left" stroke="#3b82f6" />
                        <YAxis yAxisId="right" orientation="right" stroke="#ef4444" />
                        <Tooltip
                          formatter={(value: number) => Number(value).toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                        />
                        <Legend />
                        <Bar yAxisId="left" dataKey="cash" name="ยอดเงินจากตู้" fill="#3b82f6" />
                        <Bar yAxisId="left" dataKey="actual" name="ยอดรวมทั้งหมด" fill="#22c55e" />
                        <Line yAxisId="right" type="monotone" dataKey="difference" name="ขาด/เกิน" stroke="#ef4444" strokeWidth={2} dot={false} />
                      </ComposedChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              {/* Fuel Type Pie Chart */}
              <Card>
                <CardContent className="p-4 lg:p-6">
                  <h3 className="text-lg font-semibold mb-4">สัดส่วนยอดขายน้ำมัน</h3>
                  <div className="h-64 lg:h-80">
                    {isAccountingLoading ? (
                      <div className="h-full flex items-center justify-center text-slate-400">กำลังโหลด...</div>
                    ) : fuelTypeData.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={fuelTypeData}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            label={({ name, value }) => `${name}: ${formatInt(Number(value))} ลิตร`}
                            outerRadius={80}
                            fill="#8884d8"
                            dataKey="value"
                          >
                            {fuelTypeData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip formatter={(value: number) => `${formatInt(Number(value))} ลิตร`} />
                          <Legend />
                        </PieChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-full flex items-center justify-center text-slate-400">ไม่มีข้อมูล</div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Difference Chart */}
              <Card>
                <CardContent className="p-4 lg:p-6">
                  <h3 className="text-lg font-semibold mb-4">เงินขาด/เกิน</h3>
                  <div className="h-64 lg:h-80">
                    {isAccountingLoading ? (
                      <div className="h-full flex items-center justify-center text-slate-400">กำลังโหลด...</div>
                    ) : (accountingView === 'month' ? dailyTrendData : monthlyTrendData).length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={accountingView === 'month' ? dailyTrendData : monthlyTrendData}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey={accountingView === 'month' ? 'date' : 'month'} hide />
                          <YAxis />
                          <Tooltip formatter={(value: number) => `${Number(value).toLocaleString('th-TH', { minimumFractionDigits: 2 })} บาท`} />
                          <Bar
                            dataKey="difference"
                            name="ขาด/เกิน"
                            fill="#10b981"
                          >
                            {(accountingView === 'month' ? dailyTrendData : monthlyTrendData).map((entry, index) => (
                              <Cell key={`diff-${index}`} fill={entry.difference >= 0 ? '#22c55e' : '#ef4444'} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-full flex items-center justify-center text-slate-400">ไม่มีข้อมูล</div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Recent Records Table */}
            <Card>
              <CardContent className="p-4 lg:p-6">
                <h3 className="text-lg font-semibold mb-4">รายการบัญชีในรอบนี้</h3>
                {isAccountingLoading ? (
                  <div className="text-center py-8 text-slate-400">กำลังโหลดข้อมูล...</div>
                ) : accountingData.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-slate-50">
                        <tr>
                          <th className="px-4 py-2 text-left">วันที่</th>
                          <th className="px-4 py-2 text-left">กะ</th>
                          <th className="px-4 py-2 text-left">พนักงาน</th>
                          <th className="px-4 py-2 text-right">ยอดเงินตู้</th>
                          <th className="px-4 py-2 text-right">ยอดรวม</th>
                          <th className="px-4 py-2 text-right">ขาด/เกิน</th>
                        </tr>
                      </thead>
                      <tbody>
                        {accountingData.slice().sort((a, b) => b.date.localeCompare(a.date)).map((a) => (
                          <tr key={a.id} className="border-t">
                            <td className="px-4 py-2">{formatThaiDate(a.date, 'dd MMM yyyy')}</td>
                            <td className="px-4 py-2">{a.shift?.name || '-'}</td>
                            <td className="px-4 py-2">{a.employee?.fullName || '-'}</td>
                            <td className="px-4 py-2 text-right">{formatNumber(a.cashAmount ?? 0)}</td>
                            <td className="px-4 py-2 text-right">
                              {formatNumber((a.actualCashCounted ?? 0) + a.items.twoT + a.items.capital + a.items.transfer + a.items.others)}
                            </td>
                            <td className="px-4 py-2 text-right">
                              <span className={a.difference >= 0 ? 'text-green-600' : 'text-red-600'}>
                                {a.difference >= 0 ? '+' : ''}{formatNumber(a.difference)}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-center py-8 text-slate-400">ไม่พบข้อมูลบัญชีในรอบนี้</div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Reports;
