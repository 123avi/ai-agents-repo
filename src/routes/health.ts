import { Router, Request, Response } from 'express';

const HEALTH_CHECK_VERSION = '1.0.0';

/**
 * Health check router
 * Provides system health status endpoint
 */
export const healthRouter = Router();

/**
 * Health check endpoint
 * Returns server status and basic system information
 * @route GET /health
 */
healthRouter.get('/', (req: Request, res: Response) => {
  try {
    const healthStatus = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: HEALTH_CHECK_VERSION,
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development'
    };

    res.status(200).json(healthStatus);
  } catch (error) {
    console.error('Health check failed:', error);
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: 'Health check failed'
    });
  }
});