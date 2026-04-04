import { AuthService, AuthServiceError } from '../AuthService';
import { IUserRepository, User, CreateUserRequest } from '../../repositories/IUserRepository';
import { IPasswordHasher } from '../../security/IPasswordHasher';
import { IJWTHandler, JWTPayload } from '../../security/IJWTHandler';

describe('AuthService', () => {
  let authService: AuthService;
  let mockUserRepository: jest.Mocked<IUserRepository>;
  let mockPasswordHasher: jest.Mocked<IPasswordHasher>;
  let mockJWTHandler: jest.Mocked<IJWTHandler>;

  const mockUser: User = {
    id: 1,
    email: 'test@example.com',
    password: 'hashedpassword',
    createdAt: new Date(),
    updatedAt: new Date()
  };

  beforeEach(() => {
    mockUserRepository = {
      findByEmail: jest.fn(),
      create: jest.fn()
    };

    mockPasswordHasher = {
      hash: jest.fn(),
      verify: jest.fn()
    };

    mockJWTHandler = {
      generateToken: jest.fn(),
      verifyToken: jest.fn()
    };

    authService = new AuthService(
      mockUserRepository,
      mockPasswordHasher,
      mockJWTHandler
    );
  });

  describe('register', () => {
    it('should register new user successfully', async () => {
      const request = { email: 'test@example.com', password: 'password123' };
      
      mockUserRepository.findByEmail.mockResolvedValue(null);
      mockPasswordHasher.hash.mockResolvedValue('hashedpassword');
      mockUserRepository.create.mockResolvedValue(mockUser);

      const result = await authService.register(request);

      expect(result).toEqual({ id: 1 });
      expect(mockUserRepository.findByEmail).toHaveBeenCalledWith(request.email);
      expect(mockPasswordHasher.hash).toHaveBeenCalledWith(request.password);
      expect(mockUserRepository.create).toHaveBeenCalledWith({
        email: request.email,
        password: 'hashedpassword'
      });
    });

    it('should throw error for duplicate email', async () => {
      const request = { email: 'test@example.com', password: 'password123' };
      
      mockUserRepository.findByEmail.mockResolvedValue(mockUser);

      await expect(authService.register(request)).rejects.toThrow(
        new AuthServiceError('Email already registered', 'DUPLICATE_EMAIL')
      );

      expect(mockPasswordHasher.hash).not.toHaveBeenCalled();
      expect(mockUserRepository.create).not.toHaveBeenCalled();
    });

    it('should throw generic error for repository failures', async () => {
      const request = { email: 'test@example.com', password: 'password123' };
      
      mockUserRepository.findByEmail.mockRejectedValue(new Error('DB error'));

      await expect(authService.register(request)).rejects.toThrow(
        new AuthServiceError('Registration failed', 'REGISTRATION_ERROR')
      );
    });
  });

  describe('login', () => {
    it('should authenticate user and return JWT token', async () => {
      const request = { email: 'test@example.com', password: 'password123' };
      const expectedToken = 'jwt.token.here';
      
      mockUserRepository.findByEmail.mockResolvedValue(mockUser);
      mockPasswordHasher.verify.mockResolvedValue(true);
      mockJWTHandler.generateToken.mockResolvedValue(expectedToken);

      const result = await authService.login(request);

      expect(result).toEqual({ token: expectedToken });
      expect(mockUserRepository.findByEmail).toHaveBeenCalledWith(request.email);
      expect(mockPasswordHasher.verify).toHaveBeenCalledWith(
        request.password,
        mockUser.password
      );
      expect(mockJWTHandler.generateToken).toHaveBeenCalledWith({
        userId: mockUser.id,
        email: mockUser.email
      });
    });

    it('should throw error for non-existent user', async () => {
      const request = { email: 'nonexistent@example.com', password: 'password123' };
      
      mockUserRepository.findByEmail.mockResolvedValue(null);

      await expect(authService.login(request)).rejects.toThrow(
        new AuthServiceError('Invalid credentials', 'INVALID_CREDENTIALS')
      );

      expect(mockPasswordHasher.verify).not.toHaveBeenCalled();
      expect(mockJWTHandler.generateToken).not.toHaveBeenCalled();
    });

    it('should throw error for invalid password', async () => {
      const request = { email: 'test@example.com', password: 'wrongpassword' };
      
      mockUserRepository.findByEmail.mockResolvedValue(mockUser);
      mockPasswordHasher.verify.mockResolvedValue(false);

      await expect(authService.login(request)).rejects.toThrow(
        new AuthServiceError('Invalid credentials', 'INVALID_CREDENTIALS')
      );

      expect(mockJWTHandler.generateToken).not.toHaveBeenCalled();
    });

    it('should throw generic error for service failures', async () => {
      const request = { email: 'test@example.com', password: 'password123' };
      
      mockUserRepository.findByEmail.mockRejectedValue(new Error('DB error'));

      await expect(authService.login(request)).rejects.toThrow(
        new AuthServiceError('Authentication failed', 'AUTH_ERROR')
      );
    });
  });
});