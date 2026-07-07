// POS System Types - Point of Sale
// System for selling fuel, products, and services

export interface Sale {
  id: string;
  saleNumber: string;
  date: string;
  time: string;
  employeeId: string;
  shiftId?: string;
  items: SaleItem[];
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  payments: Payment[];
  paidAmount: number;
  change: number;
  status: 'completed' | 'pending' | 'cancelled' | 'refunded';
  cancelledAt?: string;
  cancelledBy?: string;
  cancelReason?: string;
  refundedAt?: string;
  refundedBy?: string;
  refundReason?: string;
  originalSaleId?: string;
  customerName?: string;
  customerPhone?: string;
  customerType?: 'general' | 'member' | 'corporate';
  memberId?: string;
  note?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SaleItem {
  id: string;
  saleId: string;
  type: 'fuel' | 'product' | 'service';
  productId?: string;
  fuelType?: '95' | 'B7' | 'B10' | 'Diesel';
  serviceName?: string;
  name: string;
  barcode?: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  discount: number;
  totalPrice: number;
  costPrice?: number;
  pumpNumber?: number;
  nozzleNumber?: number;
  meterStart?: number;
  meterEnd?: number;
  createdAt: string;
}

export interface Payment {
  id: string;
  saleId: string;
  method: 'cash' | 'credit_card' | 'debit_card' | 'qr_code' | 'e_wallet' | 'bank_transfer' | 'credit';
  amount: number;
  cardNumber?: string;
  cardType?: string;
  approvalCode?: string;
  qrProvider?: string;
  transactionId?: string;
  bankName?: string;
  accountNumber?: string;
  creditDueDate?: string;
  creditApprovedBy?: string;
  status: 'completed' | 'pending' | 'failed' | 'refunded';
  note?: string;
  createdAt: string;
}

// Cart for UI
export interface CartItem {
  id: string;
  type: 'fuel' | 'product' | 'service';
  productId?: string;
  fuelType?: '95' | 'B7' | 'B10' | 'Diesel';
  serviceName?: string;
  name: string;
  barcode?: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  discount: number;
  targetAmount?: number; // สำหรับขายน้ำมันตามจำนวนเงิน (ไม่ต้องคำนวณย้อนกลับ)
  pumpNumber?: number;
  nozzleNumber?: number;
  meterStart?: number;
  meterEnd?: number;
}

// Receipt template
export interface ReceiptTemplate {
  header: string;
  footer: string;
  showLogo: boolean;
  showBarcode: boolean;
  taxId?: string;
  branch?: string;
}

// POS Settings
export interface POSSettings {
  receiptTemplate: ReceiptTemplate;
  defaultPaymentMethod: Payment['method'];
  requireEmployeeAuth: boolean;
  allowCreditSale: boolean;
  maxCreditAmount: number;
  printReceipt: boolean;
  autoPrint: boolean;
}

// Quick product for POS
export interface QuickProduct {
  id: string;
  name: string;
  price: number;
  type: 'fuel' | 'product' | 'service';
  fuelType?: '95' | 'B7' | 'B10' | 'Diesel';
  barcode?: string;
  color?: string;
}

// Daily sales summary
export interface DailySalesSummary {
  date: string;
  shiftId?: string;
  employeeId?: string;
  totalSales: number;
  totalTransactions: number;
  totalItems: number;
  fuelSales: {
    '95': number;
    'B7': number;
    'B10': number;
    'Diesel': number;
  };
  productSales: number;
  serviceSales: number;
  paymentMethods: Record<Payment['method'], number>;
  discounts: number;
  taxes: number;
}

// Context type
export interface POSContextType {
  // Current cart
  cart: CartItem[];
  cartTotal: number;
  cartDiscount: number;
  cartTax: number;
  cartNetTotal: number;
  
  // Actions
  addToCart: (item: Omit<CartItem, 'id'>) => void;
  updateCartItem: (id: string, updates: Partial<CartItem>) => void;
  removeFromCart: (id: string) => void;
  clearCart: () => void;
  
  // Sale operations
  currentSale: Sale | null;
  createSale: (saleData: Partial<Sale>) => Promise<Sale>;
  completeSale: (sale: Sale, payments: Payment[]) => Promise<Sale>;
  cancelSale: (reason: string) => Promise<void>;
  refundSale: (saleId: string, reason: string) => Promise<Sale>;
  
  // History
  sales: Sale[];
  todaySales: Sale[];
  loadSales: (date?: string) => Promise<void>;
  getSaleById: (id: string) => Promise<Sale | undefined>;
  
  // Quick products
  quickProducts: QuickProduct[];
  loadQuickProducts: () => Promise<void>;
  
  // Summary
  dailySummary: DailySalesSummary | null;
  loadDailySummary: (date?: string) => Promise<void>;
  
  // Receipt
  printReceipt: (sale: Sale) => void;
  reprintReceipt: (saleId: string) => Promise<void>;
  
  // State
  isLoading: boolean;
  error: string | null;
}
