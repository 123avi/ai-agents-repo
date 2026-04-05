import { Request, Response, NextFunction } from 'express';
import { body, validationResult } from 'express-validator';
import DOMPurify from 'isomorphic-dompurify';
import rateLimit from 'express-rate-limit';

/** Maximum request size in bytes (1MB) */
const MAX_REQUEST_SIZE = 1024 * 1024;

/** Rate limit configuration */
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const RATE_LIMIT_MAX_REQUESTS = 100;

/**
 * Validates and sanitizes request input to prevent injection attacks
 * @param req Express request object
 * @param res Express response object
 * @param next Express next function
 */
export const validateInput = (req: Request, res: Response, next: NextFunction): void => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    res.status(400).json({
      error: 'Validation failed',
      details: errors.array()
    });
    return;
  }

  // Sanitize string fields in request body
  if (req.body && typeof req.body === 'object') {
    sanitizeObject(req.body);
  }

  next();
};

/**
 * Recursively sanitizes object properties to prevent XSS
 * @param obj Object to sanitize
 */
function sanitizeObject(obj: any): void {
  for (const key in obj) {
    if (typeof obj[key] === 'string') {
      obj[key] = DOMPurify.sanitize(obj[key], { ALLOWED_TAGS: [] });
    } else if (typeof obj[key] === 'object' && obj[key] !== null) {
      sanitizeObject(obj[key]);
    }
  }
}

/**
 * Validates user registration input
 */
export const validateRegistration = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Valid email is required'),
  body('password')
    .isLength({ min: 8 })
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .withMessage('Password must be at least 8 characters with uppercase, lowercase, number, and special character'),
  validateInput
];

/**
 * Validates user login input
 */
export const validateLogin = [
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('password').notEmpty().withMessage('Password is required'),
  validateInput
];

/**
 * Validates todo creation/update input
 */
export const validateTodo = [
  body('title')
    .trim()
    .isLength({ min: 1, max: 200 })
    .withMessage('Title must be between 1 and 200 characters'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Description cannot exceed 1000 characters'),
  body('completed')
    .optional()
    .isBoolean()
    .withMessage('Completed must be a boolean'),
  validateInput
];

/**
 * Rate limiting middleware to prevent abuse
 */
export const rateLimiter = rateLimit({
  windowMs: RATE_LIMIT_WINDOW_MS,
  max: RATE_LIMIT_MAX_REQUESTS,
  message: {
    error: 'Too many requests',
    retryAfter: RATE_LIMIT_WINDOW_MS / 1000
  },
  standardHeaders: true,
  legacyHeaders: false
});

/**
 * Request size limiting middleware
 * @param req Express request object
 * @param res Express response object
 * @param next Express next function
 */
export const limitRequestSize = (req: Request, res: Response, next: NextFunction): void => {
  const contentLength = req.get('content-length');
  
  if (contentLength && parseInt(contentLength) > MAX_REQUEST_SIZE) {
    res.status(413).json({
      error: 'Request entity too large',
      maxSize: MAX_REQUEST_SIZE
    });
    return;
  }
  
  next();
};