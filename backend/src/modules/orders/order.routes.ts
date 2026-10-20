import { Router } from 'express';
import { OrderController } from './order.controller';
import { asyncHandler } from '../../utils/asyncHandler';
import { requireAuth } from '../../middlewares/auth.middleware';
import { requireCsrfProtection } from '../../middlewares/csrf.middleware';
import { validateRequest } from '../../middlewares/validate.middleware';
import {
  cancelOrderSchema,
  createOrderSchema,
  listOrdersQuerySchema,
  orderIdParamSchema,
} from './order.validation';

export const orderRouter = Router();

orderRouter.use(requireAuth);

orderRouter.get(
  '/',
  validateRequest({ query: listOrdersQuerySchema }),
  asyncHandler(OrderController.listMyOrders)
);

orderRouter.post(
  '/',
  requireCsrfProtection,
  validateRequest({ body: createOrderSchema }),
  asyncHandler(OrderController.createOrder)
);

orderRouter.get(
  '/:id',
  validateRequest({ params: orderIdParamSchema }),
  asyncHandler(OrderController.getOrderById)
);

orderRouter.post(
  '/:id/cancel',
  requireCsrfProtection,
  validateRequest({ params: orderIdParamSchema, body: cancelOrderSchema }),
  asyncHandler(OrderController.cancelOrder)
);
