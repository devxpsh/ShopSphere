import { apiRequest } from './client';
import type { WishlistItem } from '../types';

export const wishlistApi = {
  async getWishlist(): Promise<WishlistItem[]> {
    const res = await apiRequest<{ items: WishlistItem[] }>('/wishlist');
    return res.data.items;
  },

  async addToWishlist(productId: string): Promise<WishlistItem[]> {
    const res = await apiRequest<{ items: WishlistItem[] }>('/wishlist', {
      method: 'POST',
      body: { productId },
    });
    return res.data.items;
  },

  async removeFromWishlist(productId: string): Promise<WishlistItem[]> {
    const res = await apiRequest<{ items: WishlistItem[] }>(`/wishlist/${productId}`, {
      method: 'DELETE',
    });
    return res.data.items;
  },
};
