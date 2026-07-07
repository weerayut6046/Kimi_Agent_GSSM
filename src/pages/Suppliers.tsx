import React, { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import {
  Truck,
  Plus,
  Search,
  Edit,
  Trash2,
  Phone,
  Mail,
  MapPin,
  User,
  Building2,
  Clock,
} from 'lucide-react';
import Header from '@/components/layout/Header';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useInventory } from '@/contexts/InventoryContext';
import type { Supplier } from '@/types/inventory';

interface LayoutContext {
  onMenuClick: () => void;
}

const Suppliers: React.FC = () => {
  const { onMenuClick } = useOutletContext<LayoutContext>();
  const { suppliers, isLoading, addSupplier, updateSupplier, deleteSupplier } = useInventory();

  // State
  const [searchTerm, setSearchTerm] = useState('');
  
  // Dialogs
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [deletingSupplier, setDeletingSupplier] = useState<Supplier | null>(null);
  const [viewingSupplier, setViewingSupplier] = useState<Supplier | null>(null);

  // Form
  const [form, setForm] = useState({
    name: '',
    contactPerson: '',
    phone: '',
    email: '',
    address: '',
    taxId: '',
    paymentTerms: 15,
  });

  // ==========================================================================
  // Computed
  // ==========================================================================
  
  const filteredSuppliers = suppliers
    .filter(
      (s) =>
        s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.contactPerson?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.phone?.includes(searchTerm)
    )
    .sort((a, b) => a.name.localeCompare(b.name));

  // ==========================================================================
  // Handlers
  // ==========================================================================
  
  const handleAdd = async () => {
    try {
      await addSupplier({
        ...form,
        isActive: true,
      });
      setIsAddOpen(false);
      resetForm();
    } catch {
      // Error handled by context
    }
  };

  const handleUpdate = async () => {
    if (!editingSupplier) return;
    
    try {
      await updateSupplier(editingSupplier.id, form);
      setEditingSupplier(null);
    } catch {
      // Error handled by context
    }
  };

  const handleDelete = async () => {
    if (!deletingSupplier) return;
    
    try {
      await deleteSupplier(deletingSupplier.id);
      setDeletingSupplier(null);
    } catch {
      // Error handled by context
    }
  };

  const openEditDialog = (supplier: Supplier) => {
    setEditingSupplier(supplier);
    setForm({
      name: supplier.name,
      contactPerson: supplier.contactPerson || '',
      phone: supplier.phone || '',
      email: supplier.email || '',
      address: supplier.address || '',
      taxId: supplier.taxId || '',
      paymentTerms: supplier.paymentTerms,
    });
  };

  const resetForm = () => {
    setForm({
      name: '',
      contactPerson: '',
      phone: '',
      email: '',
      address: '',
      taxId: '',
      paymentTerms: 15,
    });
  };

  // ==========================================================================
  // Render Helpers
  // ==========================================================================
  
  const renderForm = () => (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>ชื่อบริษัท/ซัพพลายเออร์ *</Label>
        <div className="relative">
          <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="pl-10"
            placeholder="ชื่อบริษัท"
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label>ผู้ติดต่อ</Label>
        <div className="relative">
          <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            value={form.contactPerson}
            onChange={(e) => setForm({ ...form, contactPerson: e.target.value })}
            className="pl-10"
            placeholder="ชื่อผู้ติดต่อ"
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>เบอร์โทรศัพท์</Label>
          <div className="relative">
            <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              className="pl-10"
              placeholder="0xx-xxx-xxxx"
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label>อีเมล</Label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="pl-10"
              placeholder="email@company.com"
            />
          </div>
        </div>
      </div>
      <div className="space-y-2">
        <Label>ที่อยู่</Label>
        <div className="relative">
          <MapPin className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
          <textarea
            value={form.address}
            onChange={(e) => setForm({ ...form, address: e.target.value })}
            className="w-full min-h-[80px] pl-10 pr-3 py-2 rounded-md border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="ที่อยู่บริษัท"
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>เลขประจำตัวผู้เสียภาษี</Label>
          <Input
            value={form.taxId}
            onChange={(e) => setForm({ ...form, taxId: e.target.value })}
            placeholder="เลข 13 หลัก"
          />
        </div>
        <div className="space-y-2">
          <Label>เงื่อนไขการชำระ (วัน)</Label>
          <div className="relative">
            <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              type="number"
              value={form.paymentTerms}
              onChange={(e) => setForm({ ...form, paymentTerms: Number(e.target.value) })}
              className="pl-10"
              placeholder="15"
            />
          </div>
        </div>
      </div>
    </div>
  );

  // ==========================================================================
  // Main Render
  // ==========================================================================
  
  return (
    <div>
      <Header
        title="ซัพพลายเออร์"
        subtitle="จัดการซัพพลายเออร์และผู้จำหน่าย"
        onMenuClick={onMenuClick}
      />

      <div className="p-6 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500">ซัพพลายเออร์ทั้งหมด</p>
                  <p className="text-2xl font-bold">{suppliers.length}</p>
                </div>
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Truck className="w-6 h-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500">มีเบอร์ติดต่อ</p>
                  <p className="text-2xl font-bold">
                    {suppliers.filter((s) => s.phone).length}
                  </p>
                </div>
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                  <Phone className="w-6 h-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500">มีเลขผู้เสียภาษี</p>
                  <p className="text-2xl font-bold">
                    {suppliers.filter((s) => s.taxId).length}
                  </p>
                </div>
                <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                  <Building2 className="w-6 h-6 text-orange-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <div className="flex gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="ค้นหาซัพพลายเออร์..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Button onClick={() => setIsAddOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            เพิ่มซัพพลายเออร์
          </Button>
        </div>

        {/* Table */}
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ชื่อบริษัท</TableHead>
                    <TableHead>ผู้ติดต่อ</TableHead>
                    <TableHead>เบอร์โทร</TableHead>
                    <TableHead>เงื่อนไขชำระ</TableHead>
                    <TableHead className="w-24"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8">
                        <div className="animate-spin w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full mx-auto" />
                      </TableCell>
                    </TableRow>
                  ) : filteredSuppliers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-slate-500">
                        ไม่พบซัพพลายเออร์
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredSuppliers.map((supplier) => (
                      <TableRow key={supplier.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{supplier.name}</p>
                            {supplier.taxId && (
                              <p className="text-sm text-slate-500">Tax ID: {supplier.taxId}</p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>{supplier.contactPerson || '-'}</TableCell>
                        <TableCell>{supplier.phone || '-'}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{supplier.paymentTerms} วัน</Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setViewingSupplier(supplier)}
                              title="ดูรายละเอียด"
                            >
                              <Building2 className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => openEditDialog(supplier)}
                              title="แก้ไข"
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setDeletingSupplier(supplier)}
                              title="ลบ"
                              className="text-red-600"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Add Dialog */}
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>เพิ่มซัพพลายเออร์</DialogTitle>
            <DialogDescription>กรอกข้อมูลซัพพลายเออร์ใหม่</DialogDescription>
          </DialogHeader>
          {renderForm()}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddOpen(false)}>
              ยกเลิก
            </Button>
            <Button onClick={handleAdd} disabled={!form.name}>
              บันทึก
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={!!editingSupplier} onOpenChange={() => setEditingSupplier(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>แก้ไขซัพพลายเออร์</DialogTitle>
            <DialogDescription>แก้ไขข้อมูล {editingSupplier?.name}</DialogDescription>
          </DialogHeader>
          {renderForm()}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingSupplier(null)}>
              ยกเลิก
            </Button>
            <Button onClick={handleUpdate}>บันทึก</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={!!deletingSupplier} onOpenChange={() => setDeletingSupplier(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>ยืนยันการลบ</DialogTitle>
            <DialogDescription>
              คุณแน่ใจหรือไม่ว่าต้องการลบซัพพลายเออร์ "{deletingSupplier?.name}"?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDeletingSupplier(null)}>
              ยกเลิก
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              ลบ
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Detail Dialog */}
      <Dialog open={!!viewingSupplier} onOpenChange={() => setViewingSupplier(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>รายละเอียดซัพพลายเออร์</DialogTitle>
          </DialogHeader>
          {viewingSupplier && (
            <div className="space-y-4 py-4">
              <div className="flex items-start gap-3">
                <Building2 className="w-5 h-5 text-slate-400 mt-0.5" />
                <div>
                  <p className="text-sm text-slate-500">ชื่อบริษัท</p>
                  <p className="font-medium">{viewingSupplier.name}</p>
                </div>
              </div>
              {viewingSupplier.contactPerson && (
                <div className="flex items-start gap-3">
                  <User className="w-5 h-5 text-slate-400 mt-0.5" />
                  <div>
                    <p className="text-sm text-slate-500">ผู้ติดต่อ</p>
                    <p>{viewingSupplier.contactPerson}</p>
                  </div>
                </div>
              )}
              {viewingSupplier.phone && (
                <div className="flex items-start gap-3">
                  <Phone className="w-5 h-5 text-slate-400 mt-0.5" />
                  <div>
                    <p className="text-sm text-slate-500">เบอร์โทรศัพท์</p>
                    <p>{viewingSupplier.phone}</p>
                  </div>
                </div>
              )}
              {viewingSupplier.email && (
                <div className="flex items-start gap-3">
                  <Mail className="w-5 h-5 text-slate-400 mt-0.5" />
                  <div>
                    <p className="text-sm text-slate-500">อีเมล</p>
                    <p>{viewingSupplier.email}</p>
                  </div>
                </div>
              )}
              {viewingSupplier.address && (
                <div className="flex items-start gap-3">
                  <MapPin className="w-5 h-5 text-slate-400 mt-0.5" />
                  <div>
                    <p className="text-sm text-slate-500">ที่อยู่</p>
                    <p>{viewingSupplier.address}</p>
                  </div>
                </div>
              )}
              {viewingSupplier.taxId && (
                <div className="flex items-start gap-3">
                  <Building2 className="w-5 h-5 text-slate-400 mt-0.5" />
                  <div>
                    <p className="text-sm text-slate-500">เลขประจำตัวผู้เสียภาษี</p>
                    <p>{viewingSupplier.taxId}</p>
                  </div>
                </div>
              )}
              <div className="flex items-start gap-3">
                <Clock className="w-5 h-5 text-slate-400 mt-0.5" />
                <div>
                  <p className="text-sm text-slate-500">เงื่อนไขการชำระ</p>
                  <Badge variant="outline">{viewingSupplier.paymentTerms} วัน</Badge>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button onClick={() => setViewingSupplier(null)}>ปิด</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Suppliers;
