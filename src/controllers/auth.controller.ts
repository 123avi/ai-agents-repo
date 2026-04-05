import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import { UserRepository } from '../repositories/user.repository';
import { logger } from '../utils/logger';
import { validateEmail, validatePassword } from '../utils/validation';

const SALT_ROUNDS = 12;

/**
 * Handles user registration endpoint
 */
export class AuthController {
  private userRepository: UserRepository;

  constructor(userRepository: UserRepository) {
    this.userRepository = userRepository;
  }

  /**
   * Registers a new user with email and password validation
   * @param req - Express request object containing email and password
   * @param res - Express response object
   */
  async register(req: Request, res: Response): Promise<void> {
    try {
      const { email, password } = req.body;

      // Validate request body
      if (!email || !password) {
        res.status(400).json({ error: 'Email and password are required' });
        return;
      }

      // Validate email format
      if (!validateEmail(email)) {
        res.status(400).json({ error: 'Invalid email format' });
        return;
      }

      // Validate password length
      if (!validatePassword(password)) {
        res.status(400).json({ error: 'Password must be at least 8 characters long' });
        return;
      }

      // Check if user already exists
      const existingUser = await this.userRepository.findByEmail(email);
      if (existingUser) {
        res.status(400).json({ error: 'Email already exists' });
        return;
      }

      // Hash password and create user
      const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
      const userId = uuidv4();
      
      await this.userRepository.create({
        id: userId,
        email,
        passwordHash
      });

      logger.info('User registered successfully', { userId, email });
      res.status(201).json({ userId });
    } catch (error) {
      logger.error('Registration failed', { error: error.message });
      res.status(500).json({ error: 'Internal server error' });
    }
  }
}