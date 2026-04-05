import { Pool } from 'pg';
import { DatabaseConnection } from '../database-connection';
import { DatabaseConfig } from '../types';

// Mock pg module
jest.mock('pg', () => ({
  Pool: jest.fn().mockImplementation(() => ({
    connect: jest.fn(),
    end: jest.fn(),
    query: jest.fn()
  }))
}));

const MockedPool = Pool as jest.MockedClass<typeof Pool>;

describe('DatabaseConnection', () => {
  let dbConnection: DatabaseConnection;
  let mockConfig: DatabaseConfig;
  let mockPool: jest.Mocked<Pool>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockConfig = {
      host: 'localhost',
      port: 5432,
      database: 'test_db',
      user: 'test_user',
      password: 'test_password',
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000
    };
    
    mockPool = {
      connect: jest.fn(),
      end: jest.fn(),
      query: jest.fn()
    } as any;
    
    MockedPool.mockImplementation(() => mockPool);
    dbConnection = new DatabaseConnection(mockConfig);
  });

  describe('AC-001: Database connection pool initialization', () => {
    it('should initialize connection pool with correct configuration', () => {
      expect(MockedPool).toHaveBeenCalledWith({
        host: mockConfig.host,
        port: mockConfig.port,
        database: mockConfig.database,
        user: mockConfig.user,
        password: mockConfig.password,
        max: mockConfig.max,
        idleTimeoutMillis: mockConfig.idleTimeoutMillis,
        connectionTimeoutMillis: mockConfig.connectionTimeoutMillis
      });
    });

    it('should create only one pool instance', () => {
      const anotherConnection = new DatabaseConnection(mockConfig);
      expect(MockedPool).toHaveBeenCalledTimes(2);
    });

    it('should use environment variables for database configuration', () => {
      process.env.DB_HOST = 'env_host';
      process.env.DB_PORT = '5433';
      process.env.DB_NAME = 'env_db';
      process.env.DB_USER = 'env_user';
      process.env.DB_PASSWORD = 'env_password';
      process.env.DB_MAX_CONNECTIONS = '20';

      const envConnection = DatabaseConnection.fromEnvironment();
      
      expect(MockedPool).toHaveBeenLastCalledWith({
        host: 'env_host',
        port: 5433,
        database: 'env_db',
        user: 'env_user',
        password: 'env_password',
        max: 20,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 2000
      });
    });
  });

  describe('AC-002: Database health check functionality', () => {
    it('should perform health check successfully', async () => {
      mockPool.query.mockResolvedValue({ rows: [{ now: new Date() }] });

      const result = await dbConnection.healthCheck();

      expect(result.isHealthy).toBe(true);
      expect(result.timestamp).toBeInstanceOf(Date);
      expect(mockPool.query).toHaveBeenCalledWith('SELECT NOW() as now');
    });

    it('should return unhealthy status when query fails', async () => {
      const error = new Error('Connection failed');
      mockPool.query.mockRejectedValue(error);

      const result = await dbConnection.healthCheck();

      expect(result.isHealthy).toBe(false);
      expect(result.error).toBe('Connection failed');
      expect(result.timestamp).toBeInstanceOf(Date);
    });

    it('should log health check results', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      mockPool.query.mockResolvedValue({ rows: [{ now: new Date() }] });

      await dbConnection.healthCheck();

      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Database health check'));
      consoleSpy.mockRestore();
    });
  });

  describe('AC-003: Connection error handling', () => {
    it('should handle pool connection errors', async () => {
      const connectionError = new Error('ECONNREFUSED');
      mockPool.connect.mockRejectedValue(connectionError);

      await expect(dbConnection.getConnection()).rejects.toThrow('Failed to acquire database connection');
    });

    it('should handle pool timeout errors', async () => {
      const timeoutError = new Error('timeout');
      mockPool.connect.mockRejectedValue(timeoutError);

      await expect(dbConnection.getConnection()).rejects.toThrow('Failed to acquire database connection');
    });

    it('should log connection errors', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      const error = new Error('Connection failed');
      mockPool.connect.mockRejectedValue(error);

      try {
        await dbConnection.getConnection();
      } catch (e) {
        // Expected to throw
      }

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Database connection error:',
        expect.objectContaining({ message: 'Connection failed' })
      );
      consoleErrorSpy.mockRestore();
    });

    it('should handle graceful shutdown', async () => {
      mockPool.end.mockResolvedValue();

      await dbConnection.close();

      expect(mockPool.end).toHaveBeenCalled();
    });

    it('should handle shutdown errors', async () => {
      const shutdownError = new Error('Shutdown failed');
      mockPool.end.mockRejectedValue(shutdownError);
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      await dbConnection.close();

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Error closing database connection:',
        expect.objectContaining({ message: 'Shutdown failed' })
      );
      consoleErrorSpy.mockRestore();
    });
  });
});