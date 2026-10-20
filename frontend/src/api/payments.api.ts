import { apiRequest } from './client';
import type { Order, RazorpayOrderInit } from '../types';

export const paymentsApi = {
  async verifyMockPayment(input: {
    orderId: string;
    outcome: 'SUCCESS' | 'FAILURE';
    method: 'UPI' | 'CARD' | 'NETBANKING' | 'WALLET';
  }): Promise<Order> {
    const res = await apiRequest<{ order: Order }>('/payments/mock/verify', {
      method: 'POST',
      body: input,
    });
    return res.data.order;
  },

  async createRazorpayOrder(orderId: string): Promise<RazorpayOrderInit> {
    const res = await apiRequest<{ razorpayOrder: RazorpayOrderInit }>(
      '/payments/razorpay/create-order',
      {
        method: 'POST',
        body: { orderId },
      }
    );
    return res.data.razorpayOrder;
  },

  async verifyRazorpayPayment(input: {
    orderId: string;
    razorpayOrderId: string;
    razorpayPaymentId: string;
    razorpaySignature: string;
    method?: string;
  }): Promise<Order> {
    const res = await apiRequest<{ order: Order }>('/payments/razorpay/verify', {
      method: 'POST',
      body: input,
    });
    return res.data.order;
  },
};
