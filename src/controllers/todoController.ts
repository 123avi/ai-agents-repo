import { Request, Response } from 'express';
import { todoService } from '../services/todoService';
import { logger } from '../utils/logger';
import { AuthenticatedRequest } from '../types/auth';

class TodoController {
  /**
   * Deletes a todo item by ID for the authenticated user
   * @param req - Express request object with authenticated user
   * @param res - Express response object
   */
  async deleteTodo(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const todoId = req.params.id;
      const userId = req.user.id;

      if (!todoId) {
        res.status(400).json({ error: 'Todo ID is required' });
        return;
      }

      const deleted = await todoService.deleteTodo(todoId, userId);
      
      if (!deleted) {
        res.status(404).json({ error: 'Todo not found' });
        return;
      }

      res.status(204).send();
    } catch (error) {
      logger.error('Error deleting todo:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
}

export const todoController = new TodoController();