import { AuthService } from '../auth.service.js';
import { UserRepository } from '../../repositories/user.repository.js';
import { PasswordHasher } from '../../security/password-hasher.js';
import { JWTHandler } from '../../security/jwt-handler.js';
import { User } from '../../types/user.js';

const mockUser: User = {
  id: 1,
  email: 'test@example.com',
  password: 'hashedPassword123'
};

const mockUserRepository = {
  findByEmail: jest.fn(),
  create: jest.fn()
} as unknown as UserRepository;

const mockPasswordHasher = {
  hash: jest.fn(),
  verify: jest.fn()
} as unknown as PasswordHasher;

const mockJwtHandler = {
  generateToken: jest.fn()
} as unknown as JWTHandler;

describe('AuthService', () => {
  let authService: AuthService;

  beforeEach(() => {
    authService = new AuthService(mockUserRepository, mockPasswordHasher, mockJwtHandler);
    jest.clearAllMocks();
  });

  describe('register', () => {
    it('should register a new user successfully', async () => {
      (mockUserRepository.findByEmail as jest.Mock).mockResolvedValue(null);
      (mockPasswordHasher.hash as jest.Mock).mockResolvedValue('hashedPassword123');
      (mockUserRepository.create as jest.Mock).mockResolvedValue(mockUser);

      const result = await authService.register('test@example.com', 'password123');

      expect(mockUserRepository.findByEmail).toHaveBeenCalledWith('test@example.com');
      expect(mockPasswordHasher.hash).toHaveBeenCalledWith('password123');
      expect(mockUserRepository.create).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'hashedPassword123'
      });
      expect(result).toBe(1);
    });

    it('should throw error when user already exists', async () => {
      (mockUserRepository.findByEmail as jest.Mock).mockResolvedValue(mockUser);

      await expect(authService.register('test@example.com', 'password123'))
        .rejects.toThrow('User with this email already exists');

      expect(mockPasswordHasher.hash).not.toHaveBeenCalled();
      expect(mockUserRepository.create).not.toHaveBeenCalled();
    });

    it('should handle repository errors gracefully', async () => {
      (mockUserRepository.findByEmail as jest.Mock).mockRejectedValue(new Error('Database connection failed'));

      await expect(authService.register('test@example.com', 'password123'))
        .rejects.toThrow('Registration failed: Database connection failed');
    });

    it('should handle unknown errors gracefully', async () => {
      (mockUserRepository.findByEmail as jest.Mock).mockRejectedValue('Unknown error');

      await expect(authService.register('test@example.com', 'password123'))
        .rejects.toThrow('Registration failed due to unknown error');
    });
  });

  describe('login', () => {
    it('should login user successfully', async () => {
      (mockUserRepository.findByEmail as jest.Mock).mockResolvedValue(mockUser);
      (mockPasswordHasher.verify as jest.Mock).mockResolvedValue(true);
      (mockJwtHandler.generateToken as jest.Mock).mockReturnValue('jwt.token.here');

      const result = await authService.login('test@example.com', 'password123');

      expect(mockUserRepository.findByEmail).toHaveBeenCalledWith('test@example.com');
      expect(mockPasswordHasher.verify).toHaveBeenCalledWith('password123', 'hashedPassword123');
      expect(mockJwtHandler.generateToken).toHaveBeenCalledWith({ userId: 1 });
      expect(result).toBe('jwt.token.here');
    });

    it('should throw error for non-existent user', async () => {
      (mockUserRepository.findByEmail as jest.Mock).mockResolvedValue(null);

      await expect(authService.login('test@example.com', 'password123'))
        .rejects.toThrow('Invalid credentials');

      expect(mockPasswordHasher.verify).not.toHaveBeenCalled();
      expect(mockJwtHandler.generateToken).not.toHaveBeenCalled();
    });

    it('should throw error for invalid password', async () => {
      (mockUserRepository.findByEmail as jest.Mock).mockResolvedValue(mockUser);
      (mockPasswordHasher.verify as jest.Mock).mockResolvedValue(false);

      await expect(authService.login('test@example.com', 'wrongpassword'))
        .rejects.toThrow('Invalid credentials');

      expect(mockJwtHandler.generateToken).not.toHaveBeenCalled();
    });

    it('should handle repository errors gracefully', async () => {
      (mockUserRepository.findByEmail as jest.Mock).mockRejectedValue(new Error('Database timeout'));

      await expect(authService.login('test@example.com', 'password123'))
        .rejects.toThrow('Login failed: Database timeout');
    });

    it('should handle unknown errors gracefully', async () => {
      (mockUserRepository.findByEmail as jest.Mock).mockRejectedValue('Network error');

      await expect(authService.login('test@example.com', 'password123'))
        .rejects.toThrow('Login failed due to unknown error');
    });
  });
});