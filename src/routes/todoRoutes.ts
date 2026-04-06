import { Router } from 'express';
import { TodoController } from '../controllers/todoController';
import { authMiddleware } from '../middleware/authMiddleware';
import { validateTodoInput, validateTodoUpdate } from '../middleware/validationMiddleware';
import { TodoService } from '../services/TodoService';
import { TodoRepository } from '../repositories/TodoRepository';
import { pool } from '../config/database';

/**
 * Router configuration for todo endpoints with authentication and validation middleware.
 */
const router = Router();

// Initialize dependencies
const todoRepository = new TodoRepository(pool);
const todoService = new TodoService(todoRepository);
const todoController = new TodoController(todoService);

// Apply authentication middleware to all routes
router.use(authMiddleware);

// Todo CRUD routes
router.post('/todos', validateTodoInput, (req, res) => todoController.createTodo(req, res));
router.get('/todos', (req, res) => todoController.getTodos(req, res));
router.get('/todos/:id', (req, res) => todoController.getTodoById(req, res));
router.put('/todos/:id', validateTodoUpdate, (req, res) => todoController.updateTodo(req, res));
router.delete('/todos/:id', (req, res) => todoController.deleteTodo(req, res));

export { router as todoRoutes };
