import { Pool } from 'pg';
import { DatabaseMigrator } from '../migrations/migrator';
import { readFileSync } from 'fs';

// Mock fs module
jest.mock('fs');
const mockReadFileSync = readFileSync as jest.MockedFunction<typeof readFileSync>;

// Mock pool and client
const mockClient = {
  query: jest.fn(),
  release: jest.fn()
};

const mockPool = {
  query: jest.fn(),
  connect: jest.fn().mockResolvedValue(mockClient)
} as unknown as Pool;

describe('DatabaseMigrator', () => {
  let migrator: DatabaseMigrator;
  
  beforeEach(() => {
    migrator = new DatabaseMigrator(mockPool);
    jest.clearAllMocks();
  });

  describe('runMigrations', () => {
    it('should create migrations table and run pending migrations', async () => {
      // Setup mocks
      mockPool.query = jest.fn().mockResolvedValueOnce({ rows: [] }); // No executed migrations
      mockReadFileSync.mockReturnValue('CREATE TABLE test;');
      mockClient.query = jest.fn().mockResolvedValue({ rows: [] });
      
      await migrator.runMigrations();
      
      // Verify migrations table creation
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('CREATE TABLE IF NOT EXISTS schema_migrations')
      );
      
      // Verify migration execution
      expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
      expect(mockClient.query).toHaveBeenCalledWith('CREATE TABLE test;');
      expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
    });

    it('should skip already executed migrations', async () => {
      // Mock that migration 001 is already executed
      mockPool.query = jest.fn().mockResolvedValueOnce({
        rows: [{ version: '001' }]
      });
      mockReadFileSync.mockReturnValue('CREATE TABLE test2;');
      mockClient.query = jest.fn().mockResolvedValue({ rows: [] });
      
      await migrator.runMigrations();
      
      // Should only run migration 002
      expect(mockReadFileSync).toHaveBeenCalledTimes(1);
      expect(mockClient.query).toHaveBeenCalledWith(
        'INSERT INTO schema_migrations (version) VALUES ($1)',
        ['002']
      );
    });

    it('should rollback on migration failure', async () => {
      mockPool.query = jest.fn().mockResolvedValueOnce({ rows: [] });
      mockReadFileSync.mockReturnValue('INVALID SQL;');
      mockClient.query = jest.fn()
        .mockResolvedValueOnce(undefined) // BEGIN
        .mockRejectedValueOnce(new Error('SQL syntax error')); // Migration fails
      
      await expect(migrator.runMigrations()).rejects.toThrow('SQL syntax error');
      
      expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should handle empty migration list', async () => {
      // Mock all migrations as already executed
      mockPool.query = jest.fn().mockResolvedValueOnce({
        rows: [{ version: '001' }, { version: '002' }]
      });
      
      await migrator.runMigrations();
      
      // Should not try to read any files
      expect(mockReadFileSync).not.toHaveBeenCalled();
      expect(mockClient.query).not.toHaveBeenCalled();
    });
  });

  describe('error handling', () => {
    it('should handle database connection errors', async () => {
      const connectionError = new Error('Connection failed');
      mockPool.query = jest.fn().mockRejectedValue(connectionError);
      
      await expect(migrator.runMigrations()).rejects.toThrow('Connection failed');
    });

    it('should handle file read errors', async () => {
      mockPool.query = jest.fn().mockResolvedValueOnce({ rows: [] });
      mockReadFileSync.mockImplementation(() => {
        throw new Error('File not found');
      });
      
      await expect(migrator.runMigrations()).rejects.toThrow('File not found');
    });
  });
});