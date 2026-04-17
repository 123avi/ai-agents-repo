import { Request, Response, NextFunction } from 'express';
import { TodoService } from '../services/todoService';
import { CreateTodoRequest, UpdateTodoRequest } from '../types/todo';
import { AuthenticatedRequest } from '../types/auth';

/**
 * Controller for todo CRUD operations with JWT authentication
 */
export class TodoController {
  private todoService: TodoService;

  constructor(todoService: TodoService) {
    this.todoService = todoService;
  }

  /**
   * Get all todos for authenticated user
   * GET /todos
   */
  async getTodos(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.id;
      const todos = await this.todoService.getTodosByUserId(userId);
      res.status(200).json(todos);
    } catch (error) {
      console.error('Error getting todos:', error);
      next(error);
    }
  }

  /**
   * Create a new todo for authenticated user
   * POST /todos
   */
  async createTodo(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.id;
      const todoData: CreateTodoRequest = req.body;
      const newTodo = await this.todoService.createTodo(userId, todoData);
      res.status(201).json(newTodo);
    } catch (error) {
      console.error('Error creating todo:', error);
      next(error);
    }
  }

  /**
   * Update a todo for authenticated user
   * PUT /todos/:id
   */
  async updateTodo(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.id;
      const todoId = parseInt(req.params.id, 10);
      const updateData: UpdateTodoRequest = req.body;
      
      if (isNaN(todoId)) {
        res.status(400).json({ error: 'Invalid todo ID' });
        return;
      }

      const updatedTodo = await this.todoService.updateTodo(userId, todoId, updateData);
      if (!updatedTodo) {
        res.status(404).json({ error: 'Todo not found' });
        return;
      }
      
      res.status(200).json(updatedTodo);
    } catch (error) {
      console.error('Error updating todo:', error);
      next(error);
    }
  }

  /**
   * Delete a todo for authenticated user
   * DELETE /todos/:id
   */
  async deleteTodo(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.id;
      const todoId = parseInt(req.params.id, 10);
      
      if (isNaN(todoId)) {
        res.status(400).json({ error: 'Invalid todo ID' });
        return;
      }

      const deleted = await this.todoService.deleteTodo(userId, todoId);
      if (!deleted) {
        res.status(404).json({ error: 'Todo not found' });
        return;
      }
      
      res.status(204).send();
    } catch (error) {
      console.error('Error deleting todo:', error);
      next(error);
    }
  }
}