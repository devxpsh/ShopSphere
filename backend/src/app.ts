import cookieParser from 'cookie-parser';
import cors from 'cors';
import express, { Application } from 'express';
import helmet from 'helmet';
import { env } from './config/env';
import { docsRouter } from './docs/docs.routes';
import { openApiSpec } from './docs/openapi';
import { errorHandler, notFoundHandler } from './middlewares/error.middleware';
import { globalRateLimiter } from './middlewares/rateLimit.middleware';
import { addressRouter } from './modules/addresses/address.routes';
import { adminRouter } from './modules/admin/admin.routes';
import { authRouter } from './modules/auth/auth.routes';
import { cartRouter } from './modules/cart/cart.routes';
import { categoryRouter } from './modules/categories/category.routes';
import { couponRouter } from './modules/coupons/coupon.routes';
import { healthRouter } from './modules/health/health.routes';
import { orderRouter } from './modules/orders/order.routes';
import { paymentRouter } from './modules/payments/payment.routes';
import { productRouter } from './modules/products/product.routes';
import { reviewRouter } from './modules/reviews/review.routes';
import { wishlistRouter } from './modules/wishlist/wishlist.routes';

export function createApp(): Application {
  const app = express();

  // Security headers & fingerprinting removal
  app.disable('x-powered-by');
  app.use(helmet());

  // Cross-Origin Resource Sharing with HttpOnly cookie credentials support
  app.use(
    cors({
      origin: env.CORS_ORIGIN.split(',').map((origin) => origin.trim()),
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token'],
    })
  );

  // Rate limiting
  app.use('/api', globalRateLimiter);

  // Body & Cookie parsers
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true, limit: '1mb' }));
  app.use(cookieParser());

  // API Routes (v1 + convenient /api/health alias + OpenAPI/Swagger Docs)
  app.use('/api/v1/health', healthRouter);
  app.use('/api/health', healthRouter);
  app.get('/api/v1/docs.json', (_req, res) => {
    res.status(200).json(openApiSpec);
  });
  app.use('/api/v1/docs', docsRouter);
  app.use('/api/v1/auth', authRouter);
  app.use('/api/v1/categories', categoryRouter);
  app.use('/api/v1/products', productRouter);
  app.use('/api/v1/addresses', addressRouter);
  app.use('/api/v1/coupons', couponRouter);
  app.use('/api/v1/cart', cartRouter);
  app.use('/api/v1/wishlist', wishlistRouter);
  app.use('/api/v1/orders', orderRouter);
  app.use('/api/v1/payments', paymentRouter);
  app.use('/api/v1/reviews', reviewRouter);
  app.use('/api/v1/admin', adminRouter);

  // 404 & Centralized Error Handling
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

export const app = createApp();
