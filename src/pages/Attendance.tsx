import React, { useState, useEffect, useMemo } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Clock, LogIn, LogOut, MapPin, Plus, Pencil, Trash2, FileSpreadsheet } from 'lucide-react';
import Header from '@/components/layout/Header';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { DatePickerString } from '@/components/ui/date-picker';
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
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useAttendance } from '@/contexts/AttendanceContext';
import { useSchedule } from '@/contexts/ScheduleContext';
import { useAuth } from '@/contexts/AuthContext';
import { useEmployee } from '@/contexts/EmployeeContext';
import { getCurrentDate, formatDateTime, formatThaiDate, getDayName } from '@/utils/dateUtils';
import { exportTableToExcel } from '@/lib/exportUtils';
import { format, parseISO } from 'date-fns';
import { PageLoader } from '@/components/common/LoadingPage';
import type { Attendance as AttendanceType } from '@/types';

const getDatePart = (isoString: string | null): string => {
  if (!isoString) return '';
  return format(parseISO(isoString), 'yyyy-MM-dd');
};

const getTimePart = (isoString: string | null): string => {
  if (!isoString) return '';
  return format(parseISO(isoString), 'HH:mm');
};

const combineDateTime = (date: string, time: string): string | null => {
  if (!date || !time) return null;
  return new Date(`${date}T${time}`).toISOString();
};

interface LayoutContext {
  onMenuClick: () => void;
}

