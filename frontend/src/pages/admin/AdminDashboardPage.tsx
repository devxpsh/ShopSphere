import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  BarChart3,
  Package,
  FolderTree,
  Boxes,
  ShoppingBag,
  TicketPercent,
  MessageSquareWarning,
  ShieldAlert,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Plus,
  Search,
  RefreshCw,
  Star,
  Trash2,
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';
import { useAuth } from '../../context/AuthContext';
import { adminApi } from '../../api/admin.api';
import { getApiErrorMessage } from '../../api/client';
import {
  formatPaiseToINR,
  rupeesToPaise,
  paiseToRupees,
} from '../../utils/currency';
import type {
  DiscountType,
  InventoryReason,
  OrderStatus,
  ReviewStatus,
} from '../../types';

type AdminTab =
  | 'analytics'
  | 'products'
  | 'categories'
  | 'inventory'
  | 'orders'
  | 'coupons'
  | 'reviews';

const ORDER_STATUS_OPTIONS: OrderStatus[] = [
  'PENDING',
  'CONFIRMED',
  'PROCESSING',
  'SHIPPED',
  'DELIVERED',
  'CANCELLED',
];

const INVENTORY_REASON_OPTIONS: Array<{
  value: InventoryReason;
  label: string;
}> = [
  { value: 'ADMIN_ADJUSTMENT', label: 'Admin Restock / Count Adjustment' },
  { value: 'DAMAGED_OR_LOST', label: 'Damaged or Lost Stock Write-off' },
  { value: 'INITIAL_STOCK', label: 'Initial Warehouse Batch' },
];

