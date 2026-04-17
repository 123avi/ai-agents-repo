import { AuthService } from '../AuthService';
import { IUserRepository } from '../../repositories/interfaces/IUserRepository';
import { IPasswordHasher } from '../../security/interfaces/IPasswordHasher';
import { IJwtHandler } from '../../security/interfaces/IJwtHandler';
import { User } from '../../models/User';
import { ConflictError, UnauthorizedError } from '../../errors/AppErrors';

describe('AuthService', () => {
  let authService: AuthService;
  let mockUserRepository: jest.Mocked<IUserRepository>;
  let mockPasswordHasher: jest.Mocked<IPasswordHasher>;
  let mockJwtHandler: jest.Mocked<IJwtHandler>;

  beforeEach(() => {
    mockUserRepository = {
      findByEmail: jest.fn(),
      create: jest.fn(),
      findById: jest.fn(),
      update: jest.fn(),
      delete: jest.fn()
    };

    mockPasswordHasher = {
      hash: jest.fn(),
      verify: jest.fn()
    };

    mockJwtHandler = {
      generateToken: jest.fn(),
      verifyToken: jest.fn()
    };

    authService = new AuthService(
      mockUserRepository,
      mockPasswordHasher,
      mockJwtHandler
    );
  });

  describe('register', () => {
    it('should register a new user successfully', async () => {
      const email = 'test@example.com';
      const password = 'password123';
      const hashedPassword = 'hashedPassword123';
      const userId = 1;

      mockUserRepository.findByEmail.mockResolvedValue(null);
      mockPasswordHasher.hash.mockResolvedValue(hashedPassword);
      mockUserRepository.create.mockResolvedValue(new User(email, hashedPassword, userId));

      const result = await authService.register(email, password);

      expect(mockUserRepository.findByEmail).toHaveBeenCalledWith(email);
      expect(mockPasswordHasher.hash).toHaveBeenCalledWith(password);
      expect(mockUserRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ email, password: hashedPassword })
      );
      expect(result).toBe(userId);
    });

    it('should throw ConflictError when email already exists', async () => {
      const email = 'existing@example.com';
      const password = 'password123';
      const existingUser = new User(email, 'hashedPassword', 1);

      mockUserRepository.findByEmail.mockResolvedValue(existingUser);

      await expect(authService.register(email, password))
        .rejects.toThrow(ConflictError);
      
      expect(mockPasswordHasher.hash).not.toHaveBeenCalled();
      expect(mockUserRepository.create).not.toHaveBeenCalled();
    });

    it('should throw error when repository fails', async () => {
      const email = 'test@example.com';
      const password = 'password123';
      const repositoryError = new Error('Database connection failed');

      mockUserRepository.findByEmail.mockRejectedValue(repositoryError);

      await expect(authService.register(email, password))
        .rejects.toThrow('Registration failed');
    });
  });

  describe('login', () => {
    it('should login successfully with valid credentials', async () => {
      const email = 'test@example.com';
      const password = 'password123';
      const hashedPassword = 'hashedPassword123';
      const userId = 1;
      const token = 'jwt.token.here';
      const user = new User(email, hashedPassword, userId);

      mockUserRepository.findByEmail.mockResolvedValue(user);
      mockPasswordHasher.verify.mockResolvedValue(true);
      mockJwtHandler.generateToken.mockReturnValue(token);

      const result = await authService.login(email, password);

      expect(mockUserRepository.findByEmail).toHaveBeenCalledWith(email);
      expect(mockPasswordHasher.verify).toHaveBeenCalledWith(password, hashedPassword);
      expect(mockJwtHandler.generateToken).toHaveBeenCalledWith({ userId, email });
      expect(result).toBe(token);
    });

    it('should throw UnauthorizedError when user not found', async () => {
      const email = 'nonexistent@example.com';
      const password = 'password123';

      mockUserRepository.findByEmail.mockResolvedValue(null);

      await expect(authService.login(email, password))
        .rejects.toThrow(UnauthorizedError);
      
      expect(mockPasswordHasher.verify).not.toHaveBeenCalled();
      expect(mockJwtHandler.generateToken).not.toHaveBeenCalled();
    });

    it('should throw UnauthorizedError when password is invalid', async () => {
      const email = 'test@example.com';
      const password = 'wrongpassword';
      const hashedPassword = 'hashedPassword123';
      const userId = 1;
      const user = new User(email, hashedPassword, userId);

      mockUserRepository.findByEmail.mockResolvedValue(user);
      mockPasswordHasher.verify.mockResolvedValue(false);

      await expect(authService.login(email, password))
        .rejects.toThrow(UnauthorizedError);
      
      expect(mockJwtHandler.generateToken).not.toHaveBeenCalled();
    });

    it('should throw error when repository fails during login', async () => {
      const email = 'test@example.com';
      const password = 'password123';
      const repositoryError = new Error('Database connection failed');

      mockUserRepository.findByEmail.mockRejectedValue(repositoryError);

      await expect(authService.login(email, password))
        .rejects.toThrow('Login failed');
    });
  });
});