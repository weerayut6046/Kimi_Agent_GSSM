// Customer / Membership Types

export type CustomerTier = 'bronze' | 'silver' | 'gold';

export type CustomerTransactionType = 'earn' | 'redeem' | 'adjust' | 'expire';

export interface Customer {
  id: string;
  memberCode: string;
  name: string;
  phone?: string;
  email?: string;
  tier: CustomerTier;
  points: number;
  totalSpent: number;
  birthDate?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CustomerTransaction {
  id: string;
  customerId: string;
  saleId?: string;
  type: CustomerTransactionType;
  points: number;
  amount: number;
  note?: string;
  createdAt: string;
}

export interface CustomerFilter {
  search?: string;
  tier?: CustomerTier;
  isActive?: boolean;
}

// Tier configuration
export const TIER_CONFIG: Record<CustomerTier, { label: string; minPoints: number; discountPercent: number; color: string }> = {
  bronze: { label: 'Bronze', minPoints: 0, discountPercent: 0, color: '#cd7f32' },
  silver: { label: 'Silver', minPoints: 1000, discountPercent: 2, color: '#c0c0c0' },
  gold: { label: 'Gold', minPoints: 5000, discountPercent: 5, color: '#ffd700' },
};

export function getTierFromPoints(points: number): CustomerTier {
  if (points >= TIER_CONFIG.gold.minPoints) return 'gold';
  if (points >= TIER_CONFIG.silver.minPoints) return 'silver';
  return 'bronze';
}

export function calculateDiscount(points: number, subtotal: number): { discount: number; tier: CustomerTier } {
  const tier = getTierFromPoints(points);
  const discountPercent = TIER_CONFIG[tier].discountPercent;
  const discount = Math.round((subtotal * discountPercent) / 100);
  return { discount, tier };
}
