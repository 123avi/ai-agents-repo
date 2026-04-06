/**
 * User repository interface defining data access methods for user entities.
 * Provides abstraction layer between business logic and data persistence.
 */
export interface UserRepository {
  /**
   * Find a user by their email address
   * @param email - The email address to search for
   * @returns Promise resolving to user object or null if not found
   */
  findByEmail(email: string): Promise<any | null>;

  /**
   * Create a new user in the system
   * @param userData - User data containing email, password hash, and name
   * @returns Promise resolving to created user object with ID
   */
  create(userData: { email: string; password: string; name: string }): Promise<any>;
}