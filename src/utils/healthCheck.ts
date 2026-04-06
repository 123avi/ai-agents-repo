import { db } from '../config/database';
import { logger } from './logger';

/**
 * Health check status interface
 */
interface HealthStatus {
  status: 'healthy' | 'unhealthy';
  timestamp: string;
  services: {
    database: {
      connected: boolean;
      error?: string;
      responseTime?: number;
    };
  };
}

/**
 * Perform comprehensive application health check
 * Tests database connectivity and returns detailed status
 * @returns Promise<HealthStatus> - Complete health status
 */
export async function performHealthCheck(): Promise<HealthStatus> {
  const startTime = Date.now();
  const timestamp = new Date().toISOString();
  
  try {
    const dbStatus = await db.testConnection();
    const responseTime = Date.now() - startTime;
    
    const healthStatus: HealthStatus = {
      status: dbStatus.connected ? 'healthy' : 'unhealthy',
      timestamp,
      services: {
        database: {
          connected: dbStatus.connected,
          responseTime,
          error: dbStatus.error
        }
      }
    };
    
    if (!dbStatus.connected) {
      logger.warn('Health check failed - database unavailable', { 
        error: dbStatus.error,
        details: dbStatus.details 
      });
    }
    
    return healthStatus;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown health check error';
    logger.error('Health check exception', { error: errorMessage });
    
    return {
      status: 'unhealthy',
      timestamp,
      services: {
        database: {
          connected: false,
          error: errorMessage
        }
      }
    };
  }
}