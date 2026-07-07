import React, { useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Users, Calendar, FileText, Repeat, Clock, AlertCircle, TrendingUp, DollarSign, Fuel, Activity } from 'lucide-react';
import Header from '@/components/layout/Header';
import AlertBanner from '@/components/common/AlertBanner';
import StatCard from '@/components/common/StatCard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { useAlerts } from '@/contexts/AlertContext';
import { useEmployee } from '@/contexts/EmployeeContext';
import { useSchedule } from '@/contexts/ScheduleContext';
import { useAttendance } from '@/contexts/AttendanceContext';
import { getCurrentDate, formatThaiDate, getDayName } from '@/utils/dateUtils';
import { DatePickerRangeString } from '@/components/ui/date-picker';
import { startOfMonth, endOfMonth, format } from 'date-fns';
import { Suspense, lazy } from 'react';
import { DashboardSkeleton } from '@/components/common/LoadingPage';
import { getDashboardAnalytics, type DashboardAnalytics } from '@/lib/analytics';

const StockPredictionCard = lazy(() => import('@/components/analytics/StockPredictionCard'));
const SalesTrendChart = lazy(() => import('@/components/analytics/SalesTrendChart'));
const FuelTypeChart = lazy(() => import('@/components/analytics/FuelTypeChart'));
const AttendanceRateChart = lazy(() => import('@/components/analytics/AttendanceRateChart'));
const TopEmployeesCard = lazy(() => import('@/components/analytics/TopEmployeesCard'));

interface LayoutContext {
  onMenuClick: () => void;
}

