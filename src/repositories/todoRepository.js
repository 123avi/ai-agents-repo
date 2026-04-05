const pool = require('../config/database');
const logger = require('../utils/logger');

/**
 * Creates a new todo record in the database
 * @param {Object} todoData - Todo data to insert
 * @returns {Promise<Object>} Created todo object with generated ID
 */
const create = async (todoData) => {
  const client = await pool.connect();
  
  try {
    const query = `
      INSERT INTO todos (title, description, due_date, status, user_id, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id, title, description, due_date, status, user_id, created_at, updated_at
    `;
    
    const values = [
      todoData.title,
      todoData.description || null,
      todoData.due_date || null,
      todoData.status,
      todoData.user_id,
      todoData.created_at,
      todoData.updated_at
    ];

    const result = await client.query(query, values);
    
    if (result.rows.length === 0) {
      throw new Error('Failed to create todo record');
    }

    return result.rows[0];
  } catch (error) {
    logger.error('Database error in todoRepository.create:', error);
    throw error;
  } finally {
    client.release();
  }
};

module.exports = {
  create
};