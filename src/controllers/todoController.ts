import { Request, Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import { todoService } from '../services/todoService';
import { logger } from '../utils/logger';

const TODO_RETRIEVAL_SUCCESS = 200;
const UNAUTHORIZED_ERROR = 401;

/**
 * Controller for handling todo-related HTTP requests
 */
class TodoController {
  /**
   * Retrieves all todos for the authenticated user
   * @param req - Express request object with user authentication data
   * @param res - Express response object
   * @returns Promise<Response> - JSON response with user's todos or error
   */
  async getTodos(req: AuthenticatedRequest, res: Response): Promise<Response> {
    try {
      if (!req.user?.id) {
        logger.warn('Unauthorized access attempt to GET /api/todos');
        return res.status(UNAUTHORIZED_ERROR).json({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Authentication required'
          }
        });
      }

      const userId = req.user.id;
      const todos = await todoService.getTodosByUserId(userId);
      
      logger.info(`Retrieved ${todos.length} todos for user ${userId}`);
      
      return res.status(TODO_RETRIEVAL_SUCCESS).json({
        success: true,
        data: todos
      });
    } catch (error) {
      logger.error('Error retrieving todos:', error);
      throw error;
    }
  }
}

export const todoController = new TodoController();