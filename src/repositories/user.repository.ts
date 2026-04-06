import { PrismaClient, User } from '@prisma/client';
import { CreateUserData } from '../types/user.types';

/**
 * Repository class for user database operations using Prisma
 * Handles all database interactions for user entities
 */
export class UserRepository {
  private prisma: PrismaClient;

  /**
   * Initialize UserRepository with Prisma client
   * @param prismaClient - Prisma client instance for database operations
   */
  constructor(prismaClient: PrismaClient) {
    this.prisma = prismaClient;
  }

  /**
   * Create a new user in the database
   * @param userData - User data to create new user record
   * @returns Promise resolving to created User object
   * @throws Error when database operation fails
   */
  async createUser(userData: CreateUserData): Promise<User> {
    try {
      const user = await this.prisma.user.create({
        data: {
          email: userData.email,
          password: userData.password,
          name: userData.name
        }
      });
      return user;
    } catch (error) {
      console.error('Failed to create user:', error);
      throw new Error('Database error: Failed to create user');
    }
  }

  /**
   * Find user by email address
   * @param email - Email address to search for
   * @returns Promise resolving to User object or null if not found
   * @throws Error when database operation fails
   */
  async findUserByEmail(email: string): Promise<User | null> {
    try {
      const user = await this.prisma.user.findUnique({
        where: { email }
      });
      return user;
    } catch (error) {
      console.error('Failed to find user by email:', error);
      throw new Error('Database error: Failed to find user by email');
    }
  }

  /**
   * Find user by unique identifier
   * @param id - User ID to search for
   * @returns Promise resolving to User object or null if not found
   * @throws Error when database operation fails
   */
  async findUserById(id: string): Promise<User | null> {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id }
      });
      return user;
    } catch (error) {
      console.error('Failed to find user by ID:', error);
      throw new Error('Database error: Failed to find user by ID');
    }
  }
}