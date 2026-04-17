import { Request, Response } from 'express';
import { HTTP_STATUS } from '../constants/server.js';

/**
 * Health check response interface
 */
interface HealthCheckResponse {
  status: 'ok' | 'error';
  timestamp: string;
  uptime: number;
  environment: string;
  version: string;
}

/**
 * Health check controller
 * Provides application health status for monitoring and load balancers
 */
export class HealthController {
  /**
   * Handle health check requests
   */
  public static async checkHealth(req: Request, res: Response): Promise<void> {
    try {
      const healthStatus: HealthCheckResponse = {
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: process.env.NODE_ENV ?? 'development',
        version: process.env.npm_package_version ?? '1.0.0',
      };

      res.status(HTTP_STATUS.OK).json(healthStatus);
    } catch (error) {
      const errorResponse: HealthCheckResponse = {
        status: 'error',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: process.env.NODE_ENV ?? 'development',
        version: process.env.npm_package_version ?? '1.0.0',
      };

      console.error('Health check failed:', error);
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(errorResponse);
    }
  }
}