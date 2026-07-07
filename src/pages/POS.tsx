// POS Page - Point of Sale System
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { usePOS } from '@/contexts/POSContext';
import { useCustomer } from '@/contexts/CustomerContext';
import { calculateDiscount, TIER_CONFIG, type Customer } from '@/types/customer';
import type { QuickProduct, Payment, Sale } from '@/types/pos';
import { exportReceiptToPdf } from '@/lib/exportUtils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';

import { 
  ShoppingCart, Trash2, Plus, Minus, CreditCard, 
  Banknote, QrCode, Receipt, RotateCcw, Search,
  Fuel, Package, Wrench, X, Printer, UserSearch, Crown
} from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { toast } from 'sonner';


// Payment method config
const paymentMethods = [
  { id: 'cash', label: 'เงินสด', icon: Banknote, color: 'bg-green-500' },
  { id: 'credit_card', label: 'เครดิตการ์ด', icon: CreditCard, color: 'bg-blue-500' },
  { id: 'qr_code', label: 'QR Code', icon: QrCode, color: 'bg-purple-500' },
  { id: 'e_wallet', label: 'E-Wallet', icon: CreditCard, color: 'bg-orange-500' },
];

const POS: React.FC = () => {
  const { user } = useAuth();
  const { addPoints, getCustomerByPhone } = useCustomer();
  const { 
    cart, cartTotal, cartDiscount, cartTax, cartNetTotal,
    addToCart, updateCartItem, removeFromCart, clearCart,
    currentSale, createSale, completeSale, cancelSale,
    quickProducts, loadQuickProducts,
    isLoading 
  } = usePOS();

  // State
  const [searchQuery, setSearchQuery] = useState('');
  const [showPayment, setShowPayment] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<string>('cash');
  const [paymentAmount, setPaymentAmount] = useState<string>('');
  const [payments, setPayments] = useState<Payment[]>([]);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [selectedMember, setSelectedMember] = useState<Customer | null>(null);
  const [memberSearchPhone, setMemberSearchPhone] = useState('');
  const [isSearchingMember, setIsSearchingMember] = useState(false);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [fuelQuantity, setFuelQuantity] = useState<string>('');
  const [fuelAmount, setFuelAmount] = useState<string>('');
  const [selectedFuel, setSelectedFuel] = useState<QuickProduct | null>(null);
  const [fuelSaleMode, setFuelSaleMode] = useState<'amount' | 'liters'>('amount'); // ค่าเริ่มต้นเป็นเงินบาท
  const [lastCompletedSale, setLastCompletedSale] = useState<Sale | null>(null);

  // Load quick products on mount
  useEffect(() => {
    loadQuickProducts();
  }, [loadQuickProducts]);

  // Filter products
  const filteredProducts = quickProducts.filter(p => 
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.barcode?.includes(searchQuery)
  );

  // Add product to cart
  const handleAddProduct = (product: QuickProduct) => {
    if (product.type === 'fuel') {
      setSelectedFuel(product);
      return;
    }

    addToCart({
      type: product.type as 'product' | 'service',
      productId: product.id,
      name: product.name,
      barcode: product.barcode,
      quantity: 1,
      unit: 'ชิ้น',
      unitPrice: product.price,
      discount: 0,
    });
    
    toast.success(`Added ${product.name}`);
  };

  // Add fuel to cart
  const handleAddFuel = () => {
    if (!selectedFuel) return;
    
    if (fuelSaleMode === 'liters') {
      // ขายตามจำนวนลิตร
      if (!fuelQuantity) return;
      const quantity = parseFloat(fuelQuantity);
      if (isNaN(quantity) || quantity <= 0) {
        toast.error('Invalid quantity');
        return;
      }

      addToCart({
        type: 'fuel',
        fuelType: selectedFuel.fuelType,
        name: selectedFuel.name,
        quantity,
        unit: 'ลิตร',
        unitPrice: selectedFuel.price,
        discount: 0,
      });

      toast.success(`Added ${selectedFuel.name} ${quantity} L`);
    } else {
      // ขายตามจำนวนเงิน (ค่าเริ่มต้น)
      if (!fuelAmount) return;
      const amount = parseFloat(fuelAmount);
      if (isNaN(amount) || amount <= 0) {
        toast.error('Invalid amount');
        return;
      }

      const quantity = amount / selectedFuel.price;

      addToCart({
        type: 'fuel',
        fuelType: selectedFuel.fuelType,
        name: selectedFuel.name,
        quantity: Math.round(quantity * 1000) / 1000, // ปัดเศษ 3 ตำแหน่ง (ความละเอียดสูง)
        unit: 'ลิตร',
        unitPrice: selectedFuel.price,
        discount: 0,
        targetAmount: amount, // เก็บยอดเงินที่ต้องการขายจริงๆ
      });

      toast.success(`Added ${selectedFuel.name} ${formatCurrency(amount)} (${quantity.toFixed(3)} L)`);
    }

    setSelectedFuel(null);
    setFuelQuantity('');
    setFuelAmount('');
  };

  // Update cart item quantity
  const handleUpdateQuantity = (id: string, delta: number) => {
    const item = cart.find(i => i.id === id);
    if (!item) return;
    
    const newQuantity = Math.max(0.01, item.quantity + delta);
    updateCartItem(id, { quantity: newQuantity });
  };

  // Calculate change
  const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);
  const remaining = Math.max(0, cartNetTotal - totalPaid);
  const change = Math.max(0, totalPaid - cartNetTotal);

  // Add payment
  const handleAddPayment = () => {
    const amount = parseFloat(paymentAmount);
    if (isNaN(amount) || amount <= 0) {
      toast.error('Invalid amount');
      return;
    }

    const newPayment: Payment = {
      id: Date.now().toString(),
      saleId: '',
      method: selectedPayment as Payment['method'],
      amount,
      status: 'completed',
      createdAt: new Date().toISOString(),
    };

    setPayments([...payments, newPayment]);
    setPaymentAmount('');
  };

  // Remove payment
  const handleRemovePayment = (id: string) => {
    setPayments(payments.filter(p => p.id !== id));
  };

  // Member lookup
  const handleSearchMember = async () => {
    if (!memberSearchPhone.trim()) return;
    setIsSearchingMember(true);
    try {
      const member = await getCustomerByPhone(memberSearchPhone.trim());
      if (member) {
        setSelectedMember(member);
        setCustomerName(member.name);
        setCustomerPhone(member.phone || '');
        toast.success(`พบสมาชิก: ${member.name} (${TIER_CONFIG[member.tier].label})`);
      } else {
        toast.error('ไม่พบสมาชิกเบอร์นี้');
        setSelectedMember(null);
      }
    } catch {
      toast.error('เกิดข้อผิดพลาดในการค้นหา');
    } finally {
      setIsSearchingMember(false);
    }
  };

  const handleClearMember = () => {
    setSelectedMember(null);
    setMemberSearchPhone('');
    setCustomerName('');
    setCustomerPhone('');
  };

  // Calculate tier discount
  const tierDiscount = selectedMember ? calculateDiscount(selectedMember.points, cartTotal).discount : 0;
  const finalTotal = Math.max(0, cartNetTotal - tierDiscount);

  // Process sale
  const handleProcessSale = async () => {
    if (cart.length === 0) {
      toast.error('Cart is empty');
      return;
    }

    if (payments.length === 0) {
      toast.error('Please add payment');
      return;
    }

    if (totalPaid < finalTotal) {
      toast.error('Insufficient payment');
      return;
    }

    try {
      // Create sale first
      const sale = await createSale({
        employeeId: user?.id || '',
        customerName: selectedMember?.name || customerName || undefined,
        customerPhone: selectedMember?.phone || customerPhone || undefined,
        customerType: selectedMember ? 'member' : 'general',
        memberId: selectedMember?.id,
      });

      // Complete with payments
      const completed = await completeSale(sale, payments.map(p => ({ ...p, saleId: sale.id })));

      // Add loyalty points if member (1 baht = 1 point)
      if (selectedMember) {
        const earnedPoints = Math.floor(cartNetTotal);
        await addPoints(selectedMember.id, earnedPoints, cartNetTotal, sale.id);
        toast.success(`สะสมแต้ม ${earnedPoints} แต้มให้ ${selectedMember.name}`);
      }

      // Reset
      setShowPayment(false);
      setPayments([]);
      setCustomerName('');
      setCustomerPhone('');
      setMemberSearchPhone('');
      setSelectedMember(null);
      setPaymentAmount('');
      setLastCompletedSale(completed);
      
      toast.success('Sale completed!');
    } catch (err) {
      console.error('Error processing sale:', err);
      toast.error('Failed to complete sale');
    }
  };

  // Cancel sale
  const handleCancelSale = async () => {
    if (!cancelReason) {
      toast.error('Please provide a reason');
      return;
    }

    try {
      if (currentSale) {
        await cancelSale(cancelReason);
      } else {
        // No active sale in DB yet, just clear the cart
        clearCart();
      }
      setShowCancelDialog(false);
      setCancelReason('');
      setPayments([]);
      setCustomerName('');
      setCustomerPhone('');
      toast.success('Sale cancelled');
    } catch {
      toast.error('Failed to cancel sale');
    }
  };

  // Group products by type
  const fuelProducts = filteredProducts.filter(p => p.type === 'fuel');
  const regularProducts = filteredProducts.filter(p => p.type === 'product');

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col lg:flex-row gap-4 p-4">
      {/* Left Panel - Products */}
      <div className="flex-1 flex flex-col gap-4 min-w-0">
        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search products or scan barcode..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
            autoFocus
          />
        </div>

        {/* Product Grid */}
        <Tabs defaultValue="fuel" className="flex-1 flex flex-col">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="fuel">
              <Fuel className="h-4 w-4 mr-2" />
              Fuel
            </TabsTrigger>
            <TabsTrigger value="products">
              <Package className="h-4 w-4 mr-2" />
              Products
            </TabsTrigger>
            <TabsTrigger value="services">
              <Wrench className="h-4 w-4 mr-2" />
              Services
            </TabsTrigger>
          </TabsList>

          <TabsContent value="fuel" className="flex-1">
            <div className="grid grid-cols-2 gap-3">
              {fuelProducts.map((product) => (
                <Button
                  key={product.id}
                  variant="outline"
                  className="h-24 flex flex-col items-center justify-center gap-1 p-2"
                  onClick={() => handleAddProduct(product)}
                  style={{ borderColor: product.color, borderWidth: 2 }}
                >
                  <Fuel className="h-6 w-6" style={{ color: product.color }} />
                  <span className="font-semibold">{product.name}</span>
                  <span className="text-sm text-muted-foreground">
                    {formatCurrency(product.price)}/L
                  </span>
                </Button>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="products" className="flex-1">
            <ScrollArea className="h-full">
              <div className="grid grid-cols-3 gap-3">
                {regularProducts.map((product) => (
                  <Button
                    key={product.id}
                    variant="outline"
                    className="h-24 flex flex-col items-center justify-center gap-1 p-2"
                    onClick={() => handleAddProduct(product)}
                  >
                    <Package className="h-5 w-5 text-blue-500" />
                    <span className="font-medium text-sm text-center line-clamp-2">{product.name}</span>
                    <span className="text-sm text-muted-foreground">
                      {formatCurrency(product.price)}
                    </span>
                  </Button>
                ))}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="services" className="flex-1">
            <div className="flex items-center justify-center h-full text-muted-foreground">
              Services coming soon
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Right Panel - Cart */}
      <Card className="w-full lg:w-96 flex flex-col">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <ShoppingCart className="h-5 w-5" />
            Cart ({cart.length} items)
          </CardTitle>
        </CardHeader>

        <CardContent className="flex-1 flex flex-col gap-4 p-4 pt-0">
          {/* Cart Items */}
          <ScrollArea className="flex-1 -mx-2 px-2">
            {cart.length === 0 ? (
              <div className="text-center text-muted-foreground py-8">
                Cart is empty
              </div>
            ) : (
              <div className="space-y-2">
                {cart.map((item) => (
                  <div key={item.id} className="flex items-center gap-2 p-2 bg-muted rounded-lg">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{item.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {item.targetAmount !== undefined 
                          ? `${formatCurrency(item.unitPrice)}/L × ${item.quantity.toFixed(3)} L (ขายตามเงิน)`
                          : `${formatCurrency(item.unitPrice)} × ${item.quantity} ${item.unit}`
                        }
                      </p>
                    </div>
                    
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => handleUpdateQuantity(item.id, -1)}
                      >
                        <Minus className="h-3 w-3" />
                      </Button>
                      <span className="w-12 text-center text-sm">{item.quantity}</span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => handleUpdateQuantity(item.id, 1)}
                      >
                        <Plus className="h-3 w-3" />
                      </Button>
                    </div>

                    <div className="text-right min-w-[80px]">
                      <p className="font-medium">
                        {formatCurrency(item.targetAmount ?? (item.unitPrice * item.quantity))}
                      </p>
                    </div>

                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-destructive"
                      onClick={() => removeFromCart(item.id)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>

          <Separator />

          {/* Totals */}
          <div className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Subtotal</span>
              <span>{formatCurrency(cartTotal)}</span>
            </div>
            {cartDiscount > 0 && (
              <div className="flex justify-between text-green-600">
                <span>Discount</span>
                <span>-{formatCurrency(cartDiscount)}</span>
              </div>
            )}
            {cartTax > 0 && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Tax (7%) - สินค้า/บริการ</span>
                <span>{formatCurrency(cartTax)}</span>
              </div>
            )}
            <p className="text-xs text-muted-foreground">
              * ราคาน้ำมันรวม VAT 7% แล้ว
            </p>
            <Separator />
            <div className="flex justify-between text-lg font-bold">
              <span>Total</span>
              <span>{formatCurrency(cartNetTotal)}</span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-2 gap-2">
            <Button
              variant="outline"
              onClick={() => setShowCancelDialog(true)}
              disabled={cart.length === 0 || isLoading}
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              Cancel
            </Button>
            <Button
              onClick={() => setShowPayment(true)}
              disabled={cart.length === 0 || isLoading}
              className="bg-green-600 hover:bg-green-700"
            >
              <Receipt className="h-4 w-4 mr-2" />
              Pay
            </Button>
          </div>

          {/* Print Receipt Button */}
          {lastCompletedSale && (
            <Button
              variant="outline"
              className="w-full"
              onClick={() => {
                if (lastCompletedSale) {
                  exportReceiptToPdf(lastCompletedSale, `receipt-${lastCompletedSale.saleNumber}`);
                }
              }}
            >
              <Printer className="h-4 w-4 mr-2" />
              พิมพ์ใบเสร็จ
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Fuel Quantity Dialog */}
      <Dialog open={!!selectedFuel} onOpenChange={(open) => {
        if (!open) {
          setSelectedFuel(null);
          setFuelQuantity('');
          setFuelAmount('');
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{selectedFuel?.name}</DialogTitle>
            <DialogDescription>
              เลือกโหมดการขายและระบุจำนวน
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="text-center text-2xl font-bold">
              {formatCurrency(selectedFuel?.price || 0)}/L
            </div>
            
            {/* Sale Mode Toggle */}
            <div className="flex justify-center gap-2">
              <Button
                type="button"
                variant={fuelSaleMode === 'amount' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFuelSaleMode('amount')}
                className="flex-1"
              >
                ขายตามเงิน (บาท)
              </Button>
              <Button
                type="button"
                variant={fuelSaleMode === 'liters' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFuelSaleMode('liters')}
                className="flex-1"
              >
                ขายตามลิตร
              </Button>
            </div>

            {fuelSaleMode === 'liters' ? (
              <div className="space-y-2">
                <Label>จำนวนลิตร</Label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={fuelQuantity}
                  onChange={(e) => setFuelQuantity(e.target.value)}
                  autoFocus
                />
                {fuelQuantity && (
                  <div className="text-center text-lg text-muted-foreground">
                    = {formatCurrency((selectedFuel?.price || 0) * parseFloat(fuelQuantity || '0'))}
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                <Label>จำนวนเงิน (บาท)</Label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={fuelAmount}
                  onChange={(e) => setFuelAmount(e.target.value)}
                  autoFocus
                />
                {fuelAmount && (
                  <div className="text-center text-lg text-muted-foreground">
                    = {((parseFloat(fuelAmount || '0') / (selectedFuel?.price || 1))).toFixed(2)} ลิตร
                  </div>
                )}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setSelectedFuel(null);
              setFuelQuantity('');
              setFuelAmount('');
            }}>
              Cancel
            </Button>
            <Button 
              onClick={handleAddFuel} 
              disabled={fuelSaleMode === 'liters' ? !fuelQuantity : !fuelAmount}
            >
              Add to Cart
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Payment Dialog */}
      <Dialog open={showPayment} onOpenChange={setShowPayment}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Payment</DialogTitle>
            <DialogDescription>
              เลือกวิธีการชำระเงินและระบุจำนวน
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            {/* Member Lookup */}
            <div className="space-y-2">
              <Label>ค้นหาสมาชิก (เบอร์โทร)</Label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <UserSearch className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="เช่น 0812345678"
                    value={memberSearchPhone}
                    onChange={(e) => setMemberSearchPhone(e.target.value)}
                    className="pl-10"
                    onKeyDown={(e) => e.key === 'Enter' && handleSearchMember()}
                  />
                </div>
                <Button
                  variant="outline"
                  onClick={handleSearchMember}
                  disabled={isSearchingMember || !memberSearchPhone.trim()}
                >
                  {isSearchingMember ? '...' : 'ค้นหา'}
                </Button>
              </div>

              {/* Selected Member Info */}
              {selectedMember && (
                <div className="p-3 bg-muted rounded-lg space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Crown className="w-4 h-4" style={{ color: TIER_CONFIG[selectedMember.tier].color }} />
                      <span className="font-medium">{selectedMember.name}</span>
                      <Badge
                        style={{
                          backgroundColor: TIER_CONFIG[selectedMember.tier].color,
                          color: selectedMember.tier === 'gold' ? '#000' : '#fff',
                        }}
                        className="text-xs"
                      >
                        {TIER_CONFIG[selectedMember.tier].label}
                      </Badge>
                    </div>
                    <Button variant="ghost" size="sm" onClick={handleClearMember}>
                      <X className="w-3 h-3" />
                    </Button>
                  </div>
                  <div className="flex gap-4 text-sm">
                    <span className="text-muted-foreground">
                      แต้ม: <span className="font-medium text-foreground">{selectedMember.points.toLocaleString()}</span>
                    </span>
                    {tierDiscount > 0 && (
                      <span className="text-green-600">
                        ส่วนลด: <span className="font-medium">{tierDiscount.toLocaleString()} บาท</span>
                        <span className="text-xs ml-1">({TIER_CONFIG[selectedMember.tier].discountPercent}%)</span>
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>

            <Separator />

            {/* Payment Methods */}
            <div className="grid grid-cols-2 gap-2">
              {paymentMethods.map((method) => {
                const Icon = method.icon;
                return (
                  <Button
                    key={method.id}
                    variant={selectedPayment === method.id ? 'default' : 'outline'}
                    className="h-16 flex flex-col items-center justify-center gap-1"
                    onClick={() => setSelectedPayment(method.id)}
                  >
                    <Icon className="h-5 w-5" />
                    <span className="text-xs">{method.label}</span>
                  </Button>
                );
              })}
            </div>

            {/* Payment Amount */}
            <div className="space-y-2">
              <Label>Amount</Label>
              <Input
                type="number"
                placeholder="0.00"
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(e.target.value)}
              />
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setPaymentAmount(Math.max(0, finalTotal - totalPaid).toString())}
                className="w-full"
              >
                Exact: {formatCurrency(Math.max(0, finalTotal - totalPaid))}
              </Button>
            </div>

            <Button 
              onClick={handleAddPayment}
              disabled={!paymentAmount}
              className="w-full"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Payment
            </Button>

            {/* Payment List */}
            {payments.length > 0 && (
              <div className="space-y-2">
                <Label>Payments</Label>
                {payments.map((payment) => (
                  <div key={payment.id} className="flex items-center justify-between p-2 bg-muted rounded">
                    <span className="capitalize">{payment.method.replace('_', ' ')}</span>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{formatCurrency(payment.amount)}</span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => handleRemovePayment(payment.id)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <Separator />

            {/* Summary */}
            <div className="space-y-1">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span>{formatCurrency(cartNetTotal)}</span>
              </div>
              {tierDiscount > 0 && (
                <div className="flex justify-between text-green-600">
                  <span>Member Discount</span>
                  <span>-{formatCurrency(tierDiscount)}</span>
                </div>
              )}
              <div className="flex justify-between border-t border-border pt-1">
                <span className="font-bold">Total to Pay</span>
                <span className="font-bold">{formatCurrency(finalTotal)}</span>
              </div>
              <div className="flex justify-between">
                <span>Paid</span>
                <span>{formatCurrency(totalPaid)}</span>
              </div>
              {remaining > 0 && (
                <div className="flex justify-between text-orange-600">
                  <span>Remaining</span>
                  <span>{formatCurrency(remaining)}</span>
                </div>
              )}
              {change > 0 && (
                <div className="flex justify-between text-green-600">
                  <span>Change</span>
                  <span>{formatCurrency(change)}</span>
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPayment(false)}>
              Back
            </Button>
            <Button 
              onClick={handleProcessSale}
              disabled={payments.length === 0 || totalPaid < finalTotal || isLoading}
              className="bg-green-600 hover:bg-green-700"
            >
              {isLoading ? 'Processing...' : 'Complete Sale'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cancel Dialog */}
      <Dialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancel Sale</DialogTitle>
            <DialogDescription>
              ยกเลิกการขายนี้ การกระทำนี้ไม่สามารถย้อนกลับได้
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <p className="text-muted-foreground">
              คุณแน่ใจหรือไม่ว่าต้องการยกเลิกการขายนี้?
            </p>
            <div className="space-y-2">
              <Label>Reason for cancellation</Label>
              <Input
                placeholder="Enter reason..."
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCancelDialog(false)}>
              Keep Sale
            </Button>
            <Button 
              variant="destructive"
              onClick={handleCancelSale}
              disabled={!cancelReason || isLoading}
            >
              Cancel Sale
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default POS;
