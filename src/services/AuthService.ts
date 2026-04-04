import bcrypt from 'bcrypt';
import { IUserRepository } from '../repositories/IUserRepository';
import { IJWTHandler } from '../security/IJWTHandler';
import { IPasswordHasher } from '../security/IPasswordHasher';

interface RegisterRequest {
  email: string;
  password: string;
}

interface LoginRequest {
  email: string;
  password: string;
}

interface RegisterResponse {
  id: number;
}

interface LoginResponse {
  token: string;
}

export class AuthServiceError extends Error {
  public readonly code: string;
  
  constructor(message: string, code: string) {
    super(message);
    this.code = code;
  }
}

/**
 * Authentication service handling user registration and login business logic
 */
export class AuthService {
  private readonly userRepository: IUserRepository;
  private readonly passwordHasher: IPasswordHasher;
  private readonly jwtHandler: IJWTHandler;

  constructor(
    userRepository: IUserRepository,
    passwordHasher: IPasswordHasher,
    jwtHandler: IJWTHandler
  ) {
    this.userRepository = userRepository;
    this.passwordHasher = passwordHasher;
    this.jwtHandler = jwtHandler;
  }

  /**
   * Register a new user with email uniqueness validation
   * @param request - Registration request containing email and password
   * @returns Promise resolving to user ID
   * @throws AuthServiceError for validation errors or duplicate email
   */
  async register(request: RegisterRequest): Promise<RegisterResponse> {
    try {
      // Check if email already exists
      const existingUser = await this.userRepository.findByEmail(request.email);
      if (existingUser) {
        throw new AuthServiceError('Email already registered', 'DUPLICATE_EMAIL');
      }

      // Hash password before storage
      const hashedPassword = await this.passwordHasher.hash(request.password);

      // Create user
      const user = await this.userRepository.create({
        email: request.email,
        password: hashedPassword
      });

      return { id: user.id };
    } catch (error) {
      if (error instanceof AuthServiceError) {
        throw error;
      }
      throw new AuthServiceError('Registration failed', 'REGISTRATION_ERROR');
    }
  }

  /**
   * Authenticate user credentials and generate JWT token
   * @param request - Login request containing email and password
   * @returns Promise resolving to JWT token
   * @throws AuthServiceError for invalid credentials
   */
  async login(request: LoginRequest): Promise<LoginResponse> {
    try {
      // Find user by email
      const user = await this.userRepository.findByEmail(request.email);
      if (!user) {
        throw new AuthServiceError('Invalid credentials', 'INVALID_CREDENTIALS');
      }

      // Verify password
      const isValidPassword = await this.passwordHasher.verify(
        request.password,
        user.password
      );
      
      if (!isValidPassword) {
        throw new AuthServiceError('Invalid credentials', 'INVALID_CREDENTIALS');
      }

      // Generate JWT token
      const token = await this.jwtHandler.generateToken({
        userId: user.id,
        email: user.email
      });

      return { token };
    } catch (error) {
      if (error instanceof AuthServiceError) {
        throw error;
      }
      throw new AuthServiceError('Authentication failed', 'AUTH_ERROR');
    }
  }
}