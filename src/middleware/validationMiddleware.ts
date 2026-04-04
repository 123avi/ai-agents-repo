import { Request, Response, NextFunction } from 'express';
import { CreateTodoRequest, UpdateTodoRequest } from '../types/todo';

const TITLE_MAX_LENGTH = 255;
const DESCRIPTION_MAX_LENGTH = 1000;

/**
 * Validates create todo request payload
 */
export function validateCreateTodo(req: Request, res: Response, next: NextFunction): void {
  const { title, description }: CreateTodoRequest = req.body;

  if (!title || typeof title !== 'string' || title.trim().length === 0) {
    res.status(400).json({ error: 'Title is required and must be a non-empty string' });
    return;
  }

  if (title.length > TITLE_MAX_LENGTH) {
    res.status(400).json({ error: `Title must be ${TITLE_MAX_LENGTH} characters or less` });
    return;
  }

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

  next();
}

/**
 * Validates update todo request payload
 */
export function validateUpdateTodo(req: Request, res: Response, next: NextFunction): void {
  const { title, description, completed }: UpdateTodoRequest = req.body;

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

  if (completed !== undefined && typeof completed !== 'boolean') {
    res.status(400).json({ error: 'Completed must be a boolean' });
    return;
  }

  next();
}