import { Request, Response } from 'express';
import { checkDatabaseHealth } from '../config/database';
import { logger } from '../utils/logger';

/**
 * Health check response interface
 */
interface HealthCheckResponse {
  success: boolean;
  data?: {
    status: string;
    database: string;
    timestamp: string;
  };
  error?: {
    code: string;
    message: string;
  };
}

/**
 * Database health check endpoint handler
 * Returns the current status of database connection
 * @param req Express request object
 * @param res Express response object
 */
export async function healthCheck(req: Request, res: Response): Promise<void> {
  try {
    const isDatabaseHealthy = await checkDatabaseHealth();
    
    if (isDatabaseHealthy) {
      const response: HealthCheckResponse = {
        success: true,
        data: {
          status: 'healthy',
          database: 'connected',
          timestamp: new Date().toISOString()
        }
      };
      
      res.status(200).json(response);
      logger.info('Health check passed - database connection healthy');
    } else {
      const response: HealthCheckResponse = {
        success: false,
        error: {
          code: 'DATABASE_UNHEALTHY',
          message: 'Database connection is not healthy'
        }
      };
      
      res.status(503).json(response);
      logger.warn('Health check failed - database connection unhealthy');
    }
  } catch (error) {
    logger.error('Health check error:', error);
    
    const response: HealthCheckResponse = {
      success: false,
      error: {
        code: 'HEALTH_CHECK_ERROR',
        message: 'Error performing health check'
      }
    };
    
    res.status(500).json(response);
  }
}