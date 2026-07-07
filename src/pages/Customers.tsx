import React, { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Plus, Search, Pencil, Trash2, Gift, Star, Phone, Mail } from 'lucide-react';
import { toast } from 'sonner';
import Header from '@/components/layout/Header';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useCustomer } from '@/contexts/CustomerContext';
import { useAuth } from '@/contexts/AuthContext';
import { TIER_CONFIG, getTierFromPoints, type Customer, type CustomerTier } from '@/types/customer';
import { TableSkeleton } from '@/components/common/LoadingPage';

interface LayoutContext {
  onMenuClick: () => void;
}

const generateMemberCode = (): string => {
  const now = new Date();
  const yyyymmdd = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
  const random = Math.floor(1000 + Math.random() * 9000);
  return `MB-${yyyymmdd}-${random}`;
};

const getTierBadge = (tier: CustomerTier) => {
  const config = TIER_CONFIG[tier];
  return (
    <Badge
      style={{
        backgroundColor: config.color,
        color: tier === 'gold' ? '#000' : '#fff',
      }}
      className="font-medium"
    >
      {config.label}
    </Badge>
  );
};

const Customers: React.FC = () => {
  const { onMenuClick } = useOutletContext<LayoutContext>();
  const { user } = useAuth();
  const {
    customers,
    isLoading,
    fetchCustomers,
    addCustomer,
    updateCustomer,
    deleteCustomer,
    addPoints,
    getTransactions,
  } = useCustomer();

  const canManage = user?.role === 'admin' || user?.role === 'manager';

  const [searchTerm, setSearchTerm] = useState('');
  const [tierFilter, setTierFilter] = useState<CustomerTier | 'all'>('all');

  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);
  const [isAdjustDialogOpen, setIsAdjustDialogOpen] = useState(false);

  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [transactions, setTransactions] = useState<Awaited<ReturnType<typeof getTransactions>>>([]);

  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    birthDate: '',
  });

  const [adjustPointsValue, setAdjustPointsValue] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  const filteredCustomers = customers.filter((c) => {
    const matchesSearch =
      !searchTerm ||
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.phone?.includes(searchTerm) ||
      c.memberCode.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesTier = tierFilter === 'all' || c.tier === tierFilter;
    return matchesSearch && matchesTier;
  });

  const resetForm = () => {
    setFormData({ name: '', phone: '', email: '', birthDate: '' });
  };

  const openAddDialog = () => {
    resetForm();
    setIsAddDialogOpen(true);
  };

  const openEditDialog = (customer: Customer) => {
    setSelectedCustomer(customer);
    setFormData({
      name: customer.name,
      phone: customer.phone || '',
      email: customer.email || '',
      birthDate: customer.birthDate || '',
    });
    setIsEditDialogOpen(true);
  };

  const openDeleteDialog = (customer: Customer) => {
    setSelectedCustomer(customer);
    setIsDeleteDialogOpen(true);
  };

  const openDetailDialog = async (customer: Customer) => {
    setSelectedCustomer(customer);
    setIsDetailDialogOpen(true);
    const txs = await getTransactions(customer.id);
    setTransactions(txs);
  };

  const openAdjustDialog = (customer: Customer) => {
    setSelectedCustomer(customer);
    setAdjustPointsValue('');
    setIsAdjustDialogOpen(true);
  };

  const handleAdd = async () => {
    if (!formData.name.trim()) {
      toast.error('กรุณากรอกชื่อลูกค้า');
      return;
    }
    setIsSubmitting(true);
    try {
      const result = await addCustomer({
        memberCode: generateMemberCode(),
        name: formData.name.trim(),
        phone: formData.phone.trim() || undefined,
        email: formData.email.trim() || undefined,
        birthDate: formData.birthDate || undefined,
        tier: 'bronze',
        isActive: true,
      });
      if (result) {
        toast.success('เพิ่มลูกค้าสำเร็จ');
        setIsAddDialogOpen(false);
        resetForm();
      } else {
        toast.error('ไม่สามารถเพิ่มลูกค้าได้');
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'เกิดข้อผิดพลาด');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = async () => {
    if (!selectedCustomer || !formData.name.trim()) {
      toast.error('กรุณากรอกชื่อลูกค้า');
      return;
    }
    setIsSubmitting(true);
    try {
      const success = await updateCustomer(selectedCustomer.id, {
        name: formData.name.trim(),
        phone: formData.phone.trim() || undefined,
        email: formData.email.trim() || undefined,
        birthDate: formData.birthDate || undefined,
      });
      if (success) {
        toast.success('แก้ไขข้อมูลสำเร็จ');
        setIsEditDialogOpen(false);
        setSelectedCustomer(null);
        resetForm();
      } else {
        toast.error('ไม่สามารถแก้ไขข้อมูลได้');
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'เกิดข้อผิดพลาด');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedCustomer) return;
    try {
      const success = await deleteCustomer(selectedCustomer.id);
      if (success) {
        toast.success('ลบลูกค้าสำเร็จ');
        setIsDeleteDialogOpen(false);
        setSelectedCustomer(null);
      } else {
        toast.error('ไม่สามารถลบลูกค้าได้');
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'เกิดข้อผิดพลาด');
    }
  };

  const handleAdjustPoints = async () => {
    if (!selectedCustomer) return;
    const value = parseInt(adjustPointsValue, 10);
    if (isNaN(value) || value === 0) {
      toast.error('กรุณากรอกจำนวนแต้มที่ถูกต้อง');
      return;
    }
    setIsSubmitting(true);
    try {
      if (value > 0) {
        const success = await addPoints(selectedCustomer.id, value, 0);
        if (success) {
          toast.success(`เพิ่มแต้ม ${value} แต้มสำเร็จ`);
        } else {
          toast.error('ไม่สามารถเพิ่มแต้มได้');
          setIsSubmitting(false);
          return;
        }
      } else {
        const newPoints = selectedCustomer.points + value;
        if (newPoints < 0) {
          toast.error('แต้มไม่สามารถติดลบได้');
          setIsSubmitting(false);
          return;
        }
        const success = await updateCustomer(selectedCustomer.id, {
          points: newPoints,
          tier: getTierFromPoints(newPoints),
        });
        if (success) {
          toast.success(`ลดแต้ม ${Math.abs(value)} แต้มสำเร็จ`);
        } else {
          toast.error('ไม่สามารถลดแต้มได้');
          setIsSubmitting(false);
          return;
        }
      }
      setIsAdjustDialogOpen(false);
      setSelectedCustomer(null);
      setAdjustPointsValue('');
      // Refresh transactions if detail dialog is open
      if (selectedCustomer) {
        const txs = await getTransactions(selectedCustomer.id);
        setTransactions(txs);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'เกิดข้อผิดพลาด');
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatDateThai = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString('th-TH');
    } catch {
      return dateStr;
    }
  };

  const formatDateTimeThai = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return `${d.toLocaleDateString('th-TH')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
    } catch {
      return dateStr;
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Header title="ลูกค้าสมาชิก" subtitle="จัดการลูกค้าสมาชิกและแต้มสะสม" />
        <TableSkeleton rows={5} />
      </div>
    );
  }

  return (
    <div>
      <Header
        title="ลูกค้าสมาชิก"
        subtitle="ดูและจัดการข้อมูลลูกค้าสมาชิก ระดับ และแต้มสะสม"
        onMenuClick={onMenuClick}
        actions={
          canManage && (
            <Button onClick={openAddDialog}>
              <Plus className="w-4 h-4 mr-2" />
              เพิ่มลูกค้า
            </Button>
          )
        }
      />

      <div className="p-6 space-y-6">
        {/* Search and Filter */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="ค้นหาชื่อ, เบอร์โทร, รหัสสมาชิก..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select
                value={tierFilter}
                onValueChange={(value: CustomerTier | 'all') => setTierFilter(value)}
              >
                <SelectTrigger className="w-full sm:w-44">
                  <SelectValue placeholder="ระดับสมาชิก" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">ทั้งหมด</SelectItem>
                  <SelectItem value="bronze">Bronze</SelectItem>
                  <SelectItem value="silver">Silver</SelectItem>
                  <SelectItem value="gold">Gold</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Desktop Table */}
        <Card className="hidden md:block">
          <CardContent className="p-0 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>รหัสสมาชิก</TableHead>
                  <TableHead>ชื่อ</TableHead>
                  <TableHead>เบอร์โทร</TableHead>
                  <TableHead>ระดับ</TableHead>
                  <TableHead>แต้ม</TableHead>
                  <TableHead>ยอดใช้จ่าย</TableHead>
                  <TableHead className="w-28">จัดการ</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCustomers.length > 0 ? (
                  filteredCustomers.map((customer) => (
                    <TableRow
                      key={customer.id}
                      className="cursor-pointer hover:bg-muted"
                      onClick={() => openDetailDialog(customer)}
                    >
                      <TableCell className="font-medium">{customer.memberCode}</TableCell>
                      <TableCell>{customer.name}</TableCell>
                      <TableCell>{customer.phone || '-'}</TableCell>
                      <TableCell>{getTierBadge(customer.tier)}</TableCell>
                      <TableCell>{customer.points.toLocaleString()}</TableCell>
                      <TableCell>฿{customer.totalSpent.toLocaleString()}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="min-w-[44px] min-h-[44px]"
                            onClick={() => openDetailDialog(customer)}
                          >
                            <Star className="w-4 h-4 text-amber-500" />
                          </Button>
                          {canManage && (
                            <>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="min-w-[44px] min-h-[44px]"
                                onClick={() => openEditDialog(customer)}
                              >
                                <Pencil className="w-4 h-4 text-blue-500" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="min-w-[44px] min-h-[44px]"
                                onClick={() => openDeleteDialog(customer)}
                              >
                                <Trash2 className="w-4 h-4 text-red-500" />
                              </Button>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      ไม่พบข้อมูลลูกค้า
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Mobile Cards */}
        <div className="md:hidden space-y-3">
          {filteredCustomers.length > 0 ? (
            filteredCustomers.map((customer) => (
              <Card
                key={customer.id}
                className="cursor-pointer"
                onClick={() => openDetailDialog(customer)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium truncate">{customer.name}</p>
                      <p className="text-sm text-muted-foreground">{customer.memberCode}</p>
                      {customer.phone && (
                        <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                          <Phone className="w-3 h-3" />
                          {customer.phone}
                        </p>
                      )}
                    </div>
                    <div className="shrink-0">{getTierBadge(customer.tier)}</div>
                  </div>
                  <div className="flex items-center justify-between mt-3">
                    <div className="flex gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground text-xs">แต้ม</span>
                        <p className="font-medium">{customer.points.toLocaleString()}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground text-xs">ยอดใช้จ่าย</span>
                        <p className="font-medium">฿{customer.totalSpent.toLocaleString()}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                      {canManage && (
                        <>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="min-w-[44px] min-h-[44px]"
                            onClick={() => openEditDialog(customer)}
                          >
                            <Pencil className="w-4 h-4 text-blue-500" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="min-w-[44px] min-h-[44px]"
                            onClick={() => openDeleteDialog(customer)}
                          >
                            <Trash2 className="w-4 h-4 text-red-500" />
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <p className="text-center py-8 text-muted-foreground">ไม่พบข้อมูลลูกค้า</p>
          )}
        </div>
      </div>

      {/* Add Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>เพิ่มลูกค้าสมาชิก</DialogTitle>
            <DialogDescription>
              กรอกข้อมูลลูกค้าใหม่ รหัสสมาชิกจะสร้างอัตโนมัติ
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>ชื่อ <span className="text-red-500">*</span></Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="ชื่อ-นามสกุล"
              />
            </div>
            <div className="space-y-2">
              <Label>เบอร์โทรศัพท์</Label>
              <Input
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="081-234-5678"
              />
            </div>
            <div className="space-y-2">
              <Label>อีเมล</Label>
              <Input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="email@example.com"
              />
            </div>
            <div className="space-y-2">
              <Label>วันเกิด</Label>
              <Input
                type="date"
                value={formData.birthDate}
                onChange={(e) => setFormData({ ...formData, birthDate: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddDialogOpen(false)} disabled={isSubmitting}>
              ยกเลิก
            </Button>
            <Button
              onClick={handleAdd}
              disabled={isSubmitting || !formData.name.trim()}
            >
              {isSubmitting ? 'กำลังบันทึก...' : 'บันทึก'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>แก้ไขข้อมูลลูกค้า</DialogTitle>
            <DialogDescription>
              แก้ไขข้อมูลลูกค้าสมาชิก {selectedCustomer?.memberCode}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>ชื่อ <span className="text-red-500">*</span></Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="ชื่อ-นามสกุล"
              />
            </div>
            <div className="space-y-2">
              <Label>เบอร์โทรศัพท์</Label>
              <Input
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="081-234-5678"
              />
            </div>
            <div className="space-y-2">
              <Label>อีเมล</Label>
              <Input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="email@example.com"
              />
            </div>
            <div className="space-y-2">
              <Label>วันเกิด</Label>
              <Input
                type="date"
                value={formData.birthDate}
                onChange={(e) => setFormData({ ...formData, birthDate: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)} disabled={isSubmitting}>
              ยกเลิก
            </Button>
            <Button
              onClick={handleEdit}
              disabled={isSubmitting || !formData.name.trim()}
            >
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
              คุณแน่ใจหรือไม่ที่จะลบลูกค้า <strong>{selectedCustomer?.name}</strong>?
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

      {/* Detail Dialog */}
      <Dialog open={isDetailDialogOpen} onOpenChange={setIsDetailDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>รายละเอียดลูกค้า</DialogTitle>
            <DialogDescription>ข้อมูลสมาชิกและประวัติธุรกรรม</DialogDescription>
          </DialogHeader>
          {selectedCustomer && (
            <div className="space-y-4 py-2">
              {/* Info Section */}
              <div className="bg-muted rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">รหัสสมาชิก</p>
                    <p className="font-medium">{selectedCustomer.memberCode}</p>
                  </div>
                  {getTierBadge(selectedCustomer.tier)}
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">ชื่อ</p>
                  <p className="font-medium">{selectedCustomer.name}</p>
                </div>
                {selectedCustomer.phone && (
                  <div className="flex items-center gap-2">
                    <Phone className="w-4 h-4 text-muted-foreground" />
                    <p className="text-sm">{selectedCustomer.phone}</p>
                  </div>
                )}
                {selectedCustomer.email && (
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4 text-muted-foreground" />
                    <p className="text-sm">{selectedCustomer.email}</p>
                  </div>
                )}
                {selectedCustomer.birthDate && (
                  <div>
                    <p className="text-sm text-muted-foreground">วันเกิด</p>
                    <p className="text-sm">{formatDateThai(selectedCustomer.birthDate)}</p>
                  </div>
                )}
                <div className="flex gap-4 pt-2 border-t border-border">
                  <div className="flex-1">
                    <p className="text-sm text-muted-foreground">แต้มสะสม</p>
                    <p className="text-lg font-bold text-amber-600">{selectedCustomer.points.toLocaleString()}</p>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-muted-foreground">ยอดใช้จ่ายรวม</p>
                    <p className="text-lg font-bold text-green-600">฿{selectedCustomer.totalSpent.toLocaleString()}</p>
                  </div>
                </div>
              </div>

              {canManage && (
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => {
                    setIsDetailDialogOpen(false);
                    openAdjustDialog(selectedCustomer);
                  }}
                >
                  <Gift className="w-4 h-4 mr-2" />
                  เพิ่ม/ลดแต้ม
                </Button>
              )}

              {/* Transactions */}
              <div>
                <h4 className="text-sm font-medium mb-2">ประวัติธุรกรรม</h4>
                {transactions.length > 0 ? (
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {transactions.map((tx) => (
                      <div
                        key={tx.id}
                        className="flex items-center justify-between p-3 border rounded-lg"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <Badge
                              variant={
                                tx.type === 'earn' || tx.type === 'adjust'
                                  ? 'default'
                                  : tx.type === 'redeem'
                                  ? 'destructive'
                                  : 'secondary'
                              }
                              className="text-xs"
                            >
                              {tx.type === 'earn' && 'สะสม'}
                              {tx.type === 'redeem' && 'แลก'}
                              {tx.type === 'adjust' && 'ปรับ'}
                              {tx.type === 'expire' && 'หมดอายุ'}
                            </Badge>
                            {tx.note && <span className="text-xs text-muted-foreground">{tx.note}</span>}
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">
                            {formatDateTimeThai(tx.createdAt)}
                          </p>
                        </div>
                        <div className="text-right">
                          <p
                            className={`font-medium ${
                              tx.points >= 0 ? 'text-green-600' : 'text-red-600'
                            }`}
                          >
                            {tx.points >= 0 ? '+' : ''}
                            {tx.points.toLocaleString()} แต้ม
                          </p>
                          {tx.amount > 0 && (
                            <p className="text-xs text-muted-foreground">฿{tx.amount.toLocaleString()}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">ไม่มีประวัติธุรกรรม</p>
                )}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button onClick={() => setIsDetailDialogOpen(false)}>ปิด</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Adjust Points Dialog */}
      <Dialog open={isAdjustDialogOpen} onOpenChange={setIsAdjustDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>ปรับแต้มสมาชิก</DialogTitle>
            <DialogDescription>
              {selectedCustomer?.name} (แต้มปัจจุบัน: {selectedCustomer?.points.toLocaleString()})
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>จำนวนแต้ม (+ เพิ่ม, - ลด)</Label>
              <Input
                type="number"
                value={adjustPointsValue}
                onChange={(e) => setAdjustPointsValue(e.target.value)}
                placeholder="เช่น 100 หรือ -50"
                autoFocus
              />
              <p className="text-xs text-muted-foreground">
                ใส่ค่าบวกเพื่อเพิ่มแต้ม หรือค่าลบเพื่อลดแต้ม
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAdjustDialogOpen(false)} disabled={isSubmitting}>
              ยกเลิก
            </Button>
            <Button onClick={handleAdjustPoints} disabled={isSubmitting || !adjustPointsValue}>
              {isSubmitting ? 'กำลังบันทึก...' : 'บันทึก'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Customers;
