import { AuthService } from '../auth.service';
import { UserRepository } from '../../repositories/user.repository';
import { PasswordHasher } from '../../utils/password-hasher';
import { JWTHandler } from '../../utils/jwt-handler';
import { ConflictError, UnauthorizedError } from '../../errors/custom-errors';

// Mock dependencies
jest.mock('../../repositories/user.repository');
jest.mock('../../utils/password-hasher');
jest.mock('../../utils/jwt-handler');

const mockUserRepo = UserRepository as jest.MockedClass<typeof UserRepository>;
const mockPasswordHasher = PasswordHasher as jest.MockedClass<typeof PasswordHasher>;
const mockJWTHandler = JWTHandler as jest.MockedClass<typeof JWTHandler>;

describe('AuthService', () => {
  let authService: AuthService;
  let userRepoInstance: jest.Mocked<UserRepository>;
  let passwordHasherInstance: jest.Mocked<PasswordHasher>;
  let jwtHandlerInstance: jest.Mocked<JWTHandler>;

  const MOCK_USER_EMAIL = 'test@example.com';
  const MOCK_PASSWORD = 'password123';
  const MOCK_HASHED_PASSWORD = 'hashed_password_123';
  const MOCK_USER_ID = 1;
  const MOCK_JWT_TOKEN = 'jwt_token_123';

  beforeEach(() => {
    jest.clearAllMocks();
    
    userRepoInstance = {
      findByEmail: jest.fn(),
      create: jest.fn(),
    } as any;
    
    passwordHasherInstance = {
      hash: jest.fn(),
      compare: jest.fn(),
    } as any;
    
    jwtHandlerInstance = {
      generate: jest.fn(),
    } as any;

    mockUserRepo.mockImplementation(() => userRepoInstance);
    mockPasswordHasher.mockImplementation(() => passwordHasherInstance);
    mockJWTHandler.mockImplementation(() => jwtHandlerInstance);

    authService = new AuthService(
      userRepoInstance,
      passwordHasherInstance,
      jwtHandlerInstance
    );
  });

  describe('register', () => {
    it('should successfully register a new user', async () => {
      // Arrange
      userRepoInstance.findByEmail.mockResolvedValue(null);
      passwordHasherInstance.hash.mockResolvedValue(MOCK_HASHED_PASSWORD);
      userRepoInstance.create.mockResolvedValue({ 
        id: MOCK_USER_ID, 
        email: MOCK_USER_EMAIL 
      });

      // Act
      const result = await authService.register(MOCK_USER_EMAIL, MOCK_PASSWORD);

      // Assert
      expect(userRepoInstance.findByEmail).toHaveBeenCalledWith(MOCK_USER_EMAIL);
      expect(passwordHasherInstance.hash).toHaveBeenCalledWith(MOCK_PASSWORD);
      expect(userRepoInstance.create).toHaveBeenCalledWith({
        email: MOCK_USER_EMAIL,
        password: MOCK_HASHED_PASSWORD
      });
      expect(result).toEqual({ id: MOCK_USER_ID });
    });

    it('should reject registration with duplicate email', async () => {
      // Arrange
      userRepoInstance.findByEmail.mockResolvedValue({
        id: MOCK_USER_ID,
        email: MOCK_USER_EMAIL,
        password: MOCK_HASHED_PASSWORD
      });

      // Act & Assert
      await expect(authService.register(MOCK_USER_EMAIL, MOCK_PASSWORD))
        .rejects
        .toThrow(ConflictError);
      
      expect(userRepoInstance.findByEmail).toHaveBeenCalledWith(MOCK_USER_EMAIL);
      expect(passwordHasherInstance.hash).not.toHaveBeenCalled();
      expect(userRepoInstance.create).not.toHaveBeenCalled();
    });

    it('should propagate repository errors during registration', async () => {
      // Arrange
      const dbError = new Error('Database connection failed');
      userRepoInstance.findByEmail.mockRejectedValue(dbError);

      // Act & Assert
      await expect(authService.register(MOCK_USER_EMAIL, MOCK_PASSWORD))
        .rejects
        .toThrow('Database connection failed');
    });

    it('should propagate password hashing errors', async () => {
      // Arrange
      userRepoInstance.findByEmail.mockResolvedValue(null);
      const hashError = new Error('Hashing failed');
      passwordHasherInstance.hash.mockRejectedValue(hashError);

      // Act & Assert
      await expect(authService.register(MOCK_USER_EMAIL, MOCK_PASSWORD))
        .rejects
        .toThrow('Hashing failed');
    });
  });

  describe('login', () => {
    const mockStoredUser = {
      id: MOCK_USER_ID,
      email: MOCK_USER_EMAIL,
      password: MOCK_HASHED_PASSWORD
    };

    it('should successfully login with valid credentials', async () => {
      // Arrange
      userRepoInstance.findByEmail.mockResolvedValue(mockStoredUser);
      passwordHasherInstance.compare.mockResolvedValue(true);
      jwtHandlerInstance.generate.mockResolvedValue(MOCK_JWT_TOKEN);

      // Act
      const result = await authService.login(MOCK_USER_EMAIL, MOCK_PASSWORD);

      // Assert
      expect(userRepoInstance.findByEmail).toHaveBeenCalledWith(MOCK_USER_EMAIL);
      expect(passwordHasherInstance.compare)
        .toHaveBeenCalledWith(MOCK_PASSWORD, MOCK_HASHED_PASSWORD);
      expect(jwtHandlerInstance.generate).toHaveBeenCalledWith({
        userId: MOCK_USER_ID,
        email: MOCK_USER_EMAIL
      });
      expect(result).toEqual({ token: MOCK_JWT_TOKEN });
    });

    it('should reject login with non-existent email', async () => {
      // Arrange
      userRepoInstance.findByEmail.mockResolvedValue(null);

      // Act & Assert
      await expect(authService.login(MOCK_USER_EMAIL, MOCK_PASSWORD))
        .rejects
        .toThrow(UnauthorizedError);
      
      expect(userRepoInstance.findByEmail).toHaveBeenCalledWith(MOCK_USER_EMAIL);
      expect(passwordHasherInstance.compare).not.toHaveBeenCalled();
      expect(jwtHandlerInstance.generate).not.toHaveBeenCalled();
    });

    it('should reject login with invalid password', async () => {
      // Arrange
      userRepoInstance.findByEmail.mockResolvedValue(mockStoredUser);
      passwordHasherInstance.compare.mockResolvedValue(false);

      // Act & Assert
      await expect(authService.login(MOCK_USER_EMAIL, 'wrongpassword'))
        .rejects
        .toThrow(UnauthorizedError);
      
      expect(userRepoInstance.findByEmail).toHaveBeenCalledWith(MOCK_USER_EMAIL);
      expect(passwordHasherInstance.compare)
        .toHaveBeenCalledWith('wrongpassword', MOCK_HASHED_PASSWORD);
      expect(jwtHandlerInstance.generate).not.toHaveBeenCalled();
    });

    it('should generate JWT token on successful login', async () => {
      // Arrange
      userRepoInstance.findByEmail.mockResolvedValue(mockStoredUser);
      passwordHasherInstance.compare.mockResolvedValue(true);
      jwtHandlerInstance.generate.mockResolvedValue(MOCK_JWT_TOKEN);

      // Act
      const result = await authService.login(MOCK_USER_EMAIL, MOCK_PASSWORD);

      // Assert
      expect(jwtHandlerInstance.generate).toHaveBeenCalledTimes(1);
      expect(jwtHandlerInstance.generate).toHaveBeenCalledWith({
        userId: MOCK_USER_ID,
        email: MOCK_USER_EMAIL
      });
      expect(result.token).toBe(MOCK_JWT_TOKEN);
    });

    it('should propagate JWT generation errors', async () => {
      // Arrange
      userRepoInstance.findByEmail.mockResolvedValue(mockStoredUser);
      passwordHasherInstance.compare.mockResolvedValue(true);
      const jwtError = new Error('JWT signing failed');
      jwtHandlerInstance.generate.mockRejectedValue(jwtError);

      // Act & Assert
      await expect(authService.login(MOCK_USER_EMAIL, MOCK_PASSWORD))
        .rejects
        .toThrow('JWT signing failed');
    });

    it('should propagate password comparison errors', async () => {
      // Arrange
      userRepoInstance.findByEmail.mockResolvedValue(mockStoredUser);
      const compareError = new Error('Password comparison failed');
      passwordHasherInstance.compare.mockRejectedValue(compareError);

      // Act & Assert
      await expect(authService.login(MOCK_USER_EMAIL, MOCK_PASSWORD))
        .rejects
        .toThrow('Password comparison failed');
    });
  });
});