export const AdminDashboardPage: React.FC = () => {
  const { user, isLoading: isAuthLoading } = useAuth();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<AdminTab>('analytics');
  const [feedback, setFeedback] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  // Filters & search state across tabs
  const [productSearch, setProductSearch] = useState('');
  const [orderStatusFilter, setOrderStatusFilter] = useState<OrderStatus | ''>('');
  const [orderSearch, setOrderSearch] = useState('');
  const [reviewStatusFilter, setReviewStatusFilter] = useState<
    ReviewStatus | ''
  >('');

  // Create Product Form State
  const [showNewProductForm, setShowNewProductForm] = useState(false);
  const [newProdCategoryId, setNewProdCategoryId] = useState('');
  const [newProdSku, setNewProdSku] = useState('');
  const [newProdName, setNewProdName] = useState('');
  const [newProdBrand, setNewProdBrand] = useState('');
  const [newProdPriceRupees, setNewProdPriceRupees] = useState('1499');
  const [newProdMrpRupees, setNewProdMrpRupees] = useState('1999');
  const [newProdStock, setNewProdStock] = useState('25');
  const [newProdDescription, setNewProdDescription] = useState('');
  const [newProdImageUrl, setNewProdImageUrl] = useState('');

  // Create Category Form State
  const [newCatName, setNewCatName] = useState('');
  const [newCatDescription, setNewCatDescription] = useState('');

  // Inventory Adjustment Form State
  const [invProductId, setInvProductId] = useState('');
  const [invChangeQty, setInvChangeQty] = useState('10');
  const [invReason, setInvReason] =
    useState<InventoryReason>('ADMIN_ADJUSTMENT');
  const [invNotes, setInvNotes] = useState('');

  // Create Coupon Form State
  const [newCouponCode, setNewCouponCode] = useState('');
  const [newCouponDesc, setNewCouponDesc] = useState('');
  const [newCouponType, setNewCouponType] =
    useState<DiscountType>('PERCENTAGE');
  const [newCouponValue, setNewCouponValue] = useState('15');
  const [newCouponMinOrderRupees, setNewCouponMinOrderRupees] = useState('999');
  const [newCouponMaxDiscountRupees, setNewCouponMaxDiscountRupees] =
    useState('300');
  const [newCouponUsageLimit, setNewCouponUsageLimit] = useState('100');

  const isAdmin = user?.role === 'ADMIN';

  // Queries (enabled only when user is authenticated as ADMIN)
  const analyticsQuery = useQuery({
    queryKey: ['admin', 'analytics'],
    queryFn: () => adminApi.getAnalytics(),
    enabled: Boolean(isAdmin),
  });

  const productsQuery = useQuery({
    queryKey: ['admin', 'products', productSearch],
    queryFn: () =>
      adminApi.listProducts({
        limit: 50,
        q: productSearch.trim() || undefined,
        includeInactive: true,
      }),
    enabled: Boolean(
      isAdmin && (activeTab === 'products' || activeTab === 'inventory')
    ),
  });

  const categoriesQuery = useQuery({
    queryKey: ['admin', 'categories'],
    queryFn: () => adminApi.listCategories(true),
    enabled: Boolean(
      isAdmin && (activeTab === 'categories' || activeTab === 'products')
    ),
  });

  const inventoryLogsQuery = useQuery({
    queryKey: ['admin', 'inventory-logs'],
    queryFn: () => adminApi.listInventoryLogs({ limit: 30 }),
    enabled: Boolean(isAdmin && activeTab === 'inventory'),
  });

  const ordersQuery = useQuery({
    queryKey: ['admin', 'orders', orderStatusFilter, orderSearch],
    queryFn: () =>
      adminApi.listOrders({
        limit: 30,
        status: orderStatusFilter || undefined,
        search: orderSearch.trim() || undefined,
      }),
    enabled: Boolean(isAdmin && activeTab === 'orders'),
  });

  const couponsQuery = useQuery({
    queryKey: ['admin', 'coupons'],
    queryFn: () => adminApi.listCoupons(),
    enabled: Boolean(isAdmin && activeTab === 'coupons'),
  });

  const reviewsQuery = useQuery({
    queryKey: ['admin', 'reviews', reviewStatusFilter],
    queryFn: () =>
      adminApi.listReviews({
        limit: 30,
        status: reviewStatusFilter || undefined,
      }),
    enabled: Boolean(isAdmin && activeTab === 'reviews'),
  });

  // Mutations
  const createProductMutation = useMutation({
    mutationFn: () => {
      const categoryId =
        newProdCategoryId || categoriesQuery.data?.[0]?.id || '';
      return adminApi.createProduct({
        categoryId,
        sku: newProdSku.trim().toUpperCase(),
        name: newProdName.trim(),
        brand: newProdBrand.trim() || undefined,
        description:
          newProdDescription.trim() ||
          `${newProdName.trim()} — authentic Indian retail specification.`,
        pricePaise: rupeesToPaise(Number(newProdPriceRupees)),
        mrpPaise: rupeesToPaise(Number(newProdMrpRupees)),
        stockQuantity: Number(newProdStock),
        isActive: true,
        images: newProdImageUrl.trim()
          ? [{ url: newProdImageUrl.trim(), isPrimary: true }]
          : undefined,
      });
    },
    onSuccess: (created) => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'products'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'analytics'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      setShowNewProductForm(false);
      setNewProdSku('');
      setNewProdName('');
      setNewProdBrand('');
      setNewProdDescription('');
      setNewProdImageUrl('');
      setFeedback({
        type: 'success',
        message: `Product "${created.name}" (${created.sku}) created in catalog.`,
      });
    },
    onError: (err) => {
      setFeedback({ type: 'error', message: getApiErrorMessage(err) });
    },
  });

  const toggleProductMutation = useMutation({
    mutationFn: (input: {
      id: string;
      isActive?: boolean;
      isFeatured?: boolean;
    }) =>
      adminApi.updateProduct(input.id, {
        isActive: input.isActive,
        isFeatured: input.isFeatured,
      }),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'products'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'analytics'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      setFeedback({
        type: 'success',
        message: `Updated "${updated.name}" status.`,
      });
    },
    onError: (err) => {
      setFeedback({ type: 'error', message: getApiErrorMessage(err) });
    },
  });

  const createCategoryMutation = useMutation({
    mutationFn: () =>
      adminApi.createCategory({
        name: newCatName.trim(),
        description: newCatDescription.trim() || undefined,
        isActive: true,
      }),
    onSuccess: (cat) => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'categories'] });
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      setNewCatName('');
      setNewCatDescription('');
      setFeedback({
        type: 'success',
        message: `Category "${cat.name}" created.`,
      });
    },
    onError: (err) => {
      setFeedback({ type: 'error', message: getApiErrorMessage(err) });
    },
  });

  const toggleCategoryMutation = useMutation({
    mutationFn: (input: { id: string; isActive: boolean }) =>
      adminApi.updateCategory(input.id, { isActive: input.isActive }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'categories'] });
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      setFeedback({
        type: 'success',
        message: 'Category visibility updated.',
      });
    },
    onError: (err) => {
      setFeedback({ type: 'error', message: getApiErrorMessage(err) });
    },
  });

  const adjustInventoryMutation = useMutation({
    mutationFn: () => {
      const targetId = invProductId || productsQuery.data?.products[0]?.id || '';
      return adminApi.adjustInventory(targetId, {
        changeQuantity: Number(invChangeQty),
        reason: invReason,
        notes: invNotes.trim() || undefined,
      });
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'products'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'inventory-logs'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'analytics'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      setInvNotes('');
      setFeedback({
        type: 'success',
        message: `Inventory updated for "${res.product.name}". New stock: ${res.product.stockQuantity} units.`,
      });
    },
    onError: (err) => {
      setFeedback({ type: 'error', message: getApiErrorMessage(err) });
    },
  });

  const updateOrderStatusMutation = useMutation({
    mutationFn: (input: {
      orderId: string;
      status: OrderStatus;
      cancellationReason?: string;
    }) =>
      adminApi.updateOrderStatus(input.orderId, {
        status: input.status,
        cancellationReason: input.cancellationReason,
      }),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'orders'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'analytics'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'inventory-logs'] });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      setFeedback({
        type: 'success',
        message: `Order ${updated.orderNumber} transitioned to ${updated.status}.`,
      });
    },
    onError: (err) => {
      setFeedback({ type: 'error', message: getApiErrorMessage(err) });
    },
  });

  const createCouponMutation = useMutation({
    mutationFn: () => {
      const discountValue =
        newCouponType === 'PERCENTAGE'
          ? Number(newCouponValue)
          : rupeesToPaise(Number(newCouponValue));
      const minOrderPaise = rupeesToPaise(
        Number(newCouponMinOrderRupees || '0')
      );
      const maxDiscountPaise =
        newCouponType === 'PERCENTAGE' && Number(newCouponMaxDiscountRupees) > 0
          ? rupeesToPaise(Number(newCouponMaxDiscountRupees))
          : null;
      const expiresAt = new Date(
        Date.now() + 60 * 24 * 60 * 60 * 1000
      ).toISOString();

      return adminApi.createCoupon({
        code: newCouponCode.trim().toUpperCase(),
        description: newCouponDesc.trim() || null,
        discountType: newCouponType,
        discountValue,
        minOrderPaise,
        maxDiscountPaise,
        usageLimit: Number(newCouponUsageLimit) > 0 ? Number(newCouponUsageLimit) : null,
        perUserLimit: 1,
        expiresAt,
        isActive: true,
      });
    },
    onSuccess: (created) => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'coupons'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'analytics'] });
      setNewCouponCode('');
      setNewCouponDesc('');
      setFeedback({
        type: 'success',
        message: `Coupon "${created.code}" created and activated.`,
      });
    },
    onError: (err) => {
      setFeedback({ type: 'error', message: getApiErrorMessage(err) });
    },
  });

  const toggleCouponMutation = useMutation({
    mutationFn: (input: { id: string; isActive: boolean }) =>
      adminApi.updateCoupon(input.id, { isActive: input.isActive }),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'coupons'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'analytics'] });
      setFeedback({
        type: 'success',
        message: `Coupon "${updated.code}" is now ${
          updated.isActive ? 'Active' : 'Inactive'
        }.`,
      });
    },
    onError: (err) => {
      setFeedback({ type: 'error', message: getApiErrorMessage(err) });
    },
  });

  const deleteCouponMutation = useMutation({
    mutationFn: (id: string) => adminApi.deleteCoupon(id),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'coupons'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'analytics'] });
      setFeedback({
        type: 'success',
        message:
          res.action === 'DELETED'
            ? `Coupon "${res.coupon.code}" deleted.`
            : `Coupon "${res.coupon.code}" has order history and was deactivated.`,
      });
    },
    onError: (err) => {
      setFeedback({ type: 'error', message: getApiErrorMessage(err) });
    },
  });

  const moderateReviewMutation = useMutation({
    mutationFn: (input: {
      reviewId: string;
      status: ReviewStatus;
      adminNotes?: string;
    }) =>
      adminApi.moderateReview(input.reviewId, {
        status: input.status,
        adminNotes: input.adminNotes,
      }),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'reviews'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'analytics'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      setFeedback({
        type: 'success',
        message: `Review marked as ${res.review.status}. Product rating recalculated (${res.productRatingStats.averageRating} ★ across ${res.productRatingStats.reviewCount} approved reviews).`,
      });
    },
    onError: (err) => {
      setFeedback({ type: 'error', message: getApiErrorMessage(err) });
    },
  });

  if (isAuthLoading) {
    return (
      <div
        className="max-w-7xl mx-auto px-4 py-12 animate-pulse space-y-6"
        aria-busy="true"
      >
        <div className="h-8 w-64 bg-slate-200 rounded" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="h-32 bg-slate-200 rounded-2xl" />
          <div className="h-32 bg-slate-200 rounded-2xl" />
          <div className="h-32 bg-slate-200 rounded-2xl" />
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="max-w-xl mx-auto px-4 py-16 text-center space-y-4">
        <ShieldAlert className="h-12 w-12 text-amber-600 mx-auto" />
        <h1 className="text-2xl font-bold text-slate-900">
          Administrator Sign In Required
        </h1>
        <p className="text-xs sm:text-sm text-slate-600">
          Please sign in with an Administrator account to access the ShopSphere
          Admin Command Center.
        </p>
        <Link to="/login" className="btn-primary">
          Sign In as Admin
        </Link>
      </div>
    );
  }

  if (user.role !== 'ADMIN') {
    return (
      <div className="max-w-xl mx-auto px-4 py-16 text-center space-y-4">
        <ShieldAlert className="h-12 w-12 text-rose-600 mx-auto" />
        <h1 className="text-2xl font-bold text-slate-900">
          403 Access Denied — Administrator Role Required
        </h1>
        <p className="text-xs sm:text-sm text-slate-600">
          Your account (<strong>{user.email}</strong>) has the{' '}
          <span className="font-mono font-bold">{user.role}</span> role. Admin
          permissions are strictly enforced on both the frontend and backend.
        </p>
        <Link to="/" className="btn-primary">
          Return to Storefront
        </Link>
      </div>
    );
  }

  const analytics = analyticsQuery.data;

  const tabs: Array<{
    id: AdminTab;
    label: string;
    icon: React.FC<{ className?: string }>;
  }> = [
    { id: 'analytics', label: 'Analytics & Insights', icon: BarChart3 },
    { id: 'products', label: 'Products', icon: Package },
    { id: 'categories', label: 'Categories', icon: FolderTree },
    { id: 'inventory', label: 'Inventory & Logs', icon: Boxes },
    { id: 'orders', label: 'Orders', icon: ShoppingBag },
    { id: 'coupons', label: 'Coupons', icon: TicketPercent },
    { id: 'reviews', label: 'Reviews', icon: MessageSquareWarning },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-brand-50 border border-brand-200 px-3 py-1 text-xs font-bold text-brand-700 mb-2">
            <span>ShopSphere Admin Command Center</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
            Store Administration & Live Database Analytics
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 mt-1">
            All metrics, inventory logs, and order totals are derived
            exclusively from live PostgreSQL records in integer paise.
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            queryClient.invalidateQueries({ queryKey: ['admin'] });
          }}
          className="btn-secondary !py-2 !px-4 !text-xs self-start md:self-auto"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Refresh Live Data
        </button>
      </div>

      {/* Navigation Tabs */}
      <div
        role="tablist"
        aria-label="Admin Management Sections"
        className="flex flex-wrap gap-2 border-b border-slate-200 pb-4"
      >
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              data-testid={`admin-tab-${tab.id}`}
              role="tab"
              aria-selected={isActive}
              type="button"
              onClick={() => {
                setFeedback(null);
                setActiveTab(tab.id);
              }}
              className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs sm:text-sm font-semibold transition-all ${
                isActive
                  ? 'bg-brand-600 text-white shadow-sm'
                  : 'bg-white border border-slate-200 text-slate-700 hover:border-brand-300'
              }`}
            >
              <Icon className="h-4 w-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Feedback Banner */}
      {feedback && (
        <div
          role="status"
          className={`rounded-2xl border p-4 text-xs sm:text-sm flex items-center justify-between gap-3 ${
            feedback.type === 'error'
              ? 'bg-rose-50 border-rose-200 text-rose-800'
              : 'bg-emerald-50 border-emerald-200 text-emerald-900'
          }`}
        >
          <div className="flex items-center gap-2.5">
            {feedback.type === 'error' ? (
              <XCircle className="h-5 w-5 text-rose-600 shrink-0" />
            ) : (
              <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
            )}
            <span>{feedback.message}</span>
          </div>
          <button
            type="button"
            onClick={() => setFeedback(null)}
            className="text-xs font-bold underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* TAB 1: ANALYTICS & RECHARTS */}
      {activeTab === 'analytics' && (
        <div className="space-y-8">
          {analyticsQuery.isLoading || !analytics ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 animate-pulse">
              <div className="h-28 bg-slate-200 rounded-2xl" />
              <div className="h-28 bg-slate-200 rounded-2xl" />
              <div className="h-28 bg-slate-200 rounded-2xl" />
            </div>
          ) : (
            <>
              {/* KPI Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="rounded-2xl bg-white border border-slate-200 p-5 shadow-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Total Paid Revenue (INR)
                    </span>
                    <TrendingUp className="h-5 w-5 text-emerald-600" />
                  </div>
                  <p className="text-2xl font-extrabold text-slate-900 mt-2">
                    {formatPaiseToINR(analytics.kpis.totalRevenuePaise)}
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    Across {analytics.kpis.paidOrdersCount} verified paid orders
                  </p>
                </div>

                <div className="rounded-2xl bg-white border border-slate-200 p-5 shadow-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Total Orders & Avg Order Value
                    </span>
                    <ShoppingBag className="h-5 w-5 text-brand-600" />
                  </div>
                  <p className="text-2xl font-extrabold text-slate-900 mt-2">
                    {analytics.kpis.totalOrders} Orders
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    Avg Paid Order:{' '}
                    <strong>
                      {formatPaiseToINR(analytics.kpis.averageOrderValuePaise)}
                    </strong>
                  </p>
                </div>

                <div className="rounded-2xl bg-white border border-slate-200 p-5 shadow-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Catalog & Low-Stock Alerts
                    </span>
                    <AlertTriangle className="h-5 w-5 text-amber-500" />
                  </div>
                  <p className="text-2xl font-extrabold text-slate-900 mt-2">
                    {analytics.kpis.activeProducts} /{' '}
                    {analytics.kpis.totalProducts} Active
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    <strong className="text-amber-700">
                      {analytics.kpis.lowStockProductsCount} item(s)
                    </strong>{' '}
                    at or below low-stock threshold •{' '}
                    {analytics.kpis.totalCustomers} Customers
                  </p>
                </div>
              </div>

              {/* Recharts Visualizations */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* 14-Day Revenue Trend Chart */}
                <section className="rounded-2xl bg-white border border-slate-200 p-6 shadow-sm space-y-4">
                  <div>
                    <h2 className="text-base font-bold text-slate-900">
                      14-Day Paid Revenue Trend (INR)
                    </h2>
                    <p className="text-xs text-slate-500">
                      Daily verified revenue aggregated from PostgreSQL orders
                    </p>
                  </div>

                  <div className="h-64 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart
                        data={analytics.revenueTimeSeries.map((pt) => ({
                          ...pt,
                          revenueRupees: paiseToRupees(pt.revenuePaise),
                        }))}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                        <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                        <YAxis tick={{ fontSize: 11 }} />
                        <Tooltip
                          formatter={(value: number) => [
                            `₹${value.toLocaleString('en-IN')}`,
                            'Paid Revenue',
                          ]}
                        />
                        <Area
                          type="monotone"
                          dataKey="revenueRupees"
                          stroke="#4f46e5"
                          fill="#e0e7ff"
                          strokeWidth={2}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </section>

                {/* Revenue by Category BarChart */}
                <section className="rounded-2xl bg-white border border-slate-200 p-6 shadow-sm space-y-4">
                  <div>
                    <h2 className="text-base font-bold text-slate-900">
                      Sales Revenue by Category
                    </h2>
                    <p className="text-xs text-slate-500">
                      Derived from non-cancelled OrderItem snapshots
                    </p>
                  </div>

                  <div className="h-64 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={analytics.revenueByCategory.map((cat) => ({
                          ...cat,
                          revenueRupees: paiseToRupees(cat.revenuePaise),
                        }))}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                        <XAxis dataKey="categoryName" tick={{ fontSize: 11 }} />
                        <YAxis tick={{ fontSize: 11 }} />
                        <Tooltip
                          formatter={(value: number) => [
                            `₹${value.toLocaleString('en-IN')}`,
                            'Category Revenue',
                          ]}
                        />
                        <Bar
                          dataKey="revenueRupees"
                          fill="#0f766e"
                          radius={[6, 6, 0, 0]}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </section>
              </div>

              {/* Order Status Breakdown + Low Stock Alerts */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <section className="rounded-2xl bg-white border border-slate-200 p-6 shadow-sm space-y-4">
                  <h2 className="text-base font-bold text-slate-900">
                    Orders by Lifecycle Status
                  </h2>
                  <div className="divide-y divide-slate-100">
                    {analytics.ordersByStatus.map((row) => (
                      <div
                        key={row.status}
                        className="py-2.5 flex items-center justify-between text-xs sm:text-sm"
                      >
                        <span className="font-mono font-bold text-slate-800">
                          {row.status}
                        </span>
                        <div className="flex items-center gap-4">
                          <span className="text-slate-600">
                            {row.count} order(s)
                          </span>
                          <span className="font-bold text-slate-900 w-28 text-right">
                            {formatPaiseToINR(row.totalPaise)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>

                <section className="rounded-2xl bg-white border border-slate-200 p-6 shadow-sm space-y-4">
                  <div className="flex items-center justify-between">
                    <h2 className="text-base font-bold text-slate-900">
                      Top-Selling Products (Real OrderItems)
                    </h2>
                  </div>
                  {analytics.topSellingProducts.length === 0 ? (
                    <p className="text-xs text-slate-500">
                      No product sales recorded yet.
                    </p>
                  ) : (
                    <div className="divide-y divide-slate-100">
                      {analytics.topSellingProducts.map((item) => (
                        <div
                          key={item.productId}
                          className="py-2.5 flex items-center justify-between gap-2 text-xs"
                        >
                          <div>
                            <p className="font-bold text-slate-900">
                              {item.name}
                            </p>
                            <p className="text-slate-500 font-mono">
                              {item.sku} • {item.categoryName} • Stock:{' '}
                              {item.stockQuantity}
                            </p>
                          </div>
                          <div className="text-right shrink-0">
                            <p className="font-extrabold text-slate-900">
                              {formatPaiseToINR(item.revenuePaise)}
                            </p>
                            <p className="text-slate-500">
                              {item.unitsSold} unit(s) sold
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </section>
              </div>

              {/* Low Stock Alerts */}
              {analytics.lowStockAlerts.length > 0 && (
                <section className="rounded-2xl bg-amber-50/70 border border-amber-200 p-6 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="h-5 w-5 text-amber-600" />
                      <h2 className="text-sm font-bold text-amber-950">
                        Low-Stock Warehouse Alerts
                      </h2>
                    </div>
                    <button
                      type="button"
                      onClick={() => setActiveTab('inventory')}
                      className="text-xs font-bold text-brand-700 hover:underline"
                    >
                      Open Inventory Controls →
                    </button>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {analytics.lowStockAlerts.map((item) => (
                      <div
                        key={item.id}
                        className="rounded-xl bg-white border border-amber-200 p-3 text-xs flex items-center justify-between"
                      >
                        <div>
                          <p className="font-bold text-slate-900 line-clamp-1">
                            {item.name}
                          </p>
                          <p className="font-mono text-slate-500">{item.sku}</p>
                        </div>
                        <span className="rounded-full bg-amber-100 text-amber-900 font-extrabold px-2.5 py-1">
                          {item.stockQuantity} left
                        </span>
                      </div>
                    ))}
                  </div>
                </section>
              )}
            </>
          )}
        </div>
      )}

      {/* TAB 2: PRODUCTS MANAGEMENT */}
      {activeTab === 'products' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="h-4 w-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="search"
                value={productSearch}
                onChange={(e) => setProductSearch(e.target.value)}
                placeholder="Search products by name, SKU, or brand..."
                className="input-field !pl-10 !py-2 !text-xs"
              />
            </div>

            <button
              type="button"
              onClick={() => setShowNewProductForm((v) => !v)}
              className="btn-primary !py-2 !px-4 !text-xs"
            >
              <Plus className="h-4 w-4" />
              {showNewProductForm ? 'Close Product Form' : 'Add New Product'}
            </button>
          </div>

          {showNewProductForm && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                createProductMutation.mutate();
              }}
              className="rounded-2xl bg-white border border-slate-200 p-6 shadow-sm space-y-4"
            >
              <h2 className="text-base font-bold text-slate-900">
                Create New Catalog Product (Prices converted to Integer Paise)
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label
                    htmlFor="admin-prod-name"
                    className="block text-xs font-semibold text-slate-700 mb-1"
                  >
                    Product Name *
                  </label>
                  <input
                    id="admin-prod-name"
                    type="text"
                    required
                    value={newProdName}
                    onChange={(e) => setNewProdName(e.target.value)}
                    placeholder="[DEMO] Bharat Smart Watch Pro"
                    className="input-field !text-xs"
                  />
                </div>

                <div>
                  <label
                    htmlFor="admin-prod-sku"
                    className="block text-xs font-semibold text-slate-700 mb-1"
                  >
                    SKU *
                  </label>
                  <input
                    id="admin-prod-sku"
                    type="text"
                    required
                    value={newProdSku}
                    onChange={(e) => setNewProdSku(e.target.value)}
                    placeholder="DEMO-ELEC-099"
                    className="input-field !text-xs font-mono"
                  />
                </div>

                <div>
                  <label
                    htmlFor="admin-prod-cat"
                    className="block text-xs font-semibold text-slate-700 mb-1"
                  >
                    Category *
                  </label>
                  <select
                    id="admin-prod-cat"
                    value={newProdCategoryId}
                    onChange={(e) => setNewProdCategoryId(e.target.value)}
                    className="input-field !text-xs"
                  >
                    <option value="">Select Category (defaults to 1st)</option>
                    {(categoriesQuery.data || []).map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="admin-prod-price"
                    className="block text-xs font-semibold text-slate-700 mb-1"
                  >
                    Selling Price (₹ INR) *
                  </label>
                  <input
                    id="admin-prod-price"
                    type="number"
                    min="1"
                    step="0.01"
                    required
                    value={newProdPriceRupees}
                    onChange={(e) => setNewProdPriceRupees(e.target.value)}
                    className="input-field !text-xs"
                  />
                </div>

                <div>
                  <label
                    htmlFor="admin-prod-mrp"
                    className="block text-xs font-semibold text-slate-700 mb-1"
                  >
                    MRP (₹ INR, ≥ Selling Price) *
                  </label>
                  <input
                    id="admin-prod-mrp"
                    type="number"
                    min="1"
                    step="0.01"
                    required
                    value={newProdMrpRupees}
                    onChange={(e) => setNewProdMrpRupees(e.target.value)}
                    className="input-field !text-xs"
                  />
                </div>

                <div>
                  <label
                    htmlFor="admin-prod-stock"
                    className="block text-xs font-semibold text-slate-700 mb-1"
                  >
                    Initial Stock Quantity *
                  </label>
                  <input
                    id="admin-prod-stock"
                    type="number"
                    min="0"
                    required
                    value={newProdStock}
                    onChange={(e) => setNewProdStock(e.target.value)}
                    className="input-field !text-xs"
                  />
                </div>

                <div>
                  <label
                    htmlFor="admin-prod-brand"
                    className="block text-xs font-semibold text-slate-700 mb-1"
                  >
                    Brand
                  </label>
                  <input
                    id="admin-prod-brand"
                    type="text"
                    value={newProdBrand}
                    onChange={(e) => setNewProdBrand(e.target.value)}
                    placeholder="Indicsonic"
                    className="input-field !text-xs"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label
                    htmlFor="admin-prod-img"
                    className="block text-xs font-semibold text-slate-700 mb-1"
                  >
                    Primary Image URL (Optional)
                  </label>
                  <input
                    id="admin-prod-img"
                    type="url"
                    value={newProdImageUrl}
                    onChange={(e) => setNewProdImageUrl(e.target.value)}
                    placeholder="https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=800&q=80"
                    className="input-field !text-xs"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <button
                  type="submit"
                  disabled={createProductMutation.isPending}
                  className="btn-primary !py-2 !px-5 !text-xs"
                >
                  {createProductMutation.isPending
                    ? 'Creating...'
                    : 'Create Product'}
                </button>
              </div>
            </form>
          )}

          <div className="rounded-2xl bg-white border border-slate-200 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase">
                    <th className="py-3 px-4">Product & SKU</th>
                    <th className="py-3 px-4">Category</th>
                    <th className="py-3 px-4">Price / MRP</th>
                    <th className="py-3 px-4">Stock</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {(productsQuery.data?.products || []).map((prod) => (
                    <tr key={prod.id} className="hover:bg-slate-50/80">
                      <td className="py-3 px-4">
                        <p className="font-bold text-slate-900">
                          {prod.name || prod.title}
                        </p>
                        <p className="font-mono text-slate-500">{prod.sku}</p>
                      </td>
                      <td className="py-3 px-4 text-slate-600">
                        {prod.category.name}
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-bold text-slate-900">
                          {formatPaiseToINR(prod.pricePaise, {
                            trimZeroPaise: true,
                          })}
                        </span>
                        <span className="text-slate-400 line-through ml-1.5">
                          {formatPaiseToINR(prod.mrpPaise, {
                            trimZeroPaise: true,
                          })}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`font-bold ${
                            prod.stockQuantity <= prod.lowStockThreshold
                              ? 'text-amber-700'
                              : 'text-emerald-700'
                          }`}
                        >
                          {prod.stockQuantity} units
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
                            prod.isActive
                              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                              : 'bg-slate-100 text-slate-600 border border-slate-200'
                          }`}
                        >
                          {prod.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right space-x-2">
                        <button
                          type="button"
                          onClick={() =>
                            toggleProductMutation.mutate({
                              id: prod.id,
                              isActive: !prod.isActive,
                            })
                          }
                          className="rounded-lg border border-slate-200 px-2.5 py-1 font-semibold text-slate-700 hover:border-brand-400"
                        >
                          {prod.isActive ? 'Deactivate' : 'Activate'}
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            toggleProductMutation.mutate({
                              id: prod.id,
                              isFeatured: !prod.isFeatured,
                            })
                          }
                          className={`rounded-lg border px-2.5 py-1 font-semibold ${
                            prod.isFeatured
                              ? 'bg-amber-50 border-amber-300 text-amber-800'
                              : 'border-slate-200 text-slate-600'
                          }`}
                        >
                          {prod.isFeatured ? '★ Featured' : '☆ Feature'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: CATEGORIES MANAGEMENT */}
      {activeTab === 'categories' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              createCategoryMutation.mutate();
            }}
            className="lg:col-span-4 rounded-2xl bg-white border border-slate-200 p-6 shadow-sm space-y-4 h-fit"
          >
            <h2 className="text-base font-bold text-slate-900">
              Create Category
            </h2>
            <div>
              <label
                htmlFor="admin-cat-name"
                className="block text-xs font-semibold text-slate-700 mb-1"
              >
                Category Name *
              </label>
              <input
                id="admin-cat-name"
                type="text"
                required
                value={newCatName}
                onChange={(e) => setNewCatName(e.target.value)}
                placeholder="Regional Handlooms"
                className="input-field !text-xs"
              />
            </div>
            <div>
              <label
                htmlFor="admin-cat-desc"
                className="block text-xs font-semibold text-slate-700 mb-1"
              >
                Description
              </label>
              <textarea
                id="admin-cat-desc"
                rows={3}
                value={newCatDescription}
                onChange={(e) => setNewCatDescription(e.target.value)}
                placeholder="Authentic regional crafts and textiles..."
                className="input-field !text-xs"
              />
            </div>
            <button
              type="submit"
              disabled={createCategoryMutation.isPending}
              className="btn-primary w-full !py-2.5 !text-xs"
            >
              {createCategoryMutation.isPending
                ? 'Creating...'
                : 'Add Category'}
            </button>
          </form>

          <div className="lg:col-span-8 rounded-2xl bg-white border border-slate-200 overflow-hidden shadow-sm">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase">
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Slug</th>
                  <th className="py-3 px-4">Products</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {(categoriesQuery.data || []).map((cat) => (
                  <tr key={cat.id}>
                    <td className="py-3 px-4 font-bold text-slate-900">
                      {cat.name}
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-500">
                      {cat.slug}
                    </td>
                    <td className="py-3 px-4 text-slate-700">
                      {cat.productCount ?? 0}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
                          cat.isActive
                            ? 'bg-emerald-50 text-emerald-800'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {cat.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        type="button"
                        onClick={() =>
                          toggleCategoryMutation.mutate({
                            id: cat.id,
                            isActive: !cat.isActive,
                          })
                        }
                        className="rounded-lg border border-slate-200 px-3 py-1 font-semibold text-slate-700 hover:border-brand-400"
                      >
                        {cat.isActive ? 'Deactivate' : 'Activate'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: INVENTORY CONTROLS & AUDIT LOGS */}
      {activeTab === 'inventory' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              adjustInventoryMutation.mutate();
            }}
            className="lg:col-span-4 rounded-2xl bg-white border border-slate-200 p-6 shadow-sm space-y-4 h-fit"
          >
            <h2 className="text-base font-bold text-slate-900">
              Transactional Stock Adjustment
            </h2>
            <p className="text-xs text-slate-500">
              Atomically updates stock and appends an immutable{' '}
              <code className="font-mono">InventoryLog</code> audit entry.
            </p>

            <div>
              <label
                htmlFor="inv-product-select"
                className="block text-xs font-semibold text-slate-700 mb-1"
              >
                Select Product *
              </label>
              <select
                id="inv-product-select"
                value={invProductId}
                onChange={(e) => setInvProductId(e.target.value)}
                className="input-field !text-xs"
              >
                {(productsQuery.data?.products || []).map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.sku} — {p.name || p.title} (Stock: {p.stockQuantity})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="inv-change-qty"
                className="block text-xs font-semibold text-slate-700 mb-1"
              >
                Signed Quantity Delta (e.g., 10 or -3) *
              </label>
              <input
                id="inv-change-qty"
                type="number"
                required
                value={invChangeQty}
                onChange={(e) => setInvChangeQty(e.target.value)}
                className="input-field !text-xs font-mono"
              />
            </div>

            <div>
              <label
                htmlFor="inv-reason-select"
                className="block text-xs font-semibold text-slate-700 mb-1"
              >
                Audit Reason *
              </label>
              <select
                id="inv-reason-select"
                value={invReason}
                onChange={(e) =>
                  setInvReason(e.target.value as InventoryReason)
                }
                className="input-field !text-xs"
              >
                {INVENTORY_REASON_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="inv-notes-input"
                className="block text-xs font-semibold text-slate-700 mb-1"
              >
                Audit Notes
              </label>
              <input
                id="inv-notes-input"
                type="text"
                value={invNotes}
                onChange={(e) => setInvNotes(e.target.value)}
                placeholder="Bengaluru warehouse shipment received"
                className="input-field !text-xs"
              />
            </div>

            <button
              type="submit"
              disabled={adjustInventoryMutation.isPending}
              className="btn-primary w-full !py-2.5 !text-xs"
            >
              {adjustInventoryMutation.isPending
                ? 'Applying Stock Change...'
                : 'Apply Inventory Adjustment'}
            </button>
          </form>

          <div className="lg:col-span-8 rounded-2xl bg-white border border-slate-200 overflow-hidden shadow-sm">
            <div className="px-6 py-4 border-b border-slate-200">
              <h2 className="text-sm font-bold text-slate-900">
                Live Inventory Audit Trail (InventoryLog)
              </h2>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase">
                    <th className="py-3 px-4">Product</th>
                    <th className="py-3 px-4">Delta</th>
                    <th className="py-3 px-4">Transition</th>
                    <th className="py-3 px-4">Reason & Notes</th>
                    <th className="py-3 px-4">Actor / Order</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {(inventoryLogsQuery.data?.logs || []).map((log) => (
                    <tr key={log.id}>
                      <td className="py-3 px-4">
                        <p className="font-bold text-slate-900">
                          {log.product.name}
                        </p>
                        <p className="font-mono text-slate-500">
                          {log.product.sku}
                        </p>
                      </td>
                      <td className="py-3 px-4 font-mono font-extrabold">
                        <span
                          className={
                            log.changeQuantity >= 0
                              ? 'text-emerald-700'
                              : 'text-rose-700'
                          }
                        >
                          {log.changeQuantity >= 0
                            ? `+${log.changeQuantity}`
                            : log.changeQuantity}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-600">
                        {log.previousStock} →{' '}
                        <strong className="text-slate-900">
                          {log.newStock}
                        </strong>
                      </td>
                      <td className="py-3 px-4">
                        <span className="rounded bg-slate-100 px-2 py-0.5 font-mono text-[11px] font-semibold text-slate-800">
                          {log.reason}
                        </span>
                        {log.notes && (
                          <p className="text-slate-500 mt-0.5">{log.notes}</p>
                        )}
                      </td>
                      <td className="py-3 px-4 text-slate-600">
                        {log.actorUser?.fullName || 'System'}
                        {log.order && (
                          <p className="font-mono text-[11px] text-brand-600">
                            {log.order.orderNumber}
                          </p>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: ORDERS LIFECYCLE MANAGEMENT */}
      {activeTab === 'orders' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex flex-wrap gap-1.5">
              {(
                [
                  { value: '', label: 'All Orders' },
                  { value: 'PENDING', label: 'Pending' },
                  { value: 'CONFIRMED', label: 'Confirmed' },
                  { value: 'PROCESSING', label: 'Processing' },
                  { value: 'SHIPPED', label: 'Shipped' },
                  { value: 'DELIVERED', label: 'Delivered' },
                  { value: 'CANCELLED', label: 'Cancelled' },
                ] as const
              ).map((pill) => (
                <button
                  key={pill.label}
                  type="button"
                  onClick={() => setOrderStatusFilter(pill.value)}
                  className={`rounded-full px-3 py-1 text-xs font-semibold ${
                    orderStatusFilter === pill.value
                      ? 'bg-brand-600 text-white'
                      : 'bg-white border border-slate-200 text-slate-700'
                  }`}
                >
                  {pill.label}
                </button>
              ))}
            </div>

            <div className="relative w-full sm:w-64">
              <Search className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="search"
                value={orderSearch}
                onChange={(e) => setOrderSearch(e.target.value)}
                placeholder="Search order # or customer..."
                className="input-field !pl-9 !py-1.5 !text-xs"
              />
            </div>
          </div>

          <div className="rounded-2xl bg-white border border-slate-200 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase">
                    <th className="py-3 px-4">Order #</th>
                    <th className="py-3 px-4">Customer & Destination</th>
                    <th className="py-3 px-4">Items</th>
                    <th className="py-3 px-4">Total (INR)</th>
                    <th className="py-3 px-4">Status & Payment</th>
                    <th className="py-3 px-4 text-right">Update Lifecycle</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {(ordersQuery.data?.orders || []).map((ord) => {
                    const isTerminal =
                      ord.status === 'CANCELLED' || ord.status === 'DELIVERED';
                    return (
                      <tr key={ord.id}>
                        <td className="py-3 px-4 font-mono font-bold text-slate-900">
                          <Link
                            to={`/orders/${ord.id}`}
                            className="hover:text-brand-600 underline"
                          >
                            {ord.orderNumber}
                          </Link>
                          <p className="text-[11px] font-sans font-normal text-slate-500">
                            {new Date(ord.createdAt).toLocaleDateString(
                              'en-IN'
                            )}
                          </p>
                        </td>
                        <td className="py-3 px-4">
                          <p className="font-bold text-slate-900">
                            {ord.user?.fullName || ord.shippingRecipientName}
                          </p>
                          <p className="text-slate-500">
                            {ord.shippingCity}, {ord.shippingState} (
                            {ord.shippingPostalCode})
                          </p>
                        </td>
                        <td className="py-3 px-4 text-slate-700">
                          {ord.items.map((it) => (
                            <div key={it.id}>
                              {it.quantity} × {it.productNameSnapshot}
                            </div>
                          ))}
                        </td>
                        <td className="py-3 px-4 font-extrabold text-slate-900">
                          {formatPaiseToINR(ord.totalPaise)}
                        </td>
                        <td className="py-3 px-4">
                          <span className="inline-block rounded-full bg-brand-50 border border-brand-200 px-2.5 py-0.5 text-[11px] font-bold text-brand-800 mr-1.5">
                            {ord.status}
                          </span>
                          <span className="inline-block rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-700">
                            {ord.paymentStatus}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <select
                            aria-label={`Update status for ${ord.orderNumber}`}
                            disabled={
                              isTerminal || updateOrderStatusMutation.isPending
                            }
                            value={ord.status}
                            onChange={(e) => {
                              const nextStatus = e.target.value as OrderStatus;
                              if (nextStatus === ord.status) return;
                              updateOrderStatusMutation.mutate({
                                orderId: ord.id,
                                status: nextStatus,
                                cancellationReason:
                                  nextStatus === 'CANCELLED'
                                    ? 'Cancelled by Administrator'
                                    : undefined,
                              });
                            }}
                            className="rounded-xl border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-800 disabled:opacity-50"
                          >
                            {ORDER_STATUS_OPTIONS.map((st) => (
                              <option key={st} value={st}>
                                {st}
                              </option>
                            ))}
                          </select>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 6: COUPONS MANAGEMENT */}
      {activeTab === 'coupons' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              createCouponMutation.mutate();
            }}
            className="lg:col-span-4 rounded-2xl bg-white border border-slate-200 p-6 shadow-sm space-y-4 h-fit"
          >
            <h2 className="text-base font-bold text-slate-900">
              Create Promo Coupon
            </h2>

            <div>
              <label
                htmlFor="coupon-code-input"
                className="block text-xs font-semibold text-slate-700 mb-1"
              >
                Coupon Code *
              </label>
              <input
                id="coupon-code-input"
                type="text"
                required
                value={newCouponCode}
                onChange={(e) => setNewCouponCode(e.target.value.toUpperCase())}
                placeholder="MONSOON20"
                className="input-field !text-xs font-mono uppercase"
              />
            </div>

            <div>
              <label
                htmlFor="coupon-type-select"
                className="block text-xs font-semibold text-slate-700 mb-1"
              >
                Discount Type *
              </label>
              <select
                id="coupon-type-select"
                value={newCouponType}
                onChange={(e) =>
                  setNewCouponType(e.target.value as DiscountType)
                }
                className="input-field !text-xs"
              >
                <option value="PERCENTAGE">Percentage (%)</option>
                <option value="FIXED_PAISE">Flat Discount (₹ INR)</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label
                  htmlFor="coupon-val-input"
                  className="block text-xs font-semibold text-slate-700 mb-1"
                >
                  {newCouponType === 'PERCENTAGE'
                    ? 'Percentage (%)'
                    : 'Flat Amount (₹)'}
                </label>
                <input
                  id="coupon-val-input"
                  type="number"
                  min="1"
                  required
                  value={newCouponValue}
                  onChange={(e) => setNewCouponValue(e.target.value)}
                  className="input-field !text-xs"
                />
              </div>

              <div>
                <label
                  htmlFor="coupon-min-input"
                  className="block text-xs font-semibold text-slate-700 mb-1"
                >
                  Min Cart (₹ INR)
                </label>
                <input
                  id="coupon-min-input"
                  type="number"
                  min="0"
                  value={newCouponMinOrderRupees}
                  onChange={(e) => setNewCouponMinOrderRupees(e.target.value)}
                  className="input-field !text-xs"
                />
              </div>
            </div>

            {newCouponType === 'PERCENTAGE' && (
              <div>
                <label
                  htmlFor="coupon-max-input"
                  className="block text-xs font-semibold text-slate-700 mb-1"
                >
                  Max Discount Cap (₹ INR)
                </label>
                <input
                  id="coupon-max-input"
                  type="number"
                  min="0"
                  value={newCouponMaxDiscountRupees}
                  onChange={(e) =>
                    setNewCouponMaxDiscountRupees(e.target.value)
                  }
                  className="input-field !text-xs"
                />
              </div>
            )}

            <div>
              <label
                htmlFor="coupon-limit-input"
                className="block text-xs font-semibold text-slate-700 mb-1"
              >
                Total Usage Limit
              </label>
              <input
                id="coupon-limit-input"
                type="number"
                min="1"
                value={newCouponUsageLimit}
                onChange={(e) => setNewCouponUsageLimit(e.target.value)}
                className="input-field !text-xs"
              />
            </div>

            <div>
              <label
                htmlFor="coupon-desc-input"
                className="block text-xs font-semibold text-slate-700 mb-1"
              >
                Description
              </label>
              <input
                id="coupon-desc-input"
                type="text"
                value={newCouponDesc}
                onChange={(e) => setNewCouponDesc(e.target.value)}
                placeholder="20% off on orders above ₹999"
                className="input-field !text-xs"
              />
            </div>

            <button
              type="submit"
              disabled={createCouponMutation.isPending}
              className="btn-primary w-full !py-2.5 !text-xs"
            >
              {createCouponMutation.isPending
                ? 'Creating Coupon...'
                : 'Create Coupon'}
            </button>
          </form>

          <div className="lg:col-span-8 rounded-2xl bg-white border border-slate-200 overflow-hidden shadow-sm">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase">
                  <th className="py-3 px-4">Code & Description</th>
                  <th className="py-3 px-4">Discount Rule</th>
                  <th className="py-3 px-4">Usage</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {(couponsQuery.data || []).map((c) => (
                  <tr key={c.id}>
                    <td className="py-3 px-4">
                      <span className="font-mono font-extrabold text-brand-700">
                        {c.code}
                      </span>
                      {c.description && (
                        <p className="text-slate-500 mt-0.5">{c.description}</p>
                      )}
                    </td>
                    <td className="py-3 px-4 text-slate-700">
                      {c.discountType === 'PERCENTAGE'
                        ? `${c.discountValue}% off`
                        : `${formatPaiseToINR(c.discountValue, {
                            trimZeroPaise: true,
                          })} flat off`}
                      <p className="text-slate-500 text-[11px]">
                        Min Order:{' '}
                        {formatPaiseToINR(c.minOrderPaise, {
                          trimZeroPaise: true,
                        })}
                      </p>
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-700">
                      {c.usedCount} / {c.usageLimit ?? '∞'}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
                          c.isActive
                            ? 'bg-emerald-50 text-emerald-800'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {c.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right space-x-2">
                      <button
                        type="button"
                        onClick={() =>
                          toggleCouponMutation.mutate({
                            id: c.id,
                            isActive: !c.isActive,
                          })
                        }
                        className="rounded-lg border border-slate-200 px-2.5 py-1 font-semibold text-slate-700"
                      >
                        {c.isActive ? 'Disable' : 'Enable'}
                      </button>
                      <button
                        type="button"
                        aria-label={`Delete coupon ${c.code}`}
                        onClick={() => deleteCouponMutation.mutate(c.id)}
                        className="rounded-lg border border-rose-200 px-2 py-1 text-rose-600 hover:bg-rose-50"
                      >
                        <Trash2 className="h-3.5 w-3.5 inline" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 7: REVIEW MODERATION */}
      {activeTab === 'reviews' && (
        <div className="space-y-6">
          <div className="flex flex-wrap gap-2">
            {(
              [
                { value: '', label: 'All Reviews' },
                { value: 'PENDING', label: 'Pending Moderation' },
                { value: 'APPROVED', label: 'Approved' },
                { value: 'REJECTED', label: 'Rejected' },
              ] as const
            ).map((pill) => (
              <button
                key={pill.label}
                type="button"
                onClick={() => setReviewStatusFilter(pill.value)}
                className={`rounded-full px-3.5 py-1 text-xs font-semibold ${
                  reviewStatusFilter === pill.value
                    ? 'bg-brand-600 text-white'
                    : 'bg-white border border-slate-200 text-slate-700'
                }`}
              >
                {pill.label}
              </button>
            ))}
          </div>

          <div className="rounded-2xl bg-white border border-slate-200 overflow-hidden shadow-sm">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase">
                  <th className="py-3 px-4">Product & Customer</th>
                  <th className="py-3 px-4">Rating & Review</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Moderation Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {(reviewsQuery.data?.reviews || []).map((rev) => (
                  <tr key={rev.id}>
                    <td className="py-3 px-4">
                      <p className="font-bold text-slate-900">
                        {rev.product.name}
                      </p>
                      <p className="text-slate-500">
                        By {rev.user.fullName} ({rev.user.email})
                      </p>
                      {rev.isVerifiedPurchase && (
                        <span className="inline-block mt-1 rounded bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                          ✓ Verified Purchase
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 max-w-md">
                      <div className="flex items-center gap-1 text-amber-500 font-bold">
                        <Star className="h-3.5 w-3.5 fill-amber-400" />
                        <span>{rev.rating} / 5</span>
                        {rev.title && (
                          <span className="text-slate-900 ml-1">
                            — {rev.title}
                          </span>
                        )}
                      </div>
                      {rev.comment && (
                        <p className="text-slate-600 mt-1">{rev.comment}</p>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
                          rev.status === 'APPROVED'
                            ? 'bg-emerald-50 text-emerald-800'
                            : rev.status === 'REJECTED'
                              ? 'bg-rose-50 text-rose-800'
                              : 'bg-amber-50 text-amber-800'
                        }`}
                      >
                        {rev.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right space-x-2">
                      {rev.status !== 'APPROVED' && (
                        <button
                          type="button"
                          onClick={() =>
                            moderateReviewMutation.mutate({
                              reviewId: rev.id,
                              status: 'APPROVED',
                              adminNotes: 'Approved by Admin',
                            })
                          }
                          className="rounded-lg bg-emerald-600 text-white px-3 py-1 font-semibold hover:bg-emerald-700"
                        >
                          Approve
                        </button>
                      )}
                      {rev.status !== 'REJECTED' && (
                        <button
                          type="button"
                          onClick={() =>
                            moderateReviewMutation.mutate({
                              reviewId: rev.id,
                              status: 'REJECTED',
                              adminNotes: 'Rejected by Admin',
                            })
                          }
                          className="rounded-lg bg-rose-600 text-white px-3 py-1 font-semibold hover:bg-rose-700"
                        >
                          Reject
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
