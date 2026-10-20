import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  MapPin,
  CreditCard,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Plus,
  Lock,
  Sparkles,
  ArrowLeft,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../hooks/useCart';
import { addressesApi, AddressFormInput } from '../api/addresses.api';
import { ordersApi } from '../api/orders.api';
import { paymentsApi } from '../api/payments.api';
import { getApiErrorMessage } from '../api/client';
import { formatPaiseToINR } from '../utils/currency';
import { PaymentProvider } from '../types';

export const CheckoutPage: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { user, isLoading: isUserLoading } = useAuth();
  const { data: cart, isLoading: isCartLoading } = useCart();

  const { data: addresses = [], isLoading: isAddressesLoading } = useQuery({
    queryKey: ['addresses'],
    queryFn: () => addressesApi.listAddresses(),
    enabled: Boolean(user),
  });

  const [selectedAddressId, setSelectedAddressId] = useState<string>('');
  const [paymentProvider, setPaymentProvider] =
    useState<PaymentProvider>('MOCK');
  const [notes, setNotes] = useState('');
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);

  // Quick inline address creation if user has 0 saved addresses
  const [showNewAddressForm, setShowNewAddressForm] = useState(false);
  const [newAddress, setNewAddress] = useState<AddressFormInput>({
    label: 'Home',
    recipientName: '',
    phone: '',
    line1: '',
    city: 'Bengaluru',
    state: 'Karnataka',
    postalCode: '560001',
    country: 'India',
    isDefault: true,
  });

  useEffect(() => {
    if (addresses.length > 0 && !selectedAddressId) {
      const defaultAddr =
        addresses.find((a) => a.isDefault) || addresses[0];
      setSelectedAddressId(defaultAddr.id);
    }
  }, [addresses, selectedAddressId]);

  useEffect(() => {
    if (user && !newAddress.recipientName) {
      setNewAddress((prev) => ({
        ...prev,
        recipientName: user.fullName,
        phone: user.phone || '9876543210',
      }));
    }
  }, [user, newAddress.recipientName]);

  if (
    isUserLoading ||
    (user && (isCartLoading || isAddressesLoading))
  ) {
    return (
      <div
        className="max-w-7xl mx-auto px-4 py-12 animate-pulse space-y-6"
        aria-busy="true"
      >
        <div className="h-8 w-56 bg-slate-200 rounded" />
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-8 h-96 bg-slate-200 rounded-2xl" />
          <div className="lg:col-span-4 h-80 bg-slate-200 rounded-2xl" />
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="max-w-xl mx-auto px-4 py-16 text-center space-y-4">
        <h1 className="text-2xl font-bold text-slate-900">
          Please sign in to checkout
        </h1>
        <Link to="/login" className="btn-primary">
          Sign In
        </Link>
      </div>
    );
  }

  if (!cart || cart.items.length === 0) {
    return (
      <div className="max-w-xl mx-auto px-4 py-16 text-center space-y-4">
        <h1 className="text-2xl font-bold text-slate-900">
          Your cart is empty
        </h1>
        <p className="text-xs text-slate-500">
          Add items to your cart before proceeding to checkout.
        </p>
        <Link to="/products" className="btn-primary">
          Browse Products
        </Link>
      </div>
    );
  }

  const handleQuickCreateAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    setCheckoutError(null);
    try {
      const created = await addressesApi.createAddress(newAddress);
      await queryClient.invalidateQueries({ queryKey: ['addresses'] });
      setSelectedAddressId(created.id);
      setShowNewAddressForm(false);
    } catch (error) {
      setCheckoutError(getApiErrorMessage(error));
    }
  };

  const handlePlaceOrderAndPay = async () => {
    if (!selectedAddressId) {
      setCheckoutError('Please select or add a delivery address.');
      return;
    }

    setCheckoutError(null);
    setIsPlacingOrder(true);

    try {
      // Step 1: Create Transactional Order in PostgreSQL (validates & decrements stock atomically)
      const order = await ordersApi.createOrder({
        addressId: selectedAddressId,
        paymentProvider,
        notes: notes.trim() || undefined,
      });

      // Step 2: Execute Payment Verification based on chosen adapter
      if (paymentProvider === 'MOCK') {
        await paymentsApi.verifyMockPayment({
          orderId: order.id,
          outcome: 'SUCCESS',
          method: 'UPI',
        });
      } else if (paymentProvider === 'RAZORPAY') {
        const rpOrder = await paymentsApi.createRazorpayOrder(order.id);
        if (rpOrder.sandboxSimulation) {
          await paymentsApi.verifyRazorpayPayment({
            orderId: order.id,
            razorpayOrderId: rpOrder.razorpayOrderId,
            razorpayPaymentId: rpOrder.sandboxSimulation.razorpayPaymentId,
            razorpaySignature: rpOrder.sandboxSimulation.razorpaySignature,
            method: 'UPI',
          });
        }
      }

      // Invalidate cart, products (stock changed!), and orders cache
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['cart'] }),
        queryClient.invalidateQueries({ queryKey: ['products'] }),
        queryClient.invalidateQueries({ queryKey: ['orders'] }),
      ]);

      navigate(`/orders/${order.id}`);
    } catch (error) {
      setCheckoutError(getApiErrorMessage(error));
    } finally {
      setIsPlacingOrder(false);
    }
  };

  const { summary } = cart;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      <div className="flex items-center justify-between border-b border-slate-200 pb-5">
        <div>
          <Link
            to="/cart"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand-600 hover:underline mb-2"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to Cart
          </Link>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">
            Secure Checkout
          </h1>
        </div>
        <div className="hidden sm:flex items-center gap-2 rounded-full bg-emerald-50 border border-emerald-200 px-3.5 py-1.5 text-xs font-semibold text-emerald-800">
          <Lock className="h-3.5 w-3.5 text-emerald-600" />
          256-Bit CSRF & ACID Protected
        </div>
      </div>

      {checkoutError && (
        <div
          role="alert"
          className="rounded-2xl bg-rose-50 border border-rose-200 p-4 text-xs sm:text-sm text-rose-800 flex items-center gap-3"
        >
          <AlertCircle className="h-5 w-5 text-rose-600 shrink-0" />
          <span>{checkoutError}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left: Step 1 (Address) & Step 2 (Payment Method) */}
        <div className="lg:col-span-8 space-y-6">
          {/* Step 1: Shipping Address */}
          <section className="rounded-2xl bg-white border border-slate-200 p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className="h-6 w-6 rounded-full bg-brand-600 text-white text-xs font-bold flex items-center justify-center">
                  1
                </span>
                <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-brand-600" />
                  Select Indian Delivery Address
                </h2>
              </div>

              <button
                type="button"
                onClick={() => setShowNewAddressForm(!showNewAddressForm)}
                className="text-xs font-semibold text-brand-600 hover:underline inline-flex items-center gap-1"
              >
                <Plus className="h-3.5 w-3.5" />
                {showNewAddressForm ? 'Hide Form' : 'New Address'}
              </button>
            </div>

            {showNewAddressForm || addresses.length === 0 ? (
              <form
                onSubmit={handleQuickCreateAddress}
                className="rounded-xl bg-slate-50 border border-slate-200 p-4 space-y-3"
              >
                <p className="text-xs font-bold text-slate-800">
                  Add Delivery Address
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label
                      htmlFor="chk-name"
                      className="block text-[11px] font-semibold text-slate-600 mb-1"
                    >
                      Full Name *
                    </label>
                    <input
                      id="chk-name"
                      type="text"
                      autoComplete="name"
                      required
                      value={newAddress.recipientName}
                      onChange={(e) =>
                        setNewAddress({
                          ...newAddress,
                          recipientName: e.target.value,
                        })
                      }
                      className="input-field !py-1.5 !text-xs"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="chk-phone"
                      className="block text-[11px] font-semibold text-slate-600 mb-1"
                    >
                      10-Digit Mobile *
                    </label>
                    <input
                      id="chk-phone"
                      type="tel"
                      inputMode="numeric"
                      autoComplete="tel"
                      required
                      maxLength={10}
                      value={newAddress.phone}
                      onChange={(e) =>
                        setNewAddress({
                          ...newAddress,
                          phone: e.target.value.replace(/\D/g, ''),
                        })
                      }
                      className="input-field !py-1.5 !text-xs"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label
                      htmlFor="chk-line1"
                      className="block text-[11px] font-semibold text-slate-600 mb-1"
                    >
                      Street Address / Flat / Building *
                    </label>
                    <input
                      id="chk-line1"
                      type="text"
                      autoComplete="address-line1"
                      required
                      value={newAddress.line1}
                      onChange={(e) =>
                        setNewAddress({
                          ...newAddress,
                          line1: e.target.value,
                        })
                      }
                      placeholder="Flat 402, Indiranagar 100ft Road"
                      className="input-field !py-1.5 !text-xs"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="chk-city"
                      className="block text-[11px] font-semibold text-slate-600 mb-1"
                    >
                      City *
                    </label>
                    <input
                      id="chk-city"
                      type="text"
                      autoComplete="address-level2"
                      required
                      value={newAddress.city}
                      onChange={(e) =>
                        setNewAddress({ ...newAddress, city: e.target.value })
                      }
                      className="input-field !py-1.5 !text-xs"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="chk-pin"
                      className="block text-[11px] font-semibold text-slate-600 mb-1"
                    >
                      6-Digit PIN Code *
                    </label>
                    <input
                      id="chk-pin"
                      type="text"
                      inputMode="numeric"
                      autoComplete="postal-code"
                      required
                      maxLength={6}
                      value={newAddress.postalCode}
                      onChange={(e) =>
                        setNewAddress({
                          ...newAddress,
                          postalCode: e.target.value.replace(/\D/g, ''),
                        })
                      }
                      className="input-field !py-1.5 !text-xs font-mono"
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <button
                    type="submit"
                    className="btn-primary !py-1.5 !px-4 !text-xs"
                  >
                    Use This Address
                  </button>
                </div>
              </form>
            ) : null}

            {addresses.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {addresses.map((addr) => {
                  const isSelected = addr.id === selectedAddressId;
                  return (
                    <label
                      key={addr.id}
                      className={`cursor-pointer rounded-xl border p-4 transition-all flex items-start gap-3 ${
                        isSelected
                          ? 'border-brand-600 bg-brand-50/40 ring-2 ring-brand-600/20'
                          : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <input
                        type="radio"
                        name="deliveryAddress"
                        checked={isSelected}
                        onChange={() => setSelectedAddressId(addr.id)}
                        className="mt-1 text-brand-600 focus:ring-brand-500"
                      />
                      <div className="text-xs space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900">
                            {addr.recipientName}
                          </span>
                          <span className="rounded bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-700">
                            {addr.label || 'Address'}
                          </span>
                        </div>
                        <p className="text-slate-600">
                          {addr.line1}, {addr.city}, {addr.state} —{' '}
                          <strong className="font-mono">
                            {addr.postalCode}
                          </strong>
                        </p>
                        <p className="text-slate-500">Mobile: +91 {addr.phone}</p>
                      </div>
                    </label>
                  );
                })}
              </div>
            )}
          </section>

          {/* Step 2: Payment Adapter Selection */}
          <section className="rounded-2xl bg-white border border-slate-200 p-6 shadow-sm space-y-4">
            <div className="flex items-center gap-2.5">
              <span className="h-6 w-6 rounded-full bg-brand-600 text-white text-xs font-bold flex items-center justify-center">
                2
              </span>
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-brand-600" />
                Choose Payment Gateway
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <label
                className={`cursor-pointer rounded-xl border p-4 transition-all flex items-start gap-3 ${
                  paymentProvider === 'MOCK'
                    ? 'border-brand-600 bg-brand-50/40 ring-2 ring-brand-600/20'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <input
                  type="radio"
                  name="paymentProvider"
                  checked={paymentProvider === 'MOCK'}
                  onChange={() => setPaymentProvider('MOCK')}
                  className="mt-1 text-brand-600 focus:ring-brand-500"
                />
                <div className="space-y-1 text-xs">
                  <div className="flex items-center gap-1.5 font-bold text-slate-900">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    Instant Mock Payment Adapter
                  </div>
                  <p className="text-slate-600 leading-relaxed">
                    Simulates instant UPI / Card payment capture in development
                    without external gateway keys.
                  </p>
                </div>
              </label>

              <label
                className={`cursor-pointer rounded-xl border p-4 transition-all flex items-start gap-3 ${
                  paymentProvider === 'RAZORPAY'
                    ? 'border-brand-600 bg-brand-50/40 ring-2 ring-brand-600/20'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <input
                  type="radio"
                  name="paymentProvider"
                  checked={paymentProvider === 'RAZORPAY'}
                  onChange={() => setPaymentProvider('RAZORPAY')}
                  className="mt-1 text-brand-600 focus:ring-brand-500"
                />
                <div className="space-y-1 text-xs">
                  <div className="flex items-center gap-1.5 font-bold text-slate-900">
                    <Sparkles className="h-4 w-4 text-brand-600" />
                    Razorpay Test Mode (HMAC-SHA256)
                  </div>
                  <p className="text-slate-600 leading-relaxed">
                    Creates a Razorpay order & verifies cryptographic{' '}
                    <code>HMAC-SHA256</code> signature on the backend.
                  </p>
                </div>
              </label>
            </div>

            <div className="pt-2">
              <label
                htmlFor="order-notes"
                className="block text-xs font-semibold text-slate-700 mb-1"
              >
                Delivery Instructions (Optional)
              </label>
              <input
                id="order-notes"
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. Leave package with security guard at main gate"
                className="input-field !py-2 !text-xs"
              />
            </div>
          </section>
        </div>

        {/* Right: Final Order Invoice Summary */}
        <aside className="lg:col-span-4 space-y-5">
          <div className="rounded-2xl bg-white border border-slate-200 p-6 shadow-sm space-y-5">
            <h2 className="text-base font-bold text-slate-900">
              Order Review ({summary.totalQuantity} items)
            </h2>

            <div className="max-h-56 overflow-y-auto divide-y divide-slate-100 pr-1">
              {cart.items.map((item) => (
                <div
                  key={item.id}
                  className="py-2.5 flex items-center justify-between gap-3 text-xs"
                >
                  <div className="min-w-0">
                    <p className="font-semibold text-slate-900 truncate">
                      {item.product.title}
                    </p>
                    <p className="text-slate-500">
                      Qty: {item.quantity} ×{' '}
                      {formatPaiseToINR(item.product.pricePaise, {
                        trimZeroPaise: true,
                      })}
                    </p>
                  </div>
                  <span className="font-bold text-slate-900 shrink-0">
                    {formatPaiseToINR(item.lineSubtotalPaise, {
                      trimZeroPaise: true,
                    })}
                  </span>
                </div>
              ))}
            </div>

            <dl className="space-y-2 text-xs sm:text-sm border-t border-slate-200 pt-4">
              <div className="flex justify-between text-slate-600">
                <dt>Subtotal</dt>
                <dd className="font-semibold text-slate-900">
                  {formatPaiseToINR(summary.subtotalPaise, {
                    trimZeroPaise: true,
                  })}
                </dd>
              </div>

              {summary.discountPaise > 0 && (
                <div className="flex justify-between text-emerald-700">
                  <dt>Coupon ({cart.appliedCoupon?.code})</dt>
                  <dd className="font-semibold">
                    −{' '}
                    {formatPaiseToINR(summary.discountPaise, {
                      trimZeroPaise: true,
                    })}
                  </dd>
                </div>
              )}

              <div className="flex justify-between text-slate-600">
                <dt>18% GST</dt>
                <dd className="font-semibold text-slate-900">
                  {formatPaiseToINR(summary.taxPaise)}
                </dd>
              </div>

              <div className="flex justify-between text-slate-600">
                <dt>Shipping</dt>
                <dd className="font-semibold text-slate-900">
                  {summary.shippingPaise === 0
                    ? 'FREE'
                    : formatPaiseToINR(summary.shippingPaise, {
                        trimZeroPaise: true,
                      })}
                </dd>
              </div>

              <div className="border-t border-slate-200 pt-3 flex justify-between items-baseline text-base font-extrabold text-slate-900">
                <dt>Total Payable</dt>
                <dd>{formatPaiseToINR(summary.totalPaise)}</dd>
              </div>
            </dl>

            <button
              type="button"
              disabled={isPlacingOrder || !selectedAddressId}
              onClick={handlePlaceOrderAndPay}
              className="btn-primary w-full !py-3.5 !text-sm"
            >
              {isPlacingOrder
                ? 'Locking Stock & Verifying Payment...'
                : `Place Order & Pay ${formatPaiseToINR(
                    summary.totalPaise,
                    { trimZeroPaise: true }
                  )}`}
            </button>

            <div className="flex items-start gap-2 text-[11px] text-slate-500">
              <ShieldCheck className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
              <span>
                Stock is atomically reserved inside a PostgreSQL transaction to
                prevent overselling.
              </span>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
};
