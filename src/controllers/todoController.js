const todoService = require('../services/todoService');
const { AppError } = require('../utils/errors');
const { HTTP_STATUS } = require('../constants/httpStatus');

/**
 * Handles HTTP requests for todo operations
 */
class TodoController {
  /**
   * Deletes a todo item by ID with ownership validation
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   */
  async deleteTodo(req, res, next) {
    try {
      const todoId = parseInt(req.params.id, 10);
      const userId = req.user.id;

      if (isNaN(todoId)) {
        throw new AppError('Invalid todo ID', HTTP_STATUS.BAD_REQUEST);
      }

      await todoService.deleteTodo(todoId, userId);
      res.status(HTTP_STATUS.NO_CONTENT).send();
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new TodoController();