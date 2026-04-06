import { Request, Response } from 'express';
import { TodoService } from '../services/TodoService';

const VALID_TODO_STATUSES = ['pending', 'completed'] as const;

/**
 * Controller for handling todo-related HTTP requests.
 * All endpoints require JWT authentication via authMiddleware.
 */
export class TodoController {
  private todoService: TodoService;

  constructor(todoService: TodoService) {
    this.todoService = todoService;
  }

  /**
   * Creates a new todo item for the authenticated user.
   * @param req - Express request with authenticated user
   * @param res - Express response
   */
  async createTodo(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      const { title, description } = req.body;

      const todo = await this.todoService.createTodo(userId, { title, description });
      res.status(201).json(todo);
    } catch (error) {
      this.handleError(error, res);
    }
  }

  /**
   * Retrieves todos for the authenticated user with optional status filtering.
   * @param req - Express request with authenticated user and optional status query
   * @param res - Express response
   */
  async getTodos(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      const { status } = req.query;

      if (status && !VALID_TODO_STATUSES.includes(status as any)) {
        res.status(400).json({ error: 'Invalid status parameter. Must be pending or completed.' });
        return;
      }

      const todos = await this.todoService.getTodos(userId, status as string);
      res.status(200).json(todos);
    } catch (error) {
      this.handleError(error, res);
    }
  }

  /**
   * Retrieves a single todo by ID for the authenticated user.
   * @param req - Express request with todo ID parameter
   * @param res - Express response
   */
  async getTodoById(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      const todoId = parseInt(req.params.id);

      const todo = await this.todoService.getTodoById(userId, todoId);
      if (!todo) {
        res.status(404).json({ error: 'Todo not found' });
        return;
      }

      res.status(200).json(todo);
    } catch (error) {
      this.handleError(error, res);
    }
  }

  /**
   * Updates a todo item for the authenticated user.
   * @param req - Express request with todo ID and update data
   * @param res - Express response
   */
  async updateTodo(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      const todoId = parseInt(req.params.id);
      const updateData = req.body;

      const todo = await this.todoService.updateTodo(userId, todoId, updateData);
      if (!todo) {
        res.status(404).json({ error: 'Todo not found' });
        return;
      }

      res.status(200).json(todo);
    } catch (error) {
      this.handleError(error, res);
    }
  }

  /**
   * Deletes a todo item for the authenticated user.
   * @param req - Express request with todo ID parameter
   * @param res - Express response
   */
  async deleteTodo(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      const todoId = parseInt(req.params.id);

      const deleted = await this.todoService.deleteTodo(userId, todoId);
      if (!deleted) {
        res.status(404).json({ error: 'Todo not found' });
        return;
      }

      res.status(204).send();
    } catch (error) {
      this.handleError(error, res);
    }
  }

  /**
   * Handles errors with appropriate HTTP responses while preserving useful context.
   * @param error - The error to handle
   * @param res - Express response
   */
  private handleError(error: any, res: Response): void {
    console.error('TodoController error:', error);

    if (error.name === 'ValidationError') {
      res.status(400).json({ error: 'Validation failed', details: error.message });
    } else if (error.name === 'NotFoundError') {
      res.status(404).json({ error: error.message || 'Resource not found' });
    } else if (error.name === 'UnauthorizedError') {
      res.status(403).json({ error: 'Access denied' });
    } else {
      res.status(500).json({ error: 'Internal server error' });
    }
  }
}
