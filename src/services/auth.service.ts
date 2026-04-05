import { UserRepository } from '../repositories/user.repository';
import { User } from '../models/user.model';
import { logger } from '../utils/logger';

/**
 * Authentication service handling user-related database operations
 */
export class AuthService {
  private userRepository: UserRepository;

  constructor(userRepository: UserRepository) {
    this.userRepository = userRepository;
  }

  /**
   * Finds user by email address
   * @param email - User email to search for
   * @returns User object if found, null otherwise
   */
  async findUserByEmail(email: string): Promise<User | null> {
    try {
      return await this.userRepository.findByEmail(email);
    } catch (error) {
      logger.error('Error finding user by email:', error);
      throw error;
    }
  }
}