import express from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { body, validationResult } from 'express-validator';
import { pool } from '../database/connection';

const router = express.Router();

// Named constants
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const TOKEN_EXPIRATION = '24h';
const INVALID_CREDENTIALS_ERROR = 'Invalid credentials';
const SERVER_ERROR_MESSAGE = 'Internal server error';

/**
 * Validates login request body
 */
const validateLoginRequest = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .matches(EMAIL_REGEX)
    .withMessage('Valid email is required'),
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters')
];

/**
 * POST /api/auth/login - Authenticates user and returns JWT token
 * Accepts email and password, validates credentials, returns JWT token on success
 */
router.post('/login', validateLoginRequest, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password } = req.body;

    const result = await findUserByEmail(email);
    if (!result) {
      return res.status(401).json({ error: INVALID_CREDENTIALS_ERROR });
    }

    const isValidPassword = await validatePassword(password, result.password_hash);
    if (!isValidPassword) {
      return res.status(401).json({ error: INVALID_CREDENTIALS_ERROR });
    }

    const token = generateJwtToken(result.id);
    res.status(200).json({ token });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: SERVER_ERROR_MESSAGE });
  }
});

/**
 * Finds user by email address
 * @param {string} email - User email address
 * @returns {Promise<Object|null>} User object or null if not found
 */
async function findUserByEmail(email) {
  const query = 'SELECT id, email, password_hash FROM users WHERE email = $1';
  const result = await pool.query(query, [email]);
  return result.rows.length > 0 ? result.rows[0] : null;
}

/**
 * Validates password against hash
 * @param {string} password - Plain text password
 * @param {string} hash - Stored password hash
 * @returns {Promise<boolean>} True if password is valid
 */
async function validatePassword(password, hash) {
  return await bcrypt.compare(password, hash);
}

/**
 * Generates JWT token for authenticated user
 * @param {string} userId - User ID
 * @returns {string} JWT token valid for 24 hours
 */
function generateJwtToken(userId) {
  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret) {
    throw new Error('JWT_SECRET environment variable is required');
  }

  return jwt.sign(
    { userId },
    jwtSecret,
    { expiresIn: TOKEN_EXPIRATION }
  );
}

export default router;