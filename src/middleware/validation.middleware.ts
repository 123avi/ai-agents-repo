import { Request, Response, NextFunction } from 'express';
import { CreateTodoDto, UpdateTodoDto } from '../dto/todo.dto';
import { logger } from '../utils/logger';

const VALID_STATUSES = ['pending', 'completed'] as const;
const VALID_PRIORITIES = ['low', 'medium', 'high'] as const;
const TITLE_MAX_LENGTH = 255;
const DESCRIPTION_MAX_LENGTH = 1000;

/**
 * Validates input for creating a new todo
 */
export function validateTodoInput(req: Request, res: Response, next: NextFunction): void {
  try {
    const { title, description, status, priority, dueDate }: CreateTodoDto = req.body;

    // Title is required
    if (!title || typeof title !== 'string' || title.trim().length === 0) {
      res.status(400).json({ error: 'Title is required and must be a non-empty string' });
      return;
    }

    if (title.length > TITLE_MAX_LENGTH) {
      res.status(400).json({ error: `Title must be ${TITLE_MAX_LENGTH} characters or less` });
      return;
    }

    // Optional description validation
    if (description !== undefined) {
      if (typeof description !== 'string') {
        res.status(400).json({ error: 'Description must be a string' });
        return;
      }
      if (description.length > DESCRIPTION_MAX_LENGTH) {
        res.status(400).json({ error: `Description must be ${DESCRIPTION_MAX_LENGTH} characters or less` });
        return;
      }
    }

    // Optional status validation
    if (status !== undefined && !VALID_STATUSES.includes(status)) {
      res.status(400).json({ error: 'Status must be either pending or completed' });
      return;
    }

    // Optional priority validation
    if (priority !== undefined && !VALID_PRIORITIES.includes(priority)) {
      res.status(400).json({ error: 'Priority must be low, medium, or high' });
      return;
    }

    // Optional due date validation
    if (dueDate !== undefined) {
      const parsedDate = new Date(dueDate);
      if (isNaN(parsedDate.getTime())) {
        res.status(400).json({ error: 'Due date must be a valid date' });
        return;
      }
    }

    next();
  } catch (error) {
    logger.error('Todo input validation error', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Validates input for updating an existing todo
 */
export function validateTodoUpdate(req: Request, res: Response, next: NextFunction): void {
  try {
    const { title, description, status, priority, dueDate }: UpdateTodoDto = req.body;

    // At least one field must be provided for update
    if (!title && !description && !status && !priority && !dueDate) {
      res.status(400).json({ error: 'At least one field must be provided for update' });
      return;
    }

    // Title validation if provided
    if (title !== undefined) {
      if (typeof title !== 'string' || title.trim().length === 0) {
        res.status(400).json({ error: 'Title must be a non-empty string' });
        return;
      }
      if (title.length > TITLE_MAX_LENGTH) {
        res.status(400).json({ error: `Title must be ${TITLE_MAX_LENGTH} characters or less` });
        return;
      }
    }

    // Description validation if provided
    if (description !== undefined) {
      if (typeof description !== 'string') {
        res.status(400).json({ error: 'Description must be a string' });
        return;
      }
      if (description.length > DESCRIPTION_MAX_LENGTH) {
        res.status(400).json({ error: `Description must be ${DESCRIPTION_MAX_LENGTH} characters or less` });
        return;
      }
    }

    // Status validation if provided
    if (status !== undefined && !VALID_STATUSES.includes(status)) {
      res.status(400).json({ error: 'Status must be either pending or completed' });
      return;
    }

    // Priority validation if provided
    if (priority !== undefined && !VALID_PRIORITIES.includes(priority)) {
      res.status(400).json({ error: 'Priority must be low, medium, or high' });
      return;
    }

    // Due date validation if provided
    if (dueDate !== undefined) {
      const parsedDate = new Date(dueDate);
      if (isNaN(parsedDate.getTime())) {
        res.status(400).json({ error: 'Due date must be a valid date' });
        return;
      }
    }

    next();
  } catch (error) {
    logger.error('Todo update validation error', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}