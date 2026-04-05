const db = require('../config/database');
const logger = require('../utils/logger');

/**
 * Finds all todo items for a specific user
 * @param {string} userId - The ID of the user
 * @returns {Promise<Array>} Array of todo objects with all fields
 * @throws {Error} If database query fails
 */
const findByUserId = async (userId) => {
  const query = `
    SELECT id, title, description, due_date, status
    FROM todos 
    WHERE user_id = $1
    ORDER BY created_at DESC
  `;
  
  try {
    const result = await db.query(query, [userId]);
    return result.rows;
  } catch (error) {
    logger.error(`Database error fetching todos for user ${userId}:`, error);
    throw error;
  }
};

module.exports = {
  findByUserId
};