import { Pool, PoolClient } from 'pg';
import { UserRepository, CreateUserInput } from '../user-repository';
import { DatabaseError } from '../../../errors/database-error';
import { ConflictError } from '../../../errors/conflict-error';

describe('UserRepository', () => {
  let mockPool: jest.Mocked<Pool>;
  let mockClient: jest.Mocked<PoolClient>;
  let userRepository: UserRepository;

  beforeEach(() => {
    mockClient = {
      query: jest.fn(),
      release: jest.fn(),
    } as any;

    mockPool = {
      connect: jest.fn().mockResolvedValue(mockClient),
    } as any;

    userRepository = new UserRepository(mockPool);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createUser', () => {
    const mockUserData: CreateUserInput = {
      email: 'test@example.com',
      password_hash: 'hashed_password'
    };

    const mockUserResult = {
      id: 1,
      email: 'test@example.com',
      password_hash: 'hashed_password',
      created_at: new Date()
    };

    it('should create a user successfully', async () => {
      mockClient.query.mockResolvedValue({
        rows: [mockUserResult]
      } as any);

      const result = await userRepository.createUser(mockUserData);

      expect(mockPool.connect).toHaveBeenCalled();
      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO users'),
        [mockUserData.email, mockUserData.password_hash]
      );
      expect(mockClient.release).toHaveBeenCalled();
      expect(result).toEqual(mockUserResult);
    });

    it('should throw ConflictError for duplicate email', async () => {
      const duplicateError = { code: '23505', message: 'duplicate key value' };
      mockClient.query.mockRejectedValue(duplicateError);

      await expect(userRepository.createUser(mockUserData))
        .rejects
        .toThrow(ConflictError);
      
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should throw DatabaseError for other database errors', async () => {
      const dbError = { code: '42P01', message: 'table does not exist' };
      mockClient.query.mockRejectedValue(dbError);

      await expect(userRepository.createUser(mockUserData))
        .rejects
        .toThrow(DatabaseError);
      
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should release client even if connection fails', async () => {
      mockPool.connect.mockRejectedValue(new Error('Connection failed'));

      await expect(userRepository.createUser(mockUserData))
        .rejects
        .toThrow(DatabaseError);
    });
  });

  describe('findUserByEmail', () => {
    const mockEmail = 'test@example.com';
    const mockUser = {
      id: 1,
      email: mockEmail,
      password_hash: 'hashed_password',
      created_at: new Date()
    };

    it('should find user by email successfully', async () => {
      mockClient.query.mockResolvedValue({
        rows: [mockUser]
      } as any);

      const result = await userRepository.findUserByEmail(mockEmail);

      expect(mockPool.connect).toHaveBeenCalled();
      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT id, email, password_hash, created_at'),
        [mockEmail]
      );
      expect(mockClient.release).toHaveBeenCalled();
      expect(result).toEqual(mockUser);
    });

    it('should return null when user not found', async () => {
      mockClient.query.mockResolvedValue({
        rows: []
      } as any);

      const result = await userRepository.findUserByEmail(mockEmail);

      expect(result).toBeNull();
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should throw DatabaseError for database errors', async () => {
      const dbError = { message: 'connection timeout' };
      mockClient.query.mockRejectedValue(dbError);

      await expect(userRepository.findUserByEmail(mockEmail))
        .rejects
        .toThrow(DatabaseError);
      
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should release client even if connection fails', async () => {
      mockPool.connect.mockRejectedValue(new Error('Connection failed'));

      await expect(userRepository.findUserByEmail(mockEmail))
        .rejects
        .toThrow(DatabaseError);
    });
  });
});