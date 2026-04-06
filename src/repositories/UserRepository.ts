/**
 * Interface for user data stored in database
 */
export interface User {
  id: string;
  email: string;
  password: string;
  createdAt: Date;
}

/**
 * Interface for creating new user
 */
export interface CreateUserData {
  email: string;
  password: string;
}

/**
 * Abstract base class for user repository operations
 */
export abstract class UserRepository {
  /**
   * Creates a new user in the database
   * @param userData - User data for creation
   * @returns Promise resolving to created user ID
   */
  abstract createUser(userData: CreateUserData): Promise<string>;

  /**
   * Finds a user by email address
   * @param email - Email address to search for
   * @returns Promise resolving to user or null if not found
   */
  abstract findByEmail(email: string): Promise<User | null>;

  /**
   * Finds a user by ID
   * @param id - User ID to search for
   * @returns Promise resolving to user or null if not found
   */
  abstract findById(id: string): Promise<User | null>;
}