import { apiRequest } from './client';
import type { Order, OrderStatus, PaginationMeta, PaymentProvider } from '../types';

export interface CreateOrderPayload {
  addressId: string;
  paymentProvider: PaymentProvider;
  notes?: string;
}

export interface OrdersListResult {
  orders: Order[];
  pagination: PaginationMeta;
}

export const ordersApi = {
  async createOrder(payload: CreateOrderPayload): Promise<Order> {
    const res = await apiRequest<{ order: Order }>('/orders', {
      method: 'POST',
      body: payload,
    });
    return res.data.order;
  },

  async listMyOrders(params?: {
    page?: number;
    limit?: number;
    status?: OrderStatus;
  }): Promise<OrdersListResult> {
    const res = await apiRequest<{ orders: Order[] }>('/orders', {
      params,
    });
    return {
      orders: res.data.orders,
      pagination: res.pagination || {
        page: 1,
        limit: 10,
        totalItems: res.data.orders.length,
        totalPages: 1,
        hasNextPage: false,
        hasPrevPage: false,
      },
    };
  },

  async getOrderById(orderId: string): Promise<Order> {
    const res = await apiRequest<{ order: Order }>(`/orders/${orderId}`);
    return res.data.order;
  },

  async cancelOrder(orderId: string, reason: string): Promise<Order> {
    const res = await apiRequest<{ order: Order }>(`/orders/${orderId}/cancel`, {
      method: 'POST',
      body: { reason },
    });
    return res.data.order;
  },
};
