import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  MapPin,
  CreditCard,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Package,
  RefreshCw,
} from 'lucide-react';
import { ordersApi } from '../api/orders.api';
import { paymentsApi } from '../api/payments.api';
import { getApiErrorMessage } from '../api/client';
import { formatPaiseToINR } from '../utils/currency';

export const OrderDetailsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();

  const {
    data: order,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ['orders', 'detail', id],
    queryFn: () => ordersApi.getOrderById(id!),
    enabled: Boolean(id),
  });

  const [cancelReason, setCancelReason] = useState(
    'Ordered by mistake / Changed mind'
  );
  const [showCancelBox, setShowCancelBox] = useState(false);
  const [feedback, setFeedback] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  const cancelMutation = useMutation({
    mutationFn: () => ordersApi.cancelOrder(id!, cancelReason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders', 'detail', id] });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      setShowCancelBox(false);
      setFeedback({
        type: 'success',
        message:
          'Order cancelled and reserved stock has been restored to inventory.',
      });
    },
    onError: (err) => {
      setFeedback({
        type: 'error',
        message: getApiErrorMessage(err),
      });
    },
  });

  const retryPaymentMutation = useMutation({
    mutationFn: async () => {
      if (!order) return;
      await paymentsApi.verifyMockPayment({
        orderId: order.id,
        outcome: 'SUCCESS',
        method: 'UPI',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders', 'detail', id] });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      setFeedback({
        type: 'success',
        message: 'Payment captured and verified! Order status is now CONFIRMED.',
      });
    },
    onError: (err) => {
      setFeedback({
        type: 'error',
        message: getApiErrorMessage(err),
      });
    },
  });

  if (isLoading) {
    return (
      <div
        className="max-w-5xl mx-auto px-4 py-12 animate-pulse space-y-6"
        aria-busy="true"
      >
        <div className="h-6 w-40 bg-slate-200 rounded" />
        <div className="h-48 bg-slate-200 rounded-2xl" />
        <div className="h-64 bg-slate-200 rounded-2xl" />
      </div>
    );
  }

  if (isError || !order) {
    return (
      <div className="max-w-xl mx-auto px-4 py-16 text-center space-y-4">
        <AlertCircle className="h-10 w-10 text-rose-600 mx-auto" />
        <h1 className="text-2xl font-bold text-slate-900">Order Not Found</h1>
        <p className="text-xs text-slate-500">
          This order does not exist or belongs to another customer account.
        </p>
        <Link to="/orders" className="btn-primary">
          Back to My Orders
        </Link>
      </div>
    );
  }

  const canCancel = ['PENDING', 'CONFIRMED', 'PROCESSING'].includes(
    order.status
  );
  const canRetryPayment =
    order.status === 'PENDING' && order.paymentStatus !== 'PAID';

  const latestPayment =
    order.payments && order.payments.length > 0 ? order.payments[0] : null;

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <Link
            to="/orders"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand-600 hover:underline mb-2"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            All Orders
          </Link>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl sm:text-3xl font-bold font-mono text-slate-900">
              {order.orderNumber}
            </h1>
            <span className="rounded-full bg-brand-50 border border-brand-200 px-3 py-0.5 text-xs font-bold text-brand-700">
              Status: {order.status}
            </span>
            <span className="rounded-full bg-slate-100 border border-slate-200 px-3 py-0.5 text-xs font-bold text-slate-800">
              Payment: {order.paymentStatus}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Placed on{' '}
            {new Date(order.createdAt).toLocaleString('en-IN', {
              dateStyle: 'medium',
              timeStyle: 'short',
            })}
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          {canRetryPayment && (
            <button
              type="button"
              disabled={retryPaymentMutation.isPending}
              onClick={() => retryPaymentMutation.mutate()}
              className="btn-primary !py-2 !px-4 !text-xs"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Complete Payment Now
            </button>
          )}

          {canCancel && !showCancelBox && (
            <button
              type="button"
              onClick={() => setShowCancelBox(true)}
              className="btn-secondary !py-2 !px-4 !text-xs text-rose-600 hover:!bg-rose-50 hover:!border-rose-200"
            >
              <XCircle className="h-3.5 w-3.5" />
              Cancel Order
            </button>
          )}
        </div>
      </div>

      {feedback && (
        <div
          role="status"
          className={`rounded-2xl border p-4 text-xs sm:text-sm flex items-center gap-3 ${
            feedback.type === 'error'
              ? 'bg-rose-50 border-rose-200 text-rose-800'
              : 'bg-emerald-50 border-emerald-200 text-emerald-900'
          }`}
        >
          {feedback.type === 'error' ? (
            <AlertCircle className="h-5 w-5 text-rose-600 shrink-0" />
          ) : (
            <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
          )}
          <span>{feedback.message}</span>
        </div>
      )}

      {/* Cancel Order Confirmation Box */}
      {showCancelBox && (
        <div className="rounded-2xl bg-rose-50/70 border border-rose-200 p-5 space-y-3">
          <h2 className="text-sm font-bold text-rose-900">
            Cancel Order {order.orderNumber}?
          </h2>
          <p className="text-xs text-rose-700">
            Cancelling will immediately release reserved inventory back to
            stock. If payment was captured, it will be marked for refund.
          </p>
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              type="text"
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              placeholder="Reason for cancellation"
              className="input-field !py-2 !text-xs bg-white"
            />
            <button
              type="button"
              disabled={cancelMutation.isPending}
              onClick={() => cancelMutation.mutate()}
              className="rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-semibold px-4 py-2 text-xs shrink-0"
            >
              {cancelMutation.isPending
                ? 'Cancelling...'
                : 'Confirm Cancellation'}
            </button>
            <button
              type="button"
              onClick={() => setShowCancelBox(false)}
              className="btn-secondary !py-2 !px-4 !text-xs shrink-0"
            >
              Keep Order
            </button>
          </div>
        </div>
      )}

      {order.cancellationReason && (
        <div className="rounded-2xl bg-rose-50 border border-rose-200 p-4 text-xs text-rose-800">
          <strong>Cancellation Reason:</strong> {order.cancellationReason}
        </div>
      )}

      {/* Order Items Table */}
      <section className="rounded-2xl bg-white border border-slate-200 overflow-hidden shadow-sm">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center gap-2">
          <Package className="h-4 w-4 text-brand-600" />
          <h2 className="text-sm font-bold text-slate-900">
            Ordered Items (Immutable Price Snapshot)
          </h2>
        </div>

        <div className="divide-y divide-slate-200">
          {order.items.map((item) => (
            <div
              key={item.id}
              className="px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs sm:text-sm"
            >
              <div className="space-y-0.5">
                <Link
                  to={`/products/${item.productId}`}
                  className="font-bold text-slate-900 hover:text-brand-600"
                >
                  {item.productNameSnapshot}
                </Link>
                <p className="text-xs font-mono text-slate-500">
                  SKU: {item.productSkuSnapshot} • Unit Price:{' '}
                  {formatPaiseToINR(item.unitPricePaise, {
                    trimZeroPaise: true,
                  })}
                </p>
              </div>

              <div className="flex items-center gap-6 justify-between sm:justify-end">
                <span className="text-xs font-semibold text-slate-600">
                  Qty: {item.quantity}
                </span>
                <span className="font-extrabold text-slate-900">
                  {formatPaiseToINR(item.lineTotalPaise, {
                    trimZeroPaise: true,
                  })}
                </span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Shipping Snapshot + Payment & GST Invoice Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <section className="rounded-2xl bg-white border border-slate-200 p-6 shadow-sm space-y-4">
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-brand-600" />
            <h2 className="text-sm font-bold text-slate-900">
              Shipping Address Snapshot
            </h2>
          </div>

          <div className="text-xs text-slate-600 space-y-1 leading-relaxed">
            <p className="font-bold text-slate-900 text-sm">
              {order.shippingRecipientName}
            </p>
            <p>{order.shippingLine1}</p>
            {order.shippingLine2 && <p>{order.shippingLine2}</p>}
            {order.shippingLandmark && (
              <p className="text-slate-500">
                Landmark: {order.shippingLandmark}
              </p>
            )}
            <p>
              {order.shippingCity}, {order.shippingState} —{' '}
              <strong className="font-mono text-slate-900">
                {order.shippingPostalCode}
              </strong>
            </p>
            <p className="pt-1">Phone: +91 {order.shippingPhone}</p>
          </div>

          {latestPayment && (
            <div className="pt-4 border-t border-slate-100 space-y-1.5 text-xs">
              <div className="flex items-center gap-2 font-bold text-slate-900">
                <CreditCard className="h-4 w-4 text-brand-600" />
                <span>Payment Transaction</span>
              </div>
              <p className="text-slate-600">
                Adapter: <strong>{latestPayment.provider}</strong> • Status:{' '}
                <strong>{latestPayment.status}</strong>
              </p>
              {latestPayment.providerPaymentId && (
                <p className="font-mono text-[11px] text-slate-500">
                  Txn ID: {latestPayment.providerPaymentId}
                </p>
              )}
            </div>
          )}
        </section>

        <section className="rounded-2xl bg-white border border-slate-200 p-6 shadow-sm space-y-4">
          <h2 className="text-sm font-bold text-slate-900">
            GST Tax Invoice Summary
          </h2>

          <dl className="space-y-2.5 text-xs sm:text-sm">
            <div className="flex justify-between text-slate-600">
              <dt>Items Subtotal</dt>
              <dd className="font-semibold text-slate-900">
                {formatPaiseToINR(order.subtotalPaise, { trimZeroPaise: true })}
              </dd>
            </div>

            {order.discountPaise > 0 && (
              <div className="flex justify-between text-emerald-700">
                <dt>
                  Coupon Discount{' '}
                  {order.couponCodeSnapshot
                    ? `(${order.couponCodeSnapshot})`
                    : ''}
                </dt>
                <dd className="font-semibold">
                  −{' '}
                  {formatPaiseToINR(order.discountPaise, {
                    trimZeroPaise: true,
                  })}
                </dd>
              </div>
            )}

            <div className="flex justify-between text-slate-600">
              <dt>18% GST</dt>
              <dd className="font-semibold text-slate-900">
                {formatPaiseToINR(order.taxPaise)}
              </dd>
            </div>

            <div className="flex justify-between text-slate-600">
              <dt>Delivery Charges</dt>
              <dd className="font-semibold text-slate-900">
                {order.shippingPaise === 0
                  ? 'FREE'
                  : formatPaiseToINR(order.shippingPaise, {
                      trimZeroPaise: true,
                    })}
              </dd>
            </div>

            <div className="border-t border-slate-200 pt-3 flex justify-between items-baseline text-base font-extrabold text-slate-900">
              <dt>Grand Total (INR)</dt>
              <dd>{formatPaiseToINR(order.totalPaise)}</dd>
            </div>
          </dl>
        </section>
      </div>
    </div>
  );
};
