import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from '../context/AuthContext';
import { CartPage } from '../pages/CartPage';
import { WishlistPage } from '../pages/WishlistPage';
import { AddressesPage } from '../pages/AddressesPage';
import { CheckoutPage } from '../pages/CheckoutPage';
import { OrdersPage } from '../pages/OrdersPage';
import { OrderDetailsPage } from '../pages/OrderDetailsPage';
import { ProfilePage } from '../pages/ProfilePage';
import { authApi } from '../api/auth.api';
import { cartApi } from '../api/cart.api';
import { wishlistApi } from '../api/wishlist.api';
import { addressesApi } from '../api/addresses.api';
import { couponsApi } from '../api/coupons.api';
import { ordersApi } from '../api/orders.api';
import { paymentsApi } from '../api/payments.api';
import type {
  User,
  Cart,
  WishlistItem,
  Address,
  Order,
} from '../types';

const routerFutureFlags = {
  v7_startTransition: true,
  v7_relativeSplatPath: true,
};

const mockUser: User = {
  id: 'user-111',
  email: 'customer@shopsphere.in',
  fullName: 'Aarav Sharma',
  phone: '9876543210',
  role: 'CUSTOMER',
  isActive: true,
  createdAt: new Date().toISOString(),
};

const mockCart: Cart = {
  id: 'cart-111',
  userId: 'user-111',
  appliedCoupon: {
    id: 'coupon-1',
    code: 'WELCOME10',
    description: '10% off up to ₹300',
    discountType: 'PERCENTAGE',
    discountValue: 10,
    minOrderPaise: 99900,
    maxDiscountPaise: 30000,
  },
  items: [
    {
      id: 'item-1',
      productId: 'prod-1',
      quantity: 2,
      lineSubtotalPaise: 699800,
      lineMrpTotalPaise: 1199800,
      product: {
        id: 'prod-1',
        sku: 'DEMO-ELEC-001',
        title: '[DEMO] Indicsonic Pro ANC Wireless Headphones',
        slug: 'demo-indicsonic-pro-anc-wireless-headphones',
        brand: 'Indicsonic',
        pricePaise: 349900,
        mrpPaise: 599900,
        stockQuantity: 40,
        isActive: true,
        isDemo: true,
        category: {
          id: 'cat-1',
          name: 'Electronics',
          slug: 'electronics',
        },
        primaryImage: {
          url: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=800&q=80',
          altText: 'Indicsonic Headphones',
        },
      },
    },
  ],
  summary: {
    itemCount: 1,
    totalQuantity: 2,
    subtotalPaise: 699800,
    mrpTotalPaise: 1199800,
    productSavingsPaise: 500000,
    discountPaise: 30000,
    taxPaise: 120564,
    shippingPaise: 0,
    totalPaise: 790364,
    freeShippingThresholdPaise: 49900,
    amountForFreeShippingPaise: 0,
  },
};

