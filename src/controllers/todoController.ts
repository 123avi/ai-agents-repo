import { Request, Response } from 'express';
import { todoService } from '../services/todoService';
import { AuthenticatedRequest } from '../types/auth';
import { logger } from '../utils/logger';

const HTTP_STATUS_CREATED = 201;
const HTTP_STATUS_BAD_REQUEST = 400;
const HTTP_STATUS_INTERNAL_ERROR = 500;

/**
 * Controller for creating a new todo item
 * Handles POST /api/todos endpoint
 * @param req - Express request object with authenticated user
 * @param res - Express response object
 */
export const createTodoController = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const authReq = req as AuthenticatedRequest;
    const userId = authReq.user.id;
    const { title, description, due_date } = req.body;

    logger.info('Creating todo item', { userId, title });

    const newTodo = await todoService.createTodo({
      userId,
      title,
      description,
      due_date
    });

    res.status(HTTP_STATUS_CREATED).json(newTodo);
  } catch (error) {
    logger.error('Error creating todo item', { error: error.message, userId: (req as AuthenticatedRequest).user?.id });
    res.status(HTTP_STATUS_INTERNAL_ERROR).json({
      error: 'Internal server error'
    });
  }
};