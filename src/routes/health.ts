import { Router, Request, Response } from 'express';
import { checkDatabaseHealth } from '../database/pool';

const router = Router();

/**
 * Health check endpoint that returns database connection status
 * @route GET /health
 */
router.get('/health', async (req: Request, res: Response) => {
  try {
    const dbHealth = await checkDatabaseHealth();
    
    const healthStatus = {
      status: dbHealth.healthy ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
      database: {
        healthy: dbHealth.healthy,
        message: dbHealth.message
      }
    };

    const statusCode = dbHealth.healthy ? 200 : 503;
    res.status(statusCode).json(healthStatus);
  } catch (error) {
    res.status(500).json({
      status: 'error',
      timestamp: new Date().toISOString(),
      database: {
        healthy: false,
        message: 'Health check failed'
      }
    });
  }
});

export { router as healthRouter };