const mockAddresses: Address[] = [
  {
    id: 'addr-1',
    userId: 'user-111',
    label: 'Home',
    recipientName: 'Aarav Sharma',
    phone: '9876543210',
    line1: 'Flat 402, Prestige Shantiniketan, Whitefield',
    line2: 'Hoodi Circle',
    landmark: 'Near Forum Mall',
    city: 'Bengaluru',
    state: 'Karnataka',
    postalCode: '560048',
    country: 'India',
    isDefault: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

const mockOrder: Order = {
  id: 'ord-111',
  orderNumber: 'ORD-20261020-1234',
  userId: 'user-111',
  status: 'CONFIRMED',
  paymentStatus: 'PAID',
  subtotalPaise: 699800,
  discountPaise: 30000,
  taxPaise: 120564,
  shippingPaise: 0,
  totalPaise: 790364,
  currency: 'INR',
  couponId: 'coupon-1',
  couponCodeSnapshot: 'WELCOME10',
  shippingRecipientName: 'Aarav Sharma',
  shippingPhone: '9876543210',
  shippingLine1: 'Flat 402, Prestige Shantiniketan, Whitefield',
  shippingLine2: 'Hoodi Circle',
  shippingLandmark: 'Near Forum Mall',
  shippingCity: 'Bengaluru',
  shippingState: 'Karnataka',
  shippingPostalCode: '560048',
  shippingCountry: 'India',
  notes: 'Leave at security gate',
  cancellationReason: null,
  cancelledAt: null,
  deliveredAt: null,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  items: [
    {
      id: 'oi-1',
      orderId: 'ord-111',
      productId: 'prod-1',
      productNameSnapshot: '[DEMO] Indicsonic Pro ANC Wireless Headphones',
      productSkuSnapshot: 'DEMO-ELEC-001',
      productImageSnapshot: null,
      unitPricePaise: 349900,
      unitMrpPaise: 599900,
      quantity: 2,
      lineTotalPaise: 699800,
      createdAt: new Date().toISOString(),
    },
  ],
  payments: [
    {
      id: 'pay-1',
      orderId: 'ord-111',
      provider: 'MOCK',
      status: 'PAID',
      amountPaise: 790364,
      currency: 'INR',
      providerOrderId: 'mock_order_1',
      providerPaymentId: 'mock_pay_1',
      method: 'UPI',
      failureReason: null,
      paidAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    },
  ],
};

function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });
}

