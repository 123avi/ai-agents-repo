import { Request, Response } from 'express';
import { TodoService } from '../services/todo.service';
import { CreateTodoDto, UpdateTodoDto } from '../dto/todo.dto';
import { logger } from '../utils/logger';

/**
 * Controller handling REST endpoints for todo CRUD operations
 * All endpoints require JWT authentication middleware
 */
export class TodoController {
  private todoService: TodoService;

  constructor(todoService: TodoService) {
    this.todoService = todoService;
  }

  /**
   * Creates a new todo item for the authenticated user
   * POST /api/todos
   */
  async createTodo(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ error: 'User not authenticated' });
        return;
      }

      const createTodoDto: CreateTodoDto = req.body;
      const todo = await this.todoService.createTodo(userId, createTodoDto);
      
      logger.info(`Todo created for user ${userId}`, { todoId: todo.id });
      res.status(201).json(todo);
    } catch (error) {
      logger.error('Error creating todo', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * Retrieves all todos for the authenticated user with optional status filtering
   * GET /api/todos?status=completed
   */
  async getTodos(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ error: 'User not authenticated' });
        return;
      }

      const status = req.query.status as string | undefined;
      const todos = await this.todoService.getTodosByUser(userId, status);
      
      logger.info(`Retrieved ${todos.length} todos for user ${userId}`);
      res.status(200).json(todos);
    } catch (error) {
      logger.error('Error retrieving todos', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * Retrieves a single todo by ID for the authenticated user
   * GET /api/todos/{id}
   */
  async getTodoById(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ error: 'User not authenticated' });
        return;
      }

      const todoId = parseInt(req.params.id);
      if (isNaN(todoId)) {
        res.status(400).json({ error: 'Invalid todo ID' });
        return;
      }

      const todo = await this.todoService.getTodoById(userId, todoId);
      if (!todo) {
        res.status(404).json({ error: 'Todo not found' });
        return;
      }

      logger.info(`Retrieved todo ${todoId} for user ${userId}`);
      res.status(200).json(todo);
    } catch (error) {
      logger.error('Error retrieving todo by ID', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * Updates an existing todo for the authenticated user
   * PUT /api/todos/{id}
   */
  async updateTodo(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ error: 'User not authenticated' });
        return;
      }

      const todoId = parseInt(req.params.id);
      if (isNaN(todoId)) {
        res.status(400).json({ error: 'Invalid todo ID' });
        return;
      }

      const updateTodoDto: UpdateTodoDto = req.body;
      const todo = await this.todoService.updateTodo(userId, todoId, updateTodoDto);
      
      if (!todo) {
        res.status(404).json({ error: 'Todo not found' });
        return;
      }

      logger.info(`Updated todo ${todoId} for user ${userId}`);
      res.status(200).json(todo);
    } catch (error) {
      logger.error('Error updating todo', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * Deletes a todo for the authenticated user
   * DELETE /api/todos/{id}
   */
  async deleteTodo(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ error: 'User not authenticated' });
        return;
      }

      const todoId = parseInt(req.params.id);
      if (isNaN(todoId)) {
        res.status(400).json({ error: 'Invalid todo ID' });
        return;
      }

      const deleted = await this.todoService.deleteTodo(userId, todoId);
      if (!deleted) {
        res.status(404).json({ error: 'Todo not found' });
        return;
      }

      logger.info(`Deleted todo ${todoId} for user ${userId}`);
      res.status(204).send();
    } catch (error) {
      logger.error('Error deleting todo', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
}