import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { UserRepository } from '../repositories/UserRepository';

/**
 * Configuration constants for user authentication
 */
const PASSWORD_MIN_LENGTH = 8;
const BCRYPT_ROUNDS = 12;
const JWT_EXPIRES_IN = '24h';
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Interface for user registration data
 */
export interface RegisterUserData {
  email: string;
  password: string;
}

/**
 * Interface for user login data
 */
export interface LoginUserData {
  email: string;
  password: string;
}

/**
 * Interface for JWT payload
 */
export interface JWTPayload {
  userId: string;
  iat: number;
  exp: number;
}

/**
 * User service handling authentication business logic
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
   * Registers a new user with email and password validation
   * @param userData - User registration data containing email and password
   * @returns Promise resolving to user ID
   * @throws Error if validation fails or user already exists
   */
  async registerUser(userData: RegisterUserData): Promise<string> {
    try {
      this.validateEmail(userData.email);
      this.validatePassword(userData.password);

      await this.checkDuplicateEmail(userData.email);
      const hashedPassword = await this.hashPassword(userData.password);

      const userId = await this.userRepository.createUser({
        email: userData.email,
        password: hashedPassword
      });

      return userId;
    } catch (error) {
      console.error('User registration failed:', error);
      throw error;
    }
  }

  /**
   * Authenticates user login and generates JWT token
   * @param credentials - User login credentials
   * @returns Promise resolving to JWT token
   * @throws Error if credentials are invalid
   */
  async loginUser(credentials: LoginUserData): Promise<string> {
    try {
      const user = await this.userRepository.findByEmail(credentials.email);
      if (!user) {
        throw new Error('Invalid credentials');
      }

      const isValidPassword = await this.verifyPassword(
        credentials.password,
        user.password
      );
      if (!isValidPassword) {
        throw new Error('Invalid credentials');
      }

      const token = this.generateJWT(user.id);
      return token;
    } catch (error) {
      console.error('User login failed:', error);
      throw error;
    }
  }

  /**
   * Validates email format
   * @param email - Email address to validate
   * @throws Error if email format is invalid
   */
  private validateEmail(email: string): void {
    if (!email || !EMAIL_REGEX.test(email)) {
      throw new Error('Invalid email format');
    }
  }

  /**
   * Validates password length
   * @param password - Password to validate
   * @throws Error if password is too short
   */
  private validatePassword(password: string): void {
    if (!password || password.length < PASSWORD_MIN_LENGTH) {
      throw new Error(`Password must be at least ${PASSWORD_MIN_LENGTH} characters long`);
    }
  }

  /**
   * Checks if email is already registered
   * @param email - Email to check for duplicates
   * @throws Error if email already exists
   */
  private async checkDuplicateEmail(email: string): Promise<void> {
    const existingUser = await this.userRepository.findByEmail(email);
    if (existingUser) {
      throw new Error('Email already registered');
    }
  }

  /**
   * Hashes password with bcrypt
   * @param password - Plain text password
   * @returns Promise resolving to hashed password
   */
  private async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, BCRYPT_ROUNDS);
  }

  /**
   * Verifies password against hash
   * @param password - Plain text password
   * @param hash - Stored password hash
   * @returns Promise resolving to boolean indicating match
   */
  private async verifyPassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  /**
   * Generates JWT token with user ID and 24-hour expiration
   * @param userId - User ID to include in token
   * @returns JWT token string
   * @throws Error if JWT secret is not configured
   */
  private generateJWT(userId: string): string {
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      throw new Error('JWT_SECRET environment variable not configured');
    }

    return jwt.sign(
      { userId },
      jwtSecret,
      { expiresIn: JWT_EXPIRES_IN }
    );
  }
}