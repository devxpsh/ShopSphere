import { apiRequest } from './client';
import type { Cart } from '../types';

export const cartApi = {
  async getCart(): Promise<Cart> {
    const res = await apiRequest<{ cart: Cart }>('/cart');
    return res.data.cart;
  },

  async addItem(productId: string, quantity = 1): Promise<Cart> {
    const res = await apiRequest<{ cart: Cart }>('/cart/items', {
      method: 'POST',
      body: { productId, quantity },
    });
    return res.data.cart;
  },

  async updateItemQuantity(productId: string, quantity: number): Promise<Cart> {
    const res = await apiRequest<{ cart: Cart }>(`/cart/items/${productId}`, {
      method: 'PATCH',
      body: { quantity },
    });
    return res.data.cart;
  },

  async removeItem(productId: string): Promise<Cart> {
    const res = await apiRequest<{ cart: Cart }>(`/cart/items/${productId}`, {
      method: 'DELETE',
    });
    return res.data.cart;
  },

  async clearCart(): Promise<Cart> {
    const res = await apiRequest<{ cart: Cart }>('/cart', {
      method: 'DELETE',
    });
    return res.data.cart;
  },

  async applyCoupon(code: string): Promise<Cart> {
    const res = await apiRequest<{ cart: Cart }>('/cart/coupon', {
      method: 'POST',
      body: { code },
    });
    return res.data.cart;
  },

  async removeCoupon(): Promise<Cart> {
    const res = await apiRequest<{ cart: Cart }>('/cart/coupon', {
      method: 'DELETE',
    });
    return res.data.cart;
  },
};
