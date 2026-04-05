import bcrypt from 'bcrypt';
import { UserRepository } from '../repositories/user.repository';
import { logger } from '../utils/logger';

const SALT_ROUNDS = 12;

/**
 * Authentication service handling user registration and credential management
 */
export class AuthService {
  constructor(private userRepository: UserRepository) {}

  /**
   * Registers a new user with email and hashed password
   * @param email User email address
   * @param password Plain text password
   * @returns Promise resolving to new user ID
   * @throws Error if email already exists
   */
  async registerUser(email: string, password: string): Promise<string> {
    try {
      // Check if user already exists
      const existingUser = await this.userRepository.findByEmail(email);
      if (existingUser) {
        throw new Error('Email already exists');
      }

      // Hash password
      const hashedPassword = await this.hashPassword(password);

      // Create user
      const userId = await this.userRepository.create({
        email,
        password: hashedPassword
      });

      logger.info(`User registered successfully: ${email}`);
      return userId;
    } catch (error: any) {
      logger.error('User registration failed:', error);
      throw error;
    }
  }

  /**
   * Hashes password using bcrypt with secure salt rounds
   * @param password Plain text password
   * @returns Promise resolving to hashed password
   */
  private async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, SALT_ROUNDS);
  }
}