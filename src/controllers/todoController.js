const todoService = require('../services/todoService');
const logger = require('../utils/logger');

/**
 * Retrieves all todo items for the authenticated user
 * @param {Object} req - Express request object with user from auth middleware
 * @param {Object} res - Express response object
 * @returns {Promise<void>} JSON response with todo items or error
 */
const getTodos = async (req, res) => {
  try {
    const userId = req.user.id;
    logger.info(`Fetching todos for user: ${userId}`);
    
    const todos = await todoService.getTodosByUserId(userId);
    
    logger.info(`Retrieved ${todos.length} todos for user: ${userId}`);
    res.status(200).json(todos);
  } catch (error) {
    logger.error(`Error fetching todos for user ${req.user?.id}:`, error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = {
  getTodos
};