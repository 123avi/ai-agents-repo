import { Router, Request, Response } from 'express';
import { checkDatabaseHealth } from '../database/database';

const router = Router();

/**
 * Health check endpoint that verifies database connectivity
 * @route GET /health/database
 * @returns {Response} Health status with database connectivity information
 */
router.get('/database', async (req: Request, res: Response): Promise<void> => {
  try {
    const isHealthy = await checkDatabaseHealth();
    
    if (isHealthy) {
      res.status(200).json({
        status: 'healthy',
        database: 'connected',
        timestamp: new Date().toISOString()
      });
    } else {
      res.status(503).json({
        status: 'unhealthy',
        database: 'disconnected',
        timestamp: new Date().toISOString()
      });
    }
  } catch (error) {
    console.error('Health check endpoint error:', {
      name: (error as Error).name,
      message: (error as Error).message
    });
    
    res.status(503).json({
      status: 'error',
      database: 'error',
      timestamp: new Date().toISOString()
    });
  }
});

export default router;