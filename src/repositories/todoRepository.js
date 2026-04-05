const db = require('../config/database');
const { DatabaseError } = require('../utils/errors');

/**
 * Data access layer for todo operations
 */
class TodoRepository {
  /**
   * Finds a todo by its ID
   * @param {number} id - The todo ID to search for
   * @returns {Promise<Object|null>} Todo object or null if not found
   * @throws {DatabaseError} When database operation fails
   */
  async findById(id) {
    try {
      const query = 'SELECT id, title, description, completed, user_id, created_at, updated_at FROM todos WHERE id = $1';
      const result = await db.query(query, [id]);
      return result.rows[0] || null;
    } catch (error) {
      throw new DatabaseError('Failed to find todo', error);
    }
  }

  /**
   * Deletes a todo by its ID
   * @param {number} id - The todo ID to delete
   * @throws {DatabaseError} When database operation fails
   */
  async deleteById(id) {
    try {
      const query = 'DELETE FROM todos WHERE id = $1';
      await db.query(query, [id]);
    } catch (error) {
      throw new DatabaseError('Failed to delete todo', error);
    }
  }
}

module.exports = new TodoRepository();