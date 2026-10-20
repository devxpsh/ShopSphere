import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  ShoppingBag,
  Trash2,
  Plus,
  Minus,
  Tag,
  Truck,
  ArrowRight,
  ShieldCheck,
  AlertCircle,
  CheckCircle2,
  X,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import {
  useCart,
  useUpdateCartItem,
  useRemoveCartItem,
  useClearCart,
  useApplyCoupon,
  useRemoveCoupon,
} from '../hooks/useCart';
import { couponsApi } from '../api/coupons.api';
import { getApiErrorMessage } from '../api/client';
import { formatPaiseToINR } from '../utils/currency';

const FALLBACK_IMAGE =
  'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=800&q=80';

export const CartPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, isLoading: isUserLoading } = useAuth();
  const { data: cart, isLoading: isCartLoading } = useCart();

  const updateItemMutation = useUpdateCartItem();
  const removeItemMutation = useRemoveCartItem();
  const clearCartMutation = useClearCart();
  const applyCouponMutation = useApplyCoupon();
  const removeCouponMutation = useRemoveCoupon();

  const { data: activeCoupons = [] } = useQuery({
    queryKey: ['coupons', 'active'],
    queryFn: () => couponsApi.listActiveCoupons(),
  });

  const [couponInput, setCouponInput] = useState('');
  const [couponMessage, setCouponMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  if (isUserLoading || (user && isCartLoading)) {
    return (
      <div
        className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 animate-pulse space-y-6"
        aria-busy="true"
      >
        <div className="h-8 w-56 bg-slate-200 rounded" />
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-8 space-y-4">
            <div className="h-32 bg-slate-200 rounded-2xl" />
            <div className="h-32 bg-slate-200 rounded-2xl" />
          </div>
          <div className="lg:col-span-4 h-80 bg-slate-200 rounded-2xl" />
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center space-y-5">
        <div className="mx-auto h-14 w-14 rounded-2xl bg-brand-100 text-brand-700 flex items-center justify-center">
          <ShoppingBag className="h-7 w-7" />
        </div>
        <h1 className="text-2xl font-bold text-slate-900">
          Sign in to access your persistent cart
        </h1>
        <p className="text-sm text-slate-600 max-w-md mx-auto">
          Your ShopSphere cart is stored securely in PostgreSQL with real-time
          stock validation and server-side coupon calculation.
        </p>
        <div className="flex justify-center gap-3 pt-2">
          <Link to="/login" className="btn-primary">
            Sign In to Continue
          </Link>
          <Link to="/products" className="btn-secondary">
            Browse Products
          </Link>
        </div>
      </div>
    );
  }

  if (!cart || cart.items.length === 0) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center space-y-5">
        <div className="mx-auto h-14 w-14 rounded-2xl bg-slate-200 text-slate-600 flex items-center justify-center">
          <ShoppingBag className="h-7 w-7" />
        </div>
        <h1 className="text-2xl font-bold text-slate-900">Your cart is empty</h1>
        <p className="text-sm text-slate-600 max-w-md mx-auto">
          Explore our Indian catalog of Electronics, Fashion, Books, Fitness,
          and Home & Kitchen essentials.
        </p>
        <div className="pt-2">
          <Link to="/products" className="btn-primary">
            Explore Catalog
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    );
  }

  const { summary } = cart;
  const remainingForFreeShippingPaise = summary.amountForFreeShippingPaise;
  const freeShippingProgress = Math.min(
    100,
    Math.round(
      (summary.subtotalPaise /
        Math.max(1, summary.freeShippingThresholdPaise)) *
        100
    )
  );

  const handleApplyCoupon = async (codeToApply: string) => {
    const cleanCode = codeToApply.trim().toUpperCase();
    if (!cleanCode) return;

    setCouponMessage(null);
    try {
      await applyCouponMutation.mutateAsync(cleanCode);
      setCouponInput('');
      setCouponMessage({
        type: 'success',
        text: `Coupon ${cleanCode} applied on server!`,
      });
    } catch (error) {
      setCouponMessage({
        type: 'error',
        text: getApiErrorMessage(error),
      });
    }
  };

  const handleRemoveCoupon = async () => {
    setCouponMessage(null);
    try {
      await removeCouponMutation.mutateAsync();
      setCouponMessage({
        type: 'success',
        text: 'Coupon removed from cart.',
      });
    } catch (error) {
      setCouponMessage({
        type: 'error',
        text: getApiErrorMessage(error),
      });
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">
            Shopping Cart
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 mt-1">
            {summary.totalQuantity}{' '}
            {summary.totalQuantity === 1 ? 'item' : 'items'} in your cart • All
            prices verified server-side in integer paise
          </p>
        </div>

        <button
          type="button"
          disabled={clearCartMutation.isPending}
          onClick={() => clearCartMutation.mutate()}
          className="btn-secondary !py-2 !px-3.5 !text-xs text-rose-600 hover:!bg-rose-50 hover:!border-rose-200 self-start sm:self-auto"
        >
          <Trash2 className="h-3.5 w-3.5" />
          Clear Cart
        </button>
      </div>

      {/* Free Delivery Progress Banner */}
      <div className="rounded-2xl bg-white border border-slate-200 p-4 shadow-sm space-y-2">
        <div className="flex items-center justify-between text-xs font-semibold">
          <span className="inline-flex items-center gap-2 text-slate-800">
            <Truck className="h-4 w-4 text-brand-600" />
            {remainingForFreeShippingPaise === 0 ? (
              <span className="text-emerald-700">
                Your order qualifies for FREE Pan-India Delivery!
              </span>
            ) : (
              <span>
                Add{' '}
                <strong>
                  {formatPaiseToINR(remainingForFreeShippingPaise, {
                    trimZeroPaise: true,
                  })}
                </strong>{' '}
                more for FREE Delivery (otherwise flat ₹49)
              </span>
            )}
          </span>
          <span className="text-slate-500">{freeShippingProgress}%</span>
        </div>
        <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
          <div
            className="h-full bg-emerald-500 transition-all duration-300"
            style={{ width: `${freeShippingProgress}%` }}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left: Cart Items List */}
        <div className="lg:col-span-8 space-y-4">
          {cart.items.map((item) => {
            const { product } = item;
            const maxQty = Math.min(10, Math.max(1, product.stockQuantity));
            const lineSavingsPaise = Math.max(
              0,
              item.lineMrpTotalPaise - item.lineSubtotalPaise
            );

            return (
              <article
                key={item.id}
                className="rounded-2xl bg-white border border-slate-200 p-4 sm:p-5 shadow-sm flex flex-col sm:flex-row gap-4 justify-between"
              >
                <div className="flex gap-4">
                  <Link
                    to={`/products/${encodeURIComponent(product.slug)}`}
                    className="h-24 w-24 rounded-xl bg-slate-100 border border-slate-200 overflow-hidden shrink-0"
                  >
                    <img
                      src={product.primaryImage?.url || FALLBACK_IMAGE}
                      alt={product.primaryImage?.altText || product.title}
                      width={96}
                      height={96}
                      loading="lazy"
                      className="h-full w-full object-cover"
                    />
                  </Link>

                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      {product.isDemo && (
                        <span className="badge-demo">DEMO</span>
                      )}
                      <span className="text-[11px] font-mono text-slate-400">
                        SKU: {product.sku}
                      </span>
                    </div>
                    <Link
                      to={`/products/${encodeURIComponent(product.slug)}`}
                      className="text-sm sm:text-base font-bold text-slate-900 hover:text-brand-600 line-clamp-2"
                    >
                      {product.title}
                    </Link>

                    <div className="flex items-baseline gap-2 pt-1">
                      <span className="text-sm font-bold text-slate-900">
                        {formatPaiseToINR(product.pricePaise, {
                          trimZeroPaise: true,
                        })}
                      </span>
                      {product.mrpPaise > product.pricePaise && (
                        <span className="text-xs text-slate-400 line-through">
                          {formatPaiseToINR(product.mrpPaise, {
                            trimZeroPaise: true,
                          })}
                        </span>
                      )}
                      <span className="text-xs text-slate-500">per unit</span>
                    </div>
                  </div>
                </div>

                {/* Quantity & Subtotal Controls */}
                <div className="flex sm:flex-col items-center sm:items-end justify-between gap-3 border-t sm:border-t-0 pt-3 sm:pt-0 border-slate-100">
                  <div className="text-right">
                    <p className="text-base font-extrabold text-slate-900">
                      {formatPaiseToINR(item.lineSubtotalPaise, {
                        trimZeroPaise: true,
                      })}
                    </p>
                    {lineSavingsPaise > 0 && (
                      <p className="text-[11px] font-semibold text-emerald-700">
                        You save{' '}
                        {formatPaiseToINR(lineSavingsPaise, {
                          trimZeroPaise: true,
                        })}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="inline-flex items-center rounded-xl border border-slate-300 bg-slate-50">
                      <button
                        type="button"
                        aria-label={`Decrease quantity for ${product.title}`}
                        disabled={
                          item.quantity <= 1 || updateItemMutation.isPending
                        }
                        onClick={() =>
                          updateItemMutation.mutate({
                            productId: item.productId,
                            quantity: item.quantity - 1,
                          })
                        }
                        className="p-2 text-slate-700 hover:text-brand-600 disabled:opacity-40"
                      >
                        <Minus className="h-3.5 w-3.5" />
                      </button>
                      <span className="px-3 text-xs font-bold text-slate-900">
                        {item.quantity}
                      </span>
                      <button
                        type="button"
                        aria-label={`Increase quantity for ${product.title}`}
                        disabled={
                          item.quantity >= maxQty ||
                          updateItemMutation.isPending
                        }
                        onClick={() =>
                          updateItemMutation.mutate({
                            productId: item.productId,
                            quantity: item.quantity + 1,
                          })
                        }
                        className="p-2 text-slate-700 hover:text-brand-600 disabled:opacity-40"
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </button>
                    </div>

                    <button
                      type="button"
                      aria-label={`Remove ${product.title} from cart`}
                      disabled={removeItemMutation.isPending}
                      onClick={() => removeItemMutation.mutate(item.productId)}
                      className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>

        {/* Right: Coupon & Order Summary Card */}
        <aside className="lg:col-span-4 space-y-5">
          {/* Coupon Box */}
          <div className="rounded-2xl bg-white border border-slate-200 p-5 shadow-sm space-y-4">
            <div className="flex items-center gap-2">
              <Tag className="h-4 w-4 text-brand-600" />
              <h2 className="text-sm font-bold text-slate-900">
                Apply Promo Coupon
              </h2>
            </div>

            {cart.appliedCoupon ? (
              <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-3 flex items-center justify-between gap-2">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    <span className="text-xs font-bold font-mono text-emerald-900">
                      {cart.appliedCoupon.code}
                    </span>
                  </div>
                  <p className="text-[11px] text-emerald-700">
                    Saving{' '}
                    {formatPaiseToINR(summary.discountPaise, {
                      trimZeroPaise: true,
                    })}{' '}
                    on this order
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleRemoveCoupon}
                  disabled={removeCouponMutation.isPending}
                  className="p-1.5 rounded-lg text-emerald-700 hover:bg-emerald-100"
                  aria-label="Remove coupon"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleApplyCoupon(couponInput);
                }}
                className="flex gap-2"
              >
                <input
                  type="text"
                  value={couponInput}
                  onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                  placeholder="Enter code (e.g. WELCOME10)"
                  className="input-field !py-2 !text-xs font-mono uppercase"
                />
                <button
                  type="submit"
                  disabled={
                    !couponInput.trim() || applyCouponMutation.isPending
                  }
                  className="btn-secondary !py-2 !px-3.5 !text-xs shrink-0"
                >
                  Apply
                </button>
              </form>
            )}

            {couponMessage && (
              <p
                className={`text-xs flex items-center gap-1.5 ${
                  couponMessage.type === 'error'
                    ? 'text-rose-600'
                    : 'text-emerald-700'
                }`}
              >
                <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                <span>{couponMessage.text}</span>
              </p>
            )}

            {activeCoupons.length > 0 && !cart.appliedCoupon && (
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                  Available Coupons
                </p>
                <div className="space-y-1.5">
                  {activeCoupons.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => handleApplyCoupon(c.code)}
                      className="w-full text-left rounded-xl border border-dashed border-slate-300 hover:border-brand-400 hover:bg-brand-50/40 p-2.5 transition-colors flex items-center justify-between gap-2"
                    >
                      <div>
                        <p className="text-xs font-bold font-mono text-brand-700">
                          {c.code}
                        </p>
                        <p className="text-[11px] text-slate-500 line-clamp-1">
                          {c.description ||
                            `Min order ${formatPaiseToINR(c.minOrderPaise, {
                              trimZeroPaise: true,
                            })}`}
                        </p>
                      </div>
                      <span className="text-[11px] font-semibold text-brand-600 shrink-0">
                        Tap to apply
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Price Breakdown Summary */}
          <div className="rounded-2xl bg-white border border-slate-200 p-5 shadow-sm space-y-4">
            <h2 className="text-base font-bold text-slate-900">
              Order Summary (INR)
            </h2>

            <dl className="space-y-2.5 text-xs sm:text-sm">
              <div className="flex justify-between text-slate-600">
                <dt>Items Subtotal ({summary.totalQuantity} units)</dt>
                <dd className="font-semibold text-slate-900">
                  {formatPaiseToINR(summary.subtotalPaise, {
                    trimZeroPaise: true,
                  })}
                </dd>
              </div>

              {summary.discountPaise > 0 && (
                <div className="flex justify-between text-emerald-700">
                  <dt>Coupon Discount ({cart.appliedCoupon?.code})</dt>
                  <dd className="font-semibold">
                    −{' '}
                    {formatPaiseToINR(summary.discountPaise, {
                      trimZeroPaise: true,
                    })}
                  </dd>
                </div>
              )}

              <div className="flex justify-between text-slate-600">
                <dt>Estimated GST (18%)</dt>
                <dd className="font-semibold text-slate-900">
                  {formatPaiseToINR(summary.taxPaise)}
                </dd>
              </div>

              <div className="flex justify-between text-slate-600">
                <dt>Delivery Charges</dt>
                <dd className="font-semibold text-slate-900">
                  {summary.shippingPaise === 0 ? (
                    <span className="text-emerald-700 font-bold">FREE</span>
                  ) : (
                    formatPaiseToINR(summary.shippingPaise, {
                      trimZeroPaise: true,
                    })
                  )}
                </dd>
              </div>

              <div className="border-t border-slate-200 pt-3 flex justify-between items-baseline text-base font-extrabold text-slate-900">
                <dt>Total Payable</dt>
                <dd>{formatPaiseToINR(summary.totalPaise)}</dd>
              </div>
            </dl>

            <button
              type="button"
              onClick={() => navigate('/checkout')}
              className="btn-primary w-full !py-3 !text-sm"
            >
              Proceed to Checkout
              <ArrowRight className="h-4 w-4" />
            </button>

            <div className="flex items-center gap-2 text-[11px] text-slate-500 pt-1">
              <ShieldCheck className="h-4 w-4 text-emerald-600 shrink-0" />
              <span>
                100% Server-Recalculated Checkout • ACID Inventory Protection
              </span>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
};
