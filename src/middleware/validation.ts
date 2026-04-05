import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

const HTTP_STATUS_BAD_REQUEST = 400;
const MIN_TITLE_LENGTH = 1;

/**
 * Validation middleware for todo creation requests
 * Validates required fields and data types
 * @param req - Express request object
 * @param res - Express response object  
 * @param next - Express next function
 */
export const validateCreateTodo = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const { title, description, due_date } = req.body;

  // Validate title is required and not empty
  if (!title || typeof title !== 'string' || title.trim().length < MIN_TITLE_LENGTH) {
    logger.warn('Todo creation validation failed: invalid title', { title });
    res.status(HTTP_STATUS_BAD_REQUEST).json({
      error: 'Title is required and cannot be empty'
    });
    return;
  }

  // Validate optional description if provided
  if (description !== undefined && typeof description !== 'string') {
    logger.warn('Todo creation validation failed: invalid description type');
    res.status(HTTP_STATUS_BAD_REQUEST).json({
      error: 'Description must be a string'
    });
    return;
  }

  // Validate optional due_date if provided
  if (due_date !== undefined) {
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (typeof due_date !== 'string' || !dateRegex.test(due_date)) {
      logger.warn('Todo creation validation failed: invalid due_date format');
      res.status(HTTP_STATUS_BAD_REQUEST).json({
        error: 'Due date must be in YYYY-MM-DD format'
      });
      return;
    }
  }

  next();
};