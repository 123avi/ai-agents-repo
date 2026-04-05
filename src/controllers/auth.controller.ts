/**
 * Authentication controller handling user login
 */

import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { config } from '../config/index';
import { getUserByEmail } from '../repositories/user.repository';
import { logger } from '../utils/logger';

interface LoginRequest {
  email: string;
  password: string;
}

/**
 * Validates user credentials against database
 * @param email - User email address
 * @param password - Plain text password
 * @returns User data if credentials are valid, null otherwise
 */
async function validateCredentials(email: string, password: string) {
  try {
    const user = await getUserByEmail(email);
    if (!user) {
      return null;
    }

    const isValidPassword = await bcrypt.compare(password, user.passwordHash);
    return isValidPassword ? user : null;
  } catch (error) {
    logger.error('Database error during credential validation', { error });
    throw new Error('Authentication service temporarily unavailable');
  }
}

/**
 * Authenticates user and returns user data
 * @param email - User email address
 * @param password - Plain text password
 * @returns User data if authentication successful
 */
async function authenticateUser(email: string, password: string) {
  const user = await validateCredentials(email, password);
  
  if (!user) {
    const error = new Error('Invalid credentials');
    (error as any).status = 401;
    throw error;
  }

  return user;
}

/**
 * Generates JWT token response for authenticated user
 * @param user - Authenticated user data
 * @returns Token response object
 */
function generateTokenResponse(user: any) {
  const token = jwt.sign(
    { userId: user.id, email: user.email },
    config.jwt.secret,
    { expiresIn: config.jwt.expiresIn }
  );

  return {
    success: true,
    data: {
      token,
      user: {
        id: user.id,
        email: user.email
      }
    }
  };
}

/**
 * Handles POST /api/auth/login requests
 * @param req - Express request object
 * @param res - Express response object
 */
export async function login(req: Request, res: Response): Promise<void> {
  try {
    const { email, password }: LoginRequest = req.body;

    if (!email || !password) {
      res.status(400).json({
        success: false,
        error: {
          code: 'MISSING_CREDENTIALS',
          message: 'Email and password are required'
        }
      });
      return;
    }

    const user = await authenticateUser(email, password);
    const response = generateTokenResponse(user);
    
    res.status(200).json(response);
  } catch (error: any) {
    if (error.status === 401) {
      res.status(401).json({
        success: false,
        error: {
          code: 'INVALID_CREDENTIALS',
          message: error.message
        }
      });
      return;
    }

    logger.error('Login error', { error });
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Authentication service temporarily unavailable'
      }
    });
  }
}