import React, { useState, useMemo } from 'react';
import { useOutletContext } from 'react-router-dom';
import {
  Package,
  Plus,
  Search,
  Barcode,
  Edit,
  Trash2,
  AlertTriangle,
  TrendingDown,
  History,
  Minus,
  ArrowUpDown,
  FileSpreadsheet,
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { th } from 'date-fns/locale';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

import { useInventory } from '@/contexts/InventoryContext';
import type { Product, ProductCategory, ProductTransaction } from '@/types/inventory';
import { exportTableToExcel } from '@/lib/exportUtils';

interface LayoutContext {
  onMenuClick: () => void;
}

const categoryLabels: Record<ProductCategory, string> = {
  beverage: 'เครื่องดื่ม',
  snack: 'ขนม/อาหาร',
  automotive: 'อะไหล่/ของใช้รถ',
  misc: 'อื่นๆ',
};

const categoryColors: Record<ProductCategory, string> = {
  beverage: 'bg-blue-100 text-blue-800',
  snack: 'bg-orange-100 text-orange-800',
  automotive: 'bg-green-100 text-green-800',
  misc: 'bg-slate-100 text-slate-800',
};

const transactionTypeLabels: Record<ProductTransaction['type'], string> = {
  in: 'รับเข้า',
  out: 'เบิกออก',
  adjust: 'ปรับสต็อก',
  return: 'คืนสินค้า',
};

const transactionTypeColors: Record<ProductTransaction['type'], string> = {
  in: 'bg-green-100 text-green-800',
  out: 'bg-red-100 text-red-800',
  adjust: 'bg-yellow-100 text-yellow-800',
  return: 'bg-blue-100 text-blue-800',
};

const Products: React.FC = () => {
  const { onMenuClick } = useOutletContext<LayoutContext>();
  const {
    products,
    productTransactions,
    lowStockProducts,
    suppliers,
    isLoading,
    addProduct,
    updateProduct,
    deleteProduct,
    adjustStock,
  } = useInventory();

  // State
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<ProductCategory | 'all'>('all');
  const [showLowStockOnly, setShowLowStockOnly] = useState(false);
  
  // Dialogs
  const [isAddProductOpen, setIsAddProductOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [deletingProduct, setDeletingProduct] = useState<Product | null>(null);
  const [adjustingProduct, setAdjustingProduct] = useState<Product | null>(null);
  const [viewingHistory, setViewingHistory] = useState<Product | null>(null);

  // Forms
  const [productForm, setProductForm] = useState({
    barcode: '',
    sku: '',
    name: '',
    category: 'beverage' as ProductCategory,
    unit: 'ชิ้น',
    costPrice: 0,
    sellingPrice: 0,
    currentStock: 0,
    minStock: 10,
    maxStock: 100,
    supplierId: '',
  });

  const [adjustForm, setAdjustForm] = useState({
    quantity: 0,
    reason: '',
  });

  // ==========================================================================
  // Computed Data
  // ==========================================================================
  
  const filteredProducts = useMemo(() => {
    let filtered = products;

    if (selectedCategory !== 'all') {
      filtered = filtered.filter((p) => p.category === selectedCategory);
    }

    if (showLowStockOnly) {
      filtered = filtered.filter((p) => p.currentStock < p.minStock);
    }

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (p) =>
          p.name.toLowerCase().includes(term) ||
          p.barcode?.toLowerCase().includes(term) ||
          p.sku?.toLowerCase().includes(term)
      );
    }

    return filtered.sort((a, b) => a.name.localeCompare(b.name));
  }, [products, selectedCategory, showLowStockOnly, searchTerm]);

  const productTransactionsFiltered = useMemo(() => {
    if (!viewingHistory) return [];
    return productTransactions
      .filter((t) => t.productId === viewingHistory.id)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }, [productTransactions, viewingHistory]);

  // ==========================================================================
  // Handlers
  // ==========================================================================
  
  const handleAddProduct = async () => {
    try {
      await addProduct({
        ...productForm,
        isActive: true,
      });
      setIsAddProductOpen(false);
      resetProductForm();
    } catch {
      // Error handled by context
    }
  };

  const handleUpdateProduct = async () => {
    if (!editingProduct) return;
    
    try {
      await updateProduct(editingProduct.id, {
        barcode: productForm.barcode,
        sku: productForm.sku,
        name: productForm.name,
        category: productForm.category,
        unit: productForm.unit,
        costPrice: productForm.costPrice,
        sellingPrice: productForm.sellingPrice,
        minStock: productForm.minStock,
        maxStock: productForm.maxStock,
        supplierId: productForm.supplierId || undefined,
      });
      setEditingProduct(null);
    } catch {
      // Error handled by context
    }
  };

  const handleDeleteProduct = async () => {
    if (!deletingProduct) return;
    
    try {
      await deleteProduct(deletingProduct.id);
      setDeletingProduct(null);
    } catch {
      // Error handled by context
    }
  };

  const handleAdjustStock = async () => {
    if (!adjustingProduct) return;
    
    try {
      await adjustStock(adjustingProduct.id, adjustForm.quantity, adjustForm.reason);
      setAdjustingProduct(null);
      setAdjustForm({ quantity: 0, reason: '' });
    } catch {
      // Error handled by context
    }
  };

  const openEditDialog = (product: Product) => {
    setEditingProduct(product);
    setProductForm({
      barcode: product.barcode || '',
      sku: product.sku || '',
      name: product.name,
      category: product.category,
      unit: product.unit,
      costPrice: product.costPrice,
      sellingPrice: product.sellingPrice,
      currentStock: product.currentStock,
      minStock: product.minStock,
      maxStock: product.maxStock,
      supplierId: product.supplierId || '',
    });
  };

  const resetProductForm = () => {
    setProductForm({
      barcode: '',
      sku: '',
      name: '',
      category: 'beverage',
      unit: 'ชิ้น',
      costPrice: 0,
      sellingPrice: 0,
      currentStock: 0,
      minStock: 10,
      maxStock: 100,
      supplierId: '',
    });
  };

  // ==========================================================================
  // Render Helpers
  // ==========================================================================
  
  const getStockStatus = (product: Product) => {
    if (product.currentStock <= 0) {
      return { label: 'หมด', color: 'bg-red-100 text-red-800' };
    }
    if (product.currentStock < product.minStock) {
      return { label: 'ใกล้หมด', color: 'bg-orange-100 text-orange-800' };
    }
    if (product.currentStock > product.maxStock) {
      return { label: 'เกิน', color: 'bg-yellow-100 text-yellow-800' };
    }
    return { label: 'ปกติ', color: 'bg-green-100 text-green-800' };
  };

  const renderProductForm = () => (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>บาร์โค้ด</Label>
          <div className="relative">
            <Barcode className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              value={productForm.barcode}
              onChange={(e) => setProductForm({ ...productForm, barcode: e.target.value })}
              className="pl-10"
              placeholder="สแกนหรือป้อนบาร์โค้ด"
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label>รหัสสินค้า (SKU)</Label>
          <Input
            value={productForm.sku}
            onChange={(e) => setProductForm({ ...productForm, sku: e.target.value })}
            placeholder="SKU-XXXX"
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label>ชื่อสินค้า *</Label>
        <Input
          value={productForm.name}
          onChange={(e) => setProductForm({ ...productForm, name: e.target.value })}
          placeholder="ชื่อสินค้า"
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>หมวดหมู่ *</Label>
          <Select
            value={productForm.category}
            onValueChange={(v) => setProductForm({ ...productForm, category: v as ProductCategory })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(categoryLabels).map(([key, label]) => (
                <SelectItem key={key} value={key}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>หน่วยนับ *</Label>
          <Input
            value={productForm.unit}
            onChange={(e) => setProductForm({ ...productForm, unit: e.target.value })}
            placeholder="เช่น ขวด, ซอง, ชิ้น"
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>ราคาทุน (บาท)</Label>
          <Input
            type="number"
            step="0.01"
            value={productForm.costPrice}
            onChange={(e) => setProductForm({ ...productForm, costPrice: Number(e.target.value) })}
          />
        </div>
        <div className="space-y-2">
          <Label>ราคาขาย (บาท) *</Label>
          <Input
            type="number"
            step="0.01"
            value={productForm.sellingPrice}
            onChange={(e) => setProductForm({ ...productForm, sellingPrice: Number(e.target.value) })}
          />
        </div>
      </div>
      {!editingProduct && (
        <div className="space-y-2">
          <Label>จำนวนเริ่มต้น</Label>
          <Input
            type="number"
            value={productForm.currentStock}
            onChange={(e) => setProductForm({ ...productForm, currentStock: Number(e.target.value) })}
          />
        </div>
      )}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>สต็อกขั้นต่ำ</Label>
          <Input
            type="number"
            value={productForm.minStock}
            onChange={(e) => setProductForm({ ...productForm, minStock: Number(e.target.value) })}
          />
        </div>
        <div className="space-y-2">
          <Label>สต็อกสูงสุด</Label>
          <Input
            type="number"
            value={productForm.maxStock}
            onChange={(e) => setProductForm({ ...productForm, maxStock: Number(e.target.value) })}
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label>ซัพพลายเออร์</Label>
        <Select
          value={productForm.supplierId}
          onValueChange={(v) => setProductForm({ ...productForm, supplierId: v })}
        >
          <SelectTrigger>
            <SelectValue placeholder="เลือกซัพพลายเออร์ (ถ้ามี)" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">ไม่มี</SelectItem>
            {suppliers.map((supplier) => (
              <SelectItem key={supplier.id} value={supplier.id}>
                {supplier.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );

  // ==========================================================================
  // Main Render
  // ==========================================================================
  
  return (
    <div>
      <Header
        title="จัดการสินค้า"
        subtitle="สินค้าร้านค้าและการจัดการสต็อก"
        onMenuClick={onMenuClick}
      />

      <div className="p-6 space-y-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500">สินค้าทั้งหมด</p>
                  <p className="text-2xl font-bold">{products.length}</p>
                </div>
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Package className="w-6 h-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500">ใกล้หมด</p>
                  <p className="text-2xl font-bold text-orange-600">{lowStockProducts.length}</p>
                </div>
                <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                  <TrendingDown className="w-6 h-6 text-orange-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500">หมดสต็อก</p>
                  <p className="text-2xl font-bold text-red-600">
                    {products.filter((p) => p.currentStock === 0).length}
                  </p>
                </div>
                <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
                  <Minus className="w-6 h-6 text-red-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500">มูลค่าสต็อกรวม</p>
                  <p className="text-2xl font-bold text-green-600">
                    {products
                      .reduce((sum, p) => sum + p.currentStock * p.costPrice, 0)
                      .toLocaleString()}
                  </p>
                </div>
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                  <ArrowUpDown className="w-6 h-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-4">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="ค้นหาสินค้า (ชื่อ, บาร์โค้ด, SKU)..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select
            value={selectedCategory}
            onValueChange={(v) => setSelectedCategory(v as ProductCategory | 'all')}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="ทุกหมวดหมู่" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">ทุกหมวดหมู่</SelectItem>
              {Object.entries(categoryLabels).map(([key, label]) => (
                <SelectItem key={key} value={key}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            variant={showLowStockOnly ? 'default' : 'outline'}
            onClick={() => setShowLowStockOnly(!showLowStockOnly)}
            className={showLowStockOnly ? 'bg-orange-600' : ''}
          >
            <AlertTriangle className="w-4 h-4 mr-2" />
            แสดงเฉพาะใกล้หมด
          </Button>
          <Button
            variant="outline"
            onClick={() =>
              exportTableToExcel(
                filteredProducts.map((p) => ({
                  barcode: p.barcode || '',
                  sku: p.sku || '',
                  name: p.name,
                  category: categoryLabels[p.category] || p.category,
                  unit: p.unit,
                  costPrice: p.costPrice,
                  sellingPrice: p.sellingPrice,
                  currentStock: p.currentStock,
                  minStock: p.minStock,
                  maxStock: p.maxStock,
                  supplier: p.supplier?.name || '',
                })),
                {
                  barcode: 'บาร์โค้ด',
                  sku: 'SKU',
                  name: 'ชื่อสินค้า',
                  category: 'หมวดหมู่',
                  unit: 'หน่วย',
                  costPrice: 'ราคาทุน',
                  sellingPrice: 'ราคาขาย',
                  currentStock: 'สต็อกปัจจุบัน',
                  minStock: 'สต็อกขั้นต่ำ',
                  maxStock: 'สต็อกสูงสุด',
                  supplier: 'ซัพพลายเออร์',
                },
                'รายการสินค้า'
              )
            }
          >
            <FileSpreadsheet className="w-4 h-4 mr-2" />
            Export Excel
          </Button>
          <Button onClick={() => setIsAddProductOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            เพิ่มสินค้า
          </Button>
        </div>

        {/* Products Table */}
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>สินค้า</TableHead>
                    <TableHead>หมวดหมู่</TableHead>
                    <TableHead className="text-right">ราคาทุน</TableHead>
                    <TableHead className="text-right">ราคาขาย</TableHead>
                    <TableHead className="text-right">สต็อก</TableHead>
                    <TableHead>สถานะ</TableHead>
                    <TableHead className="w-32"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8">
                        <div className="animate-spin w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full mx-auto" />
                      </TableCell>
                    </TableRow>
                  ) : filteredProducts.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-slate-500">
                        ไม่พบสินค้า
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredProducts.map((product) => {
                      const status = getStockStatus(product);
                      return (
                        <TableRow key={product.id}>
                          <TableCell>
                            <div>
                              <p className="font-medium">{product.name}</p>
                              {(product.barcode || product.sku) && (
                                <p className="text-sm text-slate-500">
                                  {product.barcode && `BC: ${product.barcode}`}
                                  {product.barcode && product.sku && ' | '}
                                  {product.sku && `SKU: ${product.sku}`}
                                </p>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge className={categoryColors[product.category]}>
                              {categoryLabels[product.category]}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            {product.costPrice.toLocaleString()}
                          </TableCell>
                          <TableCell className="text-right">
                            {product.sellingPrice.toLocaleString()}
                          </TableCell>
                          <TableCell className="text-right">
                            <span
                              className={
                                product.currentStock < product.minStock ? 'text-orange-600 font-bold' : ''
                              }
                            >
                              {product.currentStock}
                            </span>{' '}
                            <span className="text-slate-500">/ {product.maxStock} {product.unit}</span>
                          </TableCell>
                          <TableCell>
                            <Badge className={status.color}>{status.label}</Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setAdjustingProduct(product)}
                                title="ปรับสต็อก"
                              >
                                <ArrowUpDown className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setViewingHistory(product)}
                                title="ประวัติ"
                              >
                                <History className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => openEditDialog(product)}
                                title="แก้ไข"
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setDeletingProduct(product)}
                                title="ลบ"
                                className="text-red-600"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Add Product Dialog */}
      <Dialog open={isAddProductOpen} onOpenChange={setIsAddProductOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>เพิ่มสินค้าใหม่</DialogTitle>
            <DialogDescription>กรอกข้อมูลสินค้าใหม่</DialogDescription>
          </DialogHeader>
          {renderProductForm()}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddProductOpen(false)}>
              ยกเลิก
            </Button>
            <Button onClick={handleAddProduct} disabled={!productForm.name || !productForm.sellingPrice}>
              บันทึก
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Product Dialog */}
      <Dialog open={!!editingProduct} onOpenChange={() => setEditingProduct(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>แก้ไขสินค้า</DialogTitle>
            <DialogDescription>แก้ไขข้อมูลสินค้า {editingProduct?.name}</DialogDescription>
          </DialogHeader>
          {renderProductForm()}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingProduct(null)}>
              ยกเลิก
            </Button>
            <Button onClick={handleUpdateProduct}>บันทึก</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deletingProduct} onOpenChange={() => setDeletingProduct(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>ยืนยันการลบ</DialogTitle>
            <DialogDescription>
              คุณแน่ใจหรือไม่ว่าต้องการลบสินค้า "{deletingProduct?.name}"?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDeletingProduct(null)}>
              ยกเลิก
            </Button>
            <Button variant="destructive" onClick={handleDeleteProduct}>
              ลบสินค้า
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Adjust Stock Dialog */}
      <Dialog open={!!adjustingProduct} onOpenChange={() => setAdjustingProduct(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>ปรับสต็อก</DialogTitle>
            <DialogDescription>สินค้า: {adjustingProduct?.name}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="bg-slate-50 p-3 rounded-lg text-sm">
              <p>
                สต็อกปัจจุบัน: <span className="font-bold">{adjustingProduct?.currentStock}</span>{' '}
                {adjustingProduct?.unit}
              </p>
            </div>
            <div className="space-y-2">
              <Label>จำนวนที่ต้องการปรับ (ใส่ตัวเลขที่ต้องการให้เป็นสต็อกใหม่)</Label>
              <Input
                type="number"
                value={adjustForm.quantity}
                onChange={(e) => setAdjustForm({ ...adjustForm, quantity: Number(e.target.value) })}
                placeholder="เช่น 50"
              />
              <p className="text-sm text-slate-500">
                ระบบจะปรับสต็อกเป็น {adjustForm.quantity} {adjustingProduct?.unit}
              </p>
            </div>
            <div className="space-y-2">
              <Label>เหตุผล</Label>
              <Input
                value={adjustForm.reason}
                onChange={(e) => setAdjustForm({ ...adjustForm, reason: e.target.value })}
                placeholder="เช่น นับสต็อก, สินค้าเสียหาย"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAdjustingProduct(null)}>
              ยกเลิก
            </Button>
            <Button onClick={handleAdjustStock} disabled={!adjustForm.reason}>
              ปรับสต็อก
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View History Dialog */}
      <Dialog open={!!viewingHistory} onOpenChange={() => setViewingHistory(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>ประวัติการเคลื่อนไหว</DialogTitle>
            <DialogDescription>สินค้า: {viewingHistory?.name}</DialogDescription>
          </DialogHeader>
          <div className="overflow-y-auto max-h-[50vh]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>วันที่</TableHead>
                  <TableHead>ประเภท</TableHead>
                  <TableHead className="text-right">จำนวน</TableHead>
                  <TableHead>หมายเหตุ</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {productTransactionsFiltered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-8 text-slate-500">
                      ไม่มีประวัติ
                    </TableCell>
                  </TableRow>
                ) : (
                  productTransactionsFiltered.map((transaction) => (
                    <TableRow key={transaction.id}>
                      <TableCell>
                        {format(parseISO(transaction.createdAt), 'dd MMM yyyy HH:mm', { locale: th })}
                      </TableCell>
                      <TableCell>
                        <Badge className={transactionTypeColors[transaction.type]}>
                          {transactionTypeLabels[transaction.type]}
                        </Badge>
                      </TableCell>
                      <TableCell
                        className={`text-right font-medium ${
                          transaction.type === 'in' || transaction.type === 'return'
                            ? 'text-green-600'
                            : 'text-red-600'
                        }`}
                      >
                        {transaction.type === 'in' || transaction.type === 'return' ? '+' : '-'}
                        {transaction.quantity}
                      </TableCell>
                      <TableCell>{transaction.note || '-'}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
          <DialogFooter>
            <Button onClick={() => setViewingHistory(null)}>ปิด</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Products;
