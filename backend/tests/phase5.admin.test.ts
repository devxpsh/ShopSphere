import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { app } from '../src/app';
import { prisma } from '../src/config/prisma';
import { recalculateProductRatingStats } from '../src/modules/reviews/review.service';

describe('Phase 5 Administration — RBAC, Real-Data Analytics, Order Lifecycle, Inventory Logs, Coupons & Review Moderation', () => {
  const suffix = Date.now().toString(36).toUpperCase();
  const customerEmail = `customer.p5.${suffix.toLowerCase()}@example.in`;
  const testCouponCode = `ADMINP5_${suffix}`;

  let adminCookies: string[] = [];
  let adminCsrf = '';

  let customerId = '';
  let customerCookies: string[] = [];
  let customerCsrf = '';

  let testProductId = '';
  let initialStock = 0;
  let customerAddressId = '';
  let orderToDeliverId = '';
  let orderToCancelId = '';
  let createdCouponId = '';
  let customerReviewId = '';

  beforeAll(async () => {
    // 1. Login as seeded Demo Admin
    const adminLogin = await request(app).post('/api/v1/auth/login').send({
      email: 'admin@shopsphere.in',
      password: 'AdminPassword123!',
    });
    expect(adminLogin.status).toBe(200);
    const rawAdminCookies = adminLogin.headers['set-cookie'];
    adminCookies = Array.isArray(rawAdminCookies)
      ? rawAdminCookies
      : rawAdminCookies
        ? [rawAdminCookies]
        : [];
    adminCsrf = adminLogin.body.data.csrfToken;

    // 2. Register a regular CUSTOMER user
    const regCust = await request(app).post('/api/v1/auth/register').send({
      email: customerEmail,
      password: 'CustomerPassword123!',
      fullName: 'Vikramaditya Rao',
      phone: '9876501234',
    });
    expect(regCust.status).toBe(201);
    customerId = regCust.body.data.user.id;
    const rawCustCookies = regCust.headers['set-cookie'];
    customerCookies = Array.isArray(rawCustCookies)
      ? rawCustCookies
      : rawCustCookies
        ? [rawCustCookies]
        : [];
    customerCsrf = regCust.body.data.csrfToken;

    // 3. Pick a product with sufficient stock
    const product = await prisma.product.findFirstOrThrow({
      where: {
        isActive: true,
        stockQuantity: { gte: 10 },
      },
    });
    testProductId = product.id;
    initialStock = product.stockQuantity;

    // 4. Create address & two orders for the customer so Admin can manage them
    const addrRes = await request(app)
      .post('/api/v1/addresses')
      .set('Cookie', customerCookies)
      .set('X-CSRF-Token', customerCsrf)
      .send({
        label: 'Home',
        recipientName: 'Vikramaditya Rao',
        phone: '9876501234',
        line1: '12, MG Road',
        city: 'Bengaluru',
        state: 'Karnataka',
        postalCode: '560001',
        country: 'IN',
        isDefault: true,
      });
    expect(addrRes.status).toBe(201);
    customerAddressId = addrRes.body.data.address.id;

    // Order 1 (to be progressed to DELIVERED by Admin)
    await request(app)
      .post('/api/v1/cart/items')
      .set('Cookie', customerCookies)
      .set('X-CSRF-Token', customerCsrf)
      .send({ productId: testProductId, quantity: 1 });

    const ord1Res = await request(app)
      .post('/api/v1/orders')
      .set('Cookie', customerCookies)
      .set('X-CSRF-Token', customerCsrf)
      .send({ addressId: customerAddressId, paymentProvider: 'MOCK' });
    expect(ord1Res.status).toBe(201);
    orderToDeliverId = ord1Res.body.data.order.id;

    await request(app)
      .post('/api/v1/payments/mock/verify')
      .set('Cookie', customerCookies)
      .set('X-CSRF-Token', customerCsrf)
      .send({ orderId: orderToDeliverId, outcome: 'SUCCESS', method: 'UPI' });

    // Order 2 (to be CANCELLED by Admin, verifying stock restoration)
    await request(app)
      .post('/api/v1/cart/items')
      .set('Cookie', customerCookies)
      .set('X-CSRF-Token', customerCsrf)
      .send({ productId: testProductId, quantity: 2 });

    const ord2Res = await request(app)
      .post('/api/v1/orders')
      .set('Cookie', customerCookies)
      .set('X-CSRF-Token', customerCsrf)
      .send({ addressId: customerAddressId, paymentProvider: 'MOCK' });
    expect(ord2Res.status).toBe(201);
    orderToCancelId = ord2Res.body.data.order.id;

    // Submit a customer review to test Admin review moderation
    const revRes = await request(app)
      .post('/api/v1/reviews')
      .set('Cookie', customerCookies)
      .set('X-CSRF-Token', customerCsrf)
      .send({
        productId: testProductId,
        rating: 5,
        title: 'Great Indian build quality',
        comment: 'Works reliably and arrived well packaged.',
      });
    expect(revRes.status).toBe(201);
    customerReviewId = revRes.body.data.review.id;
  });

  afterAll(async () => {
    if (createdCouponId) {
      await prisma.coupon.deleteMany({ where: { id: createdCouponId } });
    }
    await prisma.inventoryLog.deleteMany({
      where: {
        OR: [
          { actorUserId: customerId },
          { orderId: { in: [orderToDeliverId, orderToCancelId].filter(Boolean) } },
        ],
      },
    });
    await prisma.review.deleteMany({ where: { userId: customerId } });
    await prisma.order.deleteMany({ where: { userId: customerId } });
    if (testProductId) {
      await prisma.product.update({
        where: { id: testProductId },
        data: { stockQuantity: initialStock },
      });
      await recalculateProductRatingStats(testProductId);
    }
    if (customerId) {
      await prisma.user.deleteMany({ where: { id: customerId } });
    }
    await prisma.$disconnect();
  });

  it('blocks non-admin CUSTOMER users from accessing any /api/v1/admin endpoint (403 FORBIDDEN)', async () => {
    const res = await request(app)
      .get('/api/v1/admin/analytics')
      .set('Cookie', customerCookies);

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });

  it('returns real database-derived analytics for ADMIN (GET /api/v1/admin/analytics)', async () => {
    const res = await request(app)
      .get('/api/v1/admin/analytics')
      .set('Cookie', adminCookies);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const { analytics } = res.body.data;
    expect(analytics.kpis.totalRevenuePaise).toBeGreaterThan(0);
    expect(analytics.kpis.totalOrders).toBeGreaterThanOrEqual(2);
    expect(analytics.kpis.totalProducts).toBeGreaterThanOrEqual(20);
    expect(Array.isArray(analytics.ordersByStatus)).toBe(true);
    expect(analytics.ordersByStatus.length).toBe(6);
    expect(Array.isArray(analytics.revenueByCategory)).toBe(true);
    expect(Array.isArray(analytics.revenueTimeSeries)).toBe(true);
    expect(analytics.revenueTimeSeries.length).toBe(14);
    expect(Array.isArray(analytics.topSellingProducts)).toBe(true);
  });

  it('allows ADMIN to list all customer orders and progress order status to DELIVERED', async () => {
    const listRes = await request(app)
      .get('/api/v1/admin/orders?limit=10')
      .set('Cookie', adminCookies);

    expect(listRes.status).toBe(200);
    expect(listRes.body.data.orders.length).toBeGreaterThanOrEqual(2);

    const shipRes = await request(app)
      .patch(`/api/v1/admin/orders/${orderToDeliverId}/status`)
      .set('Cookie', adminCookies)
      .set('X-CSRF-Token', adminCsrf)
      .send({ status: 'SHIPPED' });

    expect(shipRes.status).toBe(200);
    expect(shipRes.body.data.order.status).toBe('SHIPPED');

    const deliverRes = await request(app)
      .patch(`/api/v1/admin/orders/${orderToDeliverId}/status`)
      .set('Cookie', adminCookies)
      .set('X-CSRF-Token', adminCsrf)
      .send({ status: 'DELIVERED' });

    expect(deliverRes.status).toBe(200);
    expect(deliverRes.body.data.order.status).toBe('DELIVERED');
    expect(deliverRes.body.data.order.deliveredAt).toBeTruthy();
  });

  it('restores reserved product stock atomically and writes InventoryLog when ADMIN cancels an order', async () => {
    const beforeCancelProduct = await prisma.product.findUniqueOrThrow({
      where: { id: testProductId },
    });

    const cancelRes = await request(app)
      .patch(`/api/v1/admin/orders/${orderToCancelId}/status`)
      .set('Cookie', adminCookies)
      .set('X-CSRF-Token', adminCsrf)
      .send({
        status: 'CANCELLED',
        cancellationReason: 'Address unreachable — cancelled by Admin',
      });

    expect(cancelRes.status).toBe(200);
    expect(cancelRes.body.data.order.status).toBe('CANCELLED');
    expect(cancelRes.body.data.order.cancellationReason).toContain(
      'Address unreachable'
    );

    const afterCancelProduct = await prisma.product.findUniqueOrThrow({
      where: { id: testProductId },
    });
    expect(afterCancelProduct.stockQuantity).toBe(
      beforeCancelProduct.stockQuantity + 2
    );
  });

  it('returns paginated InventoryLog audit records for ADMIN (GET /api/v1/admin/inventory-logs)', async () => {
    const logsRes = await request(app)
      .get(`/api/v1/admin/inventory-logs?productId=${testProductId}`)
      .set('Cookie', adminCookies);

    expect(logsRes.status).toBe(200);
    expect(Array.isArray(logsRes.body.data.logs)).toBe(true);
    expect(logsRes.body.data.logs.length).toBeGreaterThanOrEqual(2);
    expect(logsRes.body.data.logs[0].product.id).toBe(testProductId);
  });

  it('allows ADMIN to create, update, list, and delete promotional coupons', async () => {
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

    const createRes = await request(app)
      .post('/api/v1/admin/coupons')
      .set('Cookie', adminCookies)
      .set('X-CSRF-Token', adminCsrf)
      .send({
        code: testCouponCode,
        description: 'Phase 5 Admin Test Coupon — ₹250 flat off',
        discountType: 'FIXED_PAISE',
        discountValue: 25000,
        minOrderPaise: 99900,
        usageLimit: 50,
        perUserLimit: 1,
        expiresAt,
        isActive: true,
      });

    expect(createRes.status).toBe(201);
    createdCouponId = createRes.body.data.coupon.id;
    expect(createRes.body.data.coupon.code).toBe(testCouponCode);

    const updateRes = await request(app)
      .patch(`/api/v1/admin/coupons/${createdCouponId}`)
      .set('Cookie', adminCookies)
      .set('X-CSRF-Token', adminCsrf)
      .send({
        isActive: false,
        description: 'Updated description',
      });

    expect(updateRes.status).toBe(200);
    expect(updateRes.body.data.coupon.isActive).toBe(false);

    const listRes = await request(app)
      .get('/api/v1/admin/coupons')
      .set('Cookie', adminCookies);
    expect(listRes.status).toBe(200);
    expect(
      listRes.body.data.coupons.some((c: { id: string }) => c.id === createdCouponId)
    ).toBe(true);

    const deleteRes = await request(app)
      .delete(`/api/v1/admin/coupons/${createdCouponId}`)
      .set('Cookie', adminCookies)
      .set('X-CSRF-Token', adminCsrf);

    expect(deleteRes.status).toBe(200);
    expect(deleteRes.body.data.action).toBe('DELETED');
    createdCouponId = '';
  });

  it('allows ADMIN to moderate customer reviews and recalculates product rating stats', async () => {
    const listRes = await request(app)
      .get(`/api/v1/admin/reviews?productId=${testProductId}`)
      .set('Cookie', adminCookies);

    expect(listRes.status).toBe(200);
    expect(
      listRes.body.data.reviews.some((r: { id: string }) => r.id === customerReviewId)
    ).toBe(true);

    const rejectRes = await request(app)
      .patch(`/api/v1/admin/reviews/${customerReviewId}/moderate`)
      .set('Cookie', adminCookies)
      .set('X-CSRF-Token', adminCsrf)
      .send({
        status: 'REJECTED',
        adminNotes: 'Rejected during moderation test',
      });

    expect(rejectRes.status).toBe(200);
    expect(rejectRes.body.data.review.status).toBe('REJECTED');

    const approveRes = await request(app)
      .patch(`/api/v1/admin/reviews/${customerReviewId}/moderate`)
      .set('Cookie', adminCookies)
      .set('X-CSRF-Token', adminCsrf)
      .send({
        status: 'APPROVED',
        adminNotes: 'Verified and re-approved by Admin',
      });

    expect(approveRes.status).toBe(200);
    expect(approveRes.body.data.review.status).toBe('APPROVED');
    expect(approveRes.body.data.productRatingStats.reviewCount).toBeGreaterThanOrEqual(1);
  });
});
