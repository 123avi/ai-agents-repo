import { Router, Request, Response } from 'express';

/**
 * Health check response interface
 */
interface HealthResponse {
  status: string;
  timestamp: string;
  uptime: number;
}

/**
 * Health status constants
 */
const HEALTH_STATUS = {
  OK: 'ok'
} as const;

/**
 * Create health check router
 * @returns Express router with health endpoint
 */
export function createHealthRouter(): Router {
  const router = Router();
  
  /**
   * Health check endpoint
   * Returns 200 OK with system status
   */
  router.get('/health', (req: Request, res: Response<HealthResponse>) => {
    try {
      const healthResponse: HealthResponse = {
        status: HEALTH_STATUS.OK,
        timestamp: new Date().toISOString(),
        uptime: Math.floor(process.uptime())
      };
      
      res.status(200).json(healthResponse);
    } catch (error) {
      console.error('Health check error:', error);
      res.status(500).json({
        status: 'error',
        timestamp: new Date().toISOString(),
        uptime: 0
      });
    }
  });
  
  return router;
}