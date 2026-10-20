import { apiRequest } from './client';
import type { Coupon } from '../types';

export const couponsApi = {
  async listActiveCoupons(): Promise<Coupon[]> {
    const res = await apiRequest<{ coupons: Coupon[] }>('/coupons/active');
    return res.data.coupons;
  },
};
