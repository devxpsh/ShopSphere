import { Router } from 'express';
import { requireAuth } from '../../middlewares/auth.middleware';
import { requireCsrfProtection } from '../../middlewares/csrf.middleware';
import { requireAdmin } from '../../middlewares/role.middleware';
import { validateRequest } from '../../middlewares/validate.middleware';
import { couponController } from './coupon.controller';
import {
  createCouponSchema,
  validateCouponSchema,
} from './coupon.validation';

export const couponRouter = Router();

couponRouter.get('/active', couponController.listActive);

couponRouter.post(
  '/validate',
  requireAuth,
  requireCsrfProtection,
  validateRequest(validateCouponSchema),
  couponController.validate
);

couponRouter.post(
  '/',
  requireAuth,
  requireAdmin,
  requireCsrfProtection,
  validateRequest(createCouponSchema),
  couponController.create
);