const Attendance: React.FC = () => {
  const { onMenuClick } = useOutletContext<LayoutContext>();
  const { user, profile } = useAuth();
  const { employees } = useEmployee();
  const { schedules, isLoading: isScheduleLoading } = useSchedule();
  const {
    attendances,
    isLoading: isAttendanceLoading,
    checkIn,
    checkOut,
    addAttendance,
    updateAttendance,
    deleteAttendance,
    getAttendanceByEmployee,
    getTodayAttendance,
  } = useAttendance();

  const [currentTime, setCurrentTime] = useState(new Date());
  const [location] = useState('ปั๊มน้ำมันสาขาหลัก');

  // Admin dialog states
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [editingAttendance, setEditingAttendance] = useState<AttendanceType | null>(null);
  const [deletingAttendanceId, setDeletingAttendanceId] = useState<string | null>(null);
  const [formEmployeeId, setFormEmployeeId] = useState('');
  const [formScheduleId, setFormScheduleId] = useState('');
  const [formCheckInDate, setFormCheckInDate] = useState('');
  const [formCheckInTime, setFormCheckInTime] = useState('');
  const [formCheckOutDate, setFormCheckOutDate] = useState('');
  const [formCheckOutTime, setFormCheckOutTime] = useState('');
  const [formStatus, setFormStatus] = useState<AttendanceType['status']>('normal');
  const [formNote, setFormNote] = useState('');
  const [formLocation, setFormLocation] = useState('ปั๊มน้ำมันสาขาหลัก');

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // All attendances sorted for admin table
  const allAttendancesSorted = useMemo(() => {
    return [...attendances]
      .filter(a => a.schedule)
      .sort((a, b) => new Date(b.schedule.date).getTime() - new Date(a.schedule.date).getTime());
  }, [attendances]);

  const availableSchedules = useMemo(() => {
    return schedules
      .filter(s => s.employeeId === formEmployeeId)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [schedules, formEmployeeId]);

  if (isScheduleLoading || isAttendanceLoading) {
    return <PageLoader />;
  }

  const today = getCurrentDate();
  const isAdmin = user?.role === 'admin';

  // Get today's schedule for current user
  const myTodaySchedule = schedules.find(
    s => s.employeeId === profile?.id && s.date === today
  );

  // Get today's attendance for current user
  const myTodayAttendance = attendances.find(
    a => a.employeeId === profile?.id && a.scheduleId === myTodaySchedule?.id
  );

  // Get all today's attendance for managers
  const todayAttendance = getTodayAttendance();

  // Get my attendance history
  const myAttendanceHistory = profile ? getAttendanceByEmployee(profile.id) : [];

  const handleCheckInClick = () => {
    if (myTodaySchedule && profile) {
      checkIn(profile.id, myTodaySchedule.id, location);
    }
  };

  const handleCheckOutClick = () => {
    if (myTodaySchedule && profile) {
      checkOut(profile.id, myTodaySchedule.id, location);
    }
  };

  const resetForm = () => {
    setFormEmployeeId('');
    setFormScheduleId('');
    setFormCheckInDate('');
    setFormCheckInTime('');
    setFormCheckOutDate('');
    setFormCheckOutTime('');
    setFormStatus('normal');
    setFormNote('');
    setFormLocation('ปั๊มน้ำมันสาขาหลัก');
    setEditingAttendance(null);
  };

  const openAddDialog = () => {
    resetForm();
    setIsDialogOpen(true);
  };

  const openEditDialog = (att: AttendanceType) => {
    setEditingAttendance(att);
    setFormEmployeeId(att.employeeId);
    setFormScheduleId(att.scheduleId);
    setFormCheckInDate(getDatePart(att.checkIn));
    setFormCheckInTime(getTimePart(att.checkIn));
    setFormCheckOutDate(getDatePart(att.checkOut));
    setFormCheckOutTime(getTimePart(att.checkOut));
    setFormStatus(att.status);
    setFormNote(att.note || '');
    setFormLocation(att.checkInLocation || 'ปั๊มน้ำมันสาขาหลัก');
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formEmployeeId || !formScheduleId) return;

    const payload = {
      employeeId: formEmployeeId,
      scheduleId: formScheduleId,
      checkIn: combineDateTime(formCheckInDate, formCheckInTime),
      checkOut: combineDateTime(formCheckOutDate, formCheckOutTime),
      checkInLocation: formLocation,
      checkOutLocation: formLocation,
      note: formNote,
      status: formStatus,
    };

    if (editingAttendance) {
      await updateAttendance(editingAttendance.id, payload);
    } else {
      await addAttendance(payload as Omit<AttendanceType, 'id' | 'employee' | 'schedule'>);
    }

    setIsDialogOpen(false);
    resetForm();
  };

  const handleDelete = async () => {
    if (deletingAttendanceId) {
      await deleteAttendance(deletingAttendanceId);
      setDeletingAttendanceId(null);
      setIsDeleteDialogOpen(false);
    }
  };

  const confirmDelete = (id: string) => {
    setDeletingAttendanceId(id);
    setIsDeleteDialogOpen(true);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'normal':
        return <Badge className="bg-green-500">ปกติ</Badge>;
      case 'late':
        return <Badge variant="destructive">มาสาย</Badge>;
      case 'early_leave':
        return <Badge variant="secondary">ออกก่อน</Badge>;
      case 'absent':
        return <Badge variant="destructive">ขาดงาน</Badge>;
      default:
        return null;
    }
  };

  return (
    <div>
      <Header
        title="ลงเวลาเข้า-ออก"
        subtitle="บันทึกเวลาการทำงานของคุณ"
        onMenuClick={onMenuClick}
        actions={
          (user?.role === 'admin' || user?.role === 'manager') && (
            <Button
              variant="outline"
              onClick={() =>
                exportTableToExcel(
                  allAttendancesSorted.map((a) => ({
                    date: a.schedule?.date || '',
                    employee: a.employee?.fullName || '',
                    checkIn: a.checkIn ? formatDateTime(a.checkIn) : '',
                    checkOut: a.checkOut ? formatDateTime(a.checkOut) : '',
                    status: a.status,
                    note: a.note || '',
                  })),
                  {
                    date: 'วันที่',
                    employee: 'พนักงาน',
                    checkIn: 'เข้างาน',
                    checkOut: 'ออกงาน',
                    status: 'สถานะ',
                    note: 'หมายเหตุ',
                  },
                  'รายงานลงเวลา'
                )
              }
            >
              <FileSpreadsheet className="w-4 h-4 mr-2" />
              Export Excel
            </Button>
          )
        }
      />

      <div className="p-6 space-y-6">
        {/* Clock Card */}
        <Card className="bg-gradient-to-r from-blue-600 to-purple-600 text-white">
          <CardContent className="p-8 text-center">
            <Clock className="w-12 h-12 mx-auto mb-4 opacity-80" />
            <h2 className="text-5xl font-bold font-mono">
              {currentTime.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </h2>
            <p className="text-blue-100 mt-2">
              วัน{getDayName(today)}ที่ {formatThaiDate(today)}
            </p>
          </CardContent>
        </Card>

        {/* Today's Shift & Check In/Out */}
        {myTodaySchedule && (
          <Card>
            <CardContent className="p-6">
              <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                <div className="text-center md:text-left">
                  <h3 className="text-lg font-semibold">กะวันนี้</h3>
                  <p className="text-2xl font-bold mt-1">{myTodaySchedule.shift.name}</p>
                  <p className="text-slate-500">
                    {myTodaySchedule.shift.startTime} - {myTodaySchedule.shift.endTime}
                  </p>
                  <div className="flex items-center gap-2 mt-2 text-sm text-slate-500">
                    <MapPin className="w-4 h-4" />
                    {location}
                  </div>
                </div>

                <div className="flex gap-4 w-full md:w-auto">
                  {!myTodayAttendance?.checkIn ? (
                    <Button
                      size="lg"
                      onClick={handleCheckInClick}
                      className="bg-green-600 hover:bg-green-700 w-full md:w-auto min-h-[56px] text-lg"
                    >
                      <LogIn className="w-6 h-6 mr-2" />
                      ลงเวลาเข้า
                    </Button>
                  ) : !myTodayAttendance?.checkOut ? (
                    <Button
                      size="lg"
                      onClick={handleCheckOutClick}
                      variant="outline"
                      className="border-red-500 text-red-500 hover:bg-red-50 w-full md:w-auto min-h-[56px] text-lg"
                    >
                      <LogOut className="w-6 h-6 mr-2" />
                      ลงเวลาออก
                    </Button>
                  ) : (
                    <div className="text-center">
                      <Badge className="bg-green-500">เสร็จสิ้น</Badge>
                      <p className="text-sm text-slate-500 mt-2">
                        เข้า: {formatDateTime(myTodayAttendance.checkIn).split(' ')[1]} | 
                        ออก: {formatDateTime(myTodayAttendance.checkOut!).split(' ')[1]}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Today's Attendance (Manager+Admin view) */}
        {(user?.role === 'admin' || user?.role === 'manager') && (
          <Card>
            <CardContent className="p-6">
              <h3 className="text-lg font-semibold mb-4">การลงเวลาวันนี้</h3>
              
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>พนักงาน</TableHead>
                    <TableHead>กะ</TableHead>
                    <TableHead>เวลาเข้า</TableHead>
                    <TableHead>เวลาออก</TableHead>
                    <TableHead>สถานะ</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {todayAttendance.length > 0 ? (
                    todayAttendance.map((att) => (
                      <TableRow key={att.id}>
                        <TableCell>{att.employee?.fullName || '-'}</TableCell>
                        <TableCell>{att.schedule?.shift?.name || '-'}</TableCell>
                        <TableCell>
                          {att.checkIn ? formatDateTime(att.checkIn).split(' ')[1] : '-'}
                        </TableCell>
                        <TableCell>
                          {att.checkOut ? formatDateTime(att.checkOut).split(' ')[1] : '-'}
                        </TableCell>
                        <TableCell>{getStatusBadge(att.status)}</TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-slate-500">
                        ยังไม่มีการลงเวลา
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        {/* Admin Management Section */}
        {isAdmin && (
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">จัดการลงเวลาพนักงาน</h3>
                <Button onClick={openAddDialog}>
                  <Plus className="w-4 h-4 mr-2" />
                  เพิ่มการลงเวลา
                </Button>
              </div>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>วันที่</TableHead>
                    <TableHead>พนักงาน</TableHead>
                    <TableHead>กะ</TableHead>
                    <TableHead>เวลาเข้า</TableHead>
                    <TableHead>เวลาออก</TableHead>
                    <TableHead>สถานะ</TableHead>
                    <TableHead className="text-right">จัดการ</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {allAttendancesSorted.length > 0 ? (
                    allAttendancesSorted.map((att) => (
                      <TableRow key={att.id}>
                        <TableCell>
                          {att.schedule ? `${getDayName(att.schedule.date)} ${formatThaiDate(att.schedule.date)}` : '-'}
                        </TableCell>
                        <TableCell>{att.employee?.fullName || '-'}</TableCell>
                        <TableCell>{att.schedule?.shift?.name || '-'}</TableCell>
                        <TableCell>
                          {att.checkIn ? formatDateTime(att.checkIn).split(' ')[1] : '-'}
                        </TableCell>
                        <TableCell>
                          {att.checkOut ? formatDateTime(att.checkOut).split(' ')[1] : '-'}
                        </TableCell>
                        <TableCell>{getStatusBadge(att.status)}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="outline"
                              size="icon"
                              onClick={() => openEditDialog(att)}
                            >
                              <Pencil className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="destructive"
                              size="icon"
                              onClick={() => confirmDelete(att.id)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-slate-500">
                        ไม่มีข้อมูลการลงเวลา
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        {/* My Attendance History */}
        <Card>
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold mb-4">ประวัติการลงเวลา</h3>
            
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>วันที่</TableHead>
                  <TableHead>กะ</TableHead>
                  <TableHead>เวลาเข้า</TableHead>
                  <TableHead>เวลาออก</TableHead>
                  <TableHead>สถานะ</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {myAttendanceHistory.length > 0 ? (
                  myAttendanceHistory
                    .filter(att => att.schedule)
                    .sort((a, b) => new Date(b.schedule.date).getTime() - new Date(a.schedule.date).getTime())
                    .slice(0, 10)
                    .map((att) => (
                      <TableRow key={att.id}>
                        <TableCell>
                          {att.schedule ? `${getDayName(att.schedule.date)} ${formatThaiDate(att.schedule.date)}` : '-'}
                        </TableCell>
                        <TableCell>{att.schedule?.shift?.name || '-'}</TableCell>
                        <TableCell>
                          {att.checkIn ? formatDateTime(att.checkIn).split(' ')[1] : '-'}
                        </TableCell>
                        <TableCell>
                          {att.checkOut ? formatDateTime(att.checkOut).split(' ')[1] : '-'}
                        </TableCell>
                        <TableCell>{getStatusBadge(att.status)}</TableCell>
                      </TableRow>
                    ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-slate-500">
                      ไม่มีประวัติการลงเวลา
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* Admin Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingAttendance ? 'แก้ไขการลงเวลา' : 'เพิ่มการลงเวลา'}
            </DialogTitle>
            <DialogDescription>
              {editingAttendance ? 'แก้ไขข้อมูลการลงเวลาของพนักงาน' : 'เพิ่มข้อมูลการลงเวลาสำหรับพนักงาน'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>พนักงาน</Label>
              <Select
                value={formEmployeeId}
                onValueChange={(v) => {
                  setFormEmployeeId(v);
                  setFormScheduleId('');
                }}
                disabled={!!editingAttendance}
              >
                <SelectTrigger>
                  <SelectValue placeholder="เลือกพนักงาน" />
                </SelectTrigger>
                <SelectContent position="popper" onCloseAutoFocus={(e) => e.preventDefault()}>
                  {employees.map((emp) => (
                    <SelectItem key={emp.id} value={emp.id}>
                      {emp.fullName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>กะ / ตารางงาน</Label>
              <Select
                value={formScheduleId}
                onValueChange={setFormScheduleId}
                disabled={!formEmployeeId || !!editingAttendance}
              >
                <SelectTrigger>
                  <SelectValue placeholder="เลือกกะ" />
                </SelectTrigger>
                <SelectContent position="popper" onCloseAutoFocus={(e) => e.preventDefault()}>
                  {availableSchedules.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {formatThaiDate(s.date)} - {s.shift.name} ({s.shift.startTime} - {s.shift.endTime})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>วันที่เข้า</Label>
                <DatePickerString
                  value={formCheckInDate}
                  onChange={setFormCheckInDate}
                  placeholder="เลือกวันที่เข้า"
                />
              </div>
              <div className="space-y-2">
                <Label>เวลาเข้า</Label>
                <Input
                  type="time"
                  value={formCheckInTime}
                  onChange={(e) => setFormCheckInTime(e.target.value)}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>วันที่ออก</Label>
                <DatePickerString
                  value={formCheckOutDate}
                  onChange={setFormCheckOutDate}
                  placeholder="เลือกวันที่ออก"
                />
              </div>
              <div className="space-y-2">
                <Label>เวลาออก</Label>
                <Input
                  type="time"
                  value={formCheckOutTime}
                  onChange={(e) => setFormCheckOutTime(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>สถานะ</Label>
              <Select value={formStatus} onValueChange={(v) => setFormStatus(v as AttendanceType['status'])}>
                <SelectTrigger>
                  <SelectValue placeholder="เลือกสถานะ" />
                </SelectTrigger>
                <SelectContent position="popper" onCloseAutoFocus={(e) => e.preventDefault()}>
                  <SelectItem value="normal">ปกติ</SelectItem>
                  <SelectItem value="late">มาสาย</SelectItem>
                  <SelectItem value="early_leave">ออกก่อน</SelectItem>
                  <SelectItem value="absent">ขาดงาน</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>สถานที่</Label>
              <Input
                value={formLocation}
                onChange={(e) => setFormLocation(e.target.value)}
                placeholder="ปั๊มน้ำมันสาขาหลัก"
              />
            </div>

            <div className="space-y-2">
              <Label>หมายเหตุ</Label>
              <Input
                value={formNote}
                onChange={(e) => setFormNote(e.target.value)}
                placeholder="หมายเหตุ (ถ้ามี)"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              ยกเลิก
            </Button>
            <Button
              onClick={handleSave}
              disabled={!formEmployeeId || !formScheduleId}
            >
              บันทึก
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>ยืนยันการลบ</AlertDialogTitle>
            <AlertDialogDescription>
              คุณแน่ใจหรือไม่ว่าต้องการลบข้อมูลการลงเวลานี้? การกระทำนี้ไม่สามารถย้อนกลับได้
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setIsDeleteDialogOpen(false)}>ยกเลิก</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">
              ลบ
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Attendance;
