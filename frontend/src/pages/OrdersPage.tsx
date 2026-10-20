import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Package, ArrowRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { ordersApi } from '../api/orders.api';
import { formatPaiseToINR } from '../utils/currency';
import { OrderStatus } from '../types';

const STATUS_BADGE_MAP: Record<
  OrderStatus,
  { label: string; className: string }
> = {
  PENDING: {
    label: 'Pending Payment',
    className: 'bg-amber-50 text-amber-800 border-amber-200',
  },
  CONFIRMED: {
    label: 'Confirmed',
    className: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  },
  PROCESSING: {
    label: 'Processing',
    className: 'bg-blue-50 text-blue-800 border-blue-200',
  },
  SHIPPED: {
    label: 'Shipped',
    className: 'bg-indigo-50 text-indigo-800 border-indigo-200',
  },
  DELIVERED: {
    label: 'Delivered',
    className: 'bg-emerald-100 text-emerald-900 border-emerald-300',
  },
  CANCELLED: {
    label: 'Cancelled',
    className: 'bg-rose-50 text-rose-800 border-rose-200',
  },
};

export const OrdersPage: React.FC = () => {
  const { user, isLoading: isUserLoading } = useAuth();
  const [statusFilter, setStatusFilter] = useState<OrderStatus | ''>('');

  const { data, isLoading: isOrdersLoading } = useQuery({
    queryKey: ['orders', statusFilter],
    queryFn: () =>
      ordersApi.listMyOrders({
        page: 1,
        limit: 20,
        status: statusFilter || undefined,
      }),
    enabled: Boolean(user),
  });

  if (isUserLoading || (user && isOrdersLoading)) {
    return (
      <div
        className="max-w-6xl mx-auto px-4 py-12 animate-pulse space-y-6"
        aria-busy="true"
      >
        <div className="h-8 w-56 bg-slate-200 rounded" />
        <div className="space-y-4">
          <div className="h-36 bg-slate-200 rounded-2xl" />
          <div className="h-36 bg-slate-200 rounded-2xl" />
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="max-w-xl mx-auto px-4 py-16 text-center space-y-4">
        <h1 className="text-2xl font-bold text-slate-900">
          Sign in to view your orders
        </h1>
        <Link to="/login" className="btn-primary">
          Sign In
        </Link>
      </div>
    );
  }

  const orders = data?.orders || [];

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">
            My Orders
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 mt-1">
            Track your ShopSphere orders, GST invoices, and payment status
          </p>
        </div>

        {/* Status Filter Pills */}
        <div className="flex flex-wrap gap-1.5">
          {(
            [
              { value: '', label: 'All' },
              { value: 'CONFIRMED', label: 'Confirmed' },
              { value: 'PENDING', label: 'Pending' },
              { value: 'SHIPPED', label: 'Shipped' },
              { value: 'DELIVERED', label: 'Delivered' },
              { value: 'CANCELLED', label: 'Cancelled' },
            ] as const
          ).map((tab) => (
            <button
              key={tab.label}
              type="button"
              onClick={() => setStatusFilter(tab.value)}
              className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
                statusFilter === tab.value
                  ? 'bg-brand-600 text-white'
                  : 'bg-white border border-slate-200 text-slate-600 hover:border-brand-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {orders.length === 0 ? (
        <div className="rounded-2xl bg-white border border-slate-200 p-12 text-center space-y-4">
          <div className="mx-auto h-12 w-12 rounded-2xl bg-slate-100 text-slate-500 flex items-center justify-center">
            <Package className="h-6 w-6" />
          </div>
          <h2 className="text-lg font-bold text-slate-900">No orders found</h2>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            {statusFilter
              ? `You have no orders matching the "${statusFilter}" filter.`
              : 'You have not placed any orders yet.'}
          </p>
          <div className="pt-2">
            <Link to="/products" className="btn-primary">
              Start Shopping
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => {
            const badge = STATUS_BADGE_MAP[order.status] || {
              label: order.status,
              className: 'bg-slate-100 text-slate-800 border-slate-200',
            };

            return (
              <article
                key={order.id}
                className="rounded-2xl bg-white border border-slate-200 p-5 shadow-sm hover:border-brand-300 transition-colors space-y-4"
              >
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm font-bold text-slate-900">
                        {order.orderNumber}
                      </span>
                      <span
                        className={`rounded-full border px-2.5 py-0.5 text-[11px] font-bold ${badge.className}`}
                      >
                        {badge.label}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500">
                      Placed on{' '}
                      {new Date(order.createdAt).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}{' '}
                      • Delivering to {order.shippingCity},{' '}
                      {order.shippingState} ({order.shippingPostalCode})
                    </p>
                  </div>

                  <div className="text-right">
                    <p className="text-base font-extrabold text-slate-900">
                      {formatPaiseToINR(order.totalPaise)}
                    </p>
                    <p className="text-[11px] text-slate-500">
                      Payment: <strong>{order.paymentStatus}</strong>
                    </p>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex flex-wrap gap-2">
                    {order.items.map((item) => (
                      <span
                        key={item.id}
                        className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-800"
                      >
                        {item.quantity} × {item.productNameSnapshot}
                      </span>
                    ))}
                  </div>

                  <Link
                    to={`/orders/${order.id}`}
                    className="btn-secondary !py-2 !px-4 !text-xs self-start sm:self-auto shrink-0"
                  >
                    View Order & Invoice
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
};
