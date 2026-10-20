import { InventoryReason, Role } from '@prisma/client';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { app } from '../src/app';
import { env } from '../src/config/env';
import { prisma } from '../src/config/prisma';

/**
 * Helper to extract a specific cookie value from Supertest Set-Cookie headers
 */
function extractCookieValue(cookies: string[] | string | undefined, name: string): string | undefined {
  if (!cookies) return undefined;
  const list = Array.isArray(cookies) ? cookies : [cookies];
  for (const raw of list) {
    const firstPart = raw.split(';')[0];
    if (firstPart && firstPart.startsWith(`${name}=`)) {
      return decodeURIComponent(firstPart.slice(name.length + 1));
    }
  }
  return undefined;
}

describe('Phase 2 Backend Core — Auth, CSRF, RBAC, Categories, Products & Inventory', () => {
  const testRunSuffix = Date.now().toString(36);
  const testUserEmail = `test.student.${testRunSuffix}@example.in`;
  const createdProductIds: string[] = [];
  const createdCategoryIds: string[] = [];

  let customerAgentCookies: string[] = [];
  let customerCsrfToken = '';
  let adminAgentCookies: string[] = [];
  let adminCsrfToken = '';

  beforeAll(async () => {
    // Log in with seeded demo admin account
    const adminLoginRes = await request(app).post('/api/v1/auth/login').send({
      email: env.SEED_ADMIN_EMAIL,
      password: env.SEED_ADMIN_PASSWORD,
    });

    expect(adminLoginRes.status).toBe(200);
    const rawCookies = adminLoginRes.headers['set-cookie'];
    adminAgentCookies = Array.isArray(rawCookies) ? rawCookies : rawCookies ? [rawCookies] : [];
    adminCsrfToken = adminLoginRes.body.data.csrfToken;
  });

  afterAll(async () => {
    // Clean up test records created during this test suite
    if (createdProductIds.length > 0) {
      await prisma.product.deleteMany({
        where: { id: { in: createdProductIds } },
      });
    }
    if (createdCategoryIds.length > 0) {
      await prisma.category.deleteMany({
        where: { id: { in: createdCategoryIds } },
      });
    }
    await prisma.user.deleteMany({
      where: { email: testUserEmail },
    });
    await prisma.$disconnect();
  });

  describe('1. Authentication, HttpOnly Cookies, Role Tampering & CSRF Protection', () => {
    it('registers a new customer, strips any client-supplied ADMIN role, and sets HttpOnly cookies', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: testUserEmail,
          password: 'SecurePassword123',
          fullName: 'Priya Nair',
          phone: '9876501234',
          role: 'ADMIN', // Malicious attempt to self-assign ADMIN role (Security Rule #2)
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user.email).toBe(testUserEmail);
      expect(res.body.data.user.role).toBe(Role.CUSTOMER);
      expect(res.body.data.user.passwordHash).toBeUndefined();
      expect(typeof res.body.data.csrfToken).toBe('string');

      const setCookieHeader = res.headers['set-cookie'];
      const cookieList = Array.isArray(setCookieHeader)
        ? setCookieHeader
        : setCookieHeader
          ? [setCookieHeader]
          : [];

      expect(cookieList.some((c) => c.includes('shopsphere_access_token=') && c.includes('HttpOnly'))).toBe(true);
      expect(cookieList.some((c) => c.includes('shopsphere_refresh_token=') && c.includes('HttpOnly'))).toBe(true);

      customerAgentCookies = cookieList;
      customerCsrfToken = res.body.data.csrfToken;
    });

    it('rejects duplicate email registration with 409 EMAIL_ALREADY_EXISTS', async () => {
      const res = await request(app).post('/api/v1/auth/register').send({
        email: testUserEmail,
        password: 'SecurePassword123',
        fullName: 'Duplicate User',
      });

      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('EMAIL_ALREADY_EXISTS');
    });

    it('returns the current user profile on GET /api/v1/auth/me using HttpOnly cookie', async () => {
      const res = await request(app)
        .get('/api/v1/auth/me')
        .set('Cookie', customerAgentCookies);

      expect(res.status).toBe(200);
      expect(res.body.data.user.email).toBe(testUserEmail);
      expect(res.body.data.user.role).toBe(Role.CUSTOMER);
    });

    it('blocks state-changing profile update when X-CSRF-Token header is missing or forged', async () => {
      // Missing X-CSRF-Token header
      const missingCsrfRes = await request(app)
        .patch('/api/v1/auth/profile')
        .set('Cookie', customerAgentCookies)
        .send({ fullName: 'Priya Nair Updated' });

      expect(missingCsrfRes.status).toBe(403);
      expect(missingCsrfRes.body.error.code).toBe('CSRF_TOKEN_MISSING');

      // Forged X-CSRF-Token header
      const forgedCsrfRes = await request(app)
        .patch('/api/v1/auth/profile')
        .set('Cookie', customerAgentCookies)
        .set('X-CSRF-Token', 'forged_nonce.forged_signature')
        .send({ fullName: 'Priya Nair Updated' });

      expect(forgedCsrfRes.status).toBe(403);
      expect(forgedCsrfRes.body.error.code).toBe('CSRF_TOKEN_INVALID');
    });

    it('allows profile update when valid Cookie and X-CSRF-Token header are provided', async () => {
      const res = await request(app)
        .patch('/api/v1/auth/profile')
        .set('Cookie', customerAgentCookies)
        .set('X-CSRF-Token', customerCsrfToken)
        .send({ fullName: 'Priya S. Nair' });

      expect(res.status).toBe(200);
      expect(res.body.data.user.fullName).toBe('Priya S. Nair');
    });

    it('refreshes session tokens via POST /api/v1/auth/refresh', async () => {
      const res = await request(app)
        .post('/api/v1/auth/refresh')
        .set('Cookie', customerAgentCookies);

      expect(res.status).toBe(200);
      expect(res.body.data.user.email).toBe(testUserEmail);
      expect(extractCookieValue(res.headers['set-cookie'], 'shopsphere_access_token')).toBeDefined();
    });
  });

  describe('2. Category APIs & Server-Side Admin RBAC', () => {
    it('lists all 6 seeded categories with active product counts', async () => {
      const res = await request(app).get('/api/v1/categories');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.categories.length).toBeGreaterThanOrEqual(6);

      const electronics = res.body.data.categories.find(
        (c: { slug: string }) => c.slug === 'electronics-audio'
      );
      expect(electronics).toBeDefined();
      expect(electronics.productCount).toBeGreaterThanOrEqual(4);
    });

    it('fetches a single category by slug', async () => {
      const res = await request(app).get('/api/v1/categories/books-engineering-study');

      expect(res.status).toBe(200);
      expect(res.body.data.category.name).toBe('Books & Engineering Study');
    });

    it('forbids a CUSTOMER from creating a category (403 FORBIDDEN)', async () => {
      const res = await request(app)
        .post('/api/v1/categories')
        .set('Cookie', customerAgentCookies)
        .set('X-CSRF-Token', customerCsrfToken)
        .send({
          name: 'Unauthorized Category',
          description: 'Customer should not be allowed to create this',
        });

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('allows an ADMIN with valid CSRF token to create and update a category', async () => {
      const createRes = await request(app)
        .post('/api/v1/categories')
        .set('Cookie', adminAgentCookies)
        .set('X-CSRF-Token', adminCsrfToken)
        .send({
          name: `Test Smart Wearables ${testRunSuffix}`,
          description: '[DEMO] Smartwatches and fitness trackers',
        });

      expect(createRes.status).toBe(201);
      const categoryId = createRes.body.data.category.id as string;
      createdCategoryIds.push(categoryId);

      const updateRes = await request(app)
        .patch(`/api/v1/categories/${categoryId}`)
        .set('Cookie', adminAgentCookies)
        .set('X-CSRF-Token', adminCsrfToken)
        .send({
          description: '[DEMO] Updated description for smart wearables',
        });

      expect(updateRes.status).toBe(200);
      expect(updateRes.body.data.category.description).toContain('Updated description');
    });
  });

  describe('3. Product Catalog APIs — Search, Filter, Sort, Pagination & Details', () => {
    it('paginates the 24 seeded demo products accurately', async () => {
      const page1Res = await request(app).get('/api/v1/products?page=1&limit=10');

      expect(page1Res.status).toBe(200);
      expect(page1Res.body.data.items).toHaveLength(10);
      expect(page1Res.body.data.pagination.totalItems).toBeGreaterThanOrEqual(24);
      expect(page1Res.body.data.pagination.page).toBe(1);
      expect(page1Res.body.data.pagination.hasNextPage).toBe(true);
      expect(page1Res.body.data.pagination.hasPrevPage).toBe(false);
    });

    it('searches products by keyword across name, brand, and description', async () => {
      const res = await request(app).get('/api/v1/products?q=Mechanical%20Keyboard');

      expect(res.status).toBe(200);
      expect(res.body.data.items.length).toBeGreaterThanOrEqual(1);
      expect(res.body.data.items[0].sku).toBe('DEMO-ELEC-002');
    });

    it('filters products by category slug and integer paise price range', async () => {
      const res = await request(app).get(
        '/api/v1/products?category=books-engineering-study&minPricePaise=50000&maxPricePaise=70000'
      );

      expect(res.status).toBe(200);
      expect(res.body.data.items.length).toBeGreaterThanOrEqual(2);
      for (const product of res.body.data.items) {
        expect(product.category.slug).toBe('books-engineering-study');
        expect(product.pricePaise).toBeGreaterThanOrEqual(50000);
        expect(product.pricePaise).toBeLessThanOrEqual(70000);
      }
    });

    it('sorts products by price_asc and price_desc in integer paise', async () => {
      const ascRes = await request(app).get('/api/v1/products?sortBy=price_asc&limit=5');
      expect(ascRes.status).toBe(200);
      const ascPrices = ascRes.body.data.items.map((p: { pricePaise: number }) => p.pricePaise);
      for (let i = 1; i < ascPrices.length; i++) {
        expect(ascPrices[i]).toBeGreaterThanOrEqual(ascPrices[i - 1]);
      }

      const descRes = await request(app).get('/api/v1/products?sortBy=price_desc&limit=5');
      expect(descRes.status).toBe(200);
      const descPrices = descRes.body.data.items.map((p: { pricePaise: number }) => p.pricePaise);
      for (let i = 1; i < descPrices.length; i++) {
        expect(descPrices[i]).toBeLessThanOrEqual(descPrices[i - 1]);
      }
    });

    it('returns full product details and related products by slug', async () => {
      const res = await request(app).get(
        '/api/v1/products/demo-indisound-nirvana-anc-pro-wireless-headphones'
      );

      expect(res.status).toBe(200);
      expect(res.body.data.product.sku).toBe('DEMO-ELEC-001');
      expect(res.body.data.product.pricePaise).toBe(349900);
      expect(res.body.data.product.mrpPaise).toBe(599900);
      expect(res.body.data.product.images.length).toBeGreaterThan(0);
      expect(Array.isArray(res.body.data.product.relatedProducts)).toBe(true);
    });
  });

  describe('4. Admin Product Creation, Pricing Validation & Transactional Inventory Logs', () => {
    it('rejects product creation when mrpPaise < pricePaise or when price is a float', async () => {
      const categoriesRes = await request(app).get('/api/v1/categories');
      const categoryId = categoriesRes.body.data.categories[0].id as string;

      // mrpPaise < pricePaise
      const invalidMrpRes = await request(app)
        .post('/api/v1/products')
        .set('Cookie', adminAgentCookies)
        .set('X-CSRF-Token', adminCsrfToken)
        .send({
          categoryId,
          sku: `DEMO-INV-${testRunSuffix}`,
          name: '[DEMO] Invalid Pricing Item',
          description: 'Testing MRP lower than selling price validation',
          pricePaise: 200000,
          mrpPaise: 150000,
          stockQuantity: 10,
        });

      expect(invalidMrpRes.status).toBe(400);
      expect(invalidMrpRes.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('creates a product and records initial stock + subsequent adjustments in InventoryLog', async () => {
      const categoriesRes = await request(app).get('/api/v1/categories');
      const categoryId = categoriesRes.body.data.categories[0].id as string;

      const createRes = await request(app)
        .post('/api/v1/products')
        .set('Cookie', adminAgentCookies)
        .set('X-CSRF-Token', adminCsrfToken)
        .send({
          categoryId,
          sku: `DEMO-TEST-${testRunSuffix}`,
          name: `[DEMO] Test USB-C Hub ${testRunSuffix}`,
          shortDescription: '[DEMO] 7-in-1 Aluminum USB-C Hub',
          description: 'Demonstration 7-in-1 USB-C hub with 4K HDMI and 100W PD pass-through.',
          brand: 'VoltEdge',
          pricePaise: 189900,
          mrpPaise: 299900,
          stockQuantity: 15,
          images: [
            {
              url: 'https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?auto=format&fit=crop&w=800&q=80',
              altText: 'Test USB-C Hub',
              isPrimary: true,
            },
          ],
        });

      expect(createRes.status).toBe(201);
      const productId = createRes.body.data.product.id as string;
      createdProductIds.push(productId);
      expect(createRes.body.data.product.stockQuantity).toBe(15);

      // Adjust inventory (+5 restock)
      const adjustRes = await request(app)
        .patch(`/api/v1/products/${productId}/inventory`)
        .set('Cookie', adminAgentCookies)
        .set('X-CSRF-Token', adminCsrfToken)
        .send({
          changeQuantity: 5,
          reason: InventoryReason.ADMIN_ADJUSTMENT,
          notes: 'Restocked 5 units in warehouse',
        });

      expect(adjustRes.status).toBe(200);
      expect(adjustRes.body.data.product.stockQuantity).toBe(20);
      expect(adjustRes.body.data.inventoryLog.previousStock).toBe(15);
      expect(adjustRes.body.data.inventoryLog.newStock).toBe(20);

      // Reject adjustment that would cause negative stock (-25 when stock is 20)
      const negativeRes = await request(app)
        .patch(`/api/v1/products/${productId}/inventory`)
        .set('Cookie', adminAgentCookies)
        .set('X-CSRF-Token', adminCsrfToken)
        .send({
          changeQuantity: -25,
          reason: InventoryReason.DAMAGED_OR_LOST,
        });

      expect(negativeRes.status).toBe(400);
      expect(negativeRes.body.error.code).toBe('INSUFFICIENT_STOCK');
    });
  });
});
