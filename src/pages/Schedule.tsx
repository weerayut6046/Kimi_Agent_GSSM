import React, { useState, useMemo } from 'react';
import { useOutletContext } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Plus, RotateCcw, Download, CalendarX } from 'lucide-react';
import { toast } from 'sonner';
import { format, addWeeks, subWeeks, startOfWeek, parseISO } from 'date-fns';
import { th } from 'date-fns/locale';
import Header from '@/components/layout/Header';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
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
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useSchedule } from '@/contexts/ScheduleContext';
import { useEmployee } from '@/contexts/EmployeeContext';
import { useAuth } from '@/contexts/AuthContext';
import { getWeekDays, formatShortThaiDate, getDayName } from '@/utils/dateUtils';
import { PageLoader } from '@/components/common/LoadingPage';
import { getShiftCoverage } from '@/utils/scheduleUtils';

interface LayoutContext {
  onMenuClick: () => void;
}

const Schedule: React.FC = () => {
  const { onMenuClick } = useOutletContext<LayoutContext>();
  const { user } = useAuth();
  const { employees, isLoading: isEmployeeLoading } = useEmployee();
  const { schedules, shifts, isLoading: isScheduleLoading, addSchedule, addShift, generateSchedule, clearAllSchedules, getSchedulesByDateRange } = useSchedule();

  const [currentWeek, setCurrentWeek] = useState(new Date());
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isAddShiftDialogOpen, setIsAddShiftDialogOpen] = useState(false);
  const [isClearDialogOpen, setIsClearDialogOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedShift, setSelectedShift] = useState('');
  const [selectedEmployee, setSelectedEmployee] = useState('');
  const [formError, setFormError] = useState('');

  // New shift form state
  const [newShiftForm, setNewShiftForm] = useState({
    name: '',
    startTime: '',
    endTime: '',
    minStaff: 2,
    color: '#3b82f6',
  });
  const [newShiftEmployee, setNewShiftEmployee] = useState('');
  const [shiftFormError, setShiftFormError] = useState('');

  const colorOptions = [
    '#22c55e', '#3b82f6', '#8b5cf6', '#f97316',
    '#ef4444', '#06b6d4', '#ec4899', '#84cc16',
  ];

  // Calculate week range
  const weekDays = useMemo(() => {
    const start = startOfWeek(currentWeek, { weekStartsOn: 1 });
    return getWeekDays(start.toISOString().split('T')[0]);
  }, [currentWeek]);

  if (isEmployeeLoading || isScheduleLoading) {
    return <PageLoader />;
  }

  const handlePrevWeek = () => {
    setCurrentWeek(prev => subWeeks(prev, 1));
  };

  const handleNextWeek = () => {
    setCurrentWeek(prev => addWeeks(prev, 1));
  };

  const handleGenerateSchedule = () => {
    const startDate = weekDays[0];
    const endDate = weekDays[6];
    generateSchedule(startDate, endDate);
  };

  const handleAddSchedule = () => {
    // Validate form
    if (!selectedDate || !selectedShift || !selectedEmployee) {
      setFormError('กรุณากรอกข้อมูลให้ครบถ้วน');
      return;
    }

    // Check if employee already has schedule on this date
    const existingSchedule = schedules.find(
      s => s.date === selectedDate && s.employeeId === selectedEmployee
    );
    if (existingSchedule) {
      setFormError('พนักงานคนนี้มีกะในวันที่เลือกแล้ว');
      return;
    }

    addSchedule({
      date: selectedDate,
      shiftId: selectedShift,
      employeeId: selectedEmployee,
      stationId: 'station1',
      status: 'scheduled',
      note: '',
      createdBy: user?.id || '',
      createdAt: new Date().toISOString(),
    });

    setIsAddDialogOpen(false);
    resetForm();
  };

  const resetForm = () => {
    setSelectedDate('');
    setSelectedShift('');
    setSelectedEmployee('');
    setFormError('');
  };

  const resetShiftForm = () => {
    setNewShiftForm({
      name: '',
      startTime: '',
      endTime: '',
      minStaff: 2,
      color: '#3b82f6',
    });
    setNewShiftEmployee('');
    setShiftFormError('');
  };

  const handleAddNewShift = async () => {
    if (!selectedDate || !newShiftForm.name || !newShiftForm.startTime || !newShiftForm.endTime || !newShiftEmployee) {
      setShiftFormError('กรุณากรอกข้อมูลให้ครบถ้วน');
      return;
    }

    try {
      // Create new shift and get the created shift back
      const newShift = await addShift({
        name: newShiftForm.name,
        startTime: newShiftForm.startTime,
        endTime: newShiftForm.endTime,
        minStaff: newShiftForm.minStaff,
        color: newShiftForm.color,
      });

      if (!newShift) {
        toast.error('ไม่สามารถสร้างกะใหม่ได้');
        return;
      }

      // Add schedule for this employee on this date with new shift
      await addSchedule({
        date: selectedDate,
        shiftId: newShift.id,
        employeeId: newShiftEmployee,
        stationId: 'station1',
        status: 'scheduled',
        note: '',
        createdBy: user?.id || '',
        createdAt: new Date().toISOString(),
      });

      toast.success('เพิ่มกะและตารางงานสำเร็จ');
      setIsAddShiftDialogOpen(false);
      resetShiftForm();
    } catch (error) {
      toast.error('เกิดข้อผิดพลาดในการเพิ่มกะ');
      console.error(error);
    }
  };

  const getSchedulesForCell = (date: string, shiftId: string) => {
    return schedules.filter(
      s => s.date === date && s.shiftId === shiftId
    );
  };

  const canAddSchedule = (date: string, shiftId: string) => {
    const shift = shifts.find(s => s.id === shiftId);
    if (!shift) return false;
    
    const currentSchedules = getSchedulesForCell(date, shiftId);
    return currentSchedules.length < shift.minStaff + 2; // Allow some flexibility
  };

  const exportSchedule = () => {
    const weekSchedules = getSchedulesByDateRange(weekDays[0], weekDays[6]);
    const csvContent = [
      ['วันที่', 'วัน', 'กะ', 'เวลา', 'พนักงาน', 'ตำแหน่ง'].join(','),
      ...weekSchedules.map(s => [
        s.date,
        getDayName(s.date),
        s.shift?.name || '',
        `${s.shift?.startTime || ''}-${s.shift?.endTime || ''}`,
        s.employee?.fullName || '',
        s.employee?.position?.name || '',
      ].join(','))
    ].join('\n');

    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `ตารางกะ_${weekDays[0]}_${weekDays[6]}.csv`;
    link.click();
  };

  return (
    <div>
      <Header
        title="ตารางกะ"
        subtitle="จัดการตารางกะการทำงานของพนักงาน"
        onMenuClick={onMenuClick}
        actions={
          <div className="flex flex-wrap gap-2 justify-end">
            {(user?.role === 'admin' || user?.role === 'manager') && (
              <>
                <Button variant="outline" size="sm" onClick={exportSchedule} className="hidden sm:inline-flex">
                  <Download className="w-4 h-4 mr-2" />
                  ส่งออก
                </Button>
                <Button variant="outline" size="sm" onClick={handleGenerateSchedule}>
                  <RotateCcw className="w-4 h-4 mr-2" />
                  <span className="hidden sm:inline">ตัดกะอัตโนมัติ</span>
                  <span className="sm:hidden">ตัดกะ</span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-red-600 border-red-200 hover:bg-red-50"
                  onClick={() => setIsClearDialogOpen(true)}
                >
                  <CalendarX className="w-4 h-4 mr-2" />
                  <span className="hidden sm:inline">ล้างตารางกะ</span>
                  <span className="sm:hidden">ล้าง</span>
                </Button>
                <Button size="sm" onClick={() => { resetForm(); setIsAddDialogOpen(true); }}>
                  <Plus className="w-4 h-4 mr-2" />
                  เพิ่มกะ
                </Button>
              </>
            )}
          </div>
        }
      />

      <div className="p-6 space-y-6">
        {/* Week Navigation */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <Button variant="outline" size="icon" onClick={handlePrevWeek}>
                <ChevronLeft className="w-4 h-4" />
              </Button>
              
              <div className="flex items-center gap-2">
                <CalendarIcon className="w-5 h-5 text-slate-500" />
                <span className="font-medium">
                  สัปดาห์ที่ {format(currentWeek, 'w', { locale: th })} - {' '}
                  {format(parseISO(weekDays[0] || new Date().toISOString()), 'MMMM yyyy', { locale: th })}
                </span>
              </div>
              
              <Button variant="outline" size="icon" onClick={handleNextWeek}>
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Schedule Grid */}
        <Card>
          <CardContent className="p-0 overflow-x-auto">
            <div className="min-w-[800px]">
              {/* Header Row */}
              <div className="grid grid-cols-8 border-b border-slate-200">
                <div className="p-4 font-medium text-slate-500 bg-slate-50">กะ / วัน</div>
                {weekDays.map((day, index) => (
                  <div
                    key={day}
                    className={`p-4 text-center border-l border-slate-200 ${
                      index === new Date().getDay() - 1 ? 'bg-blue-50' : 'bg-slate-50'
                    }`}
                  >
                    <p className="text-sm text-slate-500">{getDayName(day)}</p>
                    <p className="font-medium">{formatShortThaiDate(day)}</p>
                  </div>
                ))}
              </div>

              {/* Shift Rows */}
              {shifts.map((shift) => (
                <div key={shift.id} className="grid grid-cols-8 border-b border-slate-200">
                  <div className="p-4 bg-slate-50">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: shift.color }}
                      />
                      <div>
                        <p className="font-medium">{shift.name}</p>
                        <p className="text-xs text-slate-500">
                          {shift.startTime} - {shift.endTime}
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  {weekDays.map((day) => {
                    const cellSchedules = getSchedulesForCell(day, shift.id);
                    const coverage = getShiftCoverage(day, shift, schedules);
                    
                    return (
                      <div
                        key={`${shift.id}-${day}`}
                        className="p-1.5 sm:p-2 border-l border-slate-200 min-h-[80px] sm:min-h-[100px]"
                      >
                        <div className="space-y-1">
                          {cellSchedules.map((sched) => (
                            <div
                              key={sched.id}
                              className="px-2 py-1 rounded text-sm truncate"
                              style={{
                                backgroundColor: `${shift.color}20`,
                                borderLeft: `3px solid ${shift.color}`,
                              }}
                            >
                              {sched.employee?.fullName || '-'}
                            </div>
                          ))}
                          
                          {(user?.role === 'admin' || user?.role === 'manager') && (
                            <div className="flex items-center justify-between mt-2">
                              <Badge
                                variant={coverage.isCovered ? 'default' : 'destructive'}
                                className="text-xs"
                              >
                                {coverage.current}/{coverage.required}
                              </Badge>
                              
                              <div className="flex gap-1">
                                {canAddSchedule(day, shift.id) && (
                                  <button
                                    onClick={() => {
                                      setSelectedDate(day);
                                      setSelectedShift(shift.id);
                                      setIsAddDialogOpen(true);
                                    }}
                                    className="text-xs text-blue-600 hover:text-blue-800 px-1"
                                  >
                                    + เพิ่ม
                                  </button>
                                )}
                                <button
                                  onClick={() => {
                                    setSelectedDate(day);
                                    resetShiftForm();
                                    setIsAddShiftDialogOpen(true);
                                  }}
                                  className="text-xs text-green-600 hover:text-green-800 px-1"
                                >
                                  + กะใหม่
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Legend */}
        <div className="flex flex-wrap gap-4">
          {shifts.map((shift) => (
            <div key={shift.id} className="flex items-center gap-2">
              <div
                className="w-4 h-4 rounded"
                style={{ backgroundColor: shift.color }}
              />
              <span className="text-sm text-slate-600">
                {shift.name} ({shift.startTime} - {shift.endTime})
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Clear All Schedules Dialog */}
      <Dialog open={isClearDialogOpen} onOpenChange={setIsClearDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <CalendarX className="w-5 h-5" />
              ล้างตารางกะทั้งหมด
            </DialogTitle>
            <DialogDescription>
              คุณแน่ใจหรือไม่ว่าต้องการลบตารางกะทั้งหมด?
              <br />
              <span className="text-red-500 font-medium">ข้อมูลตารางงานทั้งหมดจะถูกลบและไม่สามารถกู้คืนได้</span>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setIsClearDialogOpen(false)}>
              ยกเลิก
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                clearAllSchedules();
                setIsClearDialogOpen(false);
              }}
            >
              ล้างทั้งหมด
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add New Shift Dialog */}
      <Dialog open={isAddShiftDialogOpen} onOpenChange={setIsAddShiftDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>เพิ่มกะใหม่</DialogTitle>
            <DialogDescription>
              สร้างกะการทำงานใหม่ในวันที่ {selectedDate ? formatShortThaiDate(selectedDate) : ''}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            {shiftFormError && (
              <div className="p-3 text-sm text-red-600 bg-red-50 rounded-md">
                {shiftFormError}
              </div>
            )}
            
            <div className="space-y-2">
              <Label>ชื่อกะ</Label>
              <Input
                value={newShiftForm.name}
                onChange={(e) => setNewShiftForm({ ...newShiftForm, name: e.target.value })}
                placeholder="เช่น กะเช้า, กะดึก"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>เวลาเริ่ม (24 ชม.)</Label>
                <Input
                  type="time"
                  step="60"
                  value={newShiftForm.startTime}
                  onChange={(e) => setNewShiftForm({ ...newShiftForm, startTime: e.target.value })}
                  placeholder="00:00"
                />
              </div>
              <div className="space-y-2">
                <Label>เวลาสิ้นสุด (24 ชม.)</Label>
                <Input
                  type="time"
                  step="60"
                  value={newShiftForm.endTime}
                  onChange={(e) => setNewShiftForm({ ...newShiftForm, endTime: e.target.value })}
                  placeholder="00:00"
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label>จำนวนพนักงานขั้นต่ำ</Label>
              <Input
                type="number"
                min={1}
                value={newShiftForm.minStaff}
                onChange={(e) => setNewShiftForm({ ...newShiftForm, minStaff: parseInt(e.target.value) || 1 })}
              />
            </div>
            
            <div className="space-y-2">
              <Label>สี</Label>
              <div className="flex flex-wrap gap-2">
                {colorOptions.map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setNewShiftForm({ ...newShiftForm, color })}
                    className={`w-8 h-8 rounded-lg transition-all ${
                      newShiftForm.color === color ? 'ring-2 ring-offset-2 ring-slate-400 scale-110' : ''
                    }`}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>
            
            <div className="space-y-2">
              <Label>พนักงาน</Label>
              <Select value={newShiftEmployee} onValueChange={setNewShiftEmployee}>
                <SelectTrigger>
                  <SelectValue placeholder="เลือกพนักงาน" />
                </SelectTrigger>
                <SelectContent>
                  {employees.filter(e => e.status === 'active').map((emp) => (
                    <SelectItem key={emp.id} value={emp.id}>
                      {emp.fullName} - {emp.position.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddShiftDialogOpen(false)}>
              ยกเลิก
            </Button>
            <Button onClick={handleAddNewShift}>บันทึก</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Schedule Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>เพิ่มตารางกะ</DialogTitle>
            <DialogDescription>
              เลือกวัน กะ และพนักงานที่ต้องการ
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            {formError && (
              <div className="p-3 text-sm text-red-600 bg-red-50 rounded-md">
                {formError}
              </div>
            )}
            <div className="space-y-2">
              <Label>วันที่</Label>
              <Select value={selectedDate} onValueChange={(value) => { setSelectedDate(value); setFormError(''); }}>
                <SelectTrigger>
                  <SelectValue placeholder="เลือกวันที่" />
                </SelectTrigger>
                <SelectContent>
                  {weekDays.map((day) => (
                    <SelectItem key={day} value={day}>
                      {getDayName(day)} {formatShortThaiDate(day)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label>กะ</Label>
              <Select value={selectedShift} onValueChange={(value) => { setSelectedShift(value); setFormError(''); }}>
                <SelectTrigger>
                  <SelectValue placeholder="เลือกกะ" />
                </SelectTrigger>
                <SelectContent>
                  {shifts.map((shift) => (
                    <SelectItem key={shift.id} value={shift.id}>
                      {shift.name} ({shift.startTime} - {shift.endTime})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label>พนักงาน</Label>
              <Select value={selectedEmployee} onValueChange={(value) => { setSelectedEmployee(value); setFormError(''); }}>
                <SelectTrigger>
                  <SelectValue placeholder="เลือกพนักงาน" />
                </SelectTrigger>
                <SelectContent>
                  {Array.isArray(employees) && employees
                    .filter(e => e.status === 'active')
                    .map((emp) => (
                      <SelectItem key={emp.id} value={emp.id}>
                        {emp.fullName} - {emp.position.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
              ยกเลิก
            </Button>
            <Button onClick={handleAddSchedule}>บันทึก</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Schedule;
