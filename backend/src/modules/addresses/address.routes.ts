import { Router } from 'express';
import { requireAuth } from '../../middlewares/auth.middleware';
import { requireCsrfProtection } from '../../middlewares/csrf.middleware';
import { validateRequest } from '../../middlewares/validate.middleware';
import { addressController } from './address.controller';
import {
  addressIdParamSchema,
  createAddressSchema,
  updateAddressSchema,
} from './address.validation';

export const addressRouter = Router();

addressRouter.use(requireAuth);

addressRouter.get('/', addressController.list);
addressRouter.get(
  '/:id',
  validateRequest(addressIdParamSchema),
  addressController.getById
);
addressRouter.post(
  '/',
  requireCsrfProtection,
  validateRequest(createAddressSchema),
  addressController.create
);
addressRouter.patch(
  '/:id',
  requireCsrfProtection,
  validateRequest(updateAddressSchema),
  addressController.update
);
addressRouter.delete(
  '/:id',
  requireCsrfProtection,
  validateRequest(addressIdParamSchema),
  addressController.remove
);
