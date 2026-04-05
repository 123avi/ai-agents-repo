import { AuthRepository } from '../auth.repository';
import { Pool } from 'pg';
import bcrypt from 'bcrypt';

// Mock pg Pool
jest.mock('pg');
const MockedPool = Pool as jest.MockedClass<typeof Pool>;

// Mock bcrypt
jest.mock('bcrypt');
const mockedBcrypt = bcrypt as jest.Mocked<typeof bcrypt>;

describe('AuthRepository', () => {
  let authRepository: AuthRepository;
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
    
    MockedPool.mockImplementation(() => mockPool);
    
    authRepository = new AuthRepository();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createUser', () => {
    it('should create user successfully', async () => {
      // AC-001: Test user creation success path
      const mockUser = {
        id: 1,
        email: 'test@example.com',
        password_hash: 'hashed_password'
      };
      
      mockedBcrypt.hash.mockResolvedValue('hashed_password');
      mockClient.query.mockResolvedValueOnce({ rows: [mockUser] });

      const result = await authRepository.createUser('test@example.com', 'password123');

      expect(mockedBcrypt.hash).toHaveBeenCalledWith('password123', 12);
      expect(mockClient.query).toHaveBeenCalledWith(
        'INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING id, email',
        ['test@example.com', 'hashed_password']
      );
      expect(result).toEqual({ id: 1, email: 'test@example.com' });
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should reject duplicate email', async () => {
      // AC-002: Test duplicate email rejection
      const duplicateError = new Error('duplicate key value');
      (duplicateError as any).code = '23505';
      
      mockedBcrypt.hash.mockResolvedValue('hashed_password');
      mockClient.query.mockRejectedValueOnce(duplicateError);

      await expect(authRepository.createUser('existing@example.com', 'password123'))
        .rejects.toThrow('Email already exists');
      
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should handle bcrypt hashing error', async () => {
      // AC-004: Test database error handling
      const hashError = new Error('Hashing failed');
      mockedBcrypt.hash.mockRejectedValueOnce(hashError);

      await expect(authRepository.createUser('test@example.com', 'password123'))
        .rejects.toThrow('Hashing failed');
    });

    it('should handle database connection error', async () => {
      // AC-004: Test database error handling
      const connectionError = new Error('Connection failed');
      mockPool.connect.mockRejectedValueOnce(connectionError);

      await expect(authRepository.createUser('test@example.com', 'password123'))
        .rejects.toThrow('Connection failed');
    });

    it('should handle generic database error', async () => {
      // AC-004: Test database error handling
      const dbError = new Error('Database error');
      
      mockedBcrypt.hash.mockResolvedValue('hashed_password');
      mockClient.query.mockRejectedValueOnce(dbError);

      await expect(authRepository.createUser('test@example.com', 'password123'))
        .rejects.toThrow('Database error');
      
      expect(mockClient.release).toHaveBeenCalled();
    });
  });

  describe('findUserByEmail', () => {
    it('should find user by email successfully', async () => {
      // AC-003: Test user lookup by email
      const mockUser = {
        id: 1,
        email: 'test@example.com',
        password_hash: 'hashed_password'
      };
      
      mockClient.query.mockResolvedValueOnce({ rows: [mockUser] });

      const result = await authRepository.findUserByEmail('test@example.com');

      expect(mockClient.query).toHaveBeenCalledWith(
        'SELECT id, email, password_hash FROM users WHERE email = $1',
        ['test@example.com']
      );
      expect(result).toEqual(mockUser);
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should return null when user not found', async () => {
      // AC-003: Test user lookup by email
      mockClient.query.mockResolvedValueOnce({ rows: [] });

      const result = await authRepository.findUserByEmail('notfound@example.com');

      expect(result).toBeNull();
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should handle database connection error', async () => {
      // AC-004: Test database error handling
      const connectionError = new Error('Connection failed');
      mockPool.connect.mockRejectedValueOnce(connectionError);

      await expect(authRepository.findUserByEmail('test@example.com'))
        .rejects.toThrow('Connection failed');
    });

    it('should handle query execution error', async () => {
      // AC-004: Test database error handling
      const queryError = new Error('Query failed');
      mockClient.query.mockRejectedValueOnce(queryError);

      await expect(authRepository.findUserByEmail('test@example.com'))
        .rejects.toThrow('Query failed');
      
      expect(mockClient.release).toHaveBeenCalled();
    });
  });

  describe('verifyPassword', () => {
    it('should verify password successfully', async () => {
      mockedBcrypt.compare.mockResolvedValue(true);

      const result = await authRepository.verifyPassword('password123', 'hashed_password');

      expect(mockedBcrypt.compare).toHaveBeenCalledWith('password123', 'hashed_password');
      expect(result).toBe(true);
    });

    it('should return false for invalid password', async () => {
      mockedBcrypt.compare.mockResolvedValue(false);

      const result = await authRepository.verifyPassword('wrongpassword', 'hashed_password');

      expect(result).toBe(false);
    });

    it('should handle bcrypt comparison error', async () => {
      // AC-004: Test database error handling
      const compareError = new Error('Comparison failed');
      mockedBcrypt.compare.mockRejectedValueOnce(compareError);

      await expect(authRepository.verifyPassword('password123', 'hashed_password'))
        .rejects.toThrow('Comparison failed');
    });
  });
});