import { Router } from 'express';
import { ReviewController } from './review.controller';
import { asyncHandler } from '../../utils/asyncHandler';
import { requireAuth } from '../../middlewares/auth.middleware';
import { requireCsrfProtection } from '../../middlewares/csrf.middleware';
import { validateRequest } from '../../middlewares/validate.middleware';
import {
  createReviewSchema,
  reviewIdParamSchema,
  reviewProductIdParamSchema,
} from './review.validation';

export const reviewRouter = Router();

// Public: list approved reviews for a product
reviewRouter.get(
  '/product/:productId',
  validateRequest({ params: reviewProductIdParamSchema }),
  asyncHandler(ReviewController.listProductReviews)
);

// Authenticated customer: submit or update review
reviewRouter.post(
  '/',
  requireAuth,
  requireCsrfProtection,
  validateRequest({ body: createReviewSchema }),
  asyncHandler(ReviewController.upsertReview)
);

// Authenticated customer (owner) or admin: delete review
reviewRouter.delete(
  '/:id',
  requireAuth,
  requireCsrfProtection,
  validateRequest({ params: reviewIdParamSchema }),
  asyncHandler(ReviewController.deleteReview)
);
