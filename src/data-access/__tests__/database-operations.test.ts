import { DatabaseOperations } from '../database-operations';
import { DatabaseConnection } from '../database-connection';
import { QuerySanitizer } from '../query-sanitizer';
import { DatabaseError } from '../errors';

// Mock dependencies
jest.mock('../database-connection');
jest.mock('../query-sanitizer');

const MockedDatabaseConnection = DatabaseConnection as jest.MockedClass<typeof DatabaseConnection>;
const MockedQuerySanitizer = QuerySanitizer as jest.MockedClass<typeof QuerySanitizer>;

describe('DatabaseOperations', () => {
  let dbOperations: DatabaseOperations;
  let mockConnection: jest.Mocked<DatabaseConnection>;
  let mockSanitizer: jest.Mocked<QuerySanitizer>;
  let mockClient: any;

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockClient = {
      query: jest.fn(),
      release: jest.fn()
    };
    
    mockConnection = {
      getConnection: jest.fn().mockResolvedValue(mockClient),
      healthCheck: jest.fn(),
      close: jest.fn()
    } as any;
    
    mockSanitizer = {
      sanitizeString: jest.fn().mockImplementation(str => str),
      sanitizeInteger: jest.fn().mockImplementation(num => num),
      sanitizeUuid: jest.fn().mockImplementation(uuid => uuid),
      sanitizeEmail: jest.fn().mockImplementation(email => email),
      sanitizeStringArray: jest.fn().mockImplementation(arr => arr)
    } as any;
    
    MockedDatabaseConnection.mockImplementation(() => mockConnection);
    MockedQuerySanitizer.mockImplementation(() => mockSanitizer);
    
    dbOperations = new DatabaseOperations(mockConnection, mockSanitizer);
  });

  describe('Connection management', () => {
    it('should acquire and release connections properly', async () => {
      mockClient.query.mockResolvedValue({ rows: [], rowCount: 0 });
      
      await dbOperations.executeQuery('SELECT 1', []);
      
      expect(mockConnection.getConnection).toHaveBeenCalled();
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should release connection even if query fails', async () => {
      mockClient.query.mockRejectedValue(new Error('Query failed'));
      
      await expect(dbOperations.executeQuery('SELECT 1', []))
        .rejects.toThrow(DatabaseError);
      
      expect(mockClient.release).toHaveBeenCalled();
    });
  });

  describe('Query execution', () => {
    it('should execute queries with sanitized parameters', async () => {
      const expectedResult = { rows: [{ id: 1 }], rowCount: 1 };
      mockClient.query.mockResolvedValue(expectedResult);
      
      const result = await dbOperations.executeQuery(
        'SELECT * FROM todos WHERE user_id = $1',
        ['user-123']
      );
      
      expect(mockSanitizer.sanitizeString).toHaveBeenCalledWith('user-123');
      expect(mockClient.query).toHaveBeenCalledWith(
        'SELECT * FROM todos WHERE user_id = $1',
        ['user-123']
      );
      expect(result).toEqual(expectedResult);
    });

    it('should handle query errors and wrap them', async () => {
      const originalError = new Error('Constraint violation');
      mockClient.query.mockRejectedValue(originalError);
      
      await expect(
        dbOperations.executeQuery('INSERT INTO todos VALUES ($1)', ['invalid'])
      ).rejects.toThrow(DatabaseError);
    });

    it('should log query execution details', async () => {
      const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
      mockClient.query.mockResolvedValue({ rows: [], rowCount: 0 });
      
      await dbOperations.executeQuery('SELECT 1', []);
      
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Executing query'),
        expect.objectContaining({
          query: 'SELECT 1',
          paramCount: 0
        })
      );
      consoleLogSpy.mockRestore();
    });
  });

  describe('Transaction support', () => {
    it('should handle transactions with commit', async () => {
      mockClient.query
        .mockResolvedValueOnce({ rows: [], rowCount: 0 }) // BEGIN
        .mockResolvedValueOnce({ rows: [{ id: 1 }], rowCount: 1 }) // INSERT
        .mockResolvedValueOnce({ rows: [], rowCount: 0 }); // COMMIT
      
      const result = await dbOperations.executeTransaction(async (client) => {
        return await client.query('INSERT INTO todos VALUES ($1)', ['test']);
      });
      
      expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
      expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
      expect(result).toEqual({ rows: [{ id: 1 }], rowCount: 1 });
    });

    it('should rollback transactions on error', async () => {
      mockClient.query
        .mockResolvedValueOnce({ rows: [], rowCount: 0 }) // BEGIN
        .mockRejectedValueOnce(new Error('Insert failed')) // INSERT
        .mockResolvedValueOnce({ rows: [], rowCount: 0 }); // ROLLBACK
      
      await expect(
        dbOperations.executeTransaction(async (client) => {
          throw new Error('Insert failed');
        })
      ).rejects.toThrow(DatabaseError);
      
      expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
    });

    it('should handle rollback errors gracefully', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      mockClient.query
        .mockResolvedValueOnce({ rows: [], rowCount: 0 }) // BEGIN
        .mockRejectedValueOnce(new Error('Insert failed')) // INSERT
        .mockRejectedValueOnce(new Error('Rollback failed')); // ROLLBACK
      
      await expect(
        dbOperations.executeTransaction(async (client) => {
          throw new Error('Insert failed');
        })
      ).rejects.toThrow(DatabaseError);
      
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Error during transaction rollback:',
        expect.objectContaining({ message: 'Rollback failed' })
      );
      consoleErrorSpy.mockRestore();
    });
  });

  describe('Health check integration', () => {
    it('should perform database health checks', async () => {
      const healthResult = { isHealthy: true, timestamp: new Date() };
      mockConnection.healthCheck.mockResolvedValue(healthResult);
      
      const result = await dbOperations.checkHealth();
      
      expect(mockConnection.healthCheck).toHaveBeenCalled();
      expect(result).toEqual(healthResult);
    });

    it('should handle health check failures', async () => {
      const healthResult = {
        isHealthy: false,
        error: 'Connection timeout',
        timestamp: new Date()
      };
      mockConnection.healthCheck.mockResolvedValue(healthResult);
      
      const result = await dbOperations.checkHealth();
      
      expect(result.isHealthy).toBe(false);
      expect(result.error).toBe('Connection timeout');
    });
  });
});