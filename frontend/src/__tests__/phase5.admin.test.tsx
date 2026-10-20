import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from '../context/AuthContext';
import { AdminDashboardPage } from '../pages/admin/AdminDashboardPage';
import { authApi } from '../api/auth.api';
import { adminApi } from '../api/admin.api';
import type {
  User,
  AdminAnalytics,
  Product,
  Category,
  AdminOrder,
  InventoryLogEntry,
  AdminCoupon,
  AdminReview,
} from '../types';

const routerFutureFlags = {
  v7_startTransition: true,
  v7_relativeSplatPath: true,
};

const mockCustomerUser: User = {
  id: 'user-customer',
  email: 'customer@shopsphere.in',
  fullName: 'Aarav Sharma',
  phone: '9876543210',
  role: 'CUSTOMER',
  isActive: true,
  createdAt: new Date().toISOString(),
};

const mockAdminUser: User = {
  id: 'user-admin',
  email: 'admin@shopsphere.in',
  fullName: 'ShopSphere Admin',
  phone: '9876500001',
  role: 'ADMIN',
  isActive: true,
  createdAt: new Date().toISOString(),
};

const mockAnalytics: AdminAnalytics = {
  kpis: {
    totalRevenuePaise: 1450000,
    totalOrders: 6,
    paidOrdersCount: 5,
    averageOrderValuePaise: 290000,
    totalCustomers: 12,
    totalProducts: 24,
    activeProducts: 24,
    lowStockProductsCount: 1,
    pendingReviewsCount: 1,
    activeCouponsCount: 3,
  },
  ordersByStatus: [
    { status: 'PENDING', count: 1, totalPaise: 150000 },
    { status: 'CONFIRMED', count: 2, totalPaise: 500000 },
    { status: 'PROCESSING', count: 0, totalPaise: 0 },
    { status: 'SHIPPED', count: 1, totalPaise: 300000 },
    { status: 'DELIVERED', count: 2, totalPaise: 500000 },
    { status: 'CANCELLED', count: 0, totalPaise: 0 },
  ],
  revenueByCategory: [
    {
      categoryId: 'cat-1',
      categoryName: 'Electronics',
      revenuePaise: 1050000,
      unitsSold: 3,
    },
    {
      categoryId: 'cat-2',
      categoryName: 'Books & Learning',
      revenuePaise: 400000,
      unitsSold: 4,
    },
  ],
  revenueTimeSeries: [
    {
      date: '2026-10-19',
      label: '19 Oct',
      revenuePaise: 700000,
      orderCount: 2,
    },
    {
      date: '2026-10-20',
      label: '20 Oct',
      revenuePaise: 750000,
      orderCount: 3,
    },
  ],
  topSellingProducts: [
    {
      productId: 'prod-1',
      sku: 'DEMO-ELEC-001',
      name: '[DEMO] Indicsonic Pro ANC Wireless Headphones',
      categoryName: 'Electronics',
      stockQuantity: 38,
      unitsSold: 3,
      revenuePaise: 1049700,
    },
  ],
  lowStockAlerts: [
    {
      id: 'prod-low-1',
      sku: 'DEMO-BOOK-002',
      name: '[DEMO] Designing Data-Intensive Applications (Indian Ed.)',
      slug: 'demo-designing-data-intensive-applications',
      stockQuantity: 4,
      lowStockThreshold: 5,
      pricePaise: 89900,
      categoryName: 'Books & Learning',
      isActive: true,
    },
  ],
};

