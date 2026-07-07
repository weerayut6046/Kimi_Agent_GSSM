import React, { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import {
  Plus,
  Search,
  Calculator,
  Lock,
  CheckCircle,
  Banknote,
  Printer,
  MoreVertical,
  FileSpreadsheet,
} from 'lucide-react';
import Header from '@/components/layout/Header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { usePayroll } from '@/contexts/PayrollContext';
import { TableSkeleton } from '@/components/common/LoadingPage';
import type { PayrollPeriod } from '@/types';
import { formatThaiDate } from '@/utils/dateUtils';
import { exportTableToExcel } from '@/lib/exportUtils';

interface LayoutContext {
  onMenuClick: () => void;
}

const thaiMonths = [
  'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
  'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม',
];

const Payroll: React.FC = () => {
  const { onMenuClick } = useOutletContext<LayoutContext>();
  const {
    periods,
    records,
    currentPeriod,
    setCurrentPeriod,
    isLoading,
    createPeriod,
    closePeriod,
    calculatePayroll,
    approveRecord,
    payRecord,
    exportPayslip,
  } = usePayroll();

  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('periods');

  // Dialog states
  const [isAddPeriodOpen, setIsAddPeriodOpen] = useState(false);
  const [isCalculateOpen, setIsCalculateOpen] = useState(false);
  const [isClosePeriodOpen, setIsClosePeriodOpen] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState<PayrollPeriod | null>(null);

  // Form states
  const [periodForm, setPeriodForm] = useState({
    year: new Date().getFullYear(),
    month: new Date().getMonth() + 1,
    startDate: '',
    endDate: '',
    payDate: '',
  });

  const [calculateForm, setCalculateForm] = useState({
    periodId: '',
    shiftRate: 400,
    overtimeRate: 60,
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Header title="เงินเดือน / ค่ากะ" subtitle="จัดการงวดเงินเดือนและรายการจ่าย" />
        <TableSkeleton rows={5} />
      </div>
    );
  }

  const filteredRecords = records.filter(
    (r) =>
      r.employee?.fullName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.employee?.position?.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredPeriods = periods.filter(
    (p) =>
      String(p.year).includes(searchTerm) ||
      thaiMonths[p.month - 1]?.includes(searchTerm)
  );

  const handleCreatePeriod = async () => {
    if (!periodForm.startDate || !periodForm.endDate) {
      return;
    }

    setIsSubmitting(true);
    try {
      await createPeriod({
        year: periodForm.year,
        month: periodForm.month,
        startDate: periodForm.startDate,
        endDate: periodForm.endDate,
        payDate: periodForm.payDate || undefined,
        status: 'open',
      });
      setIsAddPeriodOpen(false);
      resetPeriodForm();
    } catch (error) {
      console.error('Error creating period:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCalculate = async () => {
    if (!calculateForm.periodId) return;

    setIsSubmitting(true);
    try {
      await calculatePayroll(calculateForm.periodId, calculateForm.shiftRate, calculateForm.overtimeRate);
      setIsCalculateOpen(false);
      setActiveTab('records');
    } catch (error) {
      console.error('Error calculating payroll:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClosePeriod = async () => {
    if (!selectedPeriod) return;
    setIsSubmitting(true);
    try {
      await closePeriod(selectedPeriod.id);
      setIsClosePeriodOpen(false);
      setSelectedPeriod(null);
    } catch (error) {
      console.error('Error closing period:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetPeriodForm = () => {
    setPeriodForm({
      year: new Date().getFullYear(),
      month: new Date().getMonth() + 1,
      startDate: '',
      endDate: '',
      payDate: '',
    });
  };

  const openCalculateDialog = (period?: PayrollPeriod) => {
    const targetPeriod = period || currentPeriod;
    if (targetPeriod) {
      setCalculateForm({
        periodId: targetPeriod.id,
        shiftRate: 400,
        overtimeRate: 60,
      });
    }
    setIsCalculateOpen(true);
  };

  const openClosePeriodDialog = (period: PayrollPeriod) => {
    setSelectedPeriod(period);
    setIsClosePeriodOpen(true);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'open':
        return <Badge variant="outline" className="text-green-600 border-green-600">เปิด</Badge>;
      case 'processing':
        return <Badge variant="secondary" className="text-blue-600">กำลังคำนวณ</Badge>;
      case 'closed':
        return <Badge variant="secondary">ปิดแล้ว</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getRecordStatusBadge = (status: string) => {
    switch (status) {
      case 'draft':
        return <Badge variant="outline">ร่าง</Badge>;
      case 'approved':
        return <Badge variant="secondary" className="text-blue-600">อนุมัติแล้ว</Badge>;
      case 'paid':
        return <Badge className="bg-green-500">จ่ายแล้ว</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  return (
    <div>
      <Header
        title="เงินเดือน / ค่ากะ"
        subtitle="จัดการงวดเงินเดือนและรายการจ่ายพนักงาน"
        onMenuClick={onMenuClick}
        actions={
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => {
                const exportData = filteredRecords.map((r) => ({
                  employeeName: r.employee?.fullName || '-',
                  position: r.employee?.position?.name || '-',
                  shiftCount: r.shiftCount,
                  baseSalary: r.baseSalary,
                  overtimeHours: r.overtimeHours,
                  overtimePay: Math.round(r.overtimeHours * r.overtimeRate * 100) / 100,
                  totalIncome: r.totalIncome,
                  taxDeduction: r.taxDeduction,
                  socialSecurity: r.socialSecurity,
                  otherDeductions: r.otherDeductions,
                  netSalary: r.netSalary,
                  status: r.status,
                }));
                exportTableToExcel(
                  exportData,
                  {
                    employeeName: 'พนักงาน',
                    position: 'ตำแหน่ง',
                    shiftCount: 'จำนวนกะ',
                    baseSalary: 'ค่ากะ',
                    overtimeHours: 'ชั่วโมง OT',
                    overtimePay: 'ค่า OT',
                    totalIncome: 'รายได้รวม',
                    taxDeduction: 'ภาษี',
                    socialSecurity: 'ประกันสังคม',
                    otherDeductions: 'หักอื่นๆ',
                    netSalary: 'เงินได้สุทธิ',
                    status: 'สถานะ',
                  },
                  `payroll-${currentPeriod?.year}-${currentPeriod?.month}`
                );
              }}
            >
              <FileSpreadsheet className="w-4 h-4 mr-2" />
              Export Excel
            </Button>
            <Dialog open={isCalculateOpen} onOpenChange={setIsCalculateOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" onClick={() => openCalculateDialog()}>
                  <Calculator className="w-4 h-4 mr-2" />
                  คำนวณ
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>คำนวณเงินเดือน</DialogTitle>
                  <DialogDescription>
                    เลือกงวดและระบุอัตราค่ากะและค่าล่วงเวลา
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label>งวดเงินเดือน</Label>
                    <Select
                      value={calculateForm.periodId}
                      onValueChange={(value) => setCalculateForm({ ...calculateForm, periodId: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="เลือกงวด" />
                      </SelectTrigger>
                      <SelectContent>
                        {periods
                          .filter((p) => p.status !== 'closed')
                          .map((p) => (
                            <SelectItem key={p.id} value={p.id}>
                              {thaiMonths[p.month - 1]} {p.year}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>อัตราค่ากะ (บาท/กะ)</Label>
                    <Input
                      type="number"
                      min={0}
                      value={calculateForm.shiftRate}
                      onChange={(e) => setCalculateForm({ ...calculateForm, shiftRate: Number(e.target.value) })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>อัตราค่าล่วงเวลา (บาท/ชั่วโมง)</Label>
                    <Input
                      type="number"
                      min={0}
                      value={calculateForm.overtimeRate}
                      onChange={(e) => setCalculateForm({ ...calculateForm, overtimeRate: Number(e.target.value) })}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsCalculateOpen(false)} disabled={isSubmitting}>
                    ยกเลิก
                  </Button>
                  <Button onClick={handleCalculate} disabled={isSubmitting || !calculateForm.periodId}>
                    {isSubmitting ? 'กำลังคำนวณ...' : 'คำนวณ'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
            <Dialog open={isAddPeriodOpen} onOpenChange={setIsAddPeriodOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  สร้างงวด
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>สร้างงวดเงินเดือนใหม่</DialogTitle>
                  <DialogDescription>
                    กรอกข้อมูลงวดเงินเดือนใหม่ด้านล่าง
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>ปี</Label>
                      <Input
                        type="number"
                        value={periodForm.year}
                        onChange={(e) => setPeriodForm({ ...periodForm, year: Number(e.target.value) })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>เดือน</Label>
                      <Select
                        value={String(periodForm.month)}
                        onValueChange={(value) => setPeriodForm({ ...periodForm, month: Number(value) })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {thaiMonths.map((m, i) => (
                            <SelectItem key={i + 1} value={String(i + 1)}>
                              {m}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>วันที่เริ่มต้น</Label>
                    <Input
                      type="date"
                      value={periodForm.startDate}
                      onChange={(e) => setPeriodForm({ ...periodForm, startDate: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>วันที่สิ้นสุด</Label>
                    <Input
                      type="date"
                      value={periodForm.endDate}
                      onChange={(e) => setPeriodForm({ ...periodForm, endDate: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>วันที่จ่ายเงิน ( optional )</Label>
                    <Input
                      type="date"
                      value={periodForm.payDate}
                      onChange={(e) => setPeriodForm({ ...periodForm, payDate: e.target.value })}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsAddPeriodOpen(false)} disabled={isSubmitting}>
                    ยกเลิก
                  </Button>
                  <Button
                    onClick={handleCreatePeriod}
                    disabled={isSubmitting || !periodForm.startDate || !periodForm.endDate}
                  >
                    {isSubmitting ? 'กำลังบันทึก...' : 'บันทึก'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        }
      />

      <div className="p-6 space-y-6">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="periods">งวดเงินเดือน</TabsTrigger>
            <TabsTrigger value="records">รายการจ่าย</TabsTrigger>
          </TabsList>

          <TabsContent value="periods" className="space-y-4">
            {/* Search */}
            <Card>
              <CardContent className="p-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input
                    placeholder="ค้นหางวด..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Periods Table Desktop */}
            <Card className="hidden md:block">
              <CardContent className="p-0 overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>งวด</TableHead>
                      <TableHead>ช่วงวันที่</TableHead>
                      <TableHead>วันที่จ่าย</TableHead>
                      <TableHead>สถานะ</TableHead>
                      <TableHead className="w-24"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredPeriods.length > 0 ? (
                      filteredPeriods.map((period) => (
                        <TableRow key={period.id}>
                          <TableCell>
                            <div>
                              <p className="font-medium">
                                {thaiMonths[period.month - 1]} {period.year}
                              </p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <p className="text-sm text-slate-600">
                              {formatThaiDate(period.startDate, 'dd MMM yyyy')} - {formatThaiDate(period.endDate, 'dd MMM yyyy')}
                            </p>
                          </TableCell>
                          <TableCell>
                            {period.payDate ? (
                              <p className="text-sm">{formatThaiDate(period.payDate, 'dd MMM yyyy')}</p>
                            ) : (
                              <span className="text-slate-400 text-sm">-</span>
                            )}
                          </TableCell>
                          <TableCell>{getStatusBadge(period.status)}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              {period.status !== 'closed' && (
                                <>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => openCalculateDialog(period)}
                                    title="คำนวณ"
                                  >
                                    <Calculator className="w-4 h-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => openClosePeriodDialog(period)}
                                    title="ปิดงวด"
                                  >
                                    <Lock className="w-4 h-4" />
                                  </Button>
                                </>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-8 text-slate-500">
                          ไม่พบข้อมูลงวดเงินเดือน
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            {/* Periods Cards Mobile */}
            <div className="md:hidden space-y-3">
              {filteredPeriods.length > 0 ? (
                filteredPeriods.map((period) => (
                  <Card key={period.id}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-medium">
                            {thaiMonths[period.month - 1]} {period.year}
                          </p>
                          <p className="text-sm text-slate-500">
                            {formatThaiDate(period.startDate, 'dd MMM')} - {formatThaiDate(period.endDate, 'dd MMM yyyy')}
                          </p>
                          {period.payDate && (
                            <p className="text-xs text-slate-400">
                              จ่ายวันที่ {formatThaiDate(period.payDate, 'dd MMM yyyy')}
                            </p>
                          )}
                        </div>
                        {getStatusBadge(period.status)}
                      </div>
                      {period.status !== 'closed' && (
                        <div className="flex gap-2 mt-3">
                          <Button
                            variant="outline"
                            size="sm"
                            className="flex-1"
                            onClick={() => openCalculateDialog(period)}
                          >
                            <Calculator className="w-4 h-4 mr-1" />
                            คำนวณ
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="flex-1"
                            onClick={() => openClosePeriodDialog(period)}
                          >
                            <Lock className="w-4 h-4 mr-1" />
                            ปิดงวด
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))
              ) : (
                <p className="text-center py-8 text-slate-500">ไม่พบข้อมูลงวดเงินเดือน</p>
              )}
            </div>
          </TabsContent>

          <TabsContent value="records" className="space-y-4">
            {/* Period Selector */}
            <Card>
              <CardContent className="p-4">
                <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
                  <div className="flex-1 w-full">
                    <Label className="text-sm text-slate-500 mb-1 block">งวดเงินเดือน</Label>
                    <Select
                      value={currentPeriod?.id || ''}
                      onValueChange={(value) => {
                        const period = periods.find((p) => p.id === value);
                        if (period) {
                          setCurrentPeriod(period);
                        }
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="เลือกงวด" />
                      </SelectTrigger>
                      <SelectContent>
                        {periods.map((p) => (
                          <SelectItem key={p.id} value={p.id}>
                            {thaiMonths[p.month - 1]} {p.year}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="relative w-full sm:w-auto sm:min-w-[240px]">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input
                      placeholder="ค้นหาพนักงาน..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Records Table Desktop */}
            <Card className="hidden md:block">
              <CardContent className="p-0 overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>พนักงาน</TableHead>
                      <TableHead>จำนวนกะ</TableHead>
                      <TableHead>ค่ากะ</TableHead>
                      <TableHead>OT (ชม.)</TableHead>
                      <TableHead>ค่า OT</TableHead>
                      <TableHead>รายได้รวม</TableHead>
                      <TableHead>หักรวม</TableHead>
                      <TableHead>เงินได้สุทธิ</TableHead>
                      <TableHead>สถานะ</TableHead>
                      <TableHead className="w-16"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredRecords.length > 0 ? (
                      filteredRecords.map((record) => (
                        <TableRow key={record.id}>
                          <TableCell>
                            <div>
                              <p className="font-medium">{record.employee?.fullName || '-'}</p>
                              <p className="text-sm text-slate-500">{record.employee?.position?.name || '-'}</p>
                            </div>
                          </TableCell>
                          <TableCell>{record.shiftCount}</TableCell>
                          <TableCell>{record.baseSalary.toLocaleString('th-TH')}</TableCell>
                          <TableCell>{record.overtimeHours}</TableCell>
                          <TableCell>{Math.round(record.overtimeHours * record.overtimeRate * 100) / 100}</TableCell>
                          <TableCell className="font-medium">{record.totalIncome.toLocaleString('th-TH')}</TableCell>
                          <TableCell className="text-red-500">
                            {(record.taxDeduction + record.socialSecurity + record.otherDeductions).toLocaleString('th-TH')}
                          </TableCell>
                          <TableCell className="font-bold text-green-600">
                            {record.netSalary.toLocaleString('th-TH')}
                          </TableCell>
                          <TableCell>{getRecordStatusBadge(record.status)}</TableCell>
                          <TableCell>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon">
                                  <MoreVertical className="w-4 h-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                {record.status === 'draft' && (
                                  <DropdownMenuItem onClick={() => approveRecord(record.id)}>
                                    <CheckCircle className="w-4 h-4 mr-2 text-blue-500" />
                                    อนุมัติ
                                  </DropdownMenuItem>
                                )}
                                {record.status === 'approved' && (
                                  <DropdownMenuItem onClick={() => payRecord(record.id)}>
                                    <Banknote className="w-4 h-4 mr-2 text-green-500" />
                                    จ่ายเงิน
                                  </DropdownMenuItem>
                                )}
                                <DropdownMenuItem onClick={() => exportPayslip(record)}>
                                  <Printer className="w-4 h-4 mr-2" />
                                  พิมพ์สลิป
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={10} className="text-center py-8 text-slate-500">
                          {currentPeriod ? 'ไม่พบข้อมูลรายการจ่ายสำหรับงวดนี้' : 'กรุณาเลือกงวดเงินเดือน'}
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            {/* Records Cards Mobile */}
            <div className="md:hidden space-y-3">
              {filteredRecords.length > 0 ? (
                filteredRecords.map((record) => (
                  <Card key={record.id}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="min-w-0">
                          <p className="font-medium truncate">{record.employee?.fullName || '-'}</p>
                          <p className="text-sm text-slate-500 truncate">{record.employee?.position?.name || '-'}</p>
                        </div>
                        {getRecordStatusBadge(record.status)}
                      </div>
                      <div className="grid grid-cols-2 gap-2 mt-3 text-sm">
                        <div>
                          <p className="text-slate-500">จำนวนกะ</p>
                          <p className="font-medium">{record.shiftCount} กะ</p>
                        </div>
                        <div>
                          <p className="text-slate-500">ค่ากะ</p>
                          <p className="font-medium">{record.baseSalary.toLocaleString('th-TH')} บ.</p>
                        </div>
                        <div>
                          <p className="text-slate-500">OT</p>
                          <p className="font-medium">{record.overtimeHours} ชม.</p>
                        </div>
                        <div>
                          <p className="text-slate-500">ค่า OT</p>
                          <p className="font-medium">
                            {Math.round(record.overtimeHours * record.overtimeRate * 100) / 100} บ.
                          </p>
                        </div>
                      </div>
                      <div className="border-t mt-3 pt-3 space-y-1">
                        <div className="flex justify-between text-sm">
                          <span className="text-slate-500">รายได้รวม</span>
                          <span className="font-medium">{record.totalIncome.toLocaleString('th-TH')} บ.</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-slate-500">หักรวม</span>
                          <span className="text-red-500">
                            {(record.taxDeduction + record.socialSecurity + record.otherDeductions).toLocaleString('th-TH')} บ.
                          </span>
                        </div>
                        <div className="flex justify-between text-base">
                          <span className="font-medium">เงินได้สุทธิ</span>
                          <span className="font-bold text-green-600">{record.netSalary.toLocaleString('th-TH')} บ.</span>
                        </div>
                      </div>
                      <div className="flex gap-2 mt-3">
                        {record.status === 'draft' && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="flex-1"
                            onClick={() => approveRecord(record.id)}
                          >
                            <CheckCircle className="w-4 h-4 mr-1" />
                            อนุมัติ
                          </Button>
                        )}
                        {record.status === 'approved' && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="flex-1"
                            onClick={() => payRecord(record.id)}
                          >
                            <Banknote className="w-4 h-4 mr-1" />
                            จ่ายเงิน
                          </Button>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1"
                          onClick={() => exportPayslip(record)}
                        >
                          <Printer className="w-4 h-4 mr-1" />
                          พิมพ์สลิป
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))
              ) : (
                <p className="text-center py-8 text-slate-500">
                  {currentPeriod ? 'ไม่พบข้อมูลรายการจ่ายสำหรับงวดนี้' : 'กรุณาเลือกงวดเงินเดือน'}
                </p>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Close Period Dialog */}
      <Dialog open={isClosePeriodOpen} onOpenChange={setIsClosePeriodOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>ยืนยันการปิดงวด</DialogTitle>
            <DialogDescription>
              คุณแน่ใจหรือไม่ที่จะปิดงวด {selectedPeriod && thaiMonths[selectedPeriod.month - 1]} {selectedPeriod?.year}?
              การกระทำนี้จะไม่สามารถแก้ไขข้อมูลในงวดนี้ได้อีก
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsClosePeriodOpen(false)} disabled={isSubmitting}>
              ยกเลิก
            </Button>
            <Button variant="destructive" onClick={handleClosePeriod} disabled={isSubmitting}>
              {isSubmitting ? 'กำลังปิดงวด...' : 'ปิดงวด'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Payroll;
