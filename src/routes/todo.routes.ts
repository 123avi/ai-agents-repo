import { Router } from 'express';
import { TodoController } from '../controllers/todo.controller';
import { TodoService } from '../services/todo.service';
import { TodoRepository } from '../repositories/todo.repository';
import { authMiddleware } from '../middleware/auth.middleware';
import { validateTodoInput, validateTodoUpdate } from '../middleware/validation.middleware';
import { database } from '../config/database';

/**
 * Router configuration for todo endpoints with authentication and validation middleware
 */
export function createTodoRoutes(): Router {
  const router = Router();
  
  // Initialize dependencies
  const todoRepository = new TodoRepository(database);
  const todoService = new TodoService(todoRepository);
  const todoController = new TodoController(todoService);

  // Apply JWT authentication middleware to all routes
  router.use(authMiddleware);

  // POST /api/todos - Create new todo
  router.post('/', validateTodoInput, (req, res) => {
    todoController.createTodo(req, res);
  });

  // GET /api/todos - Get all todos for user with optional status filter
  router.get('/', (req, res) => {
    todoController.getTodos(req, res);
  });

  // GET /api/todos/{id} - Get single todo by ID
  router.get('/:id', (req, res) => {
    todoController.getTodoById(req, res);
  });

  // PUT /api/todos/{id} - Update existing todo
  router.put('/:id', validateTodoUpdate, (req, res) => {
    todoController.updateTodo(req, res);
  });

  // DELETE /api/todos/{id} - Delete todo
  router.delete('/:id', (req, res) => {
    todoController.deleteTodo(req, res);
  });

  return router;
}