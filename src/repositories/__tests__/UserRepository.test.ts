import { Pool } from 'pg';
import bcrypt from 'bcrypt';
import { UserRepository, CreateUserInput } from '../UserRepository';

// Mock dependencies
jest.mock('pg');
jest.mock('bcrypt');

const mockBcrypt = bcrypt as jest.Mocked<typeof bcrypt>;

/**
 * Creates a mock PostgreSQL database error with proper error structure
 * @param code - PostgreSQL error code
 * @param message - Error message
 * @returns Mock database error object
 */
const createMockDbError = (code: string, message: string) => {
  const error = new Error(message) as any;
  error.code = code;
  error.severity = 'ERROR';
  error.detail = `Key (email)=(test@example.com) already exists.`;
  error.table = 'users';
  error.constraint = 'users_email_key';
  return error;
};

describe('UserRepository', () => {
  let userRepository: UserRepository;
  let mockPool: jest.Mocked<Pool>;
  let mockClient: any;

  beforeEach(() => {
    mockClient = {
      query: jest.fn(),
      release: jest.fn()
    };
    
    mockPool = {
      connect: jest.fn().mockResolvedValue(mockClient)
    } as any;
    
    userRepository = new UserRepository(mockPool);
    
    // Reset mocks
    jest.clearAllMocks();
    mockBcrypt.hash.mockResolvedValue('hashed_password_123');
  });

  describe('createUser', () => {
    /**
     * Tests successful user creation with valid email and password data
     * Validates that password is properly hashed and user data is stored
     */
    it('should create a user with valid data', async () => {
      const userData: CreateUserInput = {
        email: 'test@example.com',
        password: 'password123'
      };
      
      const expectedUser = {
        id: 1,
        email: 'test@example.com',
        password_hash: 'hashed_password_123',
        created_at: new Date('2024-01-01')
      };
      
      mockClient.query.mockResolvedValue({ rows: [expectedUser] });
      
      const result = await userRepository.createUser(userData);
      
      expect(mockBcrypt.hash).toHaveBeenCalledWith('password123', 10);
      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO users'),
        ['test@example.com', 'hashed_password_123']
      );
      expect(result).toEqual(expectedUser);
      expect(mockClient.release).toHaveBeenCalled();
    });

    /**
     * Tests duplicate email rejection by validating PostgreSQL unique constraint violation
     * Ensures proper error message is thrown when email already exists
     */
    it('should reject duplicate email with specific error message', async () => {
      const userData: CreateUserInput = {
        email: 'existing@example.com',
        password: 'password123'
      };
      
      const dbError = createMockDbError('23505', 'duplicate key value violates unique constraint');
      mockClient.query.mockRejectedValue(dbError);
      
      await expect(userRepository.createUser(userData))
        .rejects
        .toThrow('Email already exists');
      
      expect(mockClient.release).toHaveBeenCalled();
    });

    /**
     * Tests database error handling for non-constraint related failures
     * Validates proper error propagation and client cleanup
     */
    it('should handle database errors during user creation', async () => {
      const userData: CreateUserInput = {
        email: 'test@example.com',
        password: 'password123'
      };
      
      const dbError = new Error('Connection timeout');
      mockClient.query.mockRejectedValue(dbError);
      
      await expect(userRepository.createUser(userData))
        .rejects
        .toThrow('Database error: Connection timeout');
      
      expect(mockClient.release).toHaveBeenCalled();
    });
  });

  describe('getUserByEmail', () => {
    /**
     * Tests successful user retrieval by email address using prepared statements
     * Validates SQL injection prevention and proper query parameterization
     */
    it('should retrieve user by email using prepared statements', async () => {
      const email = 'test@example.com';
      const expectedUser = {
        id: 1,
        email: 'test@example.com',
        password_hash: 'hashed_password_123',
        created_at: new Date('2024-01-01')
      };
      
      mockClient.query.mockResolvedValue({ rows: [expectedUser] });
      
      const result = await userRepository.getUserByEmail(email);
      
      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT id, email, password_hash, created_at FROM users WHERE email = $1'),
        [email]
      );
      expect(result).toEqual(expectedUser);
      expect(mockClient.release).toHaveBeenCalled();
    });

    /**
     * Tests handling of non-existent user lookup
     * Validates that null is returned when user is not found
     */
    it('should return null when user is not found', async () => {
      const email = 'nonexistent@example.com';
      
      mockClient.query.mockResolvedValue({ rows: [] });
      
      const result = await userRepository.getUserByEmail(email);
      
      expect(result).toBeNull();
      expect(mockClient.release).toHaveBeenCalled();
    });

    /**
     * Tests database error handling during user retrieval operations
     * Validates proper error propagation and resource cleanup
     */
    it('should handle database errors during retrieval', async () => {
      const email = 'test@example.com';
      const dbError = createMockDbError('08006', 'connection_failure');
      
      mockClient.query.mockRejectedValue(dbError);
      
      await expect(userRepository.getUserByEmail(email))
        .rejects
        .toThrow('Database error: connection_failure');
      
      expect(mockClient.release).toHaveBeenCalled();
    });
  });

  describe('prepared statement usage', () => {
    /**
     * Tests that all database queries use parameterized prepared statements
     * Validates SQL injection prevention across all repository methods
     */
    it('should use prepared statements for all queries to prevent SQL injection', async () => {
      const userData: CreateUserInput = {
        email: "test'; DROP TABLE users; --",
        password: 'password123'
      };
      
      mockClient.query.mockResolvedValue({ rows: [{ id: 1 }] });
      
      await userRepository.createUser(userData);
      
      // Verify parameterized query was used
      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('$1'),
        expect.arrayContaining(["test'; DROP TABLE users; --"])
      );
      
      // Test retrieval also uses parameters
      await userRepository.getUserByEmail("test'; DROP TABLE users; --");
      
      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('$1'),
        ["test'; DROP TABLE users; --"]
      );
    });
  });
});