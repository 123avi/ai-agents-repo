import jwt from 'jsonwebtoken';
import { UserRepository } from '../repositories/UserRepository';
import { Logger } from '../utils/Logger';
import { HashService } from '../utils/HashService';

const JWT_EXPIRES_IN = '24h';
const HASH_SALT_ROUNDS = 10;

/**
 * Service for handling user authentication operations.
 * Provides user registration and login functionality with JWT token generation.
 */
export class AuthService {
  private userRepository: UserRepository;
  private hashService: HashService;
  private jwtSecret: string;

  /**
   * Creates an instance of AuthService.
   * @param userRepository - Repository for user data operations
   * @param hashService - Service for password hashing operations
   */
  constructor(userRepository: UserRepository, hashService: HashService) {
    this.userRepository = userRepository;
    this.hashService = hashService;
    this.jwtSecret = this.getJwtSecret();
  }

  /**
   * Registers a new user with email and password.
   * @param email - User's email address
   * @param password - User's plain text password
   * @returns Promise<number> - The created user's ID
   * @throws Error if email already exists or registration fails
   */
  async register(email: string, password: string): Promise<number> {
    try {
      const existingUser = await this.userRepository.findByEmail(email);
      if (existingUser) {
        throw new Error('Email already exists');
      }

      const hashedPassword = await this.hashService.hash(password, HASH_SALT_ROUNDS);
      const userId = await this.userRepository.create(email, hashedPassword);
      
      Logger.info('User registered', { userId, email });
      return userId;
    } catch (error) {
      Logger.error('Registration failed', { email, error });
      throw error;
    }
  }

  /**
   * Authenticates user and returns JWT token.
   * @param email - User's email address
   * @param password - User's plain text password
   * @returns Promise<string> - JWT token for authenticated user
   * @throws Error if credentials are invalid or login fails
   */
  async login(email: string, password: string): Promise<string> {
    try {
      const user = await this.userRepository.findByEmail(email);
      if (!user) {
        throw new Error('Invalid credentials');
      }

      const isValidPassword = await this.hashService.compare(password, user.passwordHash);
      if (!isValidPassword) {
        throw new Error('Invalid credentials');
      }

      const token = this.generateJwtToken(user.id, email);
      Logger.info('User logged in', { userId: user.id, email });
      return token;
    } catch (error) {
      Logger.error('Login failed', { email, error });
      throw error;
    }
  }

  /**
   * Generates JWT token for authenticated user.
   * @param userId - User's unique identifier
   * @param email - User's email address
   * @returns string - Signed JWT token
   */
  private generateJwtToken(userId: number, email: string): string {
    const payload = { userId, email };
    return jwt.sign(payload, this.jwtSecret, { expiresIn: JWT_EXPIRES_IN });
  }

  /**
   * Retrieves and validates JWT secret from environment.
   * @returns string - JWT secret for token signing
   * @throws Error if JWT_SECRET is missing in production
   */
  private getJwtSecret(): string {
    const secret = process.env.JWT_SECRET;
    
    if (!secret) {
      if (process.env.NODE_ENV === 'production') {
        throw new Error('JWT_SECRET environment variable is required in production');
      }
      Logger.warn('JWT_SECRET not set, using development default');
      return 'dev-secret-key-change-in-production';
    }
    
    return secret;
  }
}