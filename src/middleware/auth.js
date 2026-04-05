const jwt = require('jsonwebtoken');

// JWT secret key from environment variables
const JWT_SECRET = process.env.JWT_SECRET;
const TOKEN_PREFIX = 'Bearer ';

/**
 * Authentication middleware to validate JWT tokens and extract user ID
 * Protects routes by validating Authorization header and adding user context
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const authenticateToken = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    // Check if Authorization header exists
    if (!authHeader) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'MISSING_TOKEN',
          message: 'Authorization header is required'
        }
      });
    }

    // Extract Bearer token
    const token = extractBearerToken(authHeader);
    if (!token) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'INVALID_TOKEN_FORMAT',
          message: 'Invalid authorization header format. Expected: Bearer <token>'
        }
      });
    }

    // Verify and decode JWT token
    const decoded = jwt.verify(token, JWT_SECRET);
    
    // Add user ID to request object
    req.user = {
      id: decoded.userId
    };

    // Continue to next middleware
    next();
  } catch (error) {
    handleJWTError(error, res);
  }
};

/**
 * Extracts Bearer token from Authorization header
 * @param {string} authHeader - Authorization header value
 * @returns {string|null} - Extracted token or null if invalid format
 */
const extractBearerToken = (authHeader) => {
  if (!authHeader.startsWith(TOKEN_PREFIX)) {
    return null;
  }
  return authHeader.slice(TOKEN_PREFIX.length);
};

/**
 * Handles JWT verification errors with appropriate HTTP responses
 * @param {Error} error - JWT verification error
 * @param {Object} res - Express response object
 */
const handleJWTError = (error, res) => {
  console.error('JWT verification error:', error.message);
  
  if (error.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
      error: {
        code: 'TOKEN_EXPIRED',
        message: 'Token has expired. Please login again.'
      }
    });
  }
  
  if (error.name === 'JsonWebTokenError') {
    return res.status(401).json({
      success: false,
      error: {
        code: 'INVALID_TOKEN',
        message: 'Invalid token provided'
      }
    });
  }
  
  // Generic error for any other JWT-related issues
  return res.status(401).json({
    success: false,
    error: {
      code: 'TOKEN_VERIFICATION_FAILED',
      message: 'Token verification failed'
    }
  });
};

module.exports = {
  authenticateToken
};