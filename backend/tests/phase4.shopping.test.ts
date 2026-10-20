import crypto from 'crypto';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { app } from '../src/app';
import { prisma } from '../src/config/prisma';

describe('Phase 4 Shopping Flow — Cart, Wishlist, Addresses, Coupons, Transactional Orders, Payments & Reviews', () => {
  const suffix = Date.now().toString(36);
  const userAEmail = `shopper.a.${suffix}@example.in`;
  const userBEmail = `shopper.b.${suffix}@example.in`;

  let userAId = '';
  let userACookies: string[] = [];
  let userACsrf = '';

  let userBId = '';
  let userBCookies: string[] = [];
  let userBCsrf = '';

  let testProductId = '';
  let initialProductStock = 0;
  let productPricePaise = 0;

  let userAAddressId = '';
  let firstOrderId = '';
  let secondOrderId = '';

  beforeAll(async () => {
    // 1. Register Shopper A
    const regA = await request(app).post('/api/v1/auth/register').send({
      email: userAEmail,
      password: 'ShopperPassword123!',
      fullName: 'Rohan Kulkarni',
      phone: '9876543210',
    });
    expect(regA.status).toBe(201);
    userAId = regA.body.data.user.id;
    const rawCookiesA = regA.headers['set-cookie'];
    userACookies = Array.isArray(rawCookiesA) ? rawCookiesA : rawCookiesA ? [rawCookiesA] : [];
    userACsrf = regA.body.data.csrfToken;

    // 2. Register Shopper B (for cross-user ownership tests)
    const regB = await request(app).post('/api/v1/auth/register').send({
      email: userBEmail,
      password: 'ShopperPassword123!',
      fullName: 'Meera Iyer',
      phone: '9812345678',
    });
    expect(regB.status).toBe(201);
    userBId = regB.body.data.user.id;
    const rawCookiesB = regB.headers['set-cookie'];
    userBCookies = Array.isArray(rawCookiesB) ? rawCookiesB : rawCookiesB ? [rawCookiesB] : [];
    userBCsrf = regB.body.data.csrfToken;

    // 3. Pick an active product with healthy stock & price >= ₹1,500 so coupons can be tested
    const product = await prisma.product.findFirstOrThrow({
      where: {
        isActive: true,
        stockQuantity: { gte: 10 },
        pricePaise: { gte: 150000 },
      },
    });
    testProductId = product.id;
    initialProductStock = product.stockQuantity;
    productPricePaise = product.pricePaise;
  });

  afterAll(async () => {
    // Restore product stock and rating stats if modified, then delete test orders & users
    await prisma.inventoryLog.deleteMany({
      where: { actorUserId: { in: [userAId, userBId] } },
    });
    await prisma.review.deleteMany({
      where: { userId: { in: [userAId, userBId] } },
    });
    await prisma.order.deleteMany({
      where: { userId: { in: [userAId, userBId] } },
    });
    if (testProductId) {
      await prisma.product.update({
        where: { id: testProductId },
        data: { stockQuantity: initialProductStock },
      });
    }
    await prisma.user.deleteMany({
      where: { id: { in: [userAId, userBId] } },
    });
    await prisma.$disconnect();
  });

  describe('1. Addresses Module & Ownership Enforcement', () => {
    it('rejects an address with an invalid Indian PIN code', async () => {
      const res = await request(app)
        .post('/api/v1/addresses')
        .set('Cookie', userACookies)
        .set('X-CSRF-Token', userACsrf)
        .send({
          label: 'Home',
          recipientName: 'Rohan Kulkarni',
          phone: '9876543210',
          line1: 'Flat 302, Green Valley Apartments',
          city: 'Pune',
          state: 'Maharashtra',
          postalCode: '01234', // Invalid PIN (must be 6 digits starting 1-9)
          isDefault: true,
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('creates a valid Indian shipping address and sets it as default', async () => {
      const res = await request(app)
        .post('/api/v1/addresses')
        .set('Cookie', userACookies)
        .set('X-CSRF-Token', userACsrf)
        .send({
          label: 'Home',
          recipientName: 'Rohan Kulkarni',
          phone: '9876543210',
          line1: 'Flat 302, Green Valley Apartments, Baner Road',
          landmark: 'Near Symbiosis Ishanya',
          city: 'Pune',
          state: 'Maharashtra',
          postalCode: '411045',
          isDefault: true,
        });

      expect(res.status).toBe(201);
      expect(res.body.data.address.postalCode).toBe('411045');
      expect(res.body.data.address.isDefault).toBe(true);
      userAAddressId = res.body.data.address.id;
    });

    it('prevents Shopper B from viewing or modifying Shopper A address (Security Rule #5)', async () => {
      const getRes = await request(app)
        .get(`/api/v1/addresses/${userAAddressId}`)
        .set('Cookie', userBCookies);

      expect(getRes.status).toBe(403);

      const patchRes = await request(app)
        .patch(`/api/v1/addresses/${userAAddressId}`)
        .set('Cookie', userBCookies)
        .set('X-CSRF-Token', userBCsrf)
        .send({ city: 'Mumbai' });

      expect(patchRes.status).toBe(403);
    });
  });

  describe('2. Wishlist Module', () => {
    it('adds a product to the wishlist, lists it, and removes it', async () => {
      const addRes = await request(app)
        .post('/api/v1/wishlist')
        .set('Cookie', userACookies)
        .set('X-CSRF-Token', userACsrf)
        .send({ productId: testProductId });

      expect(addRes.status).toBe(200);
      expect(addRes.body.data.items).toHaveLength(1);
      expect(addRes.body.data.items[0].productId).toBe(testProductId);

      const listRes = await request(app)
        .get('/api/v1/wishlist')
        .set('Cookie', userACookies);

      expect(listRes.status).toBe(200);
      expect(listRes.body.data.items).toHaveLength(1);

      const delRes = await request(app)
        .delete(`/api/v1/wishlist/${testProductId}`)
        .set('Cookie', userACookies)
        .set('X-CSRF-Token', userACsrf);

      expect(delRes.status).toBe(200);
      expect(delRes.body.data.items).toHaveLength(0);
    });
  });

  describe('3. Persistent Cart & Server-Side Coupon Validation', () => {
    it('adds items to the cart and computes integer paise totals on the server', async () => {
      const res = await request(app)
        .post('/api/v1/cart/items')
        .set('Cookie', userACookies)
        .set('X-CSRF-Token', userACsrf)
        .send({
          productId: testProductId,
          quantity: 2,
        });

      expect(res.status).toBe(200);
      const cart = res.body.data.cart;
      expect(cart.items).toHaveLength(1);
      expect(cart.items[0].quantity).toBe(2);
      expect(cart.summary.subtotalPaise).toBe(productPricePaise * 2);
      expect(cart.summary.taxPaise).toBe(Math.round((productPricePaise * 2 * 18) / 100));
    });

    it('rejects adding quantity that exceeds available product stock', async () => {
      const res = await request(app)
        .patch(`/api/v1/cart/items/${testProductId}`)
        .set('Cookie', userACookies)
        .set('X-CSRF-Token', userACsrf)
        .send({
          quantity: initialProductStock + 5,
        });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('INSUFFICIENT_STOCK');
    });

    it('lists active coupons and applies WELCOME10 to the cart with server-side discount calculation', async () => {
      const listCouponsRes = await request(app).get('/api/v1/coupons/active');
      expect(listCouponsRes.status).toBe(200);
      expect(listCouponsRes.body.data.coupons.length).toBeGreaterThanOrEqual(3);

      const applyRes = await request(app)
        .post('/api/v1/cart/coupon')
        .set('Cookie', userACookies)
        .set('X-CSRF-Token', userACsrf)
        .send({ code: 'welcome10' });

      expect(applyRes.status).toBe(200);
      const cart = applyRes.body.data.cart;
      expect(cart.appliedCoupon.code).toBe('WELCOME10');
      expect(cart.summary.discountPaise).toBeGreaterThan(0);
      expect(cart.summary.discountPaise).toBeLessThanOrEqual(50000); // ₹500 cap on WELCOME10
    });
  });

  describe('4. Transactional Order Creation, Ownership & Mock Payment Flow', () => {
    it('prevents Shopper B from creating an order using Shopper A shipping address', async () => {
      // Add an item to Shopper B cart first
      await request(app)
        .post('/api/v1/cart/items')
        .set('Cookie', userBCookies)
        .set('X-CSRF-Token', userBCsrf)
        .send({ productId: testProductId, quantity: 1 });

      const orderRes = await request(app)
        .post('/api/v1/orders')
        .set('Cookie', userBCookies)
        .set('X-CSRF-Token', userBCsrf)
        .send({
          addressId: userAAddressId,
          paymentProvider: 'MOCK',
        });

      expect(orderRes.status).toBe(403);
      expect(orderRes.body.error.code).toBe('FORBIDDEN_RESOURCE');
    });

    it('creates an order transactionally for Shopper A, deducts stock, logs inventory, and clears the cart', async () => {
      const res = await request(app)
        .post('/api/v1/orders')
        .set('Cookie', userACookies)
        .set('X-CSRF-Token', userACsrf)
        .send({
          addressId: userAAddressId,
          paymentProvider: 'MOCK',
          notes: 'Please call before delivery',
        });

      expect(res.status).toBe(201);
      const order = res.body.data.order;
      firstOrderId = order.id;

      expect(order.orderNumber).toMatch(/^SS-\d{8}-[A-F0-9]{6}$/);
      expect(order.status).toBe('PENDING');
      expect(order.paymentStatus).toBe('PENDING');
      expect(order.couponCodeSnapshot).toBe('WELCOME10');
      expect(order.shippingPostalCode).toBe('411045');
      expect(order.items).toHaveLength(1);
      expect(order.items[0].quantity).toBe(2);

      // Verify stock was decremented in PostgreSQL
      const updatedProduct = await prisma.product.findUniqueOrThrow({
        where: { id: testProductId },
      });
      expect(updatedProduct.stockQuantity).toBe(initialProductStock - 2);

      // Verify InventoryLog was written
      const invLog = await prisma.inventoryLog.findFirst({
        where: { orderId: firstOrderId, productId: testProductId },
      });
      expect(invLog).not.toBeNull();
      expect(invLog?.reason).toBe('ORDER_RESERVED');
      expect(invLog?.changeQuantity).toBe(-2);

      // Verify Cart was cleared
      const cartRes = await request(app)
        .get('/api/v1/cart')
        .set('Cookie', userACookies);
      expect(cartRes.body.data.cart.items).toHaveLength(0);
    });

    it('prevents Shopper B from viewing Shopper A order details', async () => {
      const res = await request(app)
        .get(`/api/v1/orders/${firstOrderId}`)
        .set('Cookie', userBCookies);

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN_RESOURCE');
    });

    it('verifies Mock payment and transitions order to CONFIRMED and PAID', async () => {
      const res = await request(app)
        .post('/api/v1/payments/mock/verify')
        .set('Cookie', userACookies)
        .set('X-CSRF-Token', userACsrf)
        .send({
          orderId: firstOrderId,
          outcome: 'SUCCESS',
          method: 'UPI',
        });

      expect(res.status).toBe(200);
      expect(res.body.data.order.status).toBe('CONFIRMED');
      expect(res.body.data.order.paymentStatus).toBe('PAID');
      expect(res.body.data.order.payments[0].status).toBe('PAID');
    });

    it('cancels a confirmed order, restores product stock atomically, and marks payment REFUNDED', async () => {
      const cancelRes = await request(app)
        .post(`/api/v1/orders/${firstOrderId}/cancel`)
        .set('Cookie', userACookies)
        .set('X-CSRF-Token', userACsrf)
        .send({
          reason: 'Ordered wrong quantity by mistake',
        });

      expect(cancelRes.status).toBe(200);
      expect(cancelRes.body.data.order.status).toBe('CANCELLED');
      expect(cancelRes.body.data.order.paymentStatus).toBe('REFUNDED');

      // Verify stock was restored to initialProductStock
      const restoredProduct = await prisma.product.findUniqueOrThrow({
        where: { id: testProductId },
      });
      expect(restoredProduct.stockQuantity).toBe(initialProductStock);
    });
  });

  describe('5. Razorpay Test Mode — HMAC-SHA256 Signature & Webhook Verification', () => {
    it('creates a Razorpay order, rejects forged signatures, and verifies valid HMAC-SHA256 signatures & webhooks', async () => {
      // 1. Add 1 item to Shopper A cart and create a second order with RAZORPAY
      await request(app)
        .post('/api/v1/cart/items')
        .set('Cookie', userACookies)
        .set('X-CSRF-Token', userACsrf)
        .send({ productId: testProductId, quantity: 1 });

      const orderRes = await request(app)
        .post('/api/v1/orders')
        .set('Cookie', userACookies)
        .set('X-CSRF-Token', userACsrf)
        .send({
          addressId: userAAddressId,
          paymentProvider: 'RAZORPAY',
        });

      expect(orderRes.status).toBe(201);
      secondOrderId = orderRes.body.data.order.id;

      // 2. Initialize Razorpay test order
      const rzpInitRes = await request(app)
        .post('/api/v1/payments/razorpay/create-order')
        .set('Cookie', userACookies)
        .set('X-CSRF-Token', userACsrf)
        .send({ orderId: secondOrderId });

      expect(rzpInitRes.status).toBe(200);
      const { razorpayOrderId, sandboxSimulation } = rzpInitRes.body.data.razorpayOrder;
      expect(razorpayOrderId).toMatch(/^order_rzp_/);
      expect(sandboxSimulation).toBeDefined();

      // 3. Reject a forged signature (Security Rule #10)
      const forgedRes = await request(app)
        .post('/api/v1/payments/razorpay/verify')
        .set('Cookie', userACookies)
        .set('X-CSRF-Token', userACsrf)
        .send({
          orderId: secondOrderId,
          razorpayOrderId,
          razorpayPaymentId: sandboxSimulation.razorpayPaymentId,
          razorpaySignature: '0000000000000000000000000000000000000000000000000000000000000000',
        });

      expect(forgedRes.status).toBe(400);
      expect(forgedRes.body.error.code).toBe('INVALID_PAYMENT_SIGNATURE');

      // 4. Verify valid HMAC-SHA256 signature
      const validRes = await request(app)
        .post('/api/v1/payments/razorpay/verify')
        .set('Cookie', userACookies)
        .set('X-CSRF-Token', userACsrf)
        .send({
          orderId: secondOrderId,
          razorpayOrderId,
          razorpayPaymentId: sandboxSimulation.razorpayPaymentId,
          razorpaySignature: sandboxSimulation.razorpaySignature,
          method: 'UPI',
        });

      expect(validRes.status).toBe(200);
      expect(validRes.body.data.order.status).toBe('CONFIRMED');
      expect(validRes.body.data.order.paymentStatus).toBe('PAID');

      // 5. Verify Razorpay webhook signature & idempotency
      const webhookPayload = {
        event: 'payment.captured',
        payload: {
          payment: {
            entity: {
              id: sandboxSimulation.razorpayPaymentId,
              order_id: razorpayOrderId,
            },
          },
        },
      };
      const rawWebhookString = JSON.stringify(webhookPayload);
      const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET || 'rzp_test_webhook_secret_shopsphere_dev';
      const webhookSignature = crypto
        .createHmac('sha256', webhookSecret)
        .update(rawWebhookString)
        .digest('hex');

      const webhookEventId = `evt_test_${suffix}`;

      const webhookRes1 = await request(app)
        .post('/api/v1/payments/razorpay/webhook')
        .set('X-Razorpay-Signature', webhookSignature)
        .set('X-Razorpay-Event-Id', webhookEventId)
        .send(webhookPayload);

      expect(webhookRes1.status).toBe(200);
      expect(webhookRes1.body.data.processed).toBe(true);

      // Duplicate webhook with same Event ID should be idempotently skipped
      const webhookRes2 = await request(app)
        .post('/api/v1/payments/razorpay/webhook')
        .set('X-Razorpay-Signature', webhookSignature)
        .set('X-Razorpay-Event-Id', webhookEventId)
        .send(webhookPayload);

      expect(webhookRes2.status).toBe(200);
      expect(webhookRes2.body.data.processed).toBe(false);
      expect(webhookRes2.body.data.reason).toBe('already_processed');
    });
  });

  describe('6. Product Reviews & Verified Purchase Detection', () => {
    it('submits a review, detects verified purchase from order history, and updates product rating stats', async () => {
      const reviewRes = await request(app)
        .post('/api/v1/reviews')
        .set('Cookie', userACookies)
        .set('X-CSRF-Token', userACsrf)
        .send({
          productId: testProductId,
          rating: 5,
          title: 'Outstanding build quality!',
          comment: 'Delivered quickly to Pune and works exactly as described.',
        });

      expect(reviewRes.status).toBe(201);
      expect(reviewRes.body.data.review.isVerifiedPurchase).toBe(true);
      expect(reviewRes.body.data.review.orderId).toBe(secondOrderId);
      expect(reviewRes.body.data.productRatingStats.reviewCount).toBeGreaterThanOrEqual(1);

      const listRes = await request(app).get(`/api/v1/reviews/product/${testProductId}`);
      expect(listRes.status).toBe(200);
      expect(
        listRes.body.data.reviews.some((r: { id: string }) => r.id === reviewRes.body.data.review.id)
      ).toBe(true);
    });
  });
});
