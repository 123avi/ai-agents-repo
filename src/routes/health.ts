import { Request, Response } from 'express';
import { DatabaseHealthChecker } from '../database/health';

/**
 * Health check route handler
 */
export class HealthController {
  private healthChecker: DatabaseHealthChecker;

  constructor() {
    this.healthChecker = new DatabaseHealthChecker();
  }

  /**
   * Handle health check endpoint request
   * @param {Request} req Express request object
   * @param {Response} res Express response object
   * @returns {Promise<void>}
   */
  public async checkHealth(req: Request, res: Response): Promise<void> {
    try {
      const healthStatus = await this.healthChecker.checkHealth();
      
      const httpStatus = healthStatus.status === 'healthy' ? 200 : 503;
      
      res.status(httpStatus).json({
        service: 'todo-api',
        database: healthStatus,
        uptime: process.uptime(),
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Health check endpoint error:', error);
      
      res.status(500).json({
        service: 'todo-api',
        database: {
          status: 'unhealthy',
          timestamp: new Date().toISOString(),
          error: 'Health check failed'
        },
        uptime: process.uptime(),
        timestamp: new Date().toISOString()
      });
    }
  }
}

/**
 * Create health controller instance
 * @returns {HealthController} Health controller instance
 */
export function createHealthController(): HealthController {
  return new HealthController();
}