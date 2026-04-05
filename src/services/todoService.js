const todoRepository = require('../repositories/todoRepository');
const { AppError } = require('../utils/errors');
const { HTTP_STATUS } = require('../constants/httpStatus');

/**
 * Service layer for todo business logic
 */
class TodoService {
  /**
   * Deletes a todo item after validating ownership
   * @param {number} todoId - The ID of the todo to delete
   * @param {number} userId - The ID of the requesting user
   * @throws {AppError} When todo not found or access denied
   */
  async deleteTodo(todoId, userId) {
    const todo = await todoRepository.findById(todoId);
    
    if (!todo) {
      throw new AppError('Todo not found', HTTP_STATUS.NOT_FOUND);
    }

    if (todo.user_id !== userId) {
      throw new AppError('Access denied', HTTP_STATUS.FORBIDDEN);
    }

    await todoRepository.deleteById(todoId);
  }
}

module.exports = new TodoService();