import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

const VALID_STATUSES = ['open', 'done'] as const;
type TodoStatus = typeof VALID_STATUSES[number];

interface UpdateTodoRequest {
  title?: string;
  description?: string;
  due_date?: string;
  status?: TodoStatus;
}

/**
 * Validates the request body for updating a todo item
 * Ensures status field has valid values if provided
 */
export const validateUpdateTodo = (req: Request, res: Response, next: NextFunction): void => {
  try {
    const { title, description, due_date, status } = req.body as UpdateTodoRequest;

    // Validate status if provided
    if (status !== undefined) {
      if (!VALID_STATUSES.includes(status)) {
        logger.warn(`Invalid status value: ${status}`);
        res.status(400).json({ 
          error: 'Invalid status value', 
          valid_values: VALID_STATUSES 
        });
        return;
      }
    }

    // Validate title if provided
    if (title !== undefined && (typeof title !== 'string' || title.trim().length === 0)) {
      logger.warn('Invalid title provided');
      res.status(400).json({ error: 'Title must be a non-empty string' });
      return;
    }

    // Validate description if provided
    if (description !== undefined && typeof description !== 'string') {
      logger.warn('Invalid description provided');
      res.status(400).json({ error: 'Description must be a string' });
      return;
    }

    // Validate due_date if provided
    if (due_date !== undefined) {
      if (typeof due_date !== 'string' || isNaN(Date.parse(due_date))) {
        logger.warn(`Invalid due_date provided: ${due_date}`);
        res.status(400).json({ error: 'Due date must be a valid ISO date string' });
        return;
      }
    }

    next();
  } catch (error) {
    logger.error('Error in todo validation middleware:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};