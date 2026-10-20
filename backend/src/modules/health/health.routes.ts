import { Router } from 'express';
import { healthController } from './health.controller';

const healthRouter = Router();

/**
 * GET /api/v1/health (and /api/health alias)
 * Returns server health status and PostgreSQL database connectivity.
 */
healthRouter.get('/', healthController.checkHealth);

export { healthRouter };
