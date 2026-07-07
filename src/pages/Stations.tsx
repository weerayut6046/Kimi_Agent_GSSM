import React, { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Plus, Search, Edit2, Trash2, MoreVertical, Building2, MapPin, Phone, User } from 'lucide-react';
import Header from '@/components/layout/Header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
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
import { useStations } from '@/contexts/StationContext';
import { useEmployee } from '@/contexts/EmployeeContext';
import { TableSkeleton } from '@/components/common/LoadingPage';
import type { Station } from '@/types';

interface LayoutContext {
  onMenuClick: () => void;
}

const Stations: React.FC = () => {
  const { onMenuClick } = useOutletContext<LayoutContext>();
  const { stations, isLoading, createStation, updateStation, deleteStation } = useStations();
  const { employees } = useEmployee();

  const [searchTerm, setSearchTerm] = useState('');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedStation, setSelectedStation] = useState<Station | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    address: '',
    phone: '',
    managerId: '',
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Header title="จัดการสาขา" subtitle="เพิ่ม แก้ไข และลบข้อมูลสาขา" />
        <TableSkeleton rows={5} />
      </div>
    );
  }

  const filteredStations = stations.filter(
    (station) =>
      station.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      station.address?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      station.phone?.includes(searchTerm)
  );

  const getManagerName = (managerId: string) => {
    const manager = employees.find((e) => e.id === managerId);
    return manager?.fullName || '-';
  };

  const handleAdd = async () => {
    if (!formData.name.trim()) {
      setSubmitError('กรุณากรอกชื่อสาขา');
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      await createStation({
        name: formData.name.trim(),
        address: formData.address.trim(),
        phone: formData.phone.trim(),
        managerId: formData.managerId,
      });

      setIsAddDialogOpen(false);
      resetForm();
    } catch (error) {
      console.error('Error adding station:', error);
      setSubmitError(error instanceof Error ? error.message : 'เกิดข้อผิดพลาดในการสร้างสาขา');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = async () => {
    if (!selectedStation) return;

    if (!formData.name.trim()) {
      setSubmitError('กรุณากรอกชื่อสาขา');
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      await updateStation(selectedStation.id, {
        name: formData.name.trim(),
        address: formData.address.trim(),
        phone: formData.phone.trim(),
        managerId: formData.managerId,
      });

      setIsEditDialogOpen(false);
      setSelectedStation(null);
      resetForm();
    } catch (error) {
      console.error('Error updating station:', error);
      setSubmitError(error instanceof Error ? error.message : 'เกิดข้อผิดพลาดในการอัปเดตสาขา');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedStation) return;

    try {
      await deleteStation(selectedStation.id);
      setIsDeleteDialogOpen(false);
      setSelectedStation(null);
    } catch (error) {
      console.error('Error deleting station:', error);
    }
  };

  const openEditDialog = (station: Station) => {
    setSelectedStation(station);
    setFormData({
      name: station.name,
      address: station.address,
      phone: station.phone,
      managerId: station.managerId,
    });
    setIsEditDialogOpen(true);
  };

  const openDeleteDialog = (station: Station) => {
    setSelectedStation(station);
    setIsDeleteDialogOpen(true);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      address: '',
      phone: '',
      managerId: '',
    });
    setSubmitError(null);
  };

  const renderFormFields = () => (
    <div className="space-y-4 py-4">
      <div className="space-y-2">
        <Label>
          ชื่อสาขา <span className="text-red-500">*</span>
        </Label>
        <Input
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          placeholder="สาขาหลัก"
        />
      </div>

      <div className="space-y-2">
        <Label>ที่อยู่</Label>
        <Input
          value={formData.address}
          onChange={(e) => setFormData({ ...formData, address: e.target.value })}
          placeholder="123 ถนนสุขุมวิท"
        />
      </div>

      <div className="space-y-2">
        <Label>เบอร์โทรศัพท์</Label>
        <Input
          value={formData.phone}
          onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
          placeholder="02-123-4567"
        />
      </div>

      <div className="space-y-2">
        <Label>ผู้จัดการสาขา</Label>
        <Select
          value={formData.managerId}
          onValueChange={(value) => setFormData({ ...formData, managerId: value })}
        >
          <SelectTrigger>
            <SelectValue placeholder="เลือกผู้จัดการสาขา" />
          </SelectTrigger>
          <SelectContent>
            {employees.map((emp) => (
              <SelectItem key={emp.id} value={emp.id}>
                {emp.fullName}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {submitError && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
          {submitError}
        </div>
      )}
    </div>
  );

  return (
    <div>
      <Header
        title="จัดการสาขา"
        subtitle="ดูและจัดการข้อมูลสาขาทั้งหมด"
        onMenuClick={onMenuClick}
        actions={
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                เพิ่มสาขา
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>เพิ่มสาขาใหม่</DialogTitle>
                <DialogDescription>กรอกข้อมูลสาขาใหม่ด้านล่าง</DialogDescription>
              </DialogHeader>
              {renderFormFields()}
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsAddDialogOpen(false)} disabled={isSubmitting}>
                  ยกเลิก
                </Button>
                <Button onClick={handleAdd} disabled={isSubmitting || !formData.name.trim()}>
                  {isSubmitting ? 'กำลังบันทึก...' : 'บันทึก'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        }
      />

      <div className="p-6 space-y-6">
        {/* Search */}
        <Card>
          <CardContent className="p-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="ค้นหาสาขา..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </CardContent>
        </Card>

        {/* Station Table Desktop */}
        <Card className="hidden md:block">
          <CardContent className="p-0 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>สาขา</TableHead>
                  <TableHead>ที่อยู่</TableHead>
                  <TableHead>เบอร์โทร</TableHead>
                  <TableHead>ผู้จัดการ</TableHead>
                  <TableHead className="w-16"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredStations.length > 0 ? (
                  filteredStations.map((station) => (
                    <TableRow key={station.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center">
                            <Building2 className="w-5 h-5 text-slate-500" />
                          </div>
                          <div>
                            <p className="font-medium">{station.name}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-sm">
                          <MapPin className="w-3 h-3 text-slate-400" />
                          {station.address || '-'}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-sm">
                          <Phone className="w-3 h-3 text-slate-400" />
                          {station.phone || '-'}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-sm">
                          <User className="w-3 h-3 text-slate-400" />
                          {getManagerName(station.managerId)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreVertical className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => openEditDialog(station)}>
                              <Edit2 className="w-4 h-4 mr-2" />
                              แก้ไข
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => openDeleteDialog(station)}
                              className="text-red-600"
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              ลบ
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-slate-500">
                      ไม่พบข้อมูลสาขา
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Station Cards Mobile */}
        <div className="md:hidden space-y-3">
          {filteredStations.length > 0 ? (
            filteredStations.map((station) => (
              <Card key={station.id}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center shrink-0">
                        <Building2 className="w-5 h-5 text-slate-500" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium truncate">{station.name}</p>
                        <p className="text-sm text-slate-500 truncate flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          {station.address || '-'}
                        </p>
                        <p className="text-xs text-slate-400 truncate flex items-center gap-1">
                          <Phone className="w-3 h-3" />
                          {station.phone || '-'}
                        </p>
                        <p className="text-xs text-slate-400 truncate flex items-center gap-1">
                          <User className="w-3 h-3" />
                          {getManagerName(station.managerId)}
                        </p>
                      </div>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="shrink-0 min-w-[44px] min-h-[44px]">
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => openEditDialog(station)}>
                          <Edit2 className="w-4 h-4 mr-2" />
                          แก้ไข
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => openDeleteDialog(station)}
                          className="text-red-600"
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          ลบ
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <p className="text-center py-8 text-slate-500">ไม่พบข้อมูลสาขา</p>
          )}
        </div>
      </div>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>แก้ไขข้อมูลสาขา</DialogTitle>
            <DialogDescription>แก้ไขข้อมูลสาขาด้านล่าง</DialogDescription>
          </DialogHeader>
          {renderFormFields()}
          <DialogFooter>
            <Button variant="outline" onClick={() => { setIsEditDialogOpen(false); setSubmitError(null); }} disabled={isSubmitting}>
              ยกเลิก
            </Button>
            <Button onClick={handleEdit} disabled={isSubmitting || !formData.name.trim()}>
              {isSubmitting ? 'กำลังบันทึก...' : 'บันทึก'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>ยืนยันการลบ</DialogTitle>
            <DialogDescription>
              คุณแน่ใจหรือไม่ที่จะลบสาขา {selectedStation?.name}?
              การกระทำนี้ไม่สามารถย้อนกลับได้
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
              ยกเลิก
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              ลบ
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Stations;
