export type Role = 'CUSTOMER' | 'ADMIN';

export interface User {
  id: string;
  fullName: string;
  email: string;
  phone: string | null;
  role: Role;
  isActive: boolean;
  emailVerified?: boolean;
  createdAt: string;
  updatedAt?: string;
}

export interface CategorySummary {
  id: string;
  name: string;
  slug: string;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  imageUrl: string | null;
  isActive?: boolean;
  parentId: string | null;
  parent: CategorySummary | null;
  children: Array<{
    id: string;
    name: string;
    slug: string;
    imageUrl: string | null;
  }>;
  productCount: number;
  createdAt: string;
  updatedAt?: string;
}

export interface ProductImage {
  id: string;
  url: string;
  altText: string | null;
  displayOrder: number;
  isPrimary: boolean;
}

export interface Product {
  id: string;
  sku: string;
  title: string;
  name?: string;
  slug: string;
  shortDescription: string | null;
  brand: string | null;
  pricePaise: number;
  mrpPaise: number;
  stockQuantity: number;
  lowStockThreshold: number;
  isActive?: boolean;
  isFeatured: boolean;
  isDemo: boolean;
  ratingAvg: number;
  reviewCount: number;
  category: CategorySummary;
  primaryImage: {
    url: string;
    altText: string | null;
  } | null;
  createdAt: string;
}

export interface ProductReview {
  id: string;
  rating: number;
  title: string | null;
  comment: string | null;
  isVerifiedPurchase: boolean;
  createdAt: string;
  user: {
    id: string;
    fullName: string;
  };
}

export interface ProductDetail extends Omit<Product, 'primaryImage'> {
  description: string;
  isActive: boolean;
  specifications: Record<string, string | number | boolean> | null;
  updatedAt: string;
  images: ProductImage[];
  reviews: ProductReview[];
  relatedProducts: Array<{
    id: string;
    sku: string;
    title: string;
    slug: string;
    brand: string | null;
    pricePaise: number;
    mrpPaise: number;
    stockQuantity: number;
    isDemo: boolean;
    ratingAvg: number;
    reviewCount: number;
    primaryImage: {
      url: string;
      altText: string | null;
    } | null;
  }>;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  totalItems: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export type ProductSortBy =
  | 'newest'
  | 'price_asc'
  | 'price_desc'
  | 'rating_desc'
  | 'name_asc';

export interface ProductFilterParams {
  q?: string;
  category?: string;
  brand?: string;
  minPricePaise?: number;
  maxPricePaise?: number;
  inStock?: boolean;
  featured?: boolean;
  minRating?: number;
  sortBy?: ProductSortBy;
  page?: number;
  limit?: number;
}

// ----------------------------------------------------------------------------
// Phase 4: Shopping Flow Types (Addresses, Coupons, Cart, Wishlist, Orders, Payments)
// ----------------------------------------------------------------------------

export interface Address {
  id: string;
  userId: string;
  label: string;
  recipientName: string;
  phone: string;
  line1: string;
  line2: string | null;
  landmark: string | null;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

export type DiscountType = 'PERCENTAGE' | 'FIXED_PAISE';

export interface Coupon {
  id: string;
  code: string;
  description: string | null;
  discountType: DiscountType;
  discountValue: number;
  minOrderPaise: number;
  maxDiscountPaise: number | null;
  expiresAt?: string;
}

export interface CartItem {
  id: string;
  productId: string;
  quantity: number;
  lineSubtotalPaise: number;
  lineMrpTotalPaise: number;
  product: {
    id: string;
    sku: string;
    title: string;
    slug: string;
    brand: string | null;
    pricePaise: number;
    mrpPaise: number;
    stockQuantity: number;
    isActive: boolean;
    isDemo: boolean;
    category: CategorySummary;
    primaryImage: {
      url: string;
      altText: string | null;
    } | null;
  };
}

export interface CartSummary {
  itemCount: number;
  totalQuantity: number;
  mrpTotalPaise: number;
  subtotalPaise: number;
  productSavingsPaise: number;
  discountPaise: number;
  shippingPaise: number;
  taxPaise: number;
  totalPaise: number;
  freeShippingThresholdPaise: number;
  amountForFreeShippingPaise: number;
}

export interface Cart {
  id: string;
  userId: string;
  items: CartItem[];
  appliedCoupon: Coupon | null;
  summary: CartSummary;
}

export interface WishlistItem {
  id: string;
  userId: string;
  productId: string;
  createdAt: string;
  product: {
    id: string;
    sku: string;
    name: string;
    slug: string;
    brand: string | null;
    pricePaise: number;
    mrpPaise: number;
    stockQuantity: number;
    isActive: boolean;
    averageRating: number;
    reviewCount: number;
    category: CategorySummary;
    images: ProductImage[];
  };
}

export type OrderStatus =
  | 'PENDING'
  | 'CONFIRMED'
  | 'PROCESSING'
  | 'SHIPPED'
  | 'DELIVERED'
  | 'CANCELLED';

export type PaymentStatus = 'PENDING' | 'AUTHORIZED' | 'PAID' | 'FAILED' | 'REFUNDED';
export type PaymentProvider = 'MOCK' | 'RAZORPAY';

export interface OrderItem {
  id: string;
  orderId: string;
  productId: string;
  productNameSnapshot: string;
  productSkuSnapshot: string;
  productImageSnapshot: string | null;
  unitPricePaise: number;
  unitMrpPaise: number;
  quantity: number;
  lineTotalPaise: number;
  createdAt: string;
}

export interface Payment {
  id: string;
  orderId: string;
  provider: PaymentProvider;
  status: PaymentStatus;
  amountPaise: number;
  currency: string;
  providerOrderId: string | null;
  providerPaymentId: string | null;
  method: string | null;
  failureReason: string | null;
  paidAt: string | null;
  createdAt: string;
}

export interface Order {
  id: string;
  orderNumber: string;
  userId: string;
  couponId: string | null;
  couponCodeSnapshot: string | null;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  subtotalPaise: number;
  discountPaise: number;
  shippingPaise: number;
  taxPaise: number;
  totalPaise: number;
  currency: string;
  shippingRecipientName: string;
  shippingPhone: string;
  shippingLine1: string;
  shippingLine2: string | null;
  shippingLandmark: string | null;
  shippingCity: string;
  shippingState: string;
  shippingPostalCode: string;
  shippingCountry: string;
  notes: string | null;
  cancellationReason: string | null;
  cancelledAt: string | null;
  deliveredAt: string | null;
  createdAt: string;
  updatedAt: string;
  items: OrderItem[];
  payments: Payment[];
}

export interface RazorpayOrderInit {
  orderId: string;
  orderNumber: string;
  razorpayOrderId: string;
  amountPaise: number;
  currency: string;
  keyId: string;
  prefill: {
    name: string;
    email: string;
    contact: string;
  };
  sandboxSimulation?: {
    razorpayPaymentId: string;
    razorpaySignature: string;
  };
}

export interface ApiSuccessResponse<T> {
  success: true;
  message?: string;
  data: T;
  pagination?: PaginationMeta;
}

export interface ApiErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: Record<string, string[]>;
  };
}

