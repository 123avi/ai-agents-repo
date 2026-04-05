import { Router, Request, Response } from 'express';
import { authenticateToken } from '../middleware/auth';
import { todoService } from '../services/todoService';
import { validateUpdateTodo } from '../validators/todoValidator';
import { logger } from '../utils/logger';

const router = Router();

interface AuthenticatedRequest extends Request {
  userId?: string;
}

/**
 * Updates an existing todo item for the authenticated user
 * PUT /api/todos/:id
 */
router.put('/:id', authenticateToken, validateUpdateTodo, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const todoId = req.params.id;
    const userId = req.userId!;
    const updateData = req.body;

    logger.info(`Updating todo ${todoId} for user ${userId}`);

    const updatedTodo = await todoService.updateTodo(todoId, userId, updateData);
    
    if (!updatedTodo) {
      logger.warn(`Todo ${todoId} not found or user ${userId} not authorized`);
      return res.status(404).json({ error: 'Todo not found' });
    }

    logger.info(`Todo ${todoId} updated successfully`);
    res.status(200).json(updatedTodo);
  } catch (error) {
    logger.error('Error updating todo:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;