const Dashboard: React.FC = () => {
  const { onMenuClick } = useOutletContext<LayoutContext>();
  const { user, profile, isLoading: isAuthLoading } = useAuth();
  const { employees, isLoading: isEmployeeLoading } = useEmployee();
  const { schedules, leaveRequests, swapRequests, isLoading: isScheduleLoading } = useSchedule();
  const { getTodayAttendance, isLoading: isAttendanceLoading } = useAttendance();
  const { checkRules } = useAlerts();

  const [analytics, setAnalytics] = useState<DashboardAnalytics | null>(null);
  const [dateRange, setDateRange] = useState({
    from: format(startOfMonth(new Date()), 'yyyy-MM-dd'),
    to: format(endOfMonth(new Date()), 'yyyy-MM-dd'),
  });

  useEffect(() => {
    const load = async () => {
      const data = await getDashboardAnalytics(dateRange.from, dateRange.to);
      setAnalytics(data);
    };
    load();
  }, [dateRange]);

  // Auto-check alert rules on mount (admin/manager only)
  useEffect(() => {
    if (user?.role === 'admin' || user?.role === 'manager') {
      checkRules().catch(console.error);
    }
  }, [user?.role, checkRules]);

  // Show skeleton while any data is loading
  const isLoading = isAuthLoading || isEmployeeLoading || isScheduleLoading || isAttendanceLoading;
  
  if (isLoading) {
    return <DashboardSkeleton />;
  }

  const today = getCurrentDate();
  const todayAttendance = getTodayAttendance();
  
  // Calculate stats
  const totalEmployees = employees.length;
  const activeEmployees = employees.filter(e => e.status === 'active').length;
  const todayShifts = schedules.filter(s => s.date === today).length;
  const pendingLeaves = leaveRequests.filter(l => l.status === 'pending').length;
  const pendingSwaps = swapRequests.filter(s => s.status === 'pending').length;
  const lateToday = todayAttendance.filter(a => a.status === 'late').length;
  const absentToday = todayAttendance.filter(a => a.status === 'absent').length;

  // Get today's schedule for current user
  const myTodaySchedule = schedules.find(
    s => s.employeeId === profile?.id && s.date === today
  );

  // Get recent leave requests
  const recentLeaves = leaveRequests
    .filter(l => l.status === 'pending')
    .slice(0, 5);

  // Get recent swap requests
  const recentSwaps = swapRequests
    .filter(s => s.status === 'pending')
    .slice(0, 5);

  return (
    <div>
      <Header
        title="แดชบอร์ด"
        subtitle={`วัน${getDayName(today)}ที่ ${formatThaiDate(today)}`}
        onMenuClick={onMenuClick}
      />

      <AlertBanner />

      <div className="p-6 space-y-6">
        {/* Date Range Filter */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <DatePickerRangeString
            from={dateRange.from}
            to={dateRange.to}
            setFrom={(from) => setDateRange(prev => ({ ...prev, from }))}
            setTo={(to) => setDateRange(prev => ({ ...prev, to }))}
            className="w-full sm:w-auto"
          />
          <p className="text-sm text-muted-foreground">
            ช่วงวันที่: {formatThaiDate(dateRange.from)} - {formatThaiDate(dateRange.to)}
          </p>
        </div>

        {/* Welcome Message */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl p-6 text-white">
          <h2 className="text-2xl font-bold">สวัสดี, {profile?.fullName?.split(' ')[0] || profile?.fullName || 'คุณ'}!</h2>
          <p className="text-blue-100 mt-1">
            {myTodaySchedule ? (
              <>วันนี้คุณมีกะ{myTodaySchedule.shift.name} ({myTodaySchedule.shift.startTime} - {myTodaySchedule.shift.endTime})</>
            ) : (
              'วันนี้คุณไม่มีกะทำงาน'
            )}
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="พนักงานทั้งหมด"
            value={totalEmployees}
            description={`${activeEmployees} คนกำลังทำงาน`}
            icon={Users}
            color="blue"
          />
          <StatCard
            title="กะวันนี้"
            value={todayShifts}
            description="กะที่กำหนดไว้"
            icon={Calendar}
            color="green"
          />
          <StatCard
            title="คำขอลารออนุมัติ"
            value={pendingLeaves}
            description="ต้องการการตรวจสอบ"
            icon={FileText}
            color="orange"
          />
          <StatCard
            title="คำขอสลับกะ"
            value={pendingSwaps}
            description="รอการอนุมัติ"
            icon={Repeat}
            color="purple"
          />
        </div>

        {/* Analytics Quick Stats for Manager/Admin */}
        {(user?.role === 'admin' || user?.role === 'manager') && analytics && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard
              title="เปลี่ยนแปลงยอดขาย"
              value={`${analytics.salesChangePercent > 0 ? '+' : ''}${analytics.salesChangePercent}%`}
              description="เทียบกับเมื่อวาน"
              icon={analytics.salesChangePercent >= 0 ? TrendingUp : TrendingUp}
              color={analytics.salesChangePercent >= 0 ? 'green' : 'red'}
            />
            <StatCard
              title="ยอดขายเฉลี่ย/วัน"
              value={`฿${analytics.avgDailySales.toLocaleString()}`}
              description="7 วันล่าสุด"
              icon={DollarSign}
              color="blue"
            />
            <StatCard
              title="น้ำมันขายดี"
              value={analytics.bestSellingFuel}
              description="7 วันล่าสุด"
              icon={Fuel}
              color="orange"
            />
            <StatCard
              title="อัตรามาทำงานวันนี้"
              value={`${analytics.attendanceRateToday}%`}
              description="ของพนักงานทั้งหมด"
              icon={Activity}
              color="green"
            />
          </div>
        )}

        {/* Additional Stats for Manager/Admin */}
        {(user?.role === 'admin' || user?.role === 'manager') && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <StatCard
              title="มาสายวันนี้"
              value={lateToday}
              description="คน"
              icon={Clock}
              color="red"
            />
            <StatCard
              title="ขาดงานวันนี้"
              value={absentToday}
              description="คน"
              icon={AlertCircle}
              color="red"
            />
          </div>
        )}

        {/* Analytics Section */}
        {(user?.role === 'admin' || user?.role === 'manager') && (
          <Suspense fallback={<div className="min-h-[200px]" />}>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <SalesTrendChart startDate={dateRange.from} endDate={dateRange.to} />
              <FuelTypeChart startDate={dateRange.from} endDate={dateRange.to} />
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <StockPredictionCard />
              <TopEmployeesCard endDate={dateRange.to} />
            </div>
            <div className="grid grid-cols-1 gap-6">
              <AttendanceRateChart endDate={dateRange.to} />
            </div>
          </Suspense>
        )}

        {/* Recent Requests */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Leave Requests */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <FileText className="w-5 h-5" />
                คำขอลาล่าสุด
              </CardTitle>
            </CardHeader>
            <CardContent>
              {recentLeaves.length > 0 ? (
                <div className="space-y-3">
                  {recentLeaves.map((leave) => (
                    <div
                      key={leave.id}
                      className="flex items-center justify-between p-3 bg-muted rounded-lg"
                    >
                      <div>
                        <p className="font-medium">{leave.employee?.fullName || '-'}</p>
                        <p className="text-sm text-muted-foreground">
                          {leave.type === 'sick' ? 'ลาป่วย' :
                           leave.type === 'personal' ? 'ลากิจ' : 'ลาพักร้อน'}
                          {' '}({leave.days} วัน)
                        </p>
                      </div>
                      <Badge variant="secondary">รออนุมัติ</Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-muted-foreground py-4">ไม่มีคำขอลารออนุมัติ</p>
              )}
            </CardContent>
          </Card>

          {/* Recent Swap Requests */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Repeat className="w-5 h-5" />
                คำขอสลับกะล่าสุด
              </CardTitle>
            </CardHeader>
            <CardContent>
              {recentSwaps.length > 0 ? (
                <div className="space-y-3">
                  {recentSwaps.map((swap) => (
                    <div
                      key={swap.id}
                      className="flex items-center justify-between p-3 bg-muted rounded-lg"
                    >
                      <div>
                        <p className="font-medium">{swap.requester?.fullName || '-'}</p>
                        <p className="text-sm text-muted-foreground">
                          ขอสลับกะกับ {swap.requested?.fullName || '-'}
                        </p>
                      </div>
                      <Badge variant="secondary">รออนุมัติ</Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-muted-foreground py-4">ไม่มีคำขอสลับกะรออนุมัติ</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Today's Schedule */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              ตารางกะวันนี้
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {['shift1', 'shift2', 'shift3'].map((shiftId) => {
                const shift = schedules.find(s => s.shiftId === shiftId)?.shift;
                const shiftSchedules = schedules.filter(
                  s => s.date === today && s.shiftId === shiftId
                );
                
                if (!shift) return null;
                
                return (
                  <div
                    key={shiftId}
                    className="p-4 rounded-lg border"
                    style={{ borderLeftWidth: '4px', borderLeftColor: shift.color }}
                  >
                    <h4 className="font-semibold">{shift.name}</h4>
                    <p className="text-sm text-muted-foreground">
                      {shift.startTime} - {shift.endTime}
                    </p>
                    <div className="mt-3 space-y-1">
                      {shiftSchedules.map((sched) => (
                        <div key={sched.id} className="text-sm">
                          {sched.employee?.fullName || '-'}
                        </div>
                      ))}
                    </div>
                    <p className="text-xs text-muted-foreground/70 mt-2">
                      {shiftSchedules.length} / {shift.minStaff} คน
                    </p>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;
