import { Router } from 'express';
import { TodoController } from '../controllers/todoController';
import { TodoService } from '../services/todoService';
import { TodoRepository } from '../repositories/todoRepository';
import { authenticateJWT } from '../middleware/authMiddleware';
import { validateCreateTodo, validateUpdateTodo } from '../middleware/validationMiddleware';

/**
 * Creates and configures todo routes with JWT authentication
 */
export function createTodoRoutes(): Router {
  const router = Router();
  const todoRepository = new TodoRepository();
  const todoService = new TodoService(todoRepository);
  const todoController = new TodoController(todoService);

  // Apply JWT authentication to all todo routes
  router.use(authenticateJWT);

  // GET /todos - Get all user's todos
  router.get('/', (req, res, next) => todoController.getTodos(req, res, next));

  // POST /todos - Create new todo
  router.post('/', validateCreateTodo, (req, res, next) => todoController.createTodo(req, res, next));

  // PUT /todos/:id - Update todo
  router.put('/:id', validateUpdateTodo, (req, res, next) => todoController.updateTodo(req, res, next));

  // DELETE /todos/:id - Delete todo
  router.delete('/:id', (req, res, next) => todoController.deleteTodo(req, res, next));

  return router;
}