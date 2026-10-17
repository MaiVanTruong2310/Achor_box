import { adminRequest } from './adminRequest';

export interface CouponItem {
  id: string;
  code: string;
  description: string | null;
  discountType: 'percentage' | 'fixed_amount';
  discountValue: number;
  minOrderValue: number | null;
  maxDiscount: number | null;
  startDate: string;
  endDate: string;
  usageLimit: number;
  usedCount: number;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface CouponRequest {
  code: string;
  description?: string;
  discountType: 'percentage' | 'fixed_amount';
  discountValue: number;
  minOrderValue?: number;
  maxDiscount?: number;
  startDate: string;
  endDate: string;
  usageLimit: number;
  isActive: boolean;
}

export const couponService = {
  getCoupons: async (): Promise<CouponItem[]> => {
    return adminRequest<CouponItem[]>('/promotions');
  },

  getCouponById: async (id: string): Promise<CouponItem> => {
    return adminRequest<CouponItem>(`/promotions/${id}`);
  },

  createCoupon: async (req: CouponRequest): Promise<CouponItem> => {
    return adminRequest<CouponItem>('/promotions', {
      method: 'POST',
      body: JSON.stringify(req)
    });
  },

  updateCoupon: async (id: string, req: CouponRequest): Promise<CouponItem> => {
    return adminRequest<CouponItem>(`/promotions/${id}`, {
      method: 'PUT',
      body: JSON.stringify(req)
    });
  },

  deleteCoupon: async (id: string): Promise<void> => {
    return adminRequest<void>(`/promotions/${id}`, {
      method: 'DELETE'
    });
  },

  toggleCoupon: async (id: string): Promise<CouponItem> => {
    return adminRequest<CouponItem>(`/promotions/${id}/toggle`, {
      method: 'PATCH'
    });
  }
};
