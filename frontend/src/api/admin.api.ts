import { apiRequest } from './client';
import type {
  AdminAnalytics,
  AdminCoupon,
  AdminOrder,
  AdminReview,
  Category,
  DiscountType,
  InventoryLogEntry,
  InventoryReason,
  OrderStatus,
  PaginationMeta,
  PaymentStatus,
  Product,
  ReviewStatus,
} from '../types';

export interface CreateProductPayload {
  categoryId: string;
  sku: string;
  name: string;
  shortDescription?: string;
  description: string;
  brand?: string;
  pricePaise: number;
  mrpPaise: number;
  stockQuantity: number;
  lowStockThreshold?: number;
  isActive?: boolean;
  isFeatured?: boolean;
  specifications?: Record<string, string | number | boolean>;
  images?: Array<{
    url: string;
    altText?: string;
    displayOrder?: number;
    isPrimary?: boolean;
  }>;
}

export interface UpdateProductPayload {
  categoryId?: string;
  sku?: string;
  name?: string;
  shortDescription?: string | null;
  description?: string;
  brand?: string | null;
  pricePaise?: number;
  mrpPaise?: number;
  lowStockThreshold?: number;
  isActive?: boolean;
  isFeatured?: boolean;
}

export interface AdjustInventoryPayload {
  changeQuantity: number;
  reason: InventoryReason;
  notes?: string;
}

export interface CreateCategoryPayload {
  name: string;
  slug?: string;
  description?: string;
  imageUrl?: string;
  isActive?: boolean;
}

export interface CreateCouponPayload {
  code: string;
  description?: string | null;
  discountType: DiscountType;
  discountValue: number;
  minOrderPaise: number;
  maxDiscountPaise?: number | null;
  usageLimit?: number | null;
  perUserLimit?: number;
  expiresAt: string;
  isActive?: boolean;
}

