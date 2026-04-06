import { Request, Response } from 'express';
import { todoService } from '../services/todoService';
import { isValidTodoStatus, validateTodoId } from '../utils/validation';
import { logger } from '../utils/logger';

/**
 * Request interface with authenticated user
 */
interface AuthenticatedRequest extends Request {
  user?: {
    id: number;
  };
}

/**
 * Validates that user is authenticated
 * @param req - Express request object
 * @throws Error with 401 status if user not authenticated
 */
function validateUserAuthentication(req: AuthenticatedRequest): number {
  if (!req.user?.id) {
    const error = new Error('Unauthorized: User not authenticated');
    (error as any).status = 401;
    throw error;
  }
  return req.user.id;
}

/**
 * Creates a new todo item
 * POST /api/todos
 */
export async function createTodo(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const userId = validateUserAuthentication(req);
    const { title, description, status = 'pending' } = req.body;

    if (!title || typeof title !== 'string' || title.trim().length === 0) {
      res.status(400).json({ error: 'Title is required and must be a non-empty string' });
      return;
    }

    if (status && !isValidTodoStatus(status)) {
      res.status(400).json({ error: 'Invalid status. Must be: pending, in-progress, or completed' });
      return;
    }

    const todo = await todoService.createTodo({
      title: title.trim(),
      description: description?.trim() || '',
      status,
      userId
    });

    res.status(201).json(todo);
  } catch (error) {
    logger.error('Error creating todo:', error);
    const status = (error as any).status || 500;
    const message = status === 401 ? (error as Error).message : 'Failed to create todo';
    res.status(status).json({ error: message });
  }
}

/**
 * Retrieves user's todo items with optional status filter
 * GET /api/todos
 */
export async function getTodos(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const userId = validateUserAuthentication(req);
    const { status } = req.query;

    if (status && typeof status === 'string' && !isValidTodoStatus(status)) {
      res.status(400).json({ error: 'Invalid status filter. Must be: pending, in-progress, or completed' });
      return;
    }

    const todos = await todoService.getTodosByUser(userId, status as string);
    res.status(200).json(todos);
  } catch (error) {
    logger.error('Error fetching todos:', error);
    const status = (error as any).status || 500;
    const message = status === 401 ? (error as Error).message : 'Failed to fetch todos';
    res.status(status).json({ error: message });
  }
}

/**
 * Retrieves a single todo item by ID
 * GET /api/todos/:id
 */
export async function getTodoById(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const userId = validateUserAuthentication(req);
    const todoId = validateTodoId(req.params.id);

    const todo = await todoService.getTodoById(todoId, userId);
    if (!todo) {
      res.status(404).json({ error: 'Todo not found' });
      return;
    }

    res.status(200).json(todo);
  } catch (error) {
    logger.error('Error fetching todo by ID:', error);
    const status = (error as any).status || 500;
    let message = 'Failed to fetch todo';
    
    if (status === 401) {
      message = (error as Error).message;
    } else if ((error as Error).message.includes('Invalid todo ID')) {
      res.status(400).json({ error: (error as Error).message });
      return;
    }
    
    res.status(status).json({ error: message });
  }
}

/**
 * Updates an existing todo item
 * PUT /api/todos/:id
 */
export async function updateTodo(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const userId = validateUserAuthentication(req);
    const todoId = validateTodoId(req.params.id);
    const { title, description, status } = req.body;

    if (title !== undefined && (typeof title !== 'string' || title.trim().length === 0)) {
      res.status(400).json({ error: 'Title must be a non-empty string' });
      return;
    }

    if (status && !isValidTodoStatus(status)) {
      res.status(400).json({ error: 'Invalid status. Must be: pending, in-progress, or completed' });
      return;
    }

    const updateData: any = {};
    if (title !== undefined) updateData.title = title.trim();
    if (description !== undefined) updateData.description = description.trim();
    if (status !== undefined) updateData.status = status;

    const todo = await todoService.updateTodo(todoId, updateData, userId);
    if (!todo) {
      res.status(404).json({ error: 'Todo not found' });
      return;
    }

    res.status(200).json(todo);
  } catch (error) {
    logger.error('Error updating todo:', error);
    const status = (error as any).status || 500;
    let message = 'Failed to update todo';
    
    if (status === 401) {
      message = (error as Error).message;
    } else if ((error as Error).message.includes('Invalid todo ID')) {
      res.status(400).json({ error: (error as Error).message });
      return;
    }
    
    res.status(status).json({ error: message });
  }
}

/**
 * Deletes a todo item
 * DELETE /api/todos/:id
 */
export async function deleteTodo(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const userId = validateUserAuthentication(req);
    const todoId = validateTodoId(req.params.id);

    const deleted = await todoService.deleteTodo(todoId, userId);
    if (!deleted) {
      res.status(404).json({ error: 'Todo not found' });
      return;
    }

    res.status(204).send();
  } catch (error) {
    logger.error('Error deleting todo:', error);
    const status = (error as any).status || 500;
    let message = 'Failed to delete todo';
    
    if (status === 401) {
      message = (error as Error).message;
    } else if ((error as Error).message.includes('Invalid todo ID')) {
      res.status(400).json({ error: (error as Error).message });
      return;
    }
    
    res.status(status).json({ error: message });
  }
}