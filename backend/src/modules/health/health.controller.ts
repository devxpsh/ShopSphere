import { Request, Response } from 'express';
import { asyncHandler } from '../../utils/asyncHandler';
import { healthService } from './health.service';

export class HealthController {
  public checkHealth = asyncHandler(async (_req: Request, res: Response): Promise<void> => {
    const result = await healthService.getHealthStatus();
    const httpStatus = result.status === 'ok' ? 200 : 503;

    res.status(httpStatus).json({
      success: result.status === 'ok',
      data: result,
    });
  });
}

export const healthController = new HealthController();
