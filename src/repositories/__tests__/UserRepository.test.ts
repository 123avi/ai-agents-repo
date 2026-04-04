import { UserRepository } from '../UserRepository';
import { Pool } from 'pg';

describe('UserRepository', () => {
  let mockPool: jest.Mocked<Pool>;
  let mockClient: any;
  let userRepository: UserRepository;

  beforeEach(() => {
    mockClient = {
      query: jest.fn(),
      release: jest.fn()
    };
    
    mockPool = {
      connect: jest.fn().mockResolvedValue(mockClient),
      query: jest.fn(),
      end: jest.fn()
    } as any;
    
    userRepository = new UserRepository(mockPool);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createUser', () => {
    it('should create user with valid data', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'hashedPassword123'
      };
      
      const mockResult = {
        rows: [{ id: 1, email: 'test@example.com', created_at: new Date() }]
      };
      
      mockClient.query.mockResolvedValue(mockResult);
      
      const result = await userRepository.createUser(userData.email, userData.password);
      
      expect(mockPool.connect).toHaveBeenCalled();
      expect(mockClient.query).toHaveBeenCalledWith(
        'INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING id, email, created_at',
        [userData.email, userData.password]
      );
      expect(mockClient.release).toHaveBeenCalled();
      expect(result).toEqual(mockResult.rows[0]);
    });

    it('should reject duplicate email with constraint violation', async () => {
      const userData = {
        email: 'duplicate@example.com',
        password: 'hashedPassword123'
      };
      
      const constraintError = new Error('duplicate key value violates unique constraint');
      (constraintError as any).code = '23505';
      
      mockClient.query.mockRejectedValue(constraintError);
      
      await expect(userRepository.createUser(userData.email, userData.password))
        .rejects.toThrow('Email already exists');
      
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should handle database connection errors', async () => {
      const connectionError = new Error('connection timeout');
      mockPool.connect.mockRejectedValue(connectionError);
      
      await expect(userRepository.createUser('test@example.com', 'password'))
        .rejects.toThrow('Database connection failed');
    });

    it('should handle generic database errors', async () => {
      const dbError = new Error('database server error');
      mockClient.query.mockRejectedValue(dbError);
      
      await expect(userRepository.createUser('test@example.com', 'password'))
        .rejects.toThrow('Failed to create user');
      
      expect(mockClient.release).toHaveBeenCalled();
    });
  });

  describe('findByEmail', () => {
    it('should retrieve user by email successfully', async () => {
      const email = 'existing@example.com';
      const mockResult = {
        rows: [{
          id: 1,
          email: 'existing@example.com',
          password_hash: 'hashedPassword123',
          created_at: new Date()
        }]
      };
      
      mockClient.query.mockResolvedValue(mockResult);
      
      const result = await userRepository.findByEmail(email);
      
      expect(mockPool.connect).toHaveBeenCalled();
      expect(mockClient.query).toHaveBeenCalledWith(
        'SELECT id, email, password_hash, created_at FROM users WHERE email = $1',
        [email]
      );
      expect(mockClient.release).toHaveBeenCalled();
      expect(result).toEqual(mockResult.rows[0]);
    });

    it('should return null when user not found', async () => {
      const email = 'nonexistent@example.com';
      const mockResult = { rows: [] };
      
      mockClient.query.mockResolvedValue(mockResult);
      
      const result = await userRepository.findByEmail(email);
      
      expect(result).toBeNull();
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should handle database errors during retrieval', async () => {
      const dbError = new Error('query execution failed');
      mockClient.query.mockRejectedValue(dbError);
      
      await expect(userRepository.findByEmail('test@example.com'))
        .rejects.toThrow('Failed to find user');
      
      expect(mockClient.release).toHaveBeenCalled();
    });
  });

  describe('SQL injection prevention', () => {
    it('should use parameterized queries for createUser', async () => {
      const maliciousEmail = "'; DROP TABLE users; --";
      const password = 'password';
      
      mockClient.query.mockResolvedValue({ rows: [{ id: 1 }] });
      
      await userRepository.createUser(maliciousEmail, password);
      
      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('$1'),
        expect.arrayContaining([maliciousEmail, password])
      );
    });

    it('should use parameterized queries for findByEmail', async () => {
      const maliciousEmail = "'; DROP TABLE users; --";
      
      mockClient.query.mockResolvedValue({ rows: [] });
      
      await userRepository.findByEmail(maliciousEmail);
      
      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('$1'),
        expect.arrayContaining([maliciousEmail])
      );
    });
  });

  describe('prepared statement verification', () => {
    it('should use consistent prepared statement structure for createUser', async () => {
      mockClient.query.mockResolvedValue({ rows: [{ id: 1 }] });
      
      await userRepository.createUser('test1@example.com', 'password1');
      await userRepository.createUser('test2@example.com', 'password2');
      
      expect(mockClient.query).toHaveBeenNthCalledWith(1,
        'INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING id, email, created_at',
        ['test1@example.com', 'password1']
      );
      expect(mockClient.query).toHaveBeenNthCalledWith(2,
        'INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING id, email, created_at',
        ['test2@example.com', 'password2']
      );
    });

    it('should use consistent prepared statement structure for findByEmail', async () => {
      mockClient.query.mockResolvedValue({ rows: [] });
      
      await userRepository.findByEmail('test1@example.com');
      await userRepository.findByEmail('test2@example.com');
      
      expect(mockClient.query).toHaveBeenNthCalledWith(1,
        'SELECT id, email, password_hash, created_at FROM users WHERE email = $1',
        ['test1@example.com']
      );
      expect(mockClient.query).toHaveBeenNthCalledWith(2,
        'SELECT id, email, password_hash, created_at FROM users WHERE email = $1',
        ['test2@example.com']
      );
    });
  });
});