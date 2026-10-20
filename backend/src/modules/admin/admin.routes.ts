import { Role } from '@prisma/client';
import { Router } from 'express';
import { requireAuth } from '../../middlewares/auth.middleware';
import { requireCsrfProtection } from '../../middlewares/csrf.middleware';
import { requireRole } from '../../middlewares/role.middleware';
import { validateRequest } from '../../middlewares/validate.middleware';
import { asyncHandler } from '../../utils/asyncHandler';
import { AdminController } from './admin.controller';
import {
  adminCouponIdParamSchema,
  adminInventoryLogsQuerySchema,
  adminOrderIdParamSchema,
  adminOrdersQuerySchema,
  adminReviewIdParamSchema,
  adminReviewsQuerySchema,
  createAdminCouponSchema,
  moderateReviewSchema,
  updateAdminCouponSchema,
  updateOrderStatusSchema,
} from './admin.schemas';

export const adminRouter = Router();

// Enforce authentication and server-side ADMIN role on every /api/v1/admin endpoint
adminRouter.use(requireAuth, requireRole(Role.ADMIN));

// 1. Real-Data Analytics
adminRouter.get('/analytics', asyncHandler(AdminController.getAnalytics));

// 2. Admin Orders Management
adminRouter.get(
  '/orders',
  validateRequest({ query: adminOrdersQuerySchema }),
  asyncHandler(AdminController.listOrders)
);

adminRouter.patch(
  '/orders/:id/status',
  requireCsrfProtection,
  validateRequest({
    params: adminOrderIdParamSchema,
    body: updateOrderStatusSchema,
  }),
  asyncHandler(AdminController.updateOrderStatus)
);

// 3. Admin Inventory Audit Logs
adminRouter.get(
  '/inventory-logs',
  validateRequest({ query: adminInventoryLogsQuerySchema }),
  asyncHandler(AdminController.listInventoryLogs)
);

// 4. Admin Coupons Management
adminRouter.get('/coupons', asyncHandler(AdminController.listCoupons));

adminRouter.post(
  '/coupons',
  requireCsrfProtection,
  validateRequest({ body: createAdminCouponSchema }),
  asyncHandler(AdminController.createCoupon)
);

adminRouter.patch(
  '/coupons/:id',
  requireCsrfProtection,
  validateRequest({
    params: adminCouponIdParamSchema,
    body: updateAdminCouponSchema,
  }),
  asyncHandler(AdminController.updateCoupon)
);

adminRouter.delete(
  '/coupons/:id',
  requireCsrfProtection,
  validateRequest({ params: adminCouponIdParamSchema }),
  asyncHandler(AdminController.deleteCoupon)
);

// 5. Admin Review Moderation
adminRouter.get(
  '/reviews',
  validateRequest({ query: adminReviewsQuerySchema }),
  asyncHandler(AdminController.listReviews)
);

adminRouter.patch(
  '/reviews/:id/moderate',
  requireCsrfProtection,
  validateRequest({
    params: adminReviewIdParamSchema,
    body: moderateReviewSchema,
  }),
  asyncHandler(AdminController.moderateReview)
);
