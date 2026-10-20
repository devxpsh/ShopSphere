import { Router } from 'express';
import { requireAuth } from '../../middlewares/auth.middleware';
import { requireCsrfProtection } from '../../middlewares/csrf.middleware';
import { validateRequest } from '../../middlewares/validate.middleware';
import { cartController } from './cart.controller';
import {
  addCartItemSchema,
  applyCartCouponSchema,
  cartProductParamSchema,
  mergeGuestCartSchema,
  updateCartItemSchema,
} from './cart.validation';

export const cartRouter = Router();

cartRouter.use(requireAuth);

cartRouter.get('/', cartController.getCart);

cartRouter.post(
  '/items',
  requireCsrfProtection,
  validateRequest(addCartItemSchema),
  cartController.addItem
);

cartRouter.patch(
  '/items/:productId',
  requireCsrfProtection,
  validateRequest(updateCartItemSchema),
  cartController.updateItem
);

cartRouter.delete(
  '/items/:productId',
  requireCsrfProtection,
  validateRequest(cartProductParamSchema),
  cartController.removeItem
);

cartRouter.delete('/', requireCsrfProtection, cartController.clearCart);

cartRouter.post(
  '/coupon',
  requireCsrfProtection,
  validateRequest(applyCartCouponSchema),
  cartController.applyCoupon
);

cartRouter.delete(
  '/coupon',
  requireCsrfProtection,
  cartController.removeCoupon
);

cartRouter.post(
  '/merge',
  requireCsrfProtection,
  validateRequest(mergeGuestCartSchema),
  cartController.mergeGuestCart
);
