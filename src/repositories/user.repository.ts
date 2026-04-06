import { User, CreateUserRequest } from '../interfaces/user.interface';

/**
 * Repository interface for user data operations
 */
export interface UserRepository {
  /**
   * Creates a new user in the database
   * @param userData - User creation data
   * @returns Promise resolving to created user
   */
  create(userData: CreateUserRequest): Promise<User>;

  /**
   * Finds a user by email address
   * @param email - User's email address
   * @returns Promise resolving to user or null if not found
   */
  findByEmail(email: string): Promise<User | null>;

  /**
   * Finds a user by ID
   * @param id - User's unique identifier
   * @returns Promise resolving to user or null if not found
   */
  findById(id: number): Promise<User | null>;
}

/**
 * PostgreSQL implementation of UserRepository
 */
export class PostgresUserRepository implements UserRepository {
  /**
   * Creates a new user in PostgreSQL database
   * @param userData - User creation data
   * @returns Promise resolving to created user
   */
  async create(userData: CreateUserRequest): Promise<User> {
    // Implementation will be added when database layer is implemented
    throw new Error('Database implementation not yet available');
  }

  /**
   * Finds a user by email in PostgreSQL database
   * @param email - User's email address
   * @returns Promise resolving to user or null if not found
   */
  async findByEmail(email: string): Promise<User | null> {
    // Implementation will be added when database layer is implemented
    throw new Error('Database implementation not yet available');
  }

  /**
   * Finds a user by ID in PostgreSQL database
   * @param id - User's unique identifier
   * @returns Promise resolving to user or null if not found
   */
  async findById(id: number): Promise<User | null> {
    // Implementation will be added when database layer is implemented
    throw new Error('Database implementation not yet available');
  }
}