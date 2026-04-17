export interface User {
  id: number;
  email: string;
  password: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateUserRequest {
  email: string;
  password: string;
}

/**
 * User repository interface for data persistence operations
 */
export interface IUserRepository {
  /**
   * Find user by email address
   * @param email - User email to search for
   * @returns Promise resolving to user or null if not found
   */
  findByEmail(email: string): Promise<User | null>;

  /**
   * Create a new user
   * @param userData - User data for creation
   * @returns Promise resolving to created user
   */
  create(userData: CreateUserRequest): Promise<User>;
}