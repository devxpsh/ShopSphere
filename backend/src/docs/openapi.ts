export const openApiSpec = {
  openapi: '3.0.3',
  info: {
    title: 'ShopSphere E-Commerce API (India)',
    version: '1.0.0',
    description:
      'Production-style full-stack e-commerce REST API for the Indian market. All monetary amounts are stored and exchanged as integer paise (`100 paise = ₹1.00 INR`). Protected state-changing routes enforce `HttpOnly` JWT cookies and HMAC Double-Submit CSRF verification (`X-CSRF-Token`).',
    contact: {
      name: 'ShopSphere Engineering',
      email: 'admin@shopsphere.in',
    },
  },
  servers: [
    {
      url: '/api/v1',
      description: 'ShopSphere API v1',
    },
  ],
  tags: [
    { name: 'Health', description: 'Service & PostgreSQL readiness probes' },
    {
      name: 'Authentication',
      description: 'HttpOnly cookie auth, CSRF token issuance, and user profile',
    },
    { name: 'Categories', description: 'Product category hierarchy & admin CRUD' },
    {
      name: 'Products',
      description:
        'Catalog search, filtering, sorting, pagination, and inventory controls',
    },
    {
      name: 'Cart',
      description:
        'Persistent database-backed shopping cart with server-recalculated INR paise totals',
    },
    { name: 'Wishlist', description: 'Customer saved wishlist items' },
    {
      name: 'Addresses',
      description: 'Indian delivery addresses with 6-digit PIN code validation',
    },
    {
      name: 'Coupons',
      description: 'Promotional coupon listing and server-side discount validation',
    },
    {
      name: 'Orders',
      description:
        'Transactional order creation, atomic stock deduction, and cancellation rules',
    },
    {
      name: 'Payments',
      description:
        'Mock Payment Adapter & Razorpay Test Mode (HMAC-SHA256 signature + webhook verification)',
    },
    {
      name: 'Reviews',
      description:
        'Verified-purchase customer product reviews & rating recalculation',
    },
    {
      name: 'Admin',
      description:
        'RBAC Admin Command Center: real-data PostgreSQL analytics, order workflow, inventory audit logs, coupon CRUD, and review moderation',
    },
  ],
  components: {
    securitySchemes: {
      cookieAuth: {
        type: 'apiKey',
        in: 'cookie',
        name: 'shopsphere_access_token',
        description: 'HttpOnly JWT access token cookie set on login/register',
      },
      csrfTokenHeader: {
        type: 'apiKey',
        in: 'header',
        name: 'X-CSRF-Token',
        description:
          'HMAC-signed CSRF token obtained from GET /api/v1/auth/csrf (must match shopsphere_csrf_token cookie)',
      },
    },
    schemas: {
      ErrorResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: false },
          error: {
            type: 'object',
            properties: {
              code: { type: 'string', example: 'VALIDATION_ERROR' },
              message: { type: 'string', example: 'Request validation failed' },
            },
          },
        },
      },
      Product: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          sku: { type: 'string', example: 'DEMO-ELEC-001' },
          name: {
            type: 'string',
            example: '[DEMO] Indicsonic Pro ANC Wireless Headphones',
          },
          slug: {
            type: 'string',
            example: 'demo-indicsonic-pro-anc-wireless-headphones',
          },
          brand: { type: 'string', nullable: true, example: 'Indicsonic' },
          pricePaise: {
            type: 'integer',
            description: 'Selling price in integer paise (₹3,499.00 = 349900)',
            example: 349900,
          },
          mrpPaise: {
            type: 'integer',
            description: 'Maximum Retail Price in integer paise (₹5,999.00 = 599900)',
            example: 599900,
          },
          stockQuantity: { type: 'integer', example: 40 },
          lowStockThreshold: { type: 'integer', example: 5 },
          isActive: { type: 'boolean', example: true },
          isFeatured: { type: 'boolean', example: true },
          averageRating: { type: 'number', example: 4.6 },
          reviewCount: { type: 'integer', example: 12 },
        },
      },
      Order: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          orderNumber: { type: 'string', example: 'ORD-20261020-4821' },
          status: {
            type: 'string',
            enum: [
              'PENDING',
              'CONFIRMED',
              'PROCESSING',
              'SHIPPED',
              'DELIVERED',
              'CANCELLED',
            ],
          },
          paymentStatus: {
            type: 'string',
            enum: ['PENDING', 'AUTHORIZED', 'PAID', 'FAILED', 'REFUNDED'],
          },
          subtotalPaise: { type: 'integer', example: 349900 },
          discountPaise: { type: 'integer', example: 30000 },
          shippingPaise: { type: 'integer', example: 0 },
          taxPaise: { type: 'integer', example: 57582 },
          totalPaise: { type: 'integer', example: 377482 },
          currency: { type: 'string', example: 'INR' },
          shippingPostalCode: { type: 'string', example: '560048' },
        },
      },
    },
  },
  paths: {
    '/health': {
      get: {
        tags: ['Health'],
        summary: 'Check API server and PostgreSQL database connectivity',
        responses: {
          '200': {
            description: 'Server and PostgreSQL database are healthy',
          },
        },
      },
    },
    '/auth/csrf': {
      get: {
        tags: ['Authentication'],
        summary: 'Issue HMAC-signed Double-Submit CSRF cookie and token',
        responses: {
          '200': { description: 'CSRF token issued in cookie and JSON body' },
        },
      },
    },
    '/auth/register': {
      post: {
        tags: ['Authentication'],
        summary: 'Register a new customer account (Role.CUSTOMER enforced)',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['fullName', 'email', 'password'],
                properties: {
                  fullName: { type: 'string', example: 'Aarav Sharma' },
                  email: { type: 'string', format: 'email' },
                  phone: { type: 'string', example: '9876543210' },
                  password: { type: 'string', example: 'StrongPass123!' },
                },
              },
            },
          },
        },
        responses: {
          '201': { description: 'Customer registered and HttpOnly cookies set' },
          '409': { description: 'Email already registered' },
        },
      },
    },
    '/auth/login': {
      post: {
        tags: ['Authentication'],
        summary: 'Authenticate user and set HttpOnly access/refresh cookies',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email', 'password'],
                properties: {
                  email: { type: 'string', format: 'email' },
                  password: { type: 'string' },
                },
              },
            },
          },
        },
        responses: {
          '200': { description: 'Authenticated successfully' },
          '401': { description: 'Invalid credentials' },
        },
      },
    },
    '/auth/refresh': {
      post: {
        tags: ['Authentication'],
        summary: 'Rotate access token using HttpOnly refresh token cookie',
        responses: {
          '200': { description: 'Access token rotated' },
          '401': { description: 'Invalid or expired refresh token' },
        },
      },
    },
    '/auth/logout': {
      post: {
        tags: ['Authentication'],
        summary: 'Clear authentication and CSRF cookies',
        security: [{ cookieAuth: [], csrfTokenHeader: [] }],
        responses: {
          '200': { description: 'Logged out successfully' },
        },
      },
    },
    '/auth/me': {
      get: {
        tags: ['Authentication'],
        summary: 'Get currently authenticated user profile',
        security: [{ cookieAuth: [] }],
        responses: {
          '200': { description: 'Current user profile' },
          '401': { description: 'Not authenticated' },
        },
      },
    },
    '/auth/profile': {
      patch: {
        tags: ['Authentication'],
        summary: 'Update authenticated user fullName, Indian phone, or password',
        security: [{ cookieAuth: [], csrfTokenHeader: [] }],
        responses: {
          '200': { description: 'Profile updated' },
        },
      },
    },
    '/categories': {
      get: {
        tags: ['Categories'],
        summary: 'List product categories with active product counts',
        responses: {
          '200': { description: 'Categories list' },
        },
      },
      post: {
        tags: ['Categories'],
        summary: 'Create a new product category (Admin only)',
        security: [{ cookieAuth: [], csrfTokenHeader: [] }],
        responses: {
          '201': { description: 'Category created' },
          '403': { description: 'Forbidden (Admin role required)' },
        },
      },
    },
    '/categories/{slugOrId}': {
      get: {
        tags: ['Categories'],
        summary: 'Get category details by slug or UUID',
        parameters: [
          {
            name: 'slugOrId',
            in: 'path',
            required: true,
            schema: { type: 'string' },
          },
        ],
        responses: {
          '200': { description: 'Category details' },
          '404': { description: 'Category not found' },
        },
      },
    },
    '/products': {
      get: {
        tags: ['Products'],
        summary:
          'Search, filter, sort, and paginate products (prices in integer paise)',
        parameters: [
          { name: 'q', in: 'query', schema: { type: 'string' } },
          { name: 'category', in: 'query', schema: { type: 'string' } },
          { name: 'brand', in: 'query', schema: { type: 'string' } },
          { name: 'minPricePaise', in: 'query', schema: { type: 'integer' } },
          { name: 'maxPricePaise', in: 'query', schema: { type: 'integer' } },
          { name: 'inStock', in: 'query', schema: { type: 'boolean' } },
          { name: 'featured', in: 'query', schema: { type: 'boolean' } },
          {
            name: 'sortBy',
            in: 'query',
            schema: {
              type: 'string',
              enum: [
                'newest',
                'price_asc',
                'price_desc',
                'rating_desc',
                'name_asc',
              ],
            },
          },
          { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
          {
            name: 'limit',
            in: 'query',
            schema: { type: 'integer', default: 12 },
          },
        ],
        responses: {
          '200': { description: 'Paginated product catalog' },
        },
      },
      post: {
        tags: ['Products'],
        summary:
          'Create a new product and record INITIAL_STOCK in InventoryLog (Admin only)',
        security: [{ cookieAuth: [], csrfTokenHeader: [] }],
        responses: {
          '201': { description: 'Product created' },
          '403': { description: 'Admin role required' },
        },
      },
    },
    '/products/{slugOrId}': {
      get: {
        tags: ['Products'],
        summary:
          'Get product details by slug or UUID including images, specs, approved reviews, and related products',
        parameters: [
          {
            name: 'slugOrId',
            in: 'path',
            required: true,
            schema: { type: 'string' },
          },
        ],
        responses: {
          '200': { description: 'Product details' },
          '404': { description: 'Product not found' },
        },
      },
    },
    '/products/{id}/inventory': {
      patch: {
        tags: ['Products'],
        summary:
          'Atomically adjust product stock and write immutable InventoryLog entry (Admin only)',
        security: [{ cookieAuth: [], csrfTokenHeader: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string', format: 'uuid' },
          },
        ],
        responses: {
          '200': { description: 'Stock adjusted and logged' },
        },
      },
    },
    '/cart': {
      get: {
        tags: ['Cart'],
        summary:
          'Get persistent cart with server-recalculated paise subtotal, coupon discount, shipping, and 18% GST',
        security: [{ cookieAuth: [] }],
        responses: {
          '200': { description: 'Customer cart and summary' },
        },
      },
      delete: {
        tags: ['Cart'],
        summary: 'Clear all items and applied coupon from cart',
        security: [{ cookieAuth: [], csrfTokenHeader: [] }],
        responses: {
          '200': { description: 'Cart cleared' },
        },
      },
    },
    '/cart/items': {
      post: {
        tags: ['Cart'],
        summary: 'Add or increment product in cart (validates live stock)',
        security: [{ cookieAuth: [], csrfTokenHeader: [] }],
        responses: {
          '200': { description: 'Item added to cart' },
        },
      },
    },
    '/cart/coupon': {
      post: {
        tags: ['Cart'],
        summary: 'Validate and attach promotional coupon to cart',
        security: [{ cookieAuth: [], csrfTokenHeader: [] }],
        responses: {
          '200': { description: 'Coupon applied to cart' },
        },
      },
      delete: {
        tags: ['Cart'],
        summary: 'Remove applied coupon from cart',
        security: [{ cookieAuth: [], csrfTokenHeader: [] }],
        responses: {
          '200': { description: 'Coupon removed' },
        },
      },
    },
    '/wishlist': {
      get: {
        tags: ['Wishlist'],
        summary: 'List customer saved wishlist items',
        security: [{ cookieAuth: [] }],
        responses: {
          '200': { description: 'Wishlist items' },
        },
      },
      post: {
        tags: ['Wishlist'],
        summary: 'Add product to customer wishlist',
        security: [{ cookieAuth: [], csrfTokenHeader: [] }],
        responses: {
          '200': { description: 'Added to wishlist' },
        },
      },
    },
    '/addresses': {
      get: {
        tags: ['Addresses'],
        summary: 'List customer Indian delivery addresses',
        security: [{ cookieAuth: [] }],
        responses: {
          '200': { description: 'Customer addresses' },
        },
      },
      post: {
        tags: ['Addresses'],
        summary:
          'Create delivery address (validates 6-digit Indian PIN code and 10-digit mobile)',
        security: [{ cookieAuth: [], csrfTokenHeader: [] }],
        responses: {
          '201': { description: 'Address created' },
        },
      },
    },
    '/coupons/active': {
      get: {
        tags: ['Coupons'],
        summary: 'List active promotional coupons available for checkout',
        responses: {
          '200': { description: 'Active coupons' },
        },
      },
    },
    '/orders': {
      post: {
        tags: ['Orders'],
        summary:
          'Create transactional order (atomic stock deduction, server price/GST calculation, immutable address/item snapshot)',
        security: [{ cookieAuth: [], csrfTokenHeader: [] }],
        responses: {
          '201': { description: 'Order created transactionally' },
          '409': { description: 'Insufficient stock (atomic guard triggered)' },
        },
      },
      get: {
        tags: ['Orders'],
        summary: 'List authenticated customer orders',
        security: [{ cookieAuth: [] }],
        responses: {
          '200': { description: 'Paginated customer orders' },
        },
      },
    },
    '/orders/{id}/cancel': {
      post: {
        tags: ['Orders'],
        summary:
          'Cancel eligible order (PENDING/CONFIRMED/PROCESSING) and atomically restore stock',
        security: [{ cookieAuth: [], csrfTokenHeader: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string', format: 'uuid' },
          },
        ],
        responses: {
          '200': { description: 'Order cancelled and stock restored' },
        },
      },
    },
    '/payments/mock/verify': {
      post: {
        tags: ['Payments'],
        summary:
          'Complete Mock payment simulation (SUCCESS transitions order to CONFIRMED + PAID)',
        security: [{ cookieAuth: [], csrfTokenHeader: [] }],
        responses: {
          '200': { description: 'Mock payment processed' },
        },
      },
    },
    '/payments/razorpay/create-order': {
      post: {
        tags: ['Payments'],
        summary: 'Initialize Razorpay Test Mode order in integer paise (INR)',
        security: [{ cookieAuth: [], csrfTokenHeader: [] }],
        responses: {
          '200': { description: 'Razorpay order payload returned' },
        },
      },
    },
    '/payments/razorpay/verify': {
      post: {
        tags: ['Payments'],
        summary:
          'Verify Razorpay payment signature server-side using HMAC-SHA256 and crypto.timingSafeEqual',
        security: [{ cookieAuth: [], csrfTokenHeader: [] }],
        responses: {
          '200': { description: 'Razorpay signature verified and order paid' },
          '400': { description: 'Tampered or invalid signature rejected' },
        },
      },
    },
    '/payments/razorpay/webhook': {
      post: {
        tags: ['Payments'],
        summary:
          'Idempotent Razorpay webhook endpoint verified via x-razorpay-signature',
        responses: {
          '200': { description: 'Webhook processed idempotently' },
        },
      },
    },
    '/reviews/product/{productId}': {
      get: {
        tags: ['Reviews'],
        summary: 'List approved reviews for a product',
        parameters: [
          {
            name: 'productId',
            in: 'path',
            required: true,
            schema: { type: 'string', format: 'uuid' },
          },
        ],
        responses: {
          '200': { description: 'Approved product reviews' },
        },
      },
      post: {
        tags: ['Reviews'],
        summary:
          'Submit or update customer review (automatically flags verified purchases)',
        security: [{ cookieAuth: [], csrfTokenHeader: [] }],
        parameters: [
          {
            name: 'productId',
            in: 'path',
            required: true,
            schema: { type: 'string', format: 'uuid' },
          },
        ],
        responses: {
          '201': { description: 'Review saved and product rating recalculated' },
        },
      },
    },
    '/admin/analytics': {
      get: {
        tags: ['Admin'],
        summary:
          'Get real-data e-commerce analytics derived exclusively from PostgreSQL records',
        security: [{ cookieAuth: [] }],
        responses: {
          '200': {
            description:
              'KPIs, ordersByStatus, revenueByCategory, 14-day revenueTimeSeries, topSellingProducts, and lowStockAlerts',
          },
          '403': { description: 'Forbidden (Admin role required)' },
        },
      },
    },
    '/admin/orders': {
      get: {
        tags: ['Admin'],
        summary: 'List all customer orders with status and search filters',
        security: [{ cookieAuth: [] }],
        responses: {
          '200': { description: 'Paginated admin orders' },
        },
      },
    },
    '/admin/orders/{id}/status': {
      patch: {
        tags: ['Admin'],
        summary:
          'Update order lifecycle status or cancel with atomic stock restoration',
        security: [{ cookieAuth: [], csrfTokenHeader: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string', format: 'uuid' },
          },
        ],
        responses: {
          '200': { description: 'Order status updated' },
        },
      },
    },
    '/admin/inventory-logs': {
      get: {
        tags: ['Admin'],
        summary: 'List paginated InventoryLog audit records',
        security: [{ cookieAuth: [] }],
        responses: {
          '200': { description: 'Paginated inventory audit trail' },
        },
      },
    },
    '/admin/coupons': {
      get: {
        tags: ['Admin'],
        summary: 'List all coupons with order redemption counts',
        security: [{ cookieAuth: [] }],
        responses: {
          '200': { description: 'All coupons' },
        },
      },
      post: {
        tags: ['Admin'],
        summary: 'Create a promotional coupon',
        security: [{ cookieAuth: [], csrfTokenHeader: [] }],
        responses: {
          '201': { description: 'Coupon created' },
        },
      },
    },
    '/admin/reviews': {
      get: {
        tags: ['Admin'],
        summary: 'List all customer reviews across PENDING, APPROVED, REJECTED',
        security: [{ cookieAuth: [] }],
        responses: {
          '200': { description: 'Paginated reviews for moderation' },
        },
      },
    },
    '/admin/reviews/{id}/moderate': {
      patch: {
        tags: ['Admin'],
        summary:
          'Moderate review status and atomically recalculate product rating',
        security: [{ cookieAuth: [], csrfTokenHeader: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string', format: 'uuid' },
          },
        ],
        responses: {
          '200': { description: 'Review moderated and rating recalculated' },
        },
      },
    },
  },
};
