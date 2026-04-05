import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { AuthRepository } from '../repositories/auth.repository';
import { User } from '../types/user.types';
import { logger } from '../utils/logger';

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is required');
}

const SALT_ROUNDS = 12;
const TOKEN_EXPIRES_IN = '24h';

/**
 * Service handling authentication business logic
 */
export class AuthService {
  private authRepository: AuthRepository;

  constructor() {
    this.authRepository = new AuthRepository();
  }

  /**
   * Registers a new user with hashed password
   * @param email User email
   * @param password Plain text password
   * @returns Created user object
   */
  async registerUser(email: string, password: string): Promise<User> {
    try {
      const existingUser = await this.authRepository.findUserByEmail(email);
      if (existingUser) {
        throw new Error('Email already exists');
      }

      const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
      const user = await this.authRepository.createUser(email, hashedPassword);
      
      logger.info(`User registered successfully: ${email}`);
      return user;
    } catch (error) {
      logger.error('User registration failed:', error);
      throw error;
    }
  }

  /**
   * Authenticates user and returns JWT token
   * @param email User email
   * @param password Plain text password
   * @returns JWT token string
   */
  async loginUser(email: string, password: string): Promise<string> {
    try {
      const user = await this.authRepository.findUserByEmail(email);
      if (!user) {
        throw new Error('Invalid credentials');
      }

      const isValidPassword = await bcrypt.compare(password, user.password);
      if (!isValidPassword) {
        throw new Error('Invalid credentials');
      }

      const token = this.generateToken(user.id, user.email);
      logger.info(`User logged in successfully: ${email}`);
      return token;
    } catch (error) {
      logger.error('User login failed:', error);
      throw error;
    }
  }

  /**
   * Generates JWT token for authenticated user
   * @param userId User ID
   * @param email User email
   * @returns JWT token string
   */
  private generateToken(userId: number, email: string): string {
    return jwt.sign(
      { userId, email },
      JWT_SECRET,
      { expiresIn: TOKEN_EXPIRES_IN }
    );
  }
}