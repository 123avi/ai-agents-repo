import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { UserRepository } from '../repositories/userRepository';
import { Logger } from '../utils/logger';

const JWT_SECRET = process.env.JWT_SECRET;
const SALT_ROUNDS = 12;
const JWT_EXPIRES_IN = '24h';

if (!JWT_SECRET || JWT_SECRET.trim() === '') {
  throw new Error('JWT_SECRET environment variable is required and cannot be empty');
}

const logger = new Logger();

/**
 * User service handling authentication and user management
 */
export class UserService {
  private userRepository: UserRepository;

  constructor(userRepository?: UserRepository) {
    if (!userRepository) {
      throw new Error('UserRepository is required');
    }
    this.userRepository = userRepository;
  }

  /**
   * Register a new user
   * @param email - User's email address
   * @param password - Plain text password
   * @param name - User's display name
   * @returns Promise with registration result
   */
  async register(email: string, password: string, name: string) {
    try {
      const existingUser = await this.userRepository.findByEmail(email);
      if (existingUser) {
        return { success: false, error: 'User already exists' };
      }

      const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
      const user = await this.userRepository.create({
        email,
        password: hashedPassword,
        name
      });

      return { success: true, userId: user.id };
    } catch (error) {
      logger.error('Registration error:', error);
      throw error;
    }
  }

  /**
   * Authenticate user login
   * @param email - User's email address
   * @param password - Plain text password
   * @returns Promise with login result and JWT token
   */
  async login(email: string, password: string) {
    try {
      const user = await this.userRepository.findByEmail(email);
      if (!user) {
        return { success: false, error: 'Invalid credentials' };
      }

      const isValidPassword = await bcrypt.compare(password, user.password);
      if (!isValidPassword) {
        return { success: false, error: 'Invalid credentials' };
      }

      const token = jwt.sign(
        { userId: user.id, email: user.email },
        JWT_SECRET,
        { expiresIn: JWT_EXPIRES_IN }
      );

      return { success: true, token };
    } catch (error) {
      logger.error('Login error:', error);
      throw error;
    }
  }
}