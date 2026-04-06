import { Router, Request, Response } from 'express';
import { DatabasePool } from '../config/database';

const router = Router();

/**
 * Health check endpoint
 * Tests database connectivity using the main application's connection pool
 */
router.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const isDbHealthy = await DatabasePool.testConnection();
    
    if (!isDbHealthy) {
      res.status(503).json({
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        services: {
          database: 'down'
        }
      });
      return;
    }

    res.status(200).json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      services: {
        database: 'up'
      }
    });
  } catch (error) {
    console.error('Health check failed:', error);
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: 'Internal server error'
    });
  }
});

export default router;