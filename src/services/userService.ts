import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { UserRepository } from '../repositories/userRepository';
import { logger } from '../utils/logger';

const BCRYPT_SALT_ROUNDS = 12;
const JWT_SECRET = process.env.JWT_SECRET || '';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';

/**
 * Interface for user registration result
 */
export interface RegisterResult {
  exists: boolean;
  userId?: string;
}

/**
 * Interface for user authentication result
 */
export interface AuthResult {
  success: boolean;
  token?: string;
}

/**
 * User service handling authentication business logic
 */
export class UserService {
  private userRepository: UserRepository;

  constructor(userRepository: UserRepository) {
    this.userRepository = userRepository;
  }

  /**
   * Registers a new user
   * @param email - User email address
   * @param password - User password
   * @param name - User display name
   * @returns Registration result with user ID or conflict flag
   */
  public async registerUser(
    email: string,
    password: string,
    name: string
  ): Promise<RegisterResult> {
    try {
      const existingUser = await this.userRepository.findByEmail(email);
      if (existingUser) {
        return { exists: true };
      }

      const hashedPassword = await this.hashPassword(password);
      const userId = await this.userRepository.create({
        email,
        password: hashedPassword,
        name
      });

      return { exists: false, userId };
    } catch (error) {
      logger.error('User registration error:', error);
      throw error;
    }
  }

  /**
   * Authenticates a user
   * @param email - User email address
   * @param password - User password
   * @returns Authentication result with JWT token
   */
  public async authenticateUser(
    email: string,
    password: string
  ): Promise<AuthResult> {
    try {
      const user = await this.userRepository.findByEmail(email);
      if (!user) {
        return { success: false };
      }

      const isValidPassword = await this.verifyPassword(password, user.password);
      if (!isValidPassword) {
        return { success: false };
      }

      const token = this.generateJwtToken(user.id, user.email);
      return { success: true, token };
    } catch (error) {
      logger.error('User authentication error:', error);
      throw error;
    }
  }

  /**
   * Hashes a password using bcrypt
   * @param password - Plain text password
   * @returns Hashed password
   */
  private async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, BCRYPT_SALT_ROUNDS);
  }

  /**
   * Verifies a password against a hash
   * @param password - Plain text password
   * @param hash - Hashed password
   * @returns True if password matches
   */
  private async verifyPassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  /**
   * Generates a JWT token for authenticated user
   * @param userId - User ID
   * @param email - User email
   * @returns JWT token
   */
  private generateJwtToken(userId: string, email: string): string {
    return jwt.sign(
      { userId, email },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );
  }
}