describe('Phase 4 Frontend — Shopping Flow Pages', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(authApi, 'getMe').mockResolvedValue(mockUser);
    vi.spyOn(cartApi, 'getCart').mockResolvedValue(mockCart);
    vi.spyOn(couponsApi, 'listActiveCoupons').mockResolvedValue([]);
    vi.spyOn(addressesApi, 'listAddresses').mockResolvedValue(mockAddresses);
    vi.spyOn(ordersApi, 'listMyOrders').mockResolvedValue({
      orders: [mockOrder],
      pagination: {
        page: 1,
        limit: 20,
        totalItems: 1,
        totalPages: 1,
        hasPrevPage: false,
        hasNextPage: false,
      },
    });
    vi.spyOn(ordersApi, 'getOrderById').mockResolvedValue(mockOrder);
  });

  it('renders CartPage with persistent cart items, applied coupon badge, and 18% GST INR breakdown', async () => {
    const queryClient = createTestQueryClient();

    render(
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <MemoryRouter future={routerFutureFlags}>
            <CartPage />
          </MemoryRouter>
        </AuthProvider>
      </QueryClientProvider>
    );

    expect(
      await screen.findByText('[DEMO] Indicsonic Pro ANC Wireless Headphones')
    ).toBeInTheDocument();
    expect(screen.getByText('WELCOME10')).toBeInTheDocument();
    expect(screen.getByText('₹7,903.64')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /Proceed to Checkout/i })
    ).toBeInTheDocument();
  });

  it('renders WishlistPage and allows moving saved items to cart', async () => {
    const mockWishlistItems: WishlistItem[] = [
      {
        id: 'wish-1',
        userId: 'user-111',
        productId: 'prod-1',
        createdAt: new Date().toISOString(),
        product: {
          id: 'prod-1',
          sku: 'DEMO-ELEC-001',
          name: '[DEMO] Indicsonic Pro ANC Wireless Headphones',
          slug: 'demo-indicsonic-pro-anc-wireless-headphones',
          brand: 'Indicsonic',
          pricePaise: 349900,
          mrpPaise: 599900,
          stockQuantity: 40,
          isActive: true,
          averageRating: 4.5,
          reviewCount: 4,
          category: {
            id: 'cat-1',
            name: 'Electronics',
            slug: 'electronics',
          },
          images: [],
        },
      },
    ];

    vi.spyOn(wishlistApi, 'getWishlist').mockResolvedValue(mockWishlistItems);
    const addItemSpy = vi
      .spyOn(cartApi, 'addItem')
      .mockResolvedValue(mockCart);
    const removeWishSpy = vi
      .spyOn(wishlistApi, 'removeFromWishlist')
      .mockResolvedValue([]);

    const queryClient = createTestQueryClient();

    render(
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <MemoryRouter future={routerFutureFlags}>
            <WishlistPage />
          </MemoryRouter>
        </AuthProvider>
      </QueryClientProvider>
    );

    expect(
      await screen.findByText('[DEMO] Indicsonic Pro ANC Wireless Headphones')
    ).toBeInTheDocument();

    const moveBtn = screen.getByRole('button', { name: /Move to Cart/i });
    fireEvent.click(moveBtn);

    await waitFor(() => {
      expect(addItemSpy).toHaveBeenCalledWith('prod-1', 1);
      expect(removeWishSpy).toHaveBeenCalledWith('prod-1');
    });
  });

  it('renders AddressesPage with Indian PIN code and default address badge', async () => {
    const queryClient = createTestQueryClient();

    render(
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <MemoryRouter future={routerFutureFlags}>
            <AddressesPage />
          </MemoryRouter>
        </AuthProvider>
      </QueryClientProvider>
    );

    expect(
      await screen.findByText('Saved Delivery Addresses')
    ).toBeInTheDocument();
    expect(screen.getByText('560048')).toBeInTheDocument();
    expect(screen.getByText('Default')).toBeInTheDocument();
  });

  it('renders CheckoutPage, places a transactional order, and verifies Mock payment', async () => {
    const createOrderSpy = vi
      .spyOn(ordersApi, 'createOrder')
      .mockResolvedValue(mockOrder);
    const verifyMockSpy = vi
      .spyOn(paymentsApi, 'verifyMockPayment')
      .mockResolvedValue(mockOrder);

    const queryClient = createTestQueryClient();

    render(
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <MemoryRouter
            initialEntries={['/checkout']}
            future={routerFutureFlags}
          >
            <Routes>
              <Route path="/checkout" element={<CheckoutPage />} />
              <Route path="/orders/:id" element={<OrderDetailsPage />} />
            </Routes>
          </MemoryRouter>
        </AuthProvider>
      </QueryClientProvider>
    );

    const placeOrderBtn = await screen.findByRole('button', {
      name: /Place Order & Pay/i,
    });
    fireEvent.click(placeOrderBtn);

    await waitFor(() => {
      expect(createOrderSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          addressId: 'addr-1',
          paymentProvider: 'MOCK',
        })
      );
      expect(verifyMockSpy).toHaveBeenCalledWith({
        orderId: 'ord-111',
        outcome: 'SUCCESS',
        method: 'UPI',
      });
    });
  });

  it('renders OrdersPage and OrderDetailsPage with immutable price snapshot and GST summary', async () => {
    const queryClient = createTestQueryClient();

    render(
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <MemoryRouter
            initialEntries={['/orders/ord-111']}
            future={routerFutureFlags}
          >
            <Routes>
              <Route path="/orders" element={<OrdersPage />} />
              <Route path="/orders/:id" element={<OrderDetailsPage />} />
            </Routes>
          </MemoryRouter>
        </AuthProvider>
      </QueryClientProvider>
    );

    expect(
      await screen.findByText('ORD-20261020-1234')
    ).toBeInTheDocument();
    expect(
      screen.getByText('GST Tax Invoice Summary')
    ).toBeInTheDocument();
    expect(screen.getByText('₹7,903.64')).toBeInTheDocument();
  });

  it('renders ProfilePage with customer details and quick links to Orders, Addresses, and Wishlist', async () => {
    const queryClient = createTestQueryClient();

    render(
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <MemoryRouter future={routerFutureFlags}>
            <ProfilePage />
          </MemoryRouter>
        </AuthProvider>
      </QueryClientProvider>
    );

    expect(await screen.findByText('My Account')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Aarav Sharma')).toBeInTheDocument();
    expect(screen.getByText('Saved Addresses')).toBeInTheDocument();
  });
});
