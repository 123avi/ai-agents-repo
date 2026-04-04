import { Router, Request, Response } from 'express';
import { HTTP_STATUS } from '../app';

/**
 * Health check response interface
 */
interface HealthResponse {
  status: string;
  timestamp: string;
  uptime: number;
}

/**
 * Creates a router for health check endpoints
 * @returns {Router} Express router with health check routes
 */
export function createHealthRouter(): Router {
  const router = Router();

  /**
   * Health check endpoint
   * Returns basic application health status
   */
  router.get('/', (req: Request, res: Response) => {
    const healthResponse: HealthResponse = {
      status: 'OK',
      timestamp: new Date().toISOString(),
      uptime: process.uptime()
    };
    
    res.status(HTTP_STATUS.OK).json(healthResponse);
  });

  return router;
}