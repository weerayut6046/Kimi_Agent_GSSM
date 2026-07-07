import React, { useState, useMemo } from 'react';
import { useOutletContext } from 'react-router-dom';
import {
  Package,
  AlertTriangle,
  Droplets,
  TrendingDown,
  Plus,
  CheckCircle,
  Clock,
  Search,
  FileSpreadsheet,
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { th } from 'date-fns/locale';

import Header from '@/components/layout/Header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import type { FuelType, FuelInventory, FuelDelivery } from '@/types/inventory';
import { exportTableToExcel } from '@/lib/exportUtils';

interface LayoutContext {
  onMenuClick: () => void;
}

const fuelTypeLabels: Record<FuelType, string> = {
  '95': 'Gasohol 95',
  'B7': 'Gasohol B7',
  'B10': 'Gasohol B10',
  'Diesel': 'Diesel',
};

const fuelTypeColors: Record<FuelType, string> = {
  '95': 'bg-green-500',
  'B7': 'bg-blue-500',
  'B10': 'bg-cyan-500',
  'Diesel': 'bg-orange-500',
};

const Inventory: React.FC = () => {
  const { onMenuClick } = useOutletContext<LayoutContext>();
  const {
    fuelInventory,
    fuelDeliveries,
    lowFuelAlerts,
    products,
    lowStockProducts,
    suppliers,
    isLoading,
    recordFuelInventory,
    recordFuelDelivery,
    confirmFuelDelivery,
  } = useInventory();

  // State
  const [activeTab, setActiveTab] = useState<'overview' | 'fuel' | 'deliveries'>('overview');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFuelType, setSelectedFuelType] = useState<FuelType | 'all'>('all');
  
  // Dialogs
  const [isRecordFuelOpen, setIsRecordFuelOpen] = useState(false);
  const [isDeliveryOpen, setIsDeliveryOpen] = useState(false);
  const [confirmingDelivery, setConfirmingDelivery] = useState<FuelDelivery | null>(null);

  // Forms
  const [fuelForm, setFuelForm] = useState({
    date: format(new Date(), 'yyyy-MM-dd'),
    fuelType: '95' as FuelType,
    openingStock: 0,
    receivedQty: 0,
    soldQty: 0,
    adjustmentQty: 0,
    actualStock: 0,
    temperature: '',
    density: '',
    note: '',
  });

  const [deliveryForm, setDeliveryForm] = useState({
    doNumber: '',
    supplierId: '',
    fuelType: '95' as FuelType,
    quantityLiters: 0,
    pricePerLiter: 0,
    deliveryDate: format(new Date(), 'yyyy-MM-dd'),
    note: '',
  });

  // ==========================================================================
  // Computed Data
  // ==========================================================================
  
  const latestFuelStock = useMemo(() => {
    const stock: Record<FuelType, FuelInventory | undefined> = {
      '95': undefined,
      'B7': undefined,
      'B10': undefined,
      'Diesel': undefined,
    };

    fuelInventory.forEach((item) => {
      if (!stock[item.fuelType] || item.date > stock[item.fuelType]!.date) {
        stock[item.fuelType] = item;
      }
    });

    return stock;
  }, [fuelInventory]);

  const filteredInventory = useMemo(() => {
    let filtered = fuelInventory;
    
    if (selectedFuelType !== 'all') {
      filtered = filtered.filter((i) => i.fuelType === selectedFuelType);
    }
    
    if (searchTerm) {
      filtered = filtered.filter(
        (i) =>
          fuelTypeLabels[i.fuelType].toLowerCase().includes(searchTerm.toLowerCase()) ||
          i.note.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    return filtered.sort((a, b) => b.date.localeCompare(a.date));
  }, [fuelInventory, selectedFuelType, searchTerm]);

  const pendingDeliveries = useMemo(() => {
    return fuelDeliveries
      .filter((d) => d.status === 'pending')
      .sort((a, b) => b.deliveryDate.localeCompare(a.deliveryDate));
  }, [fuelDeliveries]);

  // ==========================================================================
  // Handlers
  // ==========================================================================
  
  const handleRecordFuel = async () => {
    try {
      // Calculate closing stock
      const closingStock = fuelForm.openingStock + fuelForm.receivedQty - fuelForm.soldQty + fuelForm.adjustmentQty;
      
      await recordFuelInventory({
        date: fuelForm.date,
        fuelType: fuelForm.fuelType,
        tankNumber: 1,
        openingStock: fuelForm.openingStock,
        receivedQty: fuelForm.receivedQty,
        soldQty: fuelForm.soldQty,
        adjustmentQty: fuelForm.adjustmentQty,
        closingStock,
        actualStock: fuelForm.actualStock || undefined,
        temperature: fuelForm.temperature ? Number(fuelForm.temperature) : undefined,
        density: fuelForm.density ? Number(fuelForm.density) : undefined,
        recordedBy: '', // Will be set by context
        note: fuelForm.note,
      });
      setIsRecordFuelOpen(false);
      setFuelForm({
        date: format(new Date(), 'yyyy-MM-dd'),
        fuelType: '95',
        openingStock: 0,
        receivedQty: 0,
        soldQty: 0,
        adjustmentQty: 0,
        actualStock: 0,
        temperature: '',
        density: '',
        note: '',
      });
    } catch {
      // Error handled by context
    }
  };

  const handleRecordDelivery = async () => {
    try {
      await recordFuelDelivery({
        doNumber: deliveryForm.doNumber,
        supplierId: deliveryForm.supplierId,
        fuelType: deliveryForm.fuelType,
        quantityLiters: deliveryForm.quantityLiters,
        pricePerLiter: deliveryForm.pricePerLiter,
        deliveryDate: deliveryForm.deliveryDate,
        status: 'pending',
        note: deliveryForm.note,
      });
      setIsDeliveryOpen(false);
      setDeliveryForm({
        doNumber: '',
        supplierId: '',
        fuelType: '95',
        quantityLiters: 0,
        pricePerLiter: 0,
        deliveryDate: format(new Date(), 'yyyy-MM-dd'),
        note: '',
      });
    } catch {
      // Error handled by context
    }
  };

  const handleConfirmDelivery = async () => {
    if (!confirmingDelivery) return;
    
    try {
      await confirmFuelDelivery(confirmingDelivery.id, ''); // User name from auth
      setConfirmingDelivery(null);
    } catch {
      // Error handled by context
    }
  };

  // ==========================================================================
  // Render Helpers
  // ==========================================================================
  
  const renderOverview = () => (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Products */}
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

        {/* Low Stock Products */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">สินค้าใกล้หมด</p>
                <p className="text-2xl font-bold text-orange-600">{lowStockProducts.length}</p>
              </div>
              <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                <TrendingDown className="w-6 h-6 text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Pending Deliveries */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">รอรับน้ำมัน</p>
                <p className="text-2xl font-bold text-yellow-600">{pendingDeliveries.length}</p>
              </div>
              <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                <Clock className="w-6 h-6 text-yellow-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Low Fuel Alerts */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">น้ำมันต่ำกว่ากำหนด</p>
                <p className="text-2xl font-bold text-red-600">{lowFuelAlerts.length}</p>
              </div>
              <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-red-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Current Fuel Stock */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Droplets className="w-5 h-5" />
            สต็อกน้ำมันปัจจุบัน
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {(Object.keys(latestFuelStock) as FuelType[]).map((fuelType) => {
              const stock = latestFuelStock[fuelType];
              const currentStock = stock
                ? stock.actualStock !== undefined
                  ? stock.actualStock
                  : stock.closingStock
                : 0;
              const isLow = lowFuelAlerts.some((a) => a.fuelType === fuelType);

              return (
                <div
                  key={fuelType}
                  className={`p-4 rounded-lg border ${
                    isLow ? 'border-red-200 bg-red-50' : 'border-slate-200'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <div className={`w-3 h-3 rounded-full ${fuelTypeColors[fuelType]}`} />
                    <span className="font-medium">{fuelTypeLabels[fuelType]}</span>
                  </div>
                  <p className={`text-2xl font-bold ${isLow ? 'text-red-600' : ''}`}>
                    {currentStock.toLocaleString()}
                  </p>
                  <p className="text-sm text-slate-500">ลิตร</p>
                  {stock?.variance !== 0 && (
                    <p
                      className={`text-sm ${
                        (stock?.variance || 0) > 0 ? 'text-green-600' : 'text-red-600'
                      }`}
                    >
                      ผลต่าง: {stock?.variance.toLocaleString()} ลิตร
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Low Stock Alerts */}
      {(lowStockProducts.length > 0 || lowFuelAlerts.length > 0) && (
        <Card className="border-orange-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-orange-600">
              <AlertTriangle className="w-5 h-5" />
              แจ้งเตือนสต็อกต่ำ
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {lowFuelAlerts.map((alert) => (
                <div
                  key={alert.fuelType}
                  className="flex items-center justify-between p-3 bg-red-50 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <Droplets className="w-5 h-5 text-red-600" />
                    <div>
                      <p className="font-medium">{fuelTypeLabels[alert.fuelType]}</p>
                      <p className="text-sm text-slate-500">
                        เหลือ {alert.currentStock.toLocaleString()} จาก {alert.minStock.toLocaleString()} ลิตร
                      </p>
                    </div>
                  </div>
                  <Badge variant="destructive">ต่ำกว่ากำหนด</Badge>
                </div>
              ))}
              {lowStockProducts.slice(0, 5).map((product) => (
                <div
                  key={product.id}
                  className="flex items-center justify-between p-3 bg-orange-50 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <Package className="w-5 h-5 text-orange-600" />
                    <div>
                      <p className="font-medium">{product.name}</p>
                      <p className="text-sm text-slate-500">
                        เหลือ {product.currentStock} จาก {product.minStock} {product.unit}
                      </p>
                    </div>
                  </div>
                  <Badge variant="secondary">ใกล้หมด</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );

  const renderFuelInventory = () => (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap gap-4">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder="ค้นหา..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select
          value={selectedFuelType}
          onValueChange={(v) => setSelectedFuelType(v as FuelType | 'all')}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="ทุกประเภท" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">ทุกประเภท</SelectItem>
            {(Object.keys(fuelTypeLabels) as FuelType[]).map((type) => (
              <SelectItem key={type} value={type}>
                {fuelTypeLabels[type]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button onClick={() => setIsRecordFuelOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          บันทึกสต็อก
        </Button>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>วันที่</TableHead>
                  <TableHead>ประเภท</TableHead>
                  <TableHead className="text-right">ยอดยกมา</TableHead>
                  <TableHead className="text-right">รับเข้า</TableHead>
                  <TableHead className="text-right">ขายออก</TableHead>
                  <TableHead className="text-right">ปรับสต็อก</TableHead>
                  <TableHead className="text-right">คงเหลือ</TableHead>
                  <TableHead className="text-right">ผลต่าง</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredInventory.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-slate-500">
                      ไม่พบข้อมูล
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredInventory.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>
                        {format(parseISO(item.date), 'dd MMM yyyy', { locale: th })}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className={`w-2 h-2 rounded-full ${fuelTypeColors[item.fuelType]}`} />
                          {fuelTypeLabels[item.fuelType]}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        {item.openingStock.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right">
                        {item.receivedQty > 0 && (
                          <span className="text-green-600">+{item.receivedQty.toLocaleString()}</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {item.soldQty > 0 && (
                          <span className="text-red-600">-{item.soldQty.toLocaleString()}</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {item.adjustmentQty !== 0 && (
                          <span className={item.adjustmentQty > 0 ? 'text-green-600' : 'text-red-600'}>
                            {item.adjustmentQty > 0 ? '+' : ''}
                            {item.adjustmentQty.toLocaleString()}
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {item.actualStock !== undefined
                          ? item.actualStock.toLocaleString()
                          : item.closingStock.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right">
                        {item.variance !== 0 && (
                          <Badge variant={item.variance > 0 ? 'default' : 'destructive'}>
                            {item.variance > 0 ? '+' : ''}
                            {item.variance.toLocaleString()}
                          </Badge>
                        )}
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
  );

  const renderDeliveries = () => (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">รายการส่งน้ำมัน</h3>
        <Button onClick={() => setIsDeliveryOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          บันทึกใบส่งน้ำมัน
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>เลขที่ DO</TableHead>
                  <TableHead>วันที่ส่ง</TableHead>
                  <TableHead>ซัพพลายเออร์</TableHead>
                  <TableHead>ประเภท</TableHead>
                  <TableHead className="text-right">จำนวน (ลิตร)</TableHead>
                  <TableHead className="text-right">ราคา/ลิตร</TableHead>
                  <TableHead className="text-right">รวม</TableHead>
                  <TableHead>สถานะ</TableHead>
                  <TableHead className="w-24"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {fuelDeliveries.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8 text-slate-500">
                      ไม่พบข้อมูล
                    </TableCell>
                  </TableRow>
                ) : (
                  fuelDeliveries.map((delivery) => {
                    const supplier = suppliers.find((s) => s.id === delivery.supplierId);
                    return (
                      <TableRow key={delivery.id}>
                        <TableCell className="font-medium">{delivery.doNumber}</TableCell>
                        <TableCell>
                          {format(parseISO(delivery.deliveryDate), 'dd MMM yyyy', { locale: th })}
                        </TableCell>
                        <TableCell>{supplier?.name || '-'}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className={`w-2 h-2 rounded-full ${fuelTypeColors[delivery.fuelType]}`} />
                            {fuelTypeLabels[delivery.fuelType]}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          {delivery.quantityLiters.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right">
                          {delivery.pricePerLiter.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {delivery.totalAmount.toLocaleString()}
                        </TableCell>
                        <TableCell>
                          {delivery.status === 'pending' && (
                            <Badge variant="secondary">รอรับ</Badge>
                          )}
                          {delivery.status === 'received' && (
                            <Badge variant="default" className="bg-green-600">
                              <CheckCircle className="w-3 h-3 mr-1" />
                              รับแล้ว
                            </Badge>
                          )}
                          {delivery.status === 'rejected' && (
                            <Badge variant="destructive">ปฏิเสธ</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {delivery.status === 'pending' && (
                            <Button
                              size="sm"
                              onClick={() => setConfirmingDelivery(delivery)}
                            >
                              รับน้ำมัน
                            </Button>
                          )}
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
  );

  // ==========================================================================
  // Main Render
  // ==========================================================================
  
  return (
    <div>
      <Header
        title="คลังสินค้าและน้ำมัน"
        subtitle="จัดการสต็อกน้ำมันและสินค้า"
        onMenuClick={onMenuClick}
        actions={
          <Button
            variant="outline"
            onClick={() => {
              if (activeTab === 'fuel' || activeTab === 'overview') {
                exportTableToExcel(
                  fuelInventory.map((f) => ({
                    date: f.date,
                    fuelType: fuelTypeLabels[f.fuelType],
                    openingStock: f.openingStock,
                    receivedQty: f.receivedQty,
                    soldQty: f.soldQty,
                    closingStock: f.closingStock,
                    actualStock: f.actualStock,
                    variance: f.variance,
                    note: f.note,
                  })),
                  {
                    date: 'วันที่',
                    fuelType: 'ประเภทน้ำมัน',
                    openingStock: 'ยกมา',
                    receivedQty: 'รับเข้า',
                    soldQty: 'ขายออก',
                    closingStock: 'คงเหลือ (Book)',
                    actualStock: 'คงเหลือ (Actual)',
                    variance: 'ผลต่าง',
                    note: 'หมายเหตุ',
                  },
                  'รายงานสต็อกน้ำมัน'
                );
              } else if (activeTab === 'deliveries') {
                exportTableToExcel(
                  fuelDeliveries.map((d) => ({
                    doNumber: d.doNumber,
                    deliveryDate: d.deliveryDate,
                    fuelType: fuelTypeLabels[d.fuelType],
                    quantityLiters: d.quantityLiters,
                    supplier: d.supplier?.name || d.supplierId,
                    status: d.status,
                  })),
                  {
                    doNumber: 'เลขที่ DO',
                    deliveryDate: 'วันที่ส่งมอบ',
                    fuelType: 'ประเภทน้ำมัน',
                    quantityLiters: 'จำนวน (ลิตร)',
                    supplier: 'ซัพพลายเออร์',
                    status: 'สถานะ',
                  },
                  'รายงานการรับน้ำมัน'
                );
              }
            }}
          >
            <FileSpreadsheet className="w-4 h-4 mr-2" />
            Export Excel
          </Button>
        }
      />

      <div className="p-6 space-y-6">
        {/* Tabs */}
        <div className="flex gap-2 border-b">
          {[
            { key: 'overview', label: 'ภาพรวม' },
            { key: 'fuel', label: 'สต็อกน้ำมัน' },
            { key: 'deliveries', label: 'ใบส่งน้ำมัน' },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as typeof activeTab)}
              className={`px-4 py-2 font-medium transition-colors ${
                activeTab === tab.key
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        {isLoading ? (
          <div className="text-center py-12">
            <div className="animate-spin w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full mx-auto mb-4" />
            <p className="text-slate-500">กำลังโหลดข้อมูล...</p>
          </div>
        ) : (
          <>
            {activeTab === 'overview' && renderOverview()}
            {activeTab === 'fuel' && renderFuelInventory()}
            {activeTab === 'deliveries' && renderDeliveries()}
          </>
        )}
      </div>

      {/* Record Fuel Dialog */}
      <Dialog open={isRecordFuelOpen} onOpenChange={setIsRecordFuelOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>บันทึกสต็อกน้ำมัน</DialogTitle>
            <DialogDescription>บันทึกข้อมูลสต็อกน้ำมันประจำวัน</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>วันที่</Label>
                <Input
                  type="date"
                  value={fuelForm.date}
                  onChange={(e) => setFuelForm({ ...fuelForm, date: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>ประเภทน้ำมัน</Label>
                <Select
                  value={fuelForm.fuelType}
                  onValueChange={(v) => setFuelForm({ ...fuelForm, fuelType: v as FuelType })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.keys(fuelTypeLabels) as FuelType[]).map((type) => (
                      <SelectItem key={type} value={type}>
                        {fuelTypeLabels[type]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>ยอดยกมา (ลิตร)</Label>
                <Input
                  type="number"
                  value={fuelForm.openingStock}
                  onChange={(e) => setFuelForm({ ...fuelForm, openingStock: Number(e.target.value) })}
                />
              </div>
              <div className="space-y-2">
                <Label>รับเข้า (ลิตร)</Label>
                <Input
                  type="number"
                  value={fuelForm.receivedQty}
                  onChange={(e) => setFuelForm({ ...fuelForm, receivedQty: Number(e.target.value) })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>ขายออก (ลิตร)</Label>
                <Input
                  type="number"
                  value={fuelForm.soldQty}
                  onChange={(e) => setFuelForm({ ...fuelForm, soldQty: Number(e.target.value) })}
                />
              </div>
              <div className="space-y-2">
                <Label>ปรับสต็อก (ลิตร)</Label>
                <Input
                  type="number"
                  value={fuelForm.adjustmentQty}
                  onChange={(e) => setFuelForm({ ...fuelForm, adjustmentQty: Number(e.target.value) })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>นับจริง (ลิตร) - ถ้ามี</Label>
              <Input
                type="number"
                value={fuelForm.actualStock}
                onChange={(e) => setFuelForm({ ...fuelForm, actualStock: Number(e.target.value) })}
                placeholder="เว้นว่างถ้าไม่ได้นับ"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>อุณหภูมิ (°C)</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={fuelForm.temperature}
                  onChange={(e) => setFuelForm({ ...fuelForm, temperature: e.target.value })}
                  placeholder="optional"
                />
              </div>
              <div className="space-y-2">
                <Label>Density</Label>
                <Input
                  type="number"
                  step="0.001"
                  value={fuelForm.density}
                  onChange={(e) => setFuelForm({ ...fuelForm, density: e.target.value })}
                  placeholder="optional"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>หมายเหตุ</Label>
              <Input
                value={fuelForm.note}
                onChange={(e) => setFuelForm({ ...fuelForm, note: e.target.value })}
                placeholder="หมายเหตุ (ถ้ามี)"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsRecordFuelOpen(false)}>
              ยกเลิก
            </Button>
            <Button onClick={handleRecordFuel}>บันทึก</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Record Delivery Dialog */}
      <Dialog open={isDeliveryOpen} onOpenChange={setIsDeliveryOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>บันทึกใบส่งน้ำมัน</DialogTitle>
            <DialogDescription>บันทึกข้อมูลการส่งน้ำมันจากซัพพลายเออร์</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>เลขที่ DO</Label>
                <Input
                  value={deliveryForm.doNumber}
                  onChange={(e) => setDeliveryForm({ ...deliveryForm, doNumber: e.target.value })}
                  placeholder="DO-XXXXX"
                />
              </div>
              <div className="space-y-2">
                <Label>วันที่ส่ง</Label>
                <Input
                  type="date"
                  value={deliveryForm.deliveryDate}
                  onChange={(e) => setDeliveryForm({ ...deliveryForm, deliveryDate: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>ซัพพลายเออร์</Label>
              <Select
                value={deliveryForm.supplierId}
                onValueChange={(v) => setDeliveryForm({ ...deliveryForm, supplierId: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="เลือกซัพพลายเออร์" />
                </SelectTrigger>
                <SelectContent>
                  {suppliers.map((supplier) => (
                    <SelectItem key={supplier.id} value={supplier.id}>
                      {supplier.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>ประเภทน้ำมัน</Label>
              <Select
                value={deliveryForm.fuelType}
                onValueChange={(v) => setDeliveryForm({ ...deliveryForm, fuelType: v as FuelType })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(fuelTypeLabels) as FuelType[]).map((type) => (
                    <SelectItem key={type} value={type}>
                      {fuelTypeLabels[type]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>จำนวน (ลิตร)</Label>
                <Input
                  type="number"
                  value={deliveryForm.quantityLiters}
                  onChange={(e) => setDeliveryForm({ ...deliveryForm, quantityLiters: Number(e.target.value) })}
                />
              </div>
              <div className="space-y-2">
                <Label>ราคา/ลิตร (บาท)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={deliveryForm.pricePerLiter}
                  onChange={(e) => setDeliveryForm({ ...deliveryForm, pricePerLiter: Number(e.target.value) })}
                />
              </div>
            </div>
            <div className="bg-slate-50 p-3 rounded-lg">
              <p className="text-sm text-slate-600">
                รวมเป็นเงิน:{' '}
                <span className="font-bold text-lg">
                  {(deliveryForm.quantityLiters * deliveryForm.pricePerLiter).toLocaleString()} บาท
                </span>
              </p>
            </div>
            <div className="space-y-2">
              <Label>หมายเหตุ</Label>
              <Input
                value={deliveryForm.note}
                onChange={(e) => setDeliveryForm({ ...deliveryForm, note: e.target.value })}
                placeholder="หมายเหตุ (ถ้ามี)"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeliveryOpen(false)}>
              ยกเลิก
            </Button>
            <Button onClick={handleRecordDelivery}>บันทึก</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirm Delivery Dialog */}
      <Dialog open={!!confirmingDelivery} onOpenChange={() => setConfirmingDelivery(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>ยืนยันการรับน้ำมัน</DialogTitle>
            <DialogDescription>
              คุณต้องการยืนยันการรับน้ำมันใบส่งนี้?
            </DialogDescription>
          </DialogHeader>
          {confirmingDelivery && (
            <div className="bg-slate-50 p-4 rounded-lg text-sm space-y-2">
              <p>
                <span className="text-slate-500">เลขที่ DO:</span>{' '}
                <span className="font-medium">{confirmingDelivery.doNumber}</span>
              </p>
              <p>
                <span className="text-slate-500">ประเภท:</span>{' '}
                <span className="font-medium">{fuelTypeLabels[confirmingDelivery.fuelType]}</span>
              </p>
              <p>
                <span className="text-slate-500">จำนวน:</span>{' '}
                <span className="font-medium">{confirmingDelivery.quantityLiters.toLocaleString()} ลิตร</span>
              </p>
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setConfirmingDelivery(null)}>
              ยกเลิก
            </Button>
            <Button onClick={handleConfirmDelivery}>
              <CheckCircle className="w-4 h-4 mr-2" />
              ยืนยันรับน้ำมัน
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Inventory;
