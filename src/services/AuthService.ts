import { IUserRepository } from '../repositories/interfaces/IUserRepository';
import { IPasswordHasher } from '../security/interfaces/IPasswordHasher';
import { IJwtHandler } from '../security/interfaces/IJwtHandler';
import { User } from '../models/User';
import { ConflictError, UnauthorizedError } from '../errors/AppErrors';

/**
 * Authentication service handling user registration and login operations
 */
export class AuthService {
  /**
   * Creates an instance of AuthService
   * @param userRepository - Repository for user data operations
   * @param passwordHasher - Service for password hashing
   * @param jwtHandler - Service for JWT token operations
   */
  constructor(
    private readonly userRepository: IUserRepository,
    private readonly passwordHasher: IPasswordHasher,
    private readonly jwtHandler: IJwtHandler
  ) {}

  /**
   * Registers a new user with email uniqueness validation
   * @param email - User's email address
   * @param password - User's plain text password
   * @returns Promise resolving to created user's ID
   * @throws ConflictError if email already exists
   */
  async register(email: string, password: string): Promise<number> {
    try {
      const existingUser = await this.userRepository.findByEmail(email);
      if (existingUser) {
        throw new ConflictError('Email already registered');
      }

      const hashedPassword = await this.passwordHasher.hash(password);
      
      const user = new User(email, hashedPassword);
      const createdUser = await this.userRepository.create(user);
      
      return createdUser.id!;
    } catch (error) {
      if (error instanceof ConflictError) {
        throw error;
      }
      throw new Error(`Registration failed: ${error}`);
    }
  }

  /**
   * Authenticates user credentials and generates JWT token
   * @param email - User's email address
   * @param password - User's plain text password
   * @returns Promise resolving to JWT token
   * @throws UnauthorizedError if credentials are invalid
   */
  async login(email: string, password: string): Promise<string> {
    try {
      const user = await this.userRepository.findByEmail(email);
      if (!user) {
        throw new UnauthorizedError('Invalid credentials');
      }

      const isPasswordValid = await this.passwordHasher.verify(password, user.password);
      if (!isPasswordValid) {
        throw new UnauthorizedError('Invalid credentials');
      }

      const token = this.jwtHandler.generateToken({ userId: user.id!, email: user.email });
      return token;
    } catch (error) {
      if (error instanceof UnauthorizedError) {
        throw error;
      }
      throw new Error(`Login failed: ${error}`);
    }
  }
}