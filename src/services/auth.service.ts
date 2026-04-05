import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { AuthRepository } from '../repositories/auth.repository';
import { logger } from '../utils/logger';

const SALT_ROUNDS = 12;
const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-key';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';

interface RegisterResult {
  success: boolean;
  userId?: string;
  error?: 'EMAIL_EXISTS' | 'INTERNAL_ERROR';
}

interface LoginResult {
  success: boolean;
  token?: string;
  userId?: string;
  error?: 'INVALID_CREDENTIALS' | 'INTERNAL_ERROR';
}

/**
 * Service for authentication operations
 * Handles user registration, login, and JWT token management
 */
export class AuthService {
  private authRepository: AuthRepository;

  constructor(authRepository: AuthRepository) {
    this.authRepository = authRepository;
  }

  /**
   * Register a new user with email and password
   * 
   * @param email - User email address
   * @param password - User password (will be hashed)
   * @returns Promise<RegisterResult> - Registration result with success status
   */
  public async register(email: string, password: string): Promise<RegisterResult> {
    try {
      // Check if email already exists
      const existingUser = await this.authRepository.findByEmail(email);
      if (existingUser) {
        return { success: false, error: 'EMAIL_EXISTS' };
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
      
      // Create user
      const userId = await this.authRepository.create(email, hashedPassword);
      
      logger.info('User registered', { email, userId });
      return { success: true, userId };
    } catch (error) {
      logger.error('Registration service error', { error, email });
      return { success: false, error: 'INTERNAL_ERROR' };
    }
  }

  /**
   * Authenticate user and generate JWT token
   * 
   * @param email - User email address
   * @param password - User password
   * @returns Promise<LoginResult> - Login result with token if successful
   */
  public async login(email: string, password: string): Promise<LoginResult> {
    try {
      // Find user by email
      const user = await this.authRepository.findByEmail(email);
      if (!user) {
        return { success: false, error: 'INVALID_CREDENTIALS' };
      }

      // Verify password
      const isPasswordValid = await bcrypt.compare(password, user.password);
      if (!isPasswordValid) {
        return { success: false, error: 'INVALID_CREDENTIALS' };
      }

      // Generate JWT token
      const token = jwt.sign(
        { userId: user.id, email: user.email },
        JWT_SECRET,
        { expiresIn: JWT_EXPIRES_IN }
      );

      logger.info('User logged in', { email, userId: user.id });
      return { success: true, token, userId: user.id };
    } catch (error) {
      logger.error('Login service error', { error, email });
      return { success: false, error: 'INTERNAL_ERROR' };
    }
  }
}