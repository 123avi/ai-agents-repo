const todoRepository = require('../repositories/todoRepository');
const { NotFoundError, ForbiddenError } = require('../utils/errors');
const { logger } = require('../utils/logger');

const VALID_STATUSES = ['open', 'done'];

/**
 * Updates a todo item with ownership validation
 * @param {number} todoId - ID of the todo to update
 * @param {number} userId - ID of the authenticated user
 * @param {Object} updateData - Data to update (title, description, due_date, status)
 * @returns {Promise<Object>} Updated todo object
 * @throws {NotFoundError} When todo doesn't exist
 * @throws {ForbiddenError} When user doesn't own the todo
 */
const updateTodo = async (todoId, userId, updateData) => {
  try {
    // Validate status if provided
    if (updateData.status && !VALID_STATUSES.includes(updateData.status)) {
      throw new Error(`Status must be one of: ${VALID_STATUSES.join(', ')}`);
    }

    // Check if todo exists and get current data
    const existingTodo = await todoRepository.findById(todoId);
    if (!existingTodo) {
      throw new NotFoundError('Todo not found');
    }

    // Verify ownership
    if (existingTodo.user_id !== userId) {
      throw new ForbiddenError('You can only update your own todos');
    }

    // Update the todo
    const updatedTodo = await todoRepository.update(todoId, updateData);
    
    logger.info('Todo updated successfully:', { todoId, userId });
    return updatedTodo;
  } catch (error) {
    logger.error('Error in updateTodo service:', { error: error.message, todoId, userId });
    throw error;
  }
};

module.exports = {
  updateTodo
};