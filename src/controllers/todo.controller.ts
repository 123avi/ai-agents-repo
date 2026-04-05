import { Request, Response, NextFunction } from 'express';
import { todoService } from '../services/todo.service';
import { CreateTodoRequest, UpdateTodoRequest, TodoResponse } from '../types/todo.types';
import { AuthenticatedRequest } from '../types/auth.types';
import { HTTP_STATUS } from '../constants/http.constants';
import { logger } from '../utils/logger';

/**
 * Controller handling HTTP requests for todo CRUD operations
 * Enforces user isolation and authentication requirements
 */
export class TodoController {
  /**
   * Creates a new todo item for authenticated user
   * @param req - Authenticated request with todo data
   * @param res - HTTP response
   * @param next - Next middleware function
   */
  async createTodo(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.id;
      const todoData: CreateTodoRequest = req.body;
      
      const todo = await todoService.createTodo(userId, todoData);
      
      res.status(HTTP_STATUS.CREATED).json({
        success: true,
        data: todo
      });
    } catch (error) {
      logger.error('Error creating todo:', error);
      next(error);
    }
  }

  /**
   * Retrieves all todos for authenticated user
   * @param req - Authenticated request
   * @param res - HTTP response
   * @param next - Next middleware function
   */
  async getTodos(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.id;
      
      const todos = await todoService.getTodosByUserId(userId);
      
      res.status(HTTP_STATUS.OK).json({
        success: true,
        data: todos
      });
    } catch (error) {
      logger.error('Error fetching todos:', error);
      next(error);
    }
  }

  /**
   * Retrieves a single todo by ID for authenticated user
   * @param req - Authenticated request with todo ID
   * @param res - HTTP response
   * @param next - Next middleware function
   */
  async getTodoById(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.id;
      const todoId = parseInt(req.params.id, 10);
      
      if (isNaN(todoId)) {
        res.status(HTTP_STATUS.BAD_REQUEST).json({
          success: false,
          error: 'Invalid todo ID'
        });
        return;
      }
      
      const todo = await todoService.getTodoById(todoId, userId);
      
      if (!todo) {
        res.status(HTTP_STATUS.NOT_FOUND).json({
          success: false,
          error: 'Todo not found'
        });
        return;
      }
      
      res.status(HTTP_STATUS.OK).json({
        success: true,
        data: todo
      });
    } catch (error) {
      logger.error('Error fetching todo by ID:', error);
      next(error);
    }
  }

  /**
   * Updates a todo item for authenticated user
   * @param req - Authenticated request with todo ID and update data
   * @param res - HTTP response
   * @param next - Next middleware function
   */
  async updateTodo(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.id;
      const todoId = parseInt(req.params.id, 10);
      const updateData: UpdateTodoRequest = req.body;
      
      if (isNaN(todoId)) {
        res.status(HTTP_STATUS.BAD_REQUEST).json({
          success: false,
          error: 'Invalid todo ID'
        });
        return;
      }
      
      const updatedTodo = await todoService.updateTodo(todoId, userId, updateData);
      
      if (!updatedTodo) {
        res.status(HTTP_STATUS.FORBIDDEN).json({
          success: false,
          error: 'Access denied or todo not found'
        });
        return;
      }
      
      res.status(HTTP_STATUS.OK).json({
        success: true,
        data: updatedTodo
      });
    } catch (error) {
      logger.error('Error updating todo:', error);
      next(error);
    }
  }

  /**
   * Deletes a todo item for authenticated user
   * @param req - Authenticated request with todo ID
   * @param res - HTTP response
   * @param next - Next middleware function
   */
  async deleteTodo(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.id;
      const todoId = parseInt(req.params.id, 10);
      
      if (isNaN(todoId)) {
        res.status(HTTP_STATUS.BAD_REQUEST).json({
          success: false,
          error: 'Invalid todo ID'
        });
        return;
      }
      
      const deleted = await todoService.deleteTodo(todoId, userId);
      
      if (!deleted) {
        res.status(HTTP_STATUS.FORBIDDEN).json({
          success: false,
          error: 'Access denied or todo not found'
        });
        return;
      }
      
      res.status(HTTP_STATUS.NO_CONTENT).send();
    } catch (error) {
      logger.error('Error deleting todo:', error);
      next(error);
    }
  }
}

export const todoController = new TodoController();