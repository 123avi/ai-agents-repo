import { Router, Request, Response } from 'express';
import { performHealthCheck } from '../utils/healthCheck';
import { logger } from '../utils/logger';

const router = Router();

/**
 * Health check endpoint
 * GET /health
 * Returns application and database health status
 */
router.get('/health', async (req: Request, res: Response) => {
  try {
    const healthStatus = await performHealthCheck();
    
    const statusCode = healthStatus.status === 'healthy' ? 200 : 503;
    
    res.status(statusCode).json(healthStatus);
    
    if (healthStatus.status === 'unhealthy') {
      logger.warn('Health check endpoint returned unhealthy status');
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Health check failed';
    logger.error('Health check endpoint error', { error: errorMessage });
    
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: errorMessage
    });
  }
});

export default router;