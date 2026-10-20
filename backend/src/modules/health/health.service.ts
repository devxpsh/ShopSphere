import { env } from '../../config/env';
import { prisma } from '../../config/prisma';

export interface HealthStatusResult {
  status: 'ok' | 'degraded';
  service: string;
  environment: string;
  timestamp: string;
  uptimeSeconds: number;
  database: {
    status: 'connected' | 'disconnected';
    latencyMs?: number;
    error?: string;
  };
}

export class HealthService {
  public async getHealthStatus(): Promise<HealthStatusResult> {
    const start = Date.now();
    let dbStatus: 'connected' | 'disconnected' = 'disconnected';
    let latencyMs: number | undefined;
    let dbError: string | undefined;

    try {
      await prisma.$queryRaw`SELECT 1`;
      dbStatus = 'connected';
      latencyMs = Date.now() - start;
    } catch (error) {
      dbStatus = 'disconnected';
      dbError =
        env.NODE_ENV === 'production'
          ? 'Database connection check failed'
          : error instanceof Error
            ? error.message
            : 'Unknown database error';
    }

    return {
      status: dbStatus === 'connected' ? 'ok' : 'degraded',
      service: 'shopsphere-backend',
      environment: env.NODE_ENV,
      timestamp: new Date().toISOString(),
      uptimeSeconds: Math.floor(process.uptime()),
      database: {
        status: dbStatus,
        ...(latencyMs !== undefined ? { latencyMs } : {}),
        ...(dbError ? { error: dbError } : {}),
      },
    };
  }
}

export const healthService = new HealthService();