const mockCategories: Category[] = [
  {
    id: 'cat-1',
    name: 'Electronics',
    slug: 'electronics',
    description: 'Headphones, keyboards, and smart gadgets',
    imageUrl: null,
    isActive: true,
    parentId: null,
    parent: null,
    children: [],
    productCount: 4,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

const mockProducts: Product[] = [
  {
    id: 'prod-1',
    sku: 'DEMO-ELEC-001',
    title: '[DEMO] Indicsonic Pro ANC Wireless Headphones',
    name: '[DEMO] Indicsonic Pro ANC Wireless Headphones',
    slug: 'demo-indicsonic-pro-anc-wireless-headphones',
    shortDescription: 'Flagship hybrid ANC wireless headphones',
    brand: 'Indicsonic',
    pricePaise: 349900,
    mrpPaise: 599900,
    stockQuantity: 38,
    lowStockThreshold: 5,
    isActive: true,
    isFeatured: true,
    isDemo: true,
    ratingAvg: 4.5,
    reviewCount: 4,
    category: {
      id: 'cat-1',
      name: 'Electronics',
      slug: 'electronics',
    },
    primaryImage: null,
    createdAt: new Date().toISOString(),
  },
];

const mockAdminOrder: AdminOrder = {
  id: 'ord-admin-1',
  orderNumber: 'ORD-20261020-8899',
  userId: 'user-customer',
  status: 'CONFIRMED',
  paymentStatus: 'PAID',
  subtotalPaise: 349900,
  discountPaise: 0,
  taxPaise: 62982,
  shippingPaise: 0,
  totalPaise: 412882,
  currency: 'INR',
  couponId: null,
  couponCodeSnapshot: null,
  shippingRecipientName: 'Aarav Sharma',
  shippingPhone: '9876543210',
  shippingLine1: 'Flat 402, Whitefield',
  shippingLine2: null,
  shippingLandmark: null,
  shippingCity: 'Bengaluru',
  shippingState: 'Karnataka',
  shippingPostalCode: '560048',
  shippingCountry: 'India',
  notes: null,
  cancellationReason: null,
  cancelledAt: null,
  deliveredAt: null,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  user: {
    id: 'user-customer',
    fullName: 'Aarav Sharma',
    email: 'customer@shopsphere.in',
    phone: '9876543210',
  },
  items: [
    {
      id: 'oi-1',
      orderId: 'ord-admin-1',
      productId: 'prod-1',
      productNameSnapshot: '[DEMO] Indicsonic Pro ANC Wireless Headphones',
      productSkuSnapshot: 'DEMO-ELEC-001',
      productImageSnapshot: null,
      unitPricePaise: 349900,
      unitMrpPaise: 599900,
      quantity: 1,
      lineTotalPaise: 349900,
      createdAt: new Date().toISOString(),
    },
  ],
  payments: [],
};

const mockInventoryLogs: InventoryLogEntry[] = [
  {
    id: 'log-1',
    productId: 'prod-1',
    actorUserId: 'user-admin',
    orderId: null,
    changeQuantity: 25,
    previousStock: 13,
    newStock: 38,
    reason: 'ADMIN_ADJUSTMENT',
    notes: 'Festive warehouse restock',
    createdAt: new Date().toISOString(),
    product: {
      id: 'prod-1',
      sku: 'DEMO-ELEC-001',
      name: '[DEMO] Indicsonic Pro ANC Wireless Headphones',
      slug: 'demo-indicsonic-pro-anc-wireless-headphones',
      stockQuantity: 38,
    },
    actorUser: {
      id: 'user-admin',
      fullName: 'ShopSphere Admin',
      email: 'admin@shopsphere.in',
      role: 'ADMIN',
    },
    order: null,
  },
];

const mockAdminCoupons: AdminCoupon[] = [
  {
    id: 'coup-1',
    code: 'WELCOME10',
    description: '10% off up to ₹300 on your first order',
    discountType: 'PERCENTAGE',
    discountValue: 10,
    minOrderPaise: 99900,
    maxDiscountPaise: 30000,
    usageLimit: 500,
    usedCount: 14,
    orderRedemptionsCount: 14,
    perUserLimit: 1,
    startsAt: new Date(Date.now() - 86400000).toISOString(),
    expiresAt: new Date(Date.now() + 86400000 * 30).toISOString(),
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

const mockAdminReviews: AdminReview[] = [
  {
    id: 'rev-1',
    userId: 'user-customer',
    productId: 'prod-1',
    orderId: 'ord-admin-1',
    rating: 5,
    title: 'Incredible ANC for Metro Commutes',
    comment: 'Blocks out Bengaluru metro noise effortlessly.',
    status: 'PENDING',
    adminNotes: null,
    isVerifiedPurchase: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    user: {
      id: 'user-customer',
      fullName: 'Aarav Sharma',
      email: 'customer@shopsphere.in',
    },
    product: {
      id: 'prod-1',
      sku: 'DEMO-ELEC-001',
      name: '[DEMO] Indicsonic Pro ANC Wireless Headphones',
      slug: 'demo-indicsonic-pro-anc-wireless-headphones',
    },
  },
];

function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });
}

describe('Phase 5 Frontend — Admin Command Center & Real-Data Analytics', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(adminApi, 'getAnalytics').mockResolvedValue(mockAnalytics);
    vi.spyOn(adminApi, 'listProducts').mockResolvedValue({
      products: mockProducts,
      pagination: {
        page: 1,
        limit: 50,
        totalItems: 1,
        totalPages: 1,
        hasNextPage: false,
        hasPrevPage: false,
      },
    });
    vi.spyOn(adminApi, 'listCategories').mockResolvedValue(mockCategories);
    vi.spyOn(adminApi, 'listOrders').mockResolvedValue({
      orders: [mockAdminOrder],
      pagination: {
        page: 1,
        limit: 20,
        totalItems: 1,
        totalPages: 1,
        hasNextPage: false,
        hasPrevPage: false,
      },
    });
    vi.spyOn(adminApi, 'listInventoryLogs').mockResolvedValue({
      logs: mockInventoryLogs,
      pagination: {
        page: 1,
        limit: 20,
        totalItems: 1,
        totalPages: 1,
        hasNextPage: false,
        hasPrevPage: false,
      },
    });
    vi.spyOn(adminApi, 'listCoupons').mockResolvedValue(mockAdminCoupons);
    vi.spyOn(adminApi, 'listReviews').mockResolvedValue({
      reviews: mockAdminReviews,
      pagination: {
        page: 1,
        limit: 20,
        totalItems: 1,
        totalPages: 1,
        hasNextPage: false,
        hasPrevPage: false,
      },
    });
  });

  it('blocks non-admin CUSTOMER role with 403 Access Denied screen', async () => {
    vi.spyOn(authApi, 'getMe').mockResolvedValue(mockCustomerUser);
    const queryClient = createTestQueryClient();

    render(
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <MemoryRouter future={routerFutureFlags}>
            <AdminDashboardPage />
          </MemoryRouter>
        </AuthProvider>
      </QueryClientProvider>
    );

    expect(
      await screen.findByText(/403 Access Denied — Administrator Role Required/i)
    ).toBeInTheDocument();
    expect(screen.getByText(/customer@shopsphere.in/i)).toBeInTheDocument();
  });

  it('renders Real-Data Analytics KPIs, Low-Stock Alerts, and Top-Selling Products for ADMIN user', async () => {
    vi.spyOn(authApi, 'getMe').mockResolvedValue(mockAdminUser);
    const queryClient = createTestQueryClient();

    render(
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <MemoryRouter future={routerFutureFlags}>
            <AdminDashboardPage />
          </MemoryRouter>
        </AuthProvider>
      </QueryClientProvider>
    );

    expect(
      await screen.findByText('Store Administration & Live Database Analytics')
    ).toBeInTheDocument();
    expect(await screen.findByText('₹14,500.00')).toBeInTheDocument();
    expect(
      screen.getByText('[DEMO] Designing Data-Intensive Applications (Indian Ed.)')
    ).toBeInTheDocument();
    expect(
      screen.getByText('[DEMO] Indicsonic Pro ANC Wireless Headphones')
    ).toBeInTheDocument();
  });

  it('allows ADMIN to switch to Orders tab and progress order status', async () => {
    vi.spyOn(authApi, 'getMe').mockResolvedValue(mockAdminUser);
    const updateStatusSpy = vi
      .spyOn(adminApi, 'updateOrderStatus')
      .mockResolvedValue({ ...mockAdminOrder, status: 'PROCESSING' });

    const queryClient = createTestQueryClient();

    render(
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <MemoryRouter future={routerFutureFlags}>
            <AdminDashboardPage />
          </MemoryRouter>
        </AuthProvider>
      </QueryClientProvider>
    );

    const ordersTab = await screen.findByTestId('admin-tab-orders');
    fireEvent.click(ordersTab);

    expect(
      await screen.findByText('ORD-20261020-8899')
    ).toBeInTheDocument();

    const statusSelect = screen.getByLabelText(
      'Update status for ORD-20261020-8899'
    );
    fireEvent.change(statusSelect, { target: { value: 'PROCESSING' } });

    await waitFor(() => {
      expect(updateStatusSpy).toHaveBeenCalledWith('ord-admin-1', {
        status: 'PROCESSING',
        cancellationReason: undefined,
      });
    });
  });

  it('allows ADMIN to view Inventory & Logs tab and submit a stock adjustment', async () => {
    vi.spyOn(authApi, 'getMe').mockResolvedValue(mockAdminUser);
    const adjustStockSpy = vi.spyOn(adminApi, 'adjustInventory').mockResolvedValue({
      product: {
        ...mockProducts[0],
        stockQuantity: 48,
      },
      inventoryLog: mockInventoryLogs[0],
    });

    const queryClient = createTestQueryClient();

    render(
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <MemoryRouter future={routerFutureFlags}>
            <AdminDashboardPage />
          </MemoryRouter>
        </AuthProvider>
      </QueryClientProvider>
    );

    const invTab = await screen.findByTestId('admin-tab-inventory');
    fireEvent.click(invTab);

    expect(
      await screen.findByText('Live Inventory Audit Trail (InventoryLog)')
    ).toBeInTheDocument();
    expect(
      await screen.findByText('Festive warehouse restock')
    ).toBeInTheDocument();

    const productSelect = await screen.findByLabelText(/Select Product/i);
    fireEvent.change(productSelect, { target: { value: 'prod-1' } });

    const applyBtn = screen.getByRole('button', {
      name: /Apply Inventory Adjustment/i,
    });
    fireEvent.click(applyBtn);

    await waitFor(() => {
      expect(adjustStockSpy).toHaveBeenCalledWith(
        'prod-1',
        expect.objectContaining({
          changeQuantity: 10,
          reason: 'ADMIN_ADJUSTMENT',
        })
      );
    });
  });

  it('allows ADMIN to moderate customer reviews in Reviews tab', async () => {
    vi.spyOn(authApi, 'getMe').mockResolvedValue(mockAdminUser);
    const moderateSpy = vi
      .spyOn(adminApi, 'moderateReview')
      .mockResolvedValue({
        review: { ...mockAdminReviews[0], status: 'APPROVED' },
        productRatingStats: { averageRating: 4.8, reviewCount: 5 },
      });

    const queryClient = createTestQueryClient();

    render(
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <MemoryRouter future={routerFutureFlags}>
            <AdminDashboardPage />
          </MemoryRouter>
        </AuthProvider>
      </QueryClientProvider>
    );

    const reviewsTab = await screen.findByTestId('admin-tab-reviews');
    fireEvent.click(reviewsTab);

    expect(
      await screen.findByText(/Incredible ANC for Metro Commutes/i)
    ).toBeInTheDocument();

    const approveBtn = screen.getByRole('button', { name: 'Approve' });
    fireEvent.click(approveBtn);

    await waitFor(() => {
      expect(moderateSpy).toHaveBeenCalledWith('rev-1', {
        status: 'APPROVED',
        adminNotes: 'Approved by Admin',
      });
    });
  });
});
