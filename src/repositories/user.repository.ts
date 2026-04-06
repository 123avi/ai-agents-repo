import { PrismaClient, User, Prisma } from '@prisma/client';
import winston from 'winston';

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' })
  ]
});

/**
 * Repository class for User database operations using Prisma ORM.
 * Provides methods for creating and retrieving user records with proper error handling.
 */
export class UserRepository {
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  /**
   * Creates a new user record in the database.
   * @param userData - The user data to create
   * @returns Promise<User> - The created user object
   * @throws Error if database operation fails
   */
  async createUser(userData: Prisma.UserCreateInput): Promise<User> {
    try {
      const user = await this.prisma.user.create({
        data: userData
      });
      return user;
    } catch (error) {
      logger.error('Failed to create user', {
        error: error instanceof Error ? error.message : 'Unknown error',
        email: userData.email,
        operation: 'createUser'
      });
      throw new Error(`Failed to create user with email ${userData.email}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Retrieves a user by their email address.
   * @param email - The email address to search for
   * @returns Promise<User | null> - The user object if found, null otherwise
   * @throws Error if database operation fails
   */
  async findUserByEmail(email: string): Promise<User | null> {
    try {
      const user = await this.prisma.user.findUnique({
        where: {
          email: email
        }
      });
      return user;
    } catch (error) {
      logger.error('Failed to find user by email', {
        error: error instanceof Error ? error.message : 'Unknown error',
        email: email,
        operation: 'findUserByEmail'
      });
      throw new Error(`Failed to find user with email ${email}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Retrieves a user by their unique ID.
   * @param id - The user ID to search for
   * @returns Promise<User | null> - The user object if found, null otherwise
   * @throws Error if database operation fails
   */
  async findUserById(id: string): Promise<User | null> {
    try {
      const user = await this.prisma.user.findUnique({
        where: {
          id: id
        }
      });
      return user;
    } catch (error) {
      logger.error('Failed to find user by ID', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId: id,
        operation: 'findUserById'
      });
      throw new Error(`Failed to find user with ID ${id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}