import { Router } from 'express';
import { PaymentController } from './payment.controller';
import { asyncHandler } from '../../utils/asyncHandler';
import { requireAuth } from '../../middlewares/auth.middleware';
import { requireCsrfProtection } from '../../middlewares/csrf.middleware';
import { validateRequest } from '../../middlewares/validate.middleware';
import {
  mockPaymentVerifySchema,
  razorpayCreateOrderSchema,
  razorpayVerifyPaymentSchema,
} from './payment.validation';

export const paymentRouter = Router();

// Server-to-server webhook endpoint (uses X-Razorpay-Signature HMAC verification, not browser cookies)
paymentRouter.post('/razorpay/webhook', asyncHandler(PaymentController.razorpayWebhook));

// Authenticated customer payment endpoints
paymentRouter.post(
  '/mock/verify',
  requireAuth,
  requireCsrfProtection,
  validateRequest({ body: mockPaymentVerifySchema }),
  asyncHandler(PaymentController.verifyMockPayment)
);

paymentRouter.post(
  '/razorpay/create-order',
  requireAuth,
  requireCsrfProtection,
  validateRequest({ body: razorpayCreateOrderSchema }),
  asyncHandler(PaymentController.createRazorpayOrder)
);

paymentRouter.post(
  '/razorpay/verify',
  requireAuth,
  requireCsrfProtection,
  validateRequest({ body: razorpayVerifyPaymentSchema }),
  asyncHandler(PaymentController.verifyRazorpayPayment)
);
