import { Migrator } from '../migrator';
import { db } from '../connection';
import * as fs from 'fs';

// Mock dependencies
jest.mock('../connection');
jest.mock('fs');

const mockDb = db as jest.Mocked<typeof db>;
const mockFs = fs as jest.Mocked<typeof fs>;

describe('Migrator', () => {
  let migrator: Migrator;

  beforeEach(() => {
    migrator = new Migrator();
    jest.clearAllMocks();
  });

  it('should run pending migrations', async () => {
    // Mock executed migrations query
    mockDb.query
      .mockResolvedValueOnce({ rows: [] } as any) // create table
      .mockResolvedValueOnce({ rows: [] } as any) // get executed migrations
      .mockResolvedValueOnce({ rows: [] } as any) // BEGIN
      .mockResolvedValueOnce({ rows: [] } as any) // migration SQL
      .mockResolvedValueOnce({ rows: [] } as any) // insert into migrations table
      .mockResolvedValueOnce({ rows: [] } as any); // COMMIT

    // Mock filesystem
    mockFs.readdirSync.mockReturnValue(['001_test.sql'] as any);
    mockFs.readFileSync.mockReturnValue('CREATE TABLE test();');

    const count = await migrator.runMigrations();

    expect(count).toBe(1);
    expect(mockDb.query).toHaveBeenCalledWith('BEGIN');
    expect(mockDb.query).toHaveBeenCalledWith('CREATE TABLE test();');
    expect(mockDb.query).toHaveBeenCalledWith('COMMIT');
  });

  it('should rollback on migration failure', async () => {
    // Mock setup queries
    mockDb.query
      .mockResolvedValueOnce({ rows: [] } as any) // create table
      .mockResolvedValueOnce({ rows: [] } as any) // get executed migrations
      .mockResolvedValueOnce({ rows: [] } as any) // BEGIN
      .mockRejectedValueOnce(new Error('Migration failed')) // migration SQL fails
      .mockResolvedValueOnce({ rows: [] } as any); // ROLLBACK

    // Mock filesystem
    mockFs.readdirSync.mockReturnValue(['001_test.sql'] as any);
    mockFs.readFileSync.mockReturnValue('INVALID SQL;');

    await expect(migrator.runMigrations()).rejects.toThrow('Migration failed');
    expect(mockDb.query).toHaveBeenCalledWith('ROLLBACK');
  });

  it('should skip already executed migrations', async () => {
    // Mock that migration 1 is already executed
    mockDb.query
      .mockResolvedValueOnce({ rows: [] } as any) // create table
      .mockResolvedValueOnce({ rows: [{ id: 1 }] } as any); // get executed migrations

    // Mock filesystem
    mockFs.readdirSync.mockReturnValue(['001_test.sql'] as any);
    mockFs.readFileSync.mockReturnValue('CREATE TABLE test();');

    const count = await migrator.runMigrations();

    expect(count).toBe(0);
    // Should not execute BEGIN/COMMIT since no pending migrations
    expect(mockDb.query).not.toHaveBeenCalledWith('BEGIN');
  });
});