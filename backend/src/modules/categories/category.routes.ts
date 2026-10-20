import { Role } from '@prisma/client';
import { Router } from 'express';
import { optionalAuth, requireAuth } from '../../middlewares/auth.middleware';
import { requireCsrf } from '../../middlewares/csrf.middleware';
import { requireRole } from '../../middlewares/role.middleware';
import { validateRequest } from '../../middlewares/validate.middleware';
import { categoryController } from './category.controller';
import {
  categoryIdParamSchema,
  createCategorySchema,
  updateCategorySchema,
} from './category.schemas';

const categoryRouter = Router();

categoryRouter.get('/', optionalAuth, categoryController.listCategories);
categoryRouter.get('/:slugOrId', optionalAuth, categoryController.getCategory);

categoryRouter.post(
  '/',
  requireAuth,
  requireRole(Role.ADMIN),
  requireCsrf,
  validateRequest({ body: createCategorySchema }),
  categoryController.createCategory
);

categoryRouter.patch(
  '/:id',
  requireAuth,
  requireRole(Role.ADMIN),
  requireCsrf,
  validateRequest({ params: categoryIdParamSchema, body: updateCategorySchema }),
  categoryController.updateCategory
);

categoryRouter.delete(
  '/:id',
  requireAuth,
  requireRole(Role.ADMIN),
  requireCsrf,
  validateRequest({ params: categoryIdParamSchema }),
  categoryController.deleteCategory
);

export { categoryRouter };
