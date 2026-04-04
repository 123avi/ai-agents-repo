import { DatabaseConnection } from '../connection';

// Mock pg module
jest.mock('pg', () => ({
  Pool: jest.fn().mockImplementation(() => ({
    on: jest.fn(),
    end: jest.fn().mockResolvedValue(undefined),
  })),
}));

describe('DatabaseConnection', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should create singleton instance', () => {
    const instance1 = DatabaseConnection.getInstance();
    const instance2 = DatabaseConnection.getInstance();
    
    expect(instance1).toBe(instance2);
  });

  it('should return pool instance', () => {
    const connection = DatabaseConnection.getInstance();
    const pool = connection.getPool();
    
    expect(pool).toBeDefined();
  });

  it('should close pool connections', async () => {
    const connection = DatabaseConnection.getInstance();
    const pool = connection.getPool();
    
    await connection.close();
    
    expect(pool.end).toHaveBeenCalled();
  });
});