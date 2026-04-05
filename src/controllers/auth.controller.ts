import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { getUserByEmail } from '../repositories/user.repository';
import { User } from '../types/user.interface';
import { AuthenticationError } from '../errors/auth.errors';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret';
const TOKEN_EXPIRY = '24h';

/**
 * Handles user login authentication
 * @param req - Express request object with email and password
 * @param res - Express response object
 */
export async function login(req: Request, res: Response): Promise<void> {
  try {
    const { email, password } = req.body;
    
    const user = await authenticateUser(email, password);
    const tokenResponse = generateTokenResponse(user);
    
    res.status(200).json({
      success: true,
      data: tokenResponse
    });
  } catch (error) {
    if (error instanceof AuthenticationError) {
      res.status(error.statusCode).json({
        success: false,
        error: {
          code: 'AUTHENTICATION_FAILED',
          message: error.message
        }
      });
    } else {
      console.error('Login error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'An unexpected error occurred'
        }
      });
    }
  }
}

/**
 * Authenticates user credentials against database
 * @param email - User email address
 * @param password - Plain text password
 * @returns Promise<User> - Authenticated user data
 * @throws AuthenticationError - When credentials are invalid
 */
async function authenticateUser(email: string, password: string): Promise<User> {
  const user = await getUserByEmail(email);
  
  if (!user) {
    throw new AuthenticationError('Invalid credentials', 401);
  }
  
  const isPasswordValid = await bcrypt.compare(password, user.password_hash);
  
  if (!isPasswordValid) {
    throw new AuthenticationError('Invalid credentials', 401);
  }
  
  return user;
}

/**
 * Generates JWT token response for authenticated user
 * @param user - Authenticated user object
 * @returns Object containing JWT token and expiration
 */
function generateTokenResponse(user: User): { token: string; expires_in: string } {
  const payload = {
    user_id: user.id,
    email: user.email
  };
  
  const token = jwt.sign(payload, JWT_SECRET, { expiresIn: TOKEN_EXPIRY });
  
  return {
    token,
    expires_in: TOKEN_EXPIRY
  };
}