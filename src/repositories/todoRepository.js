const { pool } = require('../config/database');
const { logger } = require('../utils/logger');

/**
 * Finds a todo by its ID
 * @param {number} id - Todo ID
 * @returns {Promise<Object|null>} Todo object or null if not found
 */
const findById = async (id) => {
  try {
    const query = 'SELECT * FROM todos WHERE id = $1';
    const result = await pool.query(query, [id]);
    return result.rows[0] || null;
  } catch (error) {
    logger.error('Database error in findById:', { error: error.message, id });
    throw error;
  }
};

/**
 * Updates a todo with new data
 * @param {number} id - Todo ID
 * @param {Object} updateData - Data to update
 * @returns {Promise<Object>} Updated todo object
 */
const update = async (id, updateData) => {
  try {
    const allowedFields = ['title', 'description', 'due_date', 'status'];
    const updateFields = [];
    const updateValues = [];
    let paramIndex = 1;

    // Build dynamic update query
    for (const [key, value] of Object.entries(updateData)) {
      if (allowedFields.includes(key)) {
        updateFields.push(`${key} = $${paramIndex}`);
        updateValues.push(value);
        paramIndex++;
      }
    }

    if (updateFields.length === 0) {
      throw new Error('No valid fields to update');
    }

    // Add updated_at timestamp
    updateFields.push(`updated_at = $${paramIndex}`);
    updateValues.push(new Date());
    paramIndex++;

    // Add ID for WHERE clause
    updateValues.push(id);

    const query = `
      UPDATE todos 
      SET ${updateFields.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `;

    const result = await pool.query(query, updateValues);
    return result.rows[0];
  } catch (error) {
    logger.error('Database error in update:', { error: error.message, id, updateData });
    throw error;
  }
};

module.exports = {
  findById,
  update
};