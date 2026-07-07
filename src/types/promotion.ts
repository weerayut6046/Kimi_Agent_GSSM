// Promotion Types

export type PromotionType = 'threshold' | 'happy_hour' | 'percentage' | 'fixed_amount';
export type PromotionDiscountType = 'amount' | 'percentage';
export type PromotionFuelType = '95' | 'B7' | 'B10' | 'Diesel' | 'all';

export interface Promotion {
  id: string;
  name: string;
  type: PromotionType;
  description: string;
  fuelType: PromotionFuelType;
  minAmount: number;        // เติมครบ X บาท (สำหรับ threshold)
  discountValue: number;    // ลด Y บาท หรือ Y%
  discountType: PromotionDiscountType; // 'amount' | 'percentage'
  startTime?: string;       // HH:mm (สำหรับ happy_hour)
  endTime?: string;         // HH:mm (สำหรับ happy_hour)
  startDate?: string;       // YYYY-MM-DD
  endDate?: string;         // YYYY-MM-DD
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PromotionFilter {
  search?: string;
  type?: PromotionType;
  isActive?: boolean;
}

// Helper: คำนวณส่วนลดจากโปรโมชั่น
export function calculatePromotionDiscount(
  promotion: Promotion,
  fuelAmount: number,      // จำนวนเงินน้ำมัน
  fuelType: PromotionFuelType,
  currentTime?: string     // HH:mm
): number {
  if (!promotion.isActive) return 0;

  // Check fuel type match
  if (promotion.fuelType !== 'all' && promotion.fuelType !== fuelType) return 0;

  // Check date range
  const today = new Date().toISOString().split('T')[0];
  if (promotion.startDate && today < promotion.startDate) return 0;
  if (promotion.endDate && today > promotion.endDate) return 0;

  // Check happy hour time range
  if (promotion.type === 'happy_hour' && promotion.startTime && promotion.endTime) {
    const now = currentTime || new Date().toTimeString().slice(0, 5);
    if (now < promotion.startTime || now > promotion.endTime) return 0;
  }

  // Check minimum amount for threshold
  if (promotion.type === 'threshold' && fuelAmount < promotion.minAmount) return 0;

  // Calculate discount
  if (promotion.discountType === 'percentage') {
    return Math.round((fuelAmount * promotion.discountValue) / 100);
  }

  return promotion.discountValue;
}

// Helper: รายละเอียดโปรโมชั่นเป็นข้อความ
export function getPromotionDescription(promotion: Promotion): string {
  if (promotion.type === 'threshold') {
    const fuelLabel = promotion.fuelType === 'all' ? 'ทุกประเภท' : promotion.fuelType;
    if (promotion.discountType === 'amount') {
      return `เติมน้ำมัน ${fuelLabel} ครบ ${promotion.minAmount.toLocaleString()} บาท ลด ${promotion.discountValue.toLocaleString()} บาท`;
    }
    return `เติมน้ำมัน ${fuelLabel} ครบ ${promotion.minAmount.toLocaleString()} บาท ลด ${promotion.discountValue}%`;
  }

  if (promotion.type === 'happy_hour') {
    const timeRange = `${promotion.startTime || '--:--'} - ${promotion.endTime || '--:--'}`;
    const fuelLabel = promotion.fuelType === 'all' ? 'ทุกประเภท' : promotion.fuelType;
    if (promotion.discountType === 'amount') {
      return `Happy Hour ${timeRange} ${fuelLabel} ลด ${promotion.discountValue.toLocaleString()} บาท`;
    }
    return `Happy Hour ${timeRange} ${fuelLabel} ลด ${promotion.discountValue}%`;
  }

  if (promotion.type === 'percentage') {
    const fuelLabel = promotion.fuelType === 'all' ? 'ทุกประเภท' : promotion.fuelType;
    return `ลด ${promotion.discountValue}% น้ำมัน ${fuelLabel}`;
  }

  if (promotion.type === 'fixed_amount') {
    const fuelLabel = promotion.fuelType === 'all' ? 'ทุกประเภท' : promotion.fuelType;
    return `ลด ${promotion.discountValue.toLocaleString()} บาท น้ำมัน ${fuelLabel}`;
  }

  return promotion.description;
}

export const PROMOTION_TYPE_LABELS: Record<PromotionType, string> = {
  threshold: 'เติมครบลด',
  happy_hour: 'Happy Hour',
  percentage: 'ลดเปอร์เซ็นต์',
  fixed_amount: 'ลดตามจำนวน',
};

export const PROMOTION_TYPE_BADGES: Record<PromotionType, string> = {
  threshold: 'bg-blue-100 text-blue-700 border-blue-200',
  happy_hour: 'bg-purple-100 text-purple-700 border-purple-200',
  percentage: 'bg-green-100 text-green-700 border-green-200',
  fixed_amount: 'bg-orange-100 text-orange-700 border-orange-200',
};
