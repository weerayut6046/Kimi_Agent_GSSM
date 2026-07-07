import React, { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import {
  Plus,
  Search,
  Edit2,
  Trash2,
  Tag,
  Clock,
  Fuel,
  Calendar,
  ToggleLeft,
  ToggleRight,
  Percent,
  Banknote,
  Gift,
} from 'lucide-react';
import Header from '@/components/layout/Header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { usePromotions } from '@/contexts/PromotionContext';
import { PageLoader } from '@/components/common/LoadingPage';
import type { Promotion, PromotionType, PromotionDiscountType, PromotionFuelType } from '@/types/promotion';
import {
  PROMOTION_TYPE_LABELS,
  PROMOTION_TYPE_BADGES,
  getPromotionDescription,
} from '@/types/promotion';

interface LayoutContext {
  onMenuClick: () => void;
}

const PromotionsPage: React.FC = () => {
  const { onMenuClick } = useOutletContext<LayoutContext>();

  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<PromotionType | ''>('');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedPromo, setSelectedPromo] = useState<Promotion | null>(null);
  const [error, setError] = useState('');

  const {
    promotions,
    isLoading,
    addPromotion,
    updatePromotion,
    deletePromotion,
    toggleActive,
  } = usePromotions();

  const [formData, setFormData] = useState({
    name: '',
    type: 'threshold' as PromotionType,
    description: '',
    fuelType: 'all' as PromotionFuelType,
    minAmount: 0,
    discountValue: 0,
    discountType: 'amount' as PromotionDiscountType,
    startTime: '',
    endTime: '',
    startDate: '',
    endDate: '',
    isActive: true,
  });

  // Filter promotions
  const filteredPromotions = promotions.filter((p) => {
    const matchSearch =
      !search ||
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.description.toLowerCase().includes(search.toLowerCase());
    const matchType = !filterType || p.type === filterType;
    return matchSearch && matchType;
  });

  const resetForm = () => {
    setFormData({
      name: '',
      type: 'threshold',
      description: '',
      fuelType: 'all',
      minAmount: 0,
      discountValue: 0,
      discountType: 'amount',
      startTime: '',
      endTime: '',
      startDate: '',
      endDate: '',
      isActive: true,
    });
    setError('');
  };

  const openEditDialog = (promo: Promotion) => {
    setSelectedPromo(promo);
    setFormData({
      name: promo.name,
      type: promo.type,
      description: promo.description,
      fuelType: promo.fuelType,
      minAmount: promo.minAmount,
      discountValue: promo.discountValue,
      discountType: promo.discountType,
      startTime: promo.startTime || '',
      endTime: promo.endTime || '',
      startDate: promo.startDate || '',
      endDate: promo.endDate || '',
      isActive: promo.isActive,
    });
    setIsEditDialogOpen(true);
  };

  const openDeleteDialog = (promo: Promotion) => {
    setSelectedPromo(promo);
    setIsDeleteDialogOpen(true);
  };

  const validateForm = (): boolean => {
    if (!formData.name.trim()) {
      setError('กรุณากรอกชื่อโปรโมชั่น');
      return false;
    }
    if (formData.type === 'threshold' && formData.minAmount <= 0) {
      setError('กรุณากรอกยอดขั้นต่ำให้ถูกต้อง');
      return false;
    }
    if (formData.discountValue <= 0) {
      setError('กรุณากรอกมูลค่าส่วนลดให้ถูกต้อง');
      return false;
    }
    if (
      formData.type === 'happy_hour' &&
      (!formData.startTime || !formData.endTime)
    ) {
      setError('กรุณากรอกเวลาเริ่มต้นและสิ้นสุดสำหรับ Happy Hour');
      return false;
    }
    setError('');
    return true;
  };

  const handleAdd = async () => {
    if (!validateForm()) return;
    try {
      await addPromotion({
        ...formData,
        minAmount: Number(formData.minAmount),
        discountValue: Number(formData.discountValue),
      });
      setIsAddDialogOpen(false);
      resetForm();
    } catch (err) {
      console.error('Error adding promotion:', err);
      setError('เกิดข้อผิดพลาดในการบันทึก');
    }
  };

  const handleEdit = async () => {
    if (!selectedPromo || !validateForm()) return;
    try {
      await updatePromotion(selectedPromo.id, {
        ...formData,
        minAmount: Number(formData.minAmount),
        discountValue: Number(formData.discountValue),
      });
      setIsEditDialogOpen(false);
      setSelectedPromo(null);
      resetForm();
    } catch (err) {
      console.error('Error updating promotion:', err);
      setError('เกิดข้อผิดพลาดในการแก้ไข');
    }
  };

  const handleDelete = async () => {
    if (!selectedPromo) return;
    try {
      await deletePromotion(selectedPromo.id);
      setIsDeleteDialogOpen(false);
      setSelectedPromo(null);
    } catch (err) {
      console.error('Error deleting promotion:', err);
    }
  };

  const handleToggleActive = async (promo: Promotion) => {
    await toggleActive(promo.id, !promo.isActive);
  };

  if (isLoading && promotions.length === 0) {
    return <PageLoader />;
  }

  const renderFormFields = () => (
    <div className="space-y-4 py-4">
      {error && (
        <div className="bg-red-50 text-red-700 p-3 rounded-lg text-sm">{error}</div>
      )}

      <div className="space-y-2">
        <Label>ชื่อโปรโมชั่น</Label>
        <Input
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          placeholder="เช่น เติมครบ 500 ลด 50"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>ประเภทโปรโมชั่น</Label>
          <Select
            value={formData.type}
            onValueChange={(v) => setFormData({ ...formData, type: v as PromotionType })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="threshold">{PROMOTION_TYPE_LABELS.threshold}</SelectItem>
              <SelectItem value="happy_hour">{PROMOTION_TYPE_LABELS.happy_hour}</SelectItem>
              <SelectItem value="percentage">{PROMOTION_TYPE_LABELS.percentage}</SelectItem>
              <SelectItem value="fixed_amount">{PROMOTION_TYPE_LABELS.fixed_amount}</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>ประเภทน้ำมัน</Label>
          <Select
            value={formData.fuelType}
            onValueChange={(v) => setFormData({ ...formData, fuelType: v as PromotionFuelType })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">ทุกประเภท</SelectItem>
              <SelectItem value="95">95</SelectItem>
              <SelectItem value="B7">B7</SelectItem>
              <SelectItem value="B10">B10</SelectItem>
              <SelectItem value="Diesel">Diesel</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label>รายละเอียด</Label>
        <Textarea
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          placeholder="รายละเอียดเพิ่มเติม..."
          rows={2}
        />
      </div>

      {/* Conditional: threshold min amount */}
      {formData.type === 'threshold' && (
        <div className="space-y-2">
          <Label>ยอดขั้นต่ำ (บาท)</Label>
          <Input
            type="number"
            value={formData.minAmount}
            onChange={(e) => setFormData({ ...formData, minAmount: Number(e.target.value) })}
          />
        </div>
      )}

      {/* Conditional: happy hour time */}
      {formData.type === 'happy_hour' && (
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" /> เวลาเริ่ม
            </Label>
            <Input
              type="time"
              value={formData.startTime}
              onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" /> เวลาสิ้นสุด
            </Label>
            <Input
              type="time"
              value={formData.endTime}
              onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
            />
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label className="flex items-center gap-1">
            {formData.discountType === 'amount' ? (
              <Banknote className="w-3.5 h-3.5" />
            ) : (
              <Percent className="w-3.5 h-3.5" />
            )}
            มูลค่าส่วนลด
          </Label>
          <Input
            type="number"
            value={formData.discountValue}
            onChange={(e) => setFormData({ ...formData, discountValue: Number(e.target.value) })}
          />
        </div>
        <div className="space-y-2">
          <Label>ประเภทส่วนลด</Label>
          <Select
            value={formData.discountType}
            onValueChange={(v) => setFormData({ ...formData, discountType: v as PromotionDiscountType })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="amount">จำนวนเงิน (บาท)</SelectItem>
              <SelectItem value="percentage">เปอร์เซ็นต์ (%)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label className="flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5" /> วันที่เริ่ม (ถ้ามี)
          </Label>
          <Input
            type="date"
            value={formData.startDate}
            onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label className="flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5" /> วันที่สิ้นสุด (ถ้ามี)
          </Label>
          <Input
            type="date"
            value={formData.endDate}
            onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
          />
        </div>
      </div>

      <div className="flex items-center gap-3 pt-2">
        <Switch
          checked={formData.isActive}
          onCheckedChange={(v) => setFormData({ ...formData, isActive: v })}
        />
        <Label>เปิดใช้งานโปรโมชั่นนี้</Label>
      </div>
    </div>
  );

  return (
    <div>
      <Header
        title="โปรโมชั่น"
        subtitle="จัดการโปรโมชั่นและส่วนลดน้ำมัน"
        onMenuClick={onMenuClick}
        actions={
          <Dialog open={isAddDialogOpen} onOpenChange={(open) => {
            setIsAddDialogOpen(open);
            if (!open) resetForm();
          }}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                เพิ่มโปรโมชั่น
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>เพิ่มโปรโมชั่นใหม่</DialogTitle>
                <DialogDescription>กรอกข้อมูลโปรโมชั่นด้านล่าง</DialogDescription>
              </DialogHeader>
              {renderFormFields()}
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                  ยกเลิก
                </Button>
                <Button onClick={handleAdd}>บันทึก</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        }
      />

      <div className="p-6 space-y-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center">
                  <Gift className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="text-sm text-blue-700 font-medium">โปรโมชั่นทั้งหมด</p>
                  <p className="text-xl font-bold text-blue-800">{promotions.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-green-500 rounded-lg flex items-center justify-center">
                  <ToggleRight className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="text-sm text-green-700 font-medium">กำลังใช้งาน</p>
                  <p className="text-xl font-bold text-green-800">
                    {promotions.filter((p) => p.isActive).length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-purple-500 rounded-lg flex items-center justify-center">
                  <Clock className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="text-sm text-purple-700 font-medium">Happy Hour</p>
                  <p className="text-xl font-bold text-purple-800">
                    {promotions.filter((p) => p.type === 'happy_hour').length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-orange-500 rounded-lg flex items-center justify-center">
                  <Tag className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="text-sm text-orange-700 font-medium">เติมครบลด</p>
                  <p className="text-xl font-bold text-orange-800">
                    {promotions.filter((p) => p.type === 'threshold').length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
              <div className="relative flex-1 w-full sm:max-w-xs">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="ค้นหาโปรโมชั่น..."
                  className="pl-10"
                />
              </div>
              <Select value={filterType} onValueChange={(v) => setFilterType(v as PromotionType | '')}>
                <SelectTrigger className="w-full sm:w-[180px]">
                  <SelectValue placeholder="ทุกประเภท" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">ทุกประเภท</SelectItem>
                  <SelectItem value="threshold">{PROMOTION_TYPE_LABELS.threshold}</SelectItem>
                  <SelectItem value="happy_hour">{PROMOTION_TYPE_LABELS.happy_hour}</SelectItem>
                  <SelectItem value="percentage">{PROMOTION_TYPE_LABELS.percentage}</SelectItem>
                  <SelectItem value="fixed_amount">{PROMOTION_TYPE_LABELS.fixed_amount}</SelectItem>
                </SelectContent>
              </Select>
              {(search || filterType) && (
                <Button variant="outline" onClick={() => { setSearch(''); setFilterType(''); }}>
                  ล้าง
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Desktop Table */}
        <Card className="hidden md:block">
          <CardContent className="p-0 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ชื่อโปรโมชั่น</TableHead>
                  <TableHead>ประเภท</TableHead>
                  <TableHead>น้ำมัน</TableHead>
                  <TableHead>รายละเอียด</TableHead>
                  <TableHead className="text-center">สถานะ</TableHead>
                  <TableHead className="w-24"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPromotions.length > 0 ? (
                  filteredPromotions.map((promo) => (
                    <TableRow key={promo.id}>
                      <TableCell>
                        <div className="font-medium">{promo.name}</div>
                        {promo.description && (
                          <div className="text-xs text-slate-500 truncate max-w-[200px]">
                            {promo.description}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={PROMOTION_TYPE_BADGES[promo.type]}>
                          {PROMOTION_TYPE_LABELS[promo.type]}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Fuel className="w-3.5 h-3.5 text-slate-400" />
                          <span className="text-sm">
                            {promo.fuelType === 'all' ? 'ทุกประเภท' : promo.fuelType}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-slate-600">
                          {getPromotionDescription(promo)}
                        </span>
                      </TableCell>
                      <TableCell className="text-center">
                        <button
                          onClick={() => handleToggleActive(promo)}
                          className="inline-flex items-center justify-center min-w-[44px] min-h-[44px]"
                          aria-label={promo.isActive ? 'ปิดใช้งาน' : 'เปิดใช้งาน'}
                        >
                          {promo.isActive ? (
                            <ToggleRight className="w-6 h-6 text-green-500" />
                          ) : (
                            <ToggleLeft className="w-6 h-6 text-slate-300" />
                          )}
                        </button>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" onClick={() => openEditDialog(promo)}>
                            <Edit2 className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="text-red-500" onClick={() => openDeleteDialog(promo)}>
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-slate-500">
                      ไม่พบข้อมูลโปรโมชั่น
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Mobile Cards */}
        <div className="md:hidden space-y-3">
          {filteredPromotions.length > 0 ? (
            filteredPromotions.map((promo) => (
              <Card key={promo.id}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-medium">{promo.name}</p>
                      <Badge variant="outline" className={`mt-1 ${PROMOTION_TYPE_BADGES[promo.type]}`}>
                        {PROMOTION_TYPE_LABELS[promo.type]}
                      </Badge>
                    </div>
                    <button
                      onClick={() => handleToggleActive(promo)}
                      className="min-w-[44px] min-h-[44px] flex items-center justify-center"
                      aria-label={promo.isActive ? 'ปิดใช้งาน' : 'เปิดใช้งาน'}
                    >
                      {promo.isActive ? (
                        <ToggleRight className="w-6 h-6 text-green-500" />
                      ) : (
                        <ToggleLeft className="w-6 h-6 text-slate-300" />
                      )}
                    </button>
                  </div>
                  <p className="text-sm text-slate-600 mt-2">{getPromotionDescription(promo)}</p>
                  <div className="flex items-center justify-between mt-3">
                    <div className="flex items-center gap-1 text-sm text-slate-500">
                      <Fuel className="w-3.5 h-3.5" />
                      {promo.fuelType === 'all' ? 'ทุกประเภท' : promo.fuelType}
                    </div>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" className="min-w-[44px] min-h-[44px]" onClick={() => openEditDialog(promo)}>
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="text-red-500 min-w-[44px] min-h-[44px]" onClick={() => openDeleteDialog(promo)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <p className="text-center py-8 text-slate-500">ไม่พบข้อมูลโปรโมชั่น</p>
          )}
        </div>
      </div>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={(open) => {
        setIsEditDialogOpen(open);
        if (!open) { setSelectedPromo(null); resetForm(); }
      }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>แก้ไขโปรโมชั่น</DialogTitle>
            <DialogDescription>แก้ไขข้อมูลโปรโมชั่นด้านล่าง</DialogDescription>
          </DialogHeader>
          {renderFormFields()}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              ยกเลิก
            </Button>
            <Button onClick={handleEdit}>บันทึกการแก้ไข</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>ยืนยันการลบ</DialogTitle>
            <DialogDescription>
              คุณต้องการลบโปรโมชั่น "{selectedPromo?.name}" ใช่หรือไม่?
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

export default PromotionsPage;
