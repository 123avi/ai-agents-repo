import { UserRepository } from '../repositories/user.repository.js';
import { PasswordHasher } from '../security/password-hasher.js';
import { JWTHandler } from '../security/jwt-handler.js';
import { User } from '../types/user.js';

/**
 * Service for handling user authentication operations including registration and login
 */
export class AuthService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly passwordHasher: PasswordHasher,
    private readonly jwtHandler: JWTHandler
  ) {}

  /**
   * Registers a new user with email uniqueness validation and password hashing
   * @param email - User's email address
   * @param password - User's plain text password
   * @returns Promise resolving to the created user's ID
   * @throws Error if email already exists or registration fails
   */
  async register(email: string, password: string): Promise<number> {
    try {
      const existingUser = await this.userRepository.findByEmail(email);
      if (existingUser) {
        throw new Error('User with this email already exists');
      }

      return await this.createUser(email, password);
    } catch (error) {
      if (error instanceof Error) {
        if (error.message === 'User with this email already exists') {
          throw error;
        }
        throw new Error('Registration failed: ' + error.message);
      }
      throw new Error('Registration failed due to unknown error');
    }
  }

  /**
   * Authenticates user credentials and generates JWT token
   * @param email - User's email address
   * @param password - User's plain text password
   * @returns Promise resolving to JWT token
   * @throws Error if credentials are invalid or login fails
   */
  async login(email: string, password: string): Promise<string> {
    try {
      const user = await this.userRepository.findByEmail(email);
      if (!user) {
        throw new Error('Invalid credentials');
      }

      return await this.authenticateUser(user, password);
    } catch (error) {
      if (error instanceof Error) {
        if (error.message === 'Invalid credentials') {
          throw error;
        }
        throw new Error('Login failed: ' + error.message);
      }
      throw new Error('Login failed due to unknown error');
    }
  }

  /**
   * Creates a new user with hashed password
   * @private
   */
  private async createUser(email: string, password: string): Promise<number> {
    const hashedPassword = await this.passwordHasher.hash(password);
    const user = await this.userRepository.create({
      email,
      password: hashedPassword
    });
    return user.id;
  }

  /**
   * Authenticates user and generates JWT token
   * @private
   */
  private async authenticateUser(user: User, password: string): Promise<string> {
    const isValidPassword = await this.passwordHasher.verify(password, user.password);
    if (!isValidPassword) {
      throw new Error('Invalid credentials');
    }
    return this.jwtHandler.generateToken({ userId: user.id });
  }
}