// ----------------------------------------------------------------------------
// Phase 5: Administration & Real-Data Analytics Types
// ----------------------------------------------------------------------------

export type InventoryReason =
  | 'INITIAL_STOCK'
  | 'ORDER_RESERVED'
  | 'ORDER_CANCELLED'
  | 'ADMIN_ADJUSTMENT'
  | 'DAMAGED_OR_LOST';

export type ReviewStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface AdminAnalytics {
  kpis: {
    totalRevenuePaise: number;
    totalOrders: number;
    paidOrdersCount: number;
    averageOrderValuePaise: number;
    totalCustomers: number;
    totalProducts: number;
    activeProducts: number;
    lowStockProductsCount: number;
    pendingReviewsCount: number;
    activeCouponsCount: number;
  };
  ordersByStatus: Array<{
    status: OrderStatus;
    count: number;
    totalPaise: number;
  }>;
  revenueByCategory: Array<{
    categoryId: string;
    categoryName: string;
    unitsSold: number;
    revenuePaise: number;
  }>;
  revenueTimeSeries: Array<{
    date: string;
    label: string;
    revenuePaise: number;
    orderCount: number;
  }>;
  topSellingProducts: Array<{
    productId: string;
    name: string;
    sku: string;
    categoryName: string;
    unitsSold: number;
    revenuePaise: number;
    stockQuantity: number;
  }>;
  lowStockAlerts: Array<{
    id: string;
    sku: string;
    name: string;
    slug: string;
    categoryName: string;
    stockQuantity: number;
    lowStockThreshold: number;
    pricePaise: number;
    isActive: boolean;
  }>;
}

export interface AdminOrder extends Order {
  user?: {
    id: string;
    email: string;
    fullName: string;
    phone: string | null;
  };
}

export interface InventoryLogEntry {
  id: string;
  productId: string;
  actorUserId: string | null;
  orderId: string | null;
  changeQuantity: number;
  previousStock: number;
  newStock: number;
  reason: InventoryReason;
  notes: string | null;
  createdAt: string;
  product: {
    id: string;
    sku: string;
    name: string;
    slug: string;
    stockQuantity: number;
  };
  actorUser: {
    id: string;
    fullName: string;
    email: string;
    role: Role;
  } | null;
  order: {
    id: string;
    orderNumber: string;
  } | null;
}

export interface AdminCoupon {
  id: string;
  code: string;
  description: string | null;
  discountType: DiscountType;
  discountValue: number;
  minOrderPaise: number;
  maxDiscountPaise: number | null;
  usageLimit: number | null;
  perUserLimit: number;
  usedCount: number;
  orderRedemptionsCount: number;
  startsAt: string;
  expiresAt: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AdminReview {
  id: string;
  userId: string;
  productId: string;
  orderId: string | null;
  rating: number;
  title: string | null;
  comment: string | null;
  isVerifiedPurchase: boolean;
  status: ReviewStatus;
  adminNotes: string | null;
  createdAt: string;
  updatedAt: string;
  user: {
    id: string;
    fullName: string;
    email: string;
  };
  product: {
    id: string;
    sku: string;
    name: string;
    slug: string;
  };
}

