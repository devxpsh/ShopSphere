import { Router } from 'express';
import { requireAuth } from '../../middlewares/auth.middleware';
import { requireCsrf } from '../../middlewares/csrf.middleware';
import { authRateLimiter } from '../../middlewares/rateLimit.middleware';
import { validateRequest } from '../../middlewares/validate.middleware';
import { authController } from './auth.controller';
import { loginSchema, registerSchema, updateProfileSchema } from './auth.schemas';

const authRouter = Router();

authRouter.get('/csrf', authController.getCsrfToken);

authRouter.post(
  '/register',
  authRateLimiter,
  validateRequest({ body: registerSchema }),
  authController.register
);

authRouter.post(
  '/login',
  authRateLimiter,
  validateRequest({ body: loginSchema }),
  authController.login
);

authRouter.post('/refresh', authRateLimiter, authController.refresh);

authRouter.post('/logout', requireAuth, requireCsrf, authController.logout);

authRouter.get('/me', requireAuth, authController.getMe);

authRouter.patch(
  '/profile',
  requireAuth,
  requireCsrf,
  validateRequest({ body: updateProfileSchema }),
  authController.updateProfile
);

export { authRouter };
