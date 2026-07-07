import React, { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Plus, Check, X, Calendar } from 'lucide-react';
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
import { Textarea } from '@/components/ui/textarea';

import { DatePickerString } from '@/components/ui/date-picker';
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
import { formatThaiDate } from '@/utils/dateUtils';
import type { LeaveType } from '@/types';

interface LayoutContext {
  onMenuClick: () => void;
}

const Leave: React.FC = () => {
  const { onMenuClick } = useOutletContext<LayoutContext>();
  const { user, profile } = useAuth();
  const { employees } = useEmployee();
  const { leaveRequests, requestLeave, approveLeave } = useSchedule();
  
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [leaveType, setLeaveType] = useState<LeaveType>('sick');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [reason, setReason] = useState('');

  const isManager = user?.role === 'admin' || user?.role === 'manager';

  // Filter requests based on role
  const filteredRequests = isManager
    ? leaveRequests
    : leaveRequests.filter(l => l.employeeId === profile?.id);

  const pendingRequests = filteredRequests.filter(l => l.status === 'pending');
  const historyRequests = filteredRequests.filter(l => l.status !== 'pending');

  const handleSubmit = () => {
    if (!profile || !startDate || !endDate) return;

    requestLeave({
      employeeId: profile.id,
      type: leaveType,
      startDate,
      endDate,
      reason,
    });

    setIsAddDialogOpen(false);
    resetForm();
  };

  const handleApprove = (id: string, approved: boolean) => {
    approveLeave(id, approved);
  };

  const resetForm = () => {
    setLeaveType('sick');
    setStartDate('');
    setEndDate('');
    setReason('');
  };

  const getLeaveTypeLabel = (type: LeaveType) => {
    switch (type) {
      case 'sick': return 'ลาป่วย';
      case 'personal': return 'ลากิจ';
      case 'vacation': return 'ลาพักร้อน';
      default: return type;
    }
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
        title="คำขอลา"
        subtitle="จัดการคำขอลาของพนักงาน"
        onMenuClick={onMenuClick}
        actions={
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                ขอลา
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>ยื่นคำขอลา</DialogTitle>
                <DialogDescription>
                  กรอกรายละเอียดการลาของคุณ
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>ประเภทการลา</Label>
                  <Select value={leaveType} onValueChange={(v) => setLeaveType(v as LeaveType)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sick">ลาป่วย</SelectItem>
                      <SelectItem value="personal">ลากิจ</SelectItem>
                      <SelectItem value="vacation">ลาพักร้อน</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>วันที่เริ่ม</Label>
                    <DatePickerString
                      value={startDate}
                      onChange={setStartDate}
                      placeholder="เลือกวันที่เริ่ม"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>วันที่สิ้นสุด</Label>
                    <DatePickerString
                      value={endDate}
                      onChange={setEndDate}
                      placeholder="เลือกวันที่สิ้นสุด"
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label>เหตุผล</Label>
                  <Textarea
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="ระบุเหตุผลการลา..."
                    rows={3}
                  />
                </div>
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
              <Calendar className="w-5 h-5" />
              {isManager ? 'คำขอลารออนุมัติ' : 'คำขอลาของฉัน'}
            </h3>
            
            <div className="overflow-x-auto -mx-4 sm:-mx-6 px-4 sm:px-6">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>พนักงาน</TableHead>
                    <TableHead>ประเภท</TableHead>
                    <TableHead>วันที่</TableHead>
                    <TableHead>จำนวนวัน</TableHead>
                    <TableHead>เหตุผล</TableHead>
                    <TableHead>สถานะ</TableHead>
                    {isManager && <TableHead className="w-32">จัดการ</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pendingRequests.length > 0 ? (
                    pendingRequests.map((request) => (
                      <TableRow key={request.id}>
                        <TableCell>{request.employee.fullName}</TableCell>
                        <TableCell>{getLeaveTypeLabel(request.type)}</TableCell>
                        <TableCell>
                          {formatThaiDate(request.startDate)} - {formatThaiDate(request.endDate)}
                        </TableCell>
                        <TableCell>{request.days} วัน</TableCell>
                        <TableCell className="max-w-xs truncate">{request.reason}</TableCell>
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
                      <TableCell colSpan={isManager ? 7 : 6} className="text-center py-8 text-slate-500">
                        ไม่มีคำขอลารออนุมัติ
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
            <h3 className="text-lg font-semibold mb-4">ประวัติการลา</h3>
            
            <div className="overflow-x-auto -mx-4 sm:-mx-6 px-4 sm:px-6">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>พนักงาน</TableHead>
                    <TableHead>ประเภท</TableHead>
                    <TableHead>วันที่</TableHead>
                    <TableHead>จำนวนวัน</TableHead>
                    <TableHead>สถานะ</TableHead>
                    <TableHead>อนุมัติโดย</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {historyRequests.length > 0 ? (
                    historyRequests.map((request) => (
                      <TableRow key={request.id}>
                        <TableCell>{request.employee.fullName}</TableCell>
                        <TableCell>{getLeaveTypeLabel(request.type)}</TableCell>
                        <TableCell>
                          {formatThaiDate(request.startDate)} - {formatThaiDate(request.endDate)}
                        </TableCell>
                        <TableCell>{request.days} วัน</TableCell>
                        <TableCell>{getStatusBadge(request.status)}</TableCell>
                        <TableCell>
                          {request.approvedBy
                            ? employees.find(e => e.id === request.approvedBy)?.fullName || '-'
                            : '-'}
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-slate-500">
                        ไม่มีประวัติการลา
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

export default Leave;
