import { apiRequest } from './client';
import type {
  PaginationMeta,
  Product,
  ProductDetail,
  ProductFilterParams,
  ProductImage,
} from '../types';

export interface ProductListResponse {
  items: Product[];
  pagination: PaginationMeta;
}

type RawProductPayload = Record<string, unknown> & {
  id: string;
  sku: string;
  name?: string;
  title?: string;
  slug: string;
  shortDescription?: string | null;
  description?: string;
  brand?: string | null;
  pricePaise: number;
  mrpPaise: number;
  stockQuantity: number;
  lowStockThreshold?: number;
  isActive?: boolean;
  isFeatured?: boolean;
  isDemo?: boolean;
  averageRating?: number | string;
  ratingAvg?: number | string;
  reviewCount?: number;
  category: Product['category'];
  images?: ProductImage[];
  primaryImage?: string | { url: string; altText: string | null } | null;
  specifications?: Record<string, string | number | boolean> | null;
  reviews?: ProductDetail['reviews'];
  relatedProducts?: RawProductPayload[];
  createdAt: string;
  updatedAt?: string;
};

function normalizePrimaryImage(
  raw: RawProductPayload,
  displayTitle: string
): { url: string; altText: string | null } | null {
  if (raw.primaryImage && typeof raw.primaryImage === 'object' && 'url' in raw.primaryImage) {
    return {
      url: raw.primaryImage.url,
      altText: raw.primaryImage.altText ?? displayTitle,
    };
  }
  if (typeof raw.primaryImage === 'string' && raw.primaryImage.trim().length > 0) {
    return {
      url: raw.primaryImage,
      altText: raw.images?.[0]?.altText ?? displayTitle,
    };
  }
  if (Array.isArray(raw.images) && raw.images.length > 0 && raw.images[0]?.url) {
    return {
      url: raw.images[0].url,
      altText: raw.images[0].altText ?? displayTitle,
    };
  }
  return null;
}

function normalizeProduct(raw: RawProductPayload): Product {
  const displayTitle = raw.title || raw.name || 'ShopSphere Product';
  const ratingAvg = Number(raw.ratingAvg ?? raw.averageRating ?? 0);
  const isDemo =
    typeof raw.isDemo === 'boolean'
      ? raw.isDemo
      : Boolean(raw.sku?.startsWith('DEMO-') || displayTitle.includes('[DEMO]'));

  return {
    id: raw.id,
    sku: raw.sku,
    title: displayTitle,
    name: raw.name || displayTitle,
    slug: raw.slug,
    shortDescription: raw.shortDescription ?? null,
    brand: raw.brand ?? null,
    pricePaise: Number(raw.pricePaise),
    mrpPaise: Number(raw.mrpPaise),
    stockQuantity: Number(raw.stockQuantity ?? 0),
    lowStockThreshold: Number(raw.lowStockThreshold ?? 5),
    isActive: raw.isActive ?? true,
    isFeatured: Boolean(raw.isFeatured),
    isDemo,
    ratingAvg: Number.isFinite(ratingAvg) ? ratingAvg : 0,
    reviewCount: Number(raw.reviewCount ?? 0),
    category: raw.category,
    primaryImage: normalizePrimaryImage(raw, displayTitle),
    createdAt: raw.createdAt,
  };
}

function normalizeProductDetail(raw: RawProductPayload): ProductDetail {
  const base = normalizeProduct(raw);
  return {
    ...base,
    description: raw.description || base.shortDescription || '',
    isActive: raw.isActive ?? true,
    specifications: raw.specifications ?? null,
    updatedAt: raw.updatedAt || raw.createdAt,
    images: Array.isArray(raw.images) ? raw.images : [],
    reviews: Array.isArray(raw.reviews) ? raw.reviews : [],
    relatedProducts: Array.isArray(raw.relatedProducts)
      ? raw.relatedProducts.map((rel) => normalizeProduct(rel))
      : [],
  };
}

export const productsApi = {
  async listProducts(
    filters: ProductFilterParams = {}
  ): Promise<ProductListResponse> {
    const res = await apiRequest<{
      items: RawProductPayload[];
      pagination: PaginationMeta;
    }>('/products', {
      params: {
        q: filters.q,
        category: filters.category,
        brand: filters.brand,
        minPricePaise: filters.minPricePaise,
        maxPricePaise: filters.maxPricePaise,
        inStock:
          filters.inStock !== undefined ? String(filters.inStock) : undefined,
        featured:
          filters.featured !== undefined ? String(filters.featured) : undefined,
        minRating: filters.minRating,
        sortBy: filters.sortBy,
        page: filters.page,
        limit: filters.limit,
      },
    });
    return {
      items: (res.data.items ?? []).map(normalizeProduct),
      pagination: res.data.pagination,
    };
  },

  async getProductBySlugOrId(slugOrId: string): Promise<ProductDetail> {
    const res = await apiRequest<{ product: RawProductPayload }>(
      `/products/${encodeURIComponent(slugOrId)}`
    );
    return normalizeProductDetail(res.data.product);
  },
};
