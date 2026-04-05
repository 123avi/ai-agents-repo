/**
 * Database connection health status interface
 */
export interface DatabaseHealth {
  status: 'healthy' | 'unhealthy';
  details: {
    totalConnections: number;
    idleConnections: number;
    waitingClients: number;
  };
}

/**
 * Database connection configuration interface
 */
export interface DatabaseConfig {
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
  max: number;
  min: number;
  connectionTimeoutMillis: number;
  idleTimeoutMillis: number;
  statement_timeout: number;
  ssl?: {
    rejectUnauthorized: boolean;
  } | false;
}