export const adminApi = {
  // 1. Analytics
  async getAnalytics(): Promise<AdminAnalytics> {
    const res = await apiRequest<{ analytics: AdminAnalytics }>('/admin/analytics');
    return res.data.analytics;
  },

  // 2. Products & Inventory
  async listProducts(params?: {
    page?: number;
    limit?: number;
    q?: string;
    category?: string;
    includeInactive?: boolean;
  }): Promise<{ products: Product[]; pagination: PaginationMeta }> {
    const res = await apiRequest<{
      items?: Product[];
      products?: Product[];
      pagination?: PaginationMeta;
    }>('/products', {
      params: {
        page: params?.page ?? 1,
        limit: params?.limit ?? 50,
        q: params?.q,
        category: params?.category,
        includeInactive: params?.includeInactive ?? true,
      },
    });
    const products = res.data.items || res.data.products || [];
    return {
      products,
      pagination: res.data.pagination ||
        res.pagination || {
          page: 1,
          limit: 50,
          totalItems: products.length,
          totalPages: 1,
          hasNextPage: false,
          hasPrevPage: false,
        },
    };
  },

  async createProduct(payload: CreateProductPayload): Promise<Product> {
    const res = await apiRequest<{ product: Product }>('/products', {
      method: 'POST',
      body: payload,
    });
    return res.data.product;
  },

  async updateProduct(id: string, payload: UpdateProductPayload): Promise<Product> {
    const res = await apiRequest<{ product: Product }>(`/products/${id}`, {
      method: 'PATCH',
      body: payload,
    });
    return res.data.product;
  },

  async adjustInventory(
    productId: string,
    payload: AdjustInventoryPayload
  ): Promise<{ product: Product; inventoryLog: InventoryLogEntry }> {
    const res = await apiRequest<{
      product: Product;
      inventoryLog: InventoryLogEntry;
    }>(`/products/${productId}/inventory`, {
      method: 'PATCH',
      body: payload,
    });
    return res.data;
  },

  async deactivateProduct(id: string): Promise<Product> {
    const res = await apiRequest<{ product: Product }>(`/products/${id}`, {
      method: 'DELETE',
    });
    return res.data.product;
  },

  async listInventoryLogs(params?: {
    page?: number;
    limit?: number;
    productId?: string;
  }): Promise<{ logs: InventoryLogEntry[]; pagination: PaginationMeta }> {
    const res = await apiRequest<{ logs: InventoryLogEntry[] }>(
      '/admin/inventory-logs',
      { params }
    );
    return {
      logs: res.data.logs,
      pagination: res.pagination || {
        page: 1,
        limit: 25,
        totalItems: res.data.logs.length,
        totalPages: 1,
        hasNextPage: false,
        hasPrevPage: false,
      },
    };
  },

  // 3. Categories
  async listCategories(includeInactive = true): Promise<Category[]> {
    const res = await apiRequest<{ categories: Category[] }>('/categories', {
      params: { includeInactive },
    });
    return res.data.categories;
  },

  async createCategory(payload: CreateCategoryPayload): Promise<Category> {
    const res = await apiRequest<{ category: Category }>('/categories', {
      method: 'POST',
      body: payload,
    });
    return res.data.category;
  },

  async updateCategory(
    id: string,
    payload: Partial<CreateCategoryPayload>
  ): Promise<Category> {
    const res = await apiRequest<{ category: Category }>(`/categories/${id}`, {
      method: 'PATCH',
      body: payload,
    });
    return res.data.category;
  },

  async deleteCategory(
    id: string
  ): Promise<{ action: string; category?: Category }> {
    const res = await apiRequest<{ action: string; category?: Category }>(
      `/categories/${id}`,
      {
        method: 'DELETE',
      }
    );
    return res.data;
  },

  // 4. Orders
  async listOrders(params?: {
    page?: number;
    limit?: number;
    status?: OrderStatus;
    paymentStatus?: PaymentStatus;
    search?: string;
  }): Promise<{ orders: AdminOrder[]; pagination: PaginationMeta }> {
    const res = await apiRequest<{ orders: AdminOrder[] }>('/admin/orders', {
      params,
    });
    return {
      orders: res.data.orders,
      pagination: res.pagination || {
        page: 1,
        limit: 20,
        totalItems: res.data.orders.length,
        totalPages: 1,
        hasNextPage: false,
        hasPrevPage: false,
      },
    };
  },

  async updateOrderStatus(
    orderId: string,
    payload: {
      status: OrderStatus;
      paymentStatus?: PaymentStatus;
      cancellationReason?: string;
    }
  ): Promise<AdminOrder> {
    const res = await apiRequest<{ order: AdminOrder }>(
      `/admin/orders/${orderId}/status`,
      {
        method: 'PATCH',
        body: payload,
      }
    );
    return res.data.order;
  },

  // 5. Coupons
  async listCoupons(): Promise<AdminCoupon[]> {
    const res = await apiRequest<{ coupons: AdminCoupon[] }>('/admin/coupons');
    return res.data.coupons;
  },

  async createCoupon(payload: CreateCouponPayload): Promise<AdminCoupon> {
    const res = await apiRequest<{ coupon: AdminCoupon }>('/admin/coupons', {
      method: 'POST',
      body: payload,
    });
    return res.data.coupon;
  },

  async updateCoupon(
    id: string,
    payload: Partial<CreateCouponPayload>
  ): Promise<AdminCoupon> {
    const res = await apiRequest<{ coupon: AdminCoupon }>(
      `/admin/coupons/${id}`,
      {
        method: 'PATCH',
        body: payload,
      }
    );
    return res.data.coupon;
  },

  async deleteCoupon(
    id: string
  ): Promise<{ action: 'DELETED' | 'DEACTIVATED'; coupon: AdminCoupon }> {
    const res = await apiRequest<{
      action: 'DELETED' | 'DEACTIVATED';
      coupon: AdminCoupon;
    }>(`/admin/coupons/${id}`, {
      method: 'DELETE',
    });
    return res.data;
  },

  // 6. Reviews Moderation
  async listReviews(params?: {
    page?: number;
    limit?: number;
    status?: ReviewStatus;
    productId?: string;
  }): Promise<{ reviews: AdminReview[]; pagination: PaginationMeta }> {
    const res = await apiRequest<{ reviews: AdminReview[] }>('/admin/reviews', {
      params,
    });
    return {
      reviews: res.data.reviews,
      pagination: res.pagination || {
        page: 1,
        limit: 20,
        totalItems: res.data.reviews.length,
        totalPages: 1,
        hasNextPage: false,
        hasPrevPage: false,
      },
    };
  },

  async moderateReview(
    reviewId: string,
    payload: { status: ReviewStatus; adminNotes?: string | null }
  ): Promise<{
    review: AdminReview;
    productRatingStats: { averageRating: number; reviewCount: number };
  }> {
    const res = await apiRequest<{
      review: AdminReview;
      productRatingStats: { averageRating: number; reviewCount: number };
    }>(`/admin/reviews/${reviewId}/moderate`, {
      method: 'PATCH',
      body: payload,
    });
    return res.data;
  },

  async deleteReview(reviewId: string): Promise<void> {
    await apiRequest(`/reviews/${reviewId}`, {
      method: 'DELETE',
    });
  },
};
