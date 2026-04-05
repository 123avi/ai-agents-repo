import { Router, Request, Response } from 'express';
import { checkDatabaseHealth } from '../config/database';

const router = Router();

/**
 * Health check endpoint that includes database connectivity status
 * @route GET /health
 * @returns JSON response with application and database health status
 */
router.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const dbHealth = await checkDatabaseHealth();
    
    const healthStatus = {
      status: dbHealth.status === 'healthy' ? 'ok' : 'error',
      timestamp: new Date().toISOString(),
      services: {
        database: {
          status: dbHealth.status,
          connections: dbHealth.details
        }
      }
    };

    const statusCode = dbHealth.status === 'healthy' ? 200 : 503;
    res.status(statusCode).json(healthStatus);
  } catch (error) {
    console.error('Health check error:', error);
    
    res.status(503).json({
      status: 'error',
      timestamp: new Date().toISOString(),
      services: {
        database: {
          status: 'unhealthy',
          error: 'Connection check failed'
        }
      }
    });
  }
});

export { router as healthRouter };