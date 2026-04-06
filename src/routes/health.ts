/**
 * Health check endpoint implementation
 * Provides application and database connectivity status
 */

import { Request, Response } from 'express';
import { Pool } from 'pg';

const HEALTH_CHECK_TIMEOUT = 5000;
const DB_HEALTH_QUERY = 'SELECT 1';

/**
 * Database connection pool for health checks
 */
let dbPool: Pool | null = null;

/**
 * Initialize database pool for health checks
 * @param pool - PostgreSQL connection pool instance
 */
export function initializeHealthCheck(pool: Pool): void {
  dbPool = pool;
}

/**
 * Check database connectivity
 * @returns Promise resolving to database health status
 */
async function checkDatabaseHealth(): Promise<{ healthy: boolean; error?: string }> {
  if (!dbPool) {
    return { healthy: false, error: 'Database pool not initialized' };
  }

  try {
    const client = await dbPool.connect();
    await client.query(DB_HEALTH_QUERY);
    client.release();
    return { healthy: true };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown database error';
    return { healthy: false, error: errorMessage };
  }
}

/**
 * Health check endpoint handler
 * Returns 200 for healthy, 503 for unhealthy
 * @param req - Express request object
 * @param res - Express response object
 */
export async function healthCheck(req: Request, res: Response): Promise<void> {
  const startTime = Date.now();
  
  try {
    const dbHealth = await Promise.race([
      checkDatabaseHealth(),
      new Promise<{ healthy: boolean; error: string }>((_, reject) => 
        setTimeout(() => reject(new Error('Health check timeout')), HEALTH_CHECK_TIMEOUT)
      )
    ]);

    const responseTime = Date.now() - startTime;
    const isHealthy = dbHealth.healthy;

    const healthStatus = {
      status: isHealthy ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      responseTime,
      database: {
        status: dbHealth.healthy ? 'connected' : 'disconnected',
        error: dbHealth.error
      },
      environment: process.env.NODE_ENV || 'unknown'
    };

    res.status(isHealthy ? 200 : 503).json(healthStatus);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Health check failed';
    
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: errorMessage,
      responseTime: Date.now() - startTime
    });
  }
}