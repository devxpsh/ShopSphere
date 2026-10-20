import { Router } from 'express';
import { WishlistController } from './wishlist.controller';
import { asyncHandler } from '../../utils/asyncHandler';
import { requireAuth } from '../../middlewares/auth.middleware';
import { requireCsrfProtection } from '../../middlewares/csrf.middleware';
import { validateRequest } from '../../middlewares/validate.middleware';
import { wishlistItemBodySchema, wishlistProductIdParamSchema } from './wishlist.validation';

export const wishlistRouter = Router();

wishlistRouter.use(requireAuth);

wishlistRouter.get('/', asyncHandler(WishlistController.getWishlist));

wishlistRouter.post(
  '/',
  requireCsrfProtection,
  validateRequest({ body: wishlistItemBodySchema }),
  asyncHandler(WishlistController.addItem)
);

wishlistRouter.delete(
  '/:productId',
  requireCsrfProtection,
  validateRequest({ params: wishlistProductIdParamSchema }),
  asyncHandler(WishlistController.removeItem)
);
