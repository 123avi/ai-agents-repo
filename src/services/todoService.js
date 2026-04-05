const todoRepository = require('../repositories/todoRepository');
const logger = require('../utils/logger');

/**
 * Retrieves all todo items for a specific user
 * @param {string} userId - The ID of the user
 * @returns {Promise<Array>} Array of todo items with all fields
 * @throws {Error} If database operation fails
 */
const getTodosByUserId = async (userId) => {
  try {
    const todos = await todoRepository.findByUserId(userId);
    return todos;
  } catch (error) {
    logger.error(`Service error fetching todos for user ${userId}:`, error);
    throw error;
  }
};

module.exports = {
  getTodosByUserId
};