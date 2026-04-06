import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { UserRepository } from '../repositories/user.repository';
import { User, CreateUserRequest, UserResponse, LoginResponse } from '../interfaces/user.interface';
import { logger } from '../utils/logger';

const SALT_ROUNDS = 12;
const JWT_SECRET = process.env.JWT_SECRET || 'default-secret-key';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';

/**
 * Service class for user-related operations including authentication
 */
export class UserService {
  private userRepository: UserRepository;

  /**
   * Creates a new UserService instance
   * @param userRepository - Repository for user data operations
   */
  constructor(userRepository: UserRepository) {
    this.userRepository = userRepository;
  }

  /**
   * Registers a new user with email and password
   * @param userData - User registration data
   * @returns Promise resolving to created user response
   * @throws Error if user already exists or creation fails
   */
  async register(userData: CreateUserRequest): Promise<UserResponse> {
    try {
      const existingUser = await this.userRepository.findByEmail(userData.email);
      if (existingUser) {
        throw new Error('User already exists');
      }

      const hashedPassword = await bcrypt.hash(userData.password, SALT_ROUNDS);
      const user = await this.userRepository.create({
        email: userData.email,
        password: hashedPassword
      });

      logger.info('User registered successfully', { userId: user.id, email: user.email });

      return {
        id: user.id,
        email: user.email
      };
    } catch (error) {
      logger.error('User registration failed', { error: error.message, email: userData.email });
      throw error;
    }
  }

  /**
   * Authenticates user with email and password
   * @param email - User's email address
   * @param password - User's password
   * @returns Promise resolving to login response with JWT token
   * @throws Error if credentials are invalid
   */
  async login(email: string, password: string): Promise<LoginResponse> {
    try {
      const user = await this.userRepository.findByEmail(email);
      if (!user) {
        throw new Error('Invalid credentials');
      }

      const isPasswordValid = await bcrypt.compare(password, user.password);
      if (!isPasswordValid) {
        throw new Error('Invalid credentials');
      }

      const token = jwt.sign(
        { userId: user.id, email: user.email },
        JWT_SECRET,
        { expiresIn: JWT_EXPIRES_IN }
      );

      logger.info('User logged in successfully', { userId: user.id, email: user.email });

      return {
        token,
        user: {
          id: user.id,
          email: user.email
        }
      };
    } catch (error) {
      logger.error('User login failed', { error: error.message, email });
      throw error;
    }
  }
}