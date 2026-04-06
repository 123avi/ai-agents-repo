import { DatabaseConnection } from './connection';

/**
 * Database health check status
 */
export interface DatabaseHealthStatus {
  status: 'healthy' | 'unhealthy';
  timestamp: string;
  details: {
    totalConnections: number;
    idleConnections: number;
    waitingCount: number;
    responseTime?: number;
  };
  error?: string;
}

/**
 * Database health checker
 */
export class DatabaseHealthChecker {
  private dbConnection: DatabaseConnection;

  constructor() {
    this.dbConnection = DatabaseConnection.getInstance();
  }

  /**
   * Check database health and connection status
   * @returns {Promise<DatabaseHealthStatus>} Health status information
   */
  public async checkHealth(): Promise<DatabaseHealthStatus> {
    const timestamp = new Date().toISOString();
    
    try {
      const startTime = Date.now();
      await this.performHealthQuery();
      const responseTime = Date.now() - startTime;
      
      const pool = this.dbConnection.getPool();
      const poolStats = this.getPoolStatistics(pool);
      
      return {
        status: 'healthy',
        timestamp,
        details: {
          ...poolStats,
          responseTime
        }
      };
    } catch (error) {
      console.error('Database health check failed:', error);
      
      const pool = this.dbConnection.getPool();
      const poolStats = this.getPoolStatistics(pool);
      
      return {
        status: 'unhealthy',
        timestamp,
        details: poolStats,
        error: error instanceof Error ? error.message : 'Unknown database error'
      };
    }
  }

  /**
   * Perform simple query to test database connectivity
   * @returns {Promise<void>}
   */
  private async performHealthQuery(): Promise<void> {
    await this.dbConnection.query('SELECT 1 as health_check');
  }

  /**
   * Get connection pool statistics
   * @param {any} pool Connection pool instance
   * @returns {object} Pool statistics
   */
  private getPoolStatistics(pool: any): {
    totalConnections: number;
    idleConnections: number;
    waitingCount: number;
  } {
    return {
      totalConnections: pool.totalCount || 0,
      idleConnections: pool.idleCount || 0,
      waitingCount: pool.waitingCount || 0
    };
  }
}