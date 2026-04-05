const jwt = require('jsonwebtoken');
const logger = require('../utils/logger');

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRY = process.env.JWT_EXPIRY || '24h';

/**
 * Middleware to authenticate JWT token and extract user information
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 * @returns {void} Calls next() if authenticated, sends 401 if not
 */
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) {
    logger.warn('Authentication failed: No token provided');
    return res.status(401).json({ error: 'Access token required' });
  }
  
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    logger.info(`User authenticated: ${decoded.id}`);
    next();
  } catch (error) {
    logger.warn('Authentication failed: Invalid token', { error: error.message });
    res.status(401).json({ error: 'Invalid or expired token' });
  }
};

module.exports = authenticateToken;