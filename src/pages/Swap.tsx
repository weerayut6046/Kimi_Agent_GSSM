import React, { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Plus, Check, X, Repeat } from 'lucide-react';
import Header from '@/components/layout/Header';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useSchedule } from '@/contexts/ScheduleContext';
import { useAuth } from '@/contexts/AuthContext';
import { useEmployee } from '@/contexts/EmployeeContext';
import { formatThaiDate, getDayName } from '@/utils/dateUtils';

interface LayoutContext {
  onMenuClick: () => void;
}

const Swap: React.FC = () => {
  const { onMenuClick } = useOutletContext<LayoutContext>();
  const { user, profile } = useAuth();
  const { employees } = useEmployee();
  const { schedules, swapRequests, requestSwap, approveSwap, getSchedulesByEmployee } = useSchedule();
  
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [myScheduleId, setMyScheduleId] = useState('');
  const [targetScheduleId, setTargetScheduleId] = useState('');
  const [targetEmployeeId, setTargetEmployeeId] = useState('');

  const isManager = user?.role === 'admin' || user?.role === 'manager';

  // Get my schedules
  const mySchedules = profile ? getSchedulesByEmployee(profile.id) : [];
  
  // Get target employee's schedules
  const targetSchedules = targetEmployeeId
    ? schedules.filter(s => 
        s.employeeId === targetEmployeeId && 
        s.date >= new Date().toISOString().split('T')[0]
      )
    : [];

  // Filter requests based on role
  const filteredRequests = isManager
    ? swapRequests
    : swapRequests.filter(
        s => s.requesterId === profile?.id || s.requestedId === profile?.id
      );

  const pendingRequests = filteredRequests.filter(s => s.status === 'pending' && s.schedule && s.targetSchedule);
  const historyRequests = filteredRequests.filter(s => s.status !== 'pending' && s.schedule && s.targetSchedule);

  const handleSubmit = () => {
    if (!profile || !myScheduleId || !targetScheduleId) return;

    const targetSchedule = schedules.find(s => s.id === targetScheduleId);
    if (!targetSchedule) return;

    requestSwap({
      requesterId: profile.id,
      requestedId: targetSchedule.employeeId,
      scheduleId: myScheduleId,
      targetScheduleId,
    });

    setIsAddDialogOpen(false);
    resetForm();
  };

  const handleApprove = (id: string, approved: boolean) => {
    approveSwap(id, approved);
  };

  const resetForm = () => {
    setMyScheduleId('');
    setTargetScheduleId('');
    setTargetEmployeeId('');
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="secondary">รออนุมัติ</Badge>;
      case 'approved':
        return <Badge className="bg-green-500">อนุมัติแล้ว</Badge>;
      case 'rejected':
        return <Badge variant="destructive">ไม่อนุมัติ</Badge>;
      default:
        return null;
    }
  };

  return (
    <div>
      <Header
        title="สลับกะ"
        subtitle="ขอสลับกะกับพนักงานคนอื่น"
        onMenuClick={onMenuClick}
        actions={
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                ขอสลับกะ
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md" onCloseAutoFocus={(e) => e.preventDefault()}>
              <DialogHeader>
                <DialogTitle>ขอสลับกะ</DialogTitle>
                <DialogDescription>
                  เลือกกะของคุณและกะที่ต้องการสลับ
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>กะของคุณ</Label>
                  <Select 
                    value={myScheduleId} 
                    onValueChange={(value) => {
                      setMyScheduleId(value);
                      (document.activeElement as HTMLElement)?.blur();
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="เลือกกะของคุณ" />
                    </SelectTrigger>
                    <SelectContent position="popper" onCloseAutoFocus={(e) => e.preventDefault()}>
                      {mySchedules.map((sched) => (
                        <SelectItem key={sched.id} value={sched.id}>
                          {getDayName(sched.date)} {formatThaiDate(sched.date)} - {sched.shift.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label>พนักงานที่ต้องการสลับ</Label>
                  <Select 
                    value={targetEmployeeId} 
                    onValueChange={(value) => {
                      setTargetEmployeeId(value);
                      (document.activeElement as HTMLElement)?.blur();
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="เลือกพนักงาน" />
                    </SelectTrigger>
                    <SelectContent position="popper" onCloseAutoFocus={(e) => e.preventDefault()}>
                      {employees
                        .filter(e => e.id !== profile?.id && e.status === 'active')
                        .map((emp) => (
                          <SelectItem key={emp.id} value={emp.id}>
                            {emp.fullName}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
                
                {targetEmployeeId && (
                  <div className="space-y-2">
                    <Label>กะที่ต้องการสลับ</Label>
                    <Select 
                      value={targetScheduleId} 
                      onValueChange={(value) => {
                        setTargetScheduleId(value);
                        (document.activeElement as HTMLElement)?.blur();
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="เลือกกะ" />
                      </SelectTrigger>
                      <SelectContent position="popper" onCloseAutoFocus={(e) => e.preventDefault()}>
                        {targetSchedules.map((sched) => (
                          <SelectItem key={sched.id} value={sched.id}>
                            {getDayName(sched.date)} {formatThaiDate(sched.date)} - {sched.shift.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
              
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                  ยกเลิก
                </Button>
                <Button onClick={handleSubmit}>ยื่นคำขอ</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        }
      />

      <div className="p-6 space-y-6">
        {/* Pending Requests */}
        <Card>
          <CardContent className="p-4 sm:p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Repeat className="w-5 h-5" />
              {isManager ? 'คำขอสลับกะรออนุมัติ' : 'คำขอสลับกะของฉัน'}
            </h3>
            
            <div className="overflow-x-auto -mx-4 sm:-mx-6 px-4 sm:px-6">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ผู้ขอ</TableHead>
                    <TableHead>กะผู้ขอ</TableHead>
                    <TableHead>ผู้ถูกขอ</TableHead>
                    <TableHead>กะผู้ถูกขอ</TableHead>
                    <TableHead>สถานะ</TableHead>
                    {isManager && <TableHead className="w-32">จัดการ</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pendingRequests.length > 0 ? (
                    pendingRequests.map((request) => (
                      <TableRow key={request.id}>
                        <TableCell>{request.requester.fullName}</TableCell>
                        <TableCell>
                          {getDayName(request.schedule.date)} {formatThaiDate(request.schedule.date)} - {request.schedule.shift.name}
                        </TableCell>
                        <TableCell>{request.requested.fullName}</TableCell>
                        <TableCell>
                          {getDayName(request.targetSchedule.date)} {formatThaiDate(request.targetSchedule.date)} - {request.targetSchedule.shift.name}
                        </TableCell>
                        <TableCell>{getStatusBadge(request.status)}</TableCell>
                        {isManager && (
                          <TableCell>
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-green-600 hover:text-green-700 min-w-[44px] min-h-[44px]"
                                onClick={() => handleApprove(request.id, true)}
                              >
                                <Check className="w-4 h-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-red-600 hover:text-red-700 min-w-[44px] min-h-[44px]"
                                onClick={() => handleApprove(request.id, false)}
                              >
                                <X className="w-4 h-4" />
                              </Button>
                            </div>
                          </TableCell>
                        )}
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={isManager ? 6 : 5} className="text-center py-8 text-slate-500">
                        ไม่มีคำขอสลับกะรออนุมัติ
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* History */}
        <Card>
          <CardContent className="p-4 sm:p-6">
            <h3 className="text-lg font-semibold mb-4">ประวัติการสลับกะ</h3>
            
            <div className="overflow-x-auto -mx-4 sm:-mx-6 px-4 sm:px-6">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ผู้ขอ</TableHead>
                    <TableHead>กะผู้ขอ</TableHead>
                    <TableHead>ผู้ถูกขอ</TableHead>
                    <TableHead>กะผู้ถูกขอ</TableHead>
                    <TableHead>สถานะ</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {historyRequests.length > 0 ? (
                    historyRequests.map((request) => (
                      <TableRow key={request.id}>
                        <TableCell>{request.requester.fullName}</TableCell>
                        <TableCell>
                          {getDayName(request.schedule.date)} {formatThaiDate(request.schedule.date)} - {request.schedule.shift.name}
                        </TableCell>
                        <TableCell>{request.requested.fullName}</TableCell>
                        <TableCell>
                          {getDayName(request.targetSchedule.date)} {formatThaiDate(request.targetSchedule.date)} - {request.targetSchedule.shift.name}
                        </TableCell>
                        <TableCell>{getStatusBadge(request.status)}</TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-slate-500">
                        ไม่มีประวัติการสลับกะ
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Swap;
