import { Role } from '@prisma/client';
import { Router } from 'express';
import { optionalAuth, requireAuth } from '../../middlewares/auth.middleware';
import { requireCsrf } from '../../middlewares/csrf.middleware';
import { requireRole } from '../../middlewares/role.middleware';
import { validateRequest } from '../../middlewares/validate.middleware';
import { productController } from './product.controller';
import {
  adjustInventorySchema,
  createProductSchema,
  productIdParamSchema,
  productListQuerySchema,
  updateProductSchema,
} from './product.schemas';

const productRouter = Router();

productRouter.get(
  '/',
  optionalAuth,
  validateRequest({ query: productListQuerySchema }),
  productController.listProducts
);

productRouter.get('/:slugOrId', optionalAuth, productController.getProduct);

productRouter.post(
  '/',
  requireAuth,
  requireRole(Role.ADMIN),
  requireCsrf,
  validateRequest({ body: createProductSchema }),
  productController.createProduct
);

productRouter.patch(
  '/:id',
  requireAuth,
  requireRole(Role.ADMIN),
  requireCsrf,
  validateRequest({ params: productIdParamSchema, body: updateProductSchema }),
  productController.updateProduct
);

productRouter.patch(
  '/:id/inventory',
  requireAuth,
  requireRole(Role.ADMIN),
  requireCsrf,
  validateRequest({ params: productIdParamSchema, body: adjustInventorySchema }),
  productController.adjustInventory
);

productRouter.delete(
  '/:id',
  requireAuth,
  requireRole(Role.ADMIN),
  requireCsrf,
  validateRequest({ params: productIdParamSchema }),
  productController.deleteProduct
);

export { productRouter };
