import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { app } from '../src/app';
import { prisma } from '../src/config/prisma';

describe('Phase 6 Security Hardening, Concurrency, IDOR Isolation & OpenAPI Docs', () => {
  const suffix = Date.now().toString(36).toUpperCase();
  const userAEmail = `sec.usera.${suffix.toLowerCase()}@example.in`;
  const userBEmail = `sec.userb.${suffix.toLowerCase()}@example.in`;

  let userAId = '';
  let userACookies: string[] = [];
  let userACsrf = '';
  let userAAddressId = '';
  let userAOrderId = '';

  let userBId = '';
  let userBCookies: string[] = [];
  let userBCsrf = '';
  let userBAddressId = '';

  let raceProductId = '';
  let raceCategoryId = '';

  beforeAll(async () => {
    // Pick an existing active category to create a dedicated concurrency test product
    const category = await prisma.category.findFirstOrThrow({
      where: { isActive: true },
    });
    raceCategoryId = category.id;

    // Create a dedicated test product with stockQuantity = 2 (1 for price tampering test, 1 left for race test)
    const product = await prisma.product.create({
      data: {
        categoryId: raceCategoryId,
        name: `Phase 6 Concurrency Test Item ${suffix}`,
        slug: `phase-6-concurrency-item-${suffix.toLowerCase()}`,
        sku: `P6-RACE-${suffix}`,
        description: 'Dedicated product for testing atomic stock reservation and price tampering resistance.',
        pricePaise: 250000, // ₹2,500.00
        mrpPaise: 300000,
        stockQuantity: 2,
        isActive: true,
        images: {
          create: [
            {
              url: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=800&q=80',
              altText: 'Security Test Product',
              displayOrder: 0,
              isPrimary: true,
            },
          ],
        },
      },
    });
    raceProductId = product.id;
  });

  afterAll(async () => {
    // Clean up test orders, addresses, users, and the dedicated test product
    const userIds = [userAId, userBId].filter(Boolean);
    if (userIds.length > 0) {
      await prisma.payment.deleteMany({
        where: { order: { userId: { in: userIds } } },
      });
      await prisma.orderItem.deleteMany({
        where: { order: { userId: { in: userIds } } },
      });
      await prisma.inventoryLog.deleteMany({
        where: { productId: raceProductId },
      });
      await prisma.order.deleteMany({
        where: { userId: { in: userIds } },
      });
      await prisma.cartItem.deleteMany({
        where: { cart: { userId: { in: userIds } } },
      });
      await prisma.cart.deleteMany({
        where: { userId: { in: userIds } },
      });
      await prisma.address.deleteMany({
        where: { userId: { in: userIds } },
      });
      await prisma.user.deleteMany({
        where: { id: { in: userIds } },
      });
    }
    if (raceProductId) {
      await prisma.product.deleteMany({
        where: { id: raceProductId },
      });
    }
  });

  it('serves valid OpenAPI 3.0.3 JSON specification and interactive Swagger UI HTML', async () => {
    const jsonRes = await request(app).get('/api/v1/docs.json');
    expect(jsonRes.status).toBe(200);
    expect(jsonRes.body.openapi).toBe('3.0.3');
    expect(jsonRes.body.info.title).toContain('ShopSphere');
    expect(jsonRes.body.paths['/orders']).toBeDefined();
    expect(jsonRes.body.paths['/admin/analytics']).toBeDefined();
    expect(jsonRes.body.components.securitySchemes.cookieAuth).toBeDefined();
    expect(jsonRes.body.components.securitySchemes.csrfTokenHeader).toBeDefined();

    const subJsonRes = await request(app).get('/api/v1/docs/openapi.json');
    expect(subJsonRes.status).toBe(200);
    expect(subJsonRes.body.openapi).toBe('3.0.3');

    const htmlRes = await request(app).get('/api/v1/docs/');
    expect(htmlRes.status).toBe(200);
    expect(htmlRes.headers['content-type']).toContain('text/html');
    expect(htmlRes.text).toContain('SwaggerUIBundle');
  });

  it('sets defensive HTTP security headers via Helmet and hides x-powered-by', async () => {
    const res = await request(app).get('/api/v1/health');
    expect(res.status).toBe(200);
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['x-powered-by']).toBeUndefined();
  });

  it('prevents mass-assignment privilege escalation when registering with role="ADMIN"', async () => {
    const resA = await request(app).post('/api/v1/auth/register').send({
      email: userAEmail,
      password: 'SafePassword123!',
      fullName: 'Security User Alpha',
      phone: '9876543111',
      role: 'ADMIN', // Attempt mass-assignment privilege escalation
    });

    expect(resA.status).toBe(201);
    expect(resA.body.data.user.role).toBe('CUSTOMER');
    userAId = resA.body.data.user.id;
    const rawCookiesA = resA.headers['set-cookie'];
    userACookies = Array.isArray(rawCookiesA) ? rawCookiesA : rawCookiesA ? [rawCookiesA] : [];
    userACsrf = resA.body.data.csrfToken;

    // Also register User B for cross-user IDOR and concurrency tests
    const resB = await request(app).post('/api/v1/auth/register').send({
      email: userBEmail,
      password: 'SafePassword123!',
      fullName: 'Security User Beta',
      phone: '9876543222',
    });
    expect(resB.status).toBe(201);
    expect(resB.body.data.user.role).toBe('CUSTOMER');
    userBId = resB.body.data.user.id;
    const rawCookiesB = resB.headers['set-cookie'];
    userBCookies = Array.isArray(rawCookiesB) ? rawCookiesB : rawCookiesB ? [rawCookiesB] : [];
    userBCsrf = resB.body.data.csrfToken;
  });

  it('enforces CSRF double-submit token validation on mutating requests', async () => {
    // 1. Missing X-CSRF-Token header
    const missingRes = await request(app)
      .post('/api/v1/addresses')
      .set('Cookie', userACookies)
      .send({
        label: 'Home',
        recipientName: 'User Alpha',
        phone: '9876543111',
        line1: '12 MG Road',
        city: 'Bengaluru',
        state: 'Karnataka',
        postalCode: '560001',
      });
    expect(missingRes.status).toBe(403);
    expect(missingRes.body.error.code).toBe('CSRF_TOKEN_MISSING');

    // 2. Forged / mismatched X-CSRF-Token header
    const forgedRes = await request(app)
      .post('/api/v1/addresses')
      .set('Cookie', userACookies)
      .set('X-CSRF-Token', 'forged-token-00000000000000000000')
      .send({
        label: 'Home',
        recipientName: 'User Alpha',
        phone: '9876543111',
        line1: '12 MG Road',
        city: 'Bengaluru',
        state: 'Karnataka',
        postalCode: '560001',
      });
    expect(forgedRes.status).toBe(403);
    expect(forgedRes.body.error.code).toBe('CSRF_TOKEN_INVALID');

    // 3. Valid CSRF token succeeds for both User A and User B
    const validAddrA = await request(app)
      .post('/api/v1/addresses')
      .set('Cookie', userACookies)
      .set('X-CSRF-Token', userACsrf)
      .send({
        label: 'Home',
        recipientName: 'User Alpha',
        phone: '9876543111',
        line1: '12 MG Road',
        city: 'Bengaluru',
        state: 'Karnataka',
        postalCode: '560001',
        country: 'IN',
        isDefault: true,
      });
    expect(validAddrA.status).toBe(201);
    userAAddressId = validAddrA.body.data.address.id;

    const validAddrB = await request(app)
      .post('/api/v1/addresses')
      .set('Cookie', userBCookies)
      .set('X-CSRF-Token', userBCsrf)
      .send({
        label: 'Home',
        recipientName: 'User Beta',
        phone: '9876543222',
        line1: '45 Marine Drive',
        city: 'Mumbai',
        state: 'Maharashtra',
        postalCode: '400020',
        country: 'IN',
        isDefault: true,
      });
    expect(validAddrB.status).toBe(201);
    userBAddressId = validAddrB.body.data.address.id;
  });

  it('ignores client-supplied pricePaise, discountPaise, and totalPaise tampering during cart & checkout', async () => {
    // Attempt to add ₹2,500 item to cart while injecting pricePaise: 100 (₹1.00)
    const cartRes = await request(app)
      .post('/api/v1/cart/items')
      .set('Cookie', userACookies)
      .set('X-CSRF-Token', userACsrf)
      .send({
        productId: raceProductId,
        quantity: 1,
        pricePaise: 100, // Tampered price (₹1.00 instead of ₹2,500.00)
      });
    expect(cartRes.status).toBe(200);
    expect(cartRes.body.data.cart.summary.subtotalPaise).toBe(250000);

    // Attempt to checkout while injecting tampered subtotalPaise / totalPaise / paymentStatus
    const orderRes = await request(app)
      .post('/api/v1/orders')
      .set('Cookie', userACookies)
      .set('X-CSRF-Token', userACsrf)
      .send({
        addressId: userAAddressId,
        paymentProvider: 'MOCK',
        subtotalPaise: 100,
        discountPaise: 249900,
        totalPaise: 100,
        paymentStatus: 'CAPTURED',
      });

    expect(orderRes.status).toBe(201);
    const createdOrder = orderRes.body.data.order;
    userAOrderId = createdOrder.id;

    // Server must compute: subtotal = 250000 (₹2,500 >= ₹999 so shipping = 0), tax = 18% of 250000 = 45000, total = 295000
    expect(createdOrder.subtotalPaise).toBe(250000);
    expect(createdOrder.discountPaise).toBe(0);
    expect(createdOrder.shippingPaise).toBe(0);
    expect(createdOrder.taxPaise).toBe(45000);
    expect(createdOrder.totalPaise).toBe(295000);
  });

  it('enforces strict cross-user ownership isolation (IDOR prevention) on orders and addresses', async () => {
    // User B tries to fetch User A's order details
    const getOrderRes = await request(app)
      .get(`/api/v1/orders/${userAOrderId}`)
      .set('Cookie', userBCookies);
    expect([403, 404]).toContain(getOrderRes.status);

    // User B tries to cancel User A's order
    const cancelOrderRes = await request(app)
      .post(`/api/v1/orders/${userAOrderId}/cancel`)
      .set('Cookie', userBCookies)
      .set('X-CSRF-Token', userBCsrf)
      .send({ reason: 'Malicious cross-user cancellation attempt' });
    expect([403, 404]).toContain(cancelOrderRes.status);

    // User B tries to update User A's address
    const updateAddrRes = await request(app)
      .patch(`/api/v1/addresses/${userAAddressId}`)
      .set('Cookie', userBCookies)
      .set('X-CSRF-Token', userBCsrf)
      .send({ city: 'Hijacked City' });
    expect([403, 404]).toContain(updateAddrRes.status);

    // User B tries to delete User A's address
    const deleteAddrRes = await request(app)
      .delete(`/api/v1/addresses/${userAAddressId}`)
      .set('Cookie', userBCookies)
      .set('X-CSRF-Token', userBCsrf);
    expect([403, 404]).toContain(deleteAddrRes.status);
  });

  it('prevents overselling under concurrent checkout race conditions when only 1 unit remains', async () => {
    // Verify exactly 1 unit remains in stock on raceProductId
    const beforeProduct = await prisma.product.findUniqueOrThrow({
      where: { id: raceProductId },
    });
    expect(beforeProduct.stockQuantity).toBe(1);

    // Both User A and User B add the last 1 unit to their respective carts
    const addA = await request(app)
      .post('/api/v1/cart/items')
      .set('Cookie', userACookies)
      .set('X-CSRF-Token', userACsrf)
      .send({ productId: raceProductId, quantity: 1 });
    expect(addA.status).toBe(200);

    const addB = await request(app)
      .post('/api/v1/cart/items')
      .set('Cookie', userBCookies)
      .set('X-CSRF-Token', userBCsrf)
      .send({ productId: raceProductId, quantity: 1 });
    expect(addB.status).toBe(200);

    // Fire both checkout requests simultaneously via Promise.all
    const [checkoutA, checkoutB] = await Promise.all([
      request(app)
        .post('/api/v1/orders')
        .set('Cookie', userACookies)
        .set('X-CSRF-Token', userACsrf)
        .send({ addressId: userAAddressId, paymentProvider: 'MOCK' }),
      request(app)
        .post('/api/v1/orders')
        .set('Cookie', userBCookies)
        .set('X-CSRF-Token', userBCsrf)
        .send({ addressId: userBAddressId, paymentProvider: 'MOCK' }),
    ]);

    const statuses = [checkoutA.status, checkoutB.status].sort((a, b) => a - b);
    // Exactly one must succeed (201) and one must fail with 400 (INSUFFICIENT_STOCK)
    expect(statuses).toEqual([201, 400]);

    const failedResponse = checkoutA.status === 400 ? checkoutA : checkoutB;
    expect(failedResponse.body.error.code).toBe('INSUFFICIENT_STOCK');

    // Database stock must be 0 and NEVER negative
    const afterProduct = await prisma.product.findUniqueOrThrow({
      where: { id: raceProductId },
    });
    expect(afterProduct.stockQuantity).toBe(0);
  });
});
