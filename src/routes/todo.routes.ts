import { Router } from 'express';
import { todoController } from '../controllers/todo.controller';
import { authenticateToken } from '../middleware/auth.middleware';
import { validateCreateTodo, validateUpdateTodo } from '../middleware/validation.middleware';

/**
 * Express router for todo endpoints
 * All routes require authentication and enforce user isolation
 */
export const todoRoutes = Router();

// Apply authentication middleware to all todo routes
todoRoutes.use(authenticateToken);

/**
 * @route POST /api/todos
 * @desc Create a new todo item
 * @access Private
 */
todoRoutes.post('/', validateCreateTodo, todoController.createTodo);

/**
 * @route GET /api/todos
 * @desc Get all todos for authenticated user
 * @access Private
 */
todoRoutes.get('/', todoController.getTodos);

/**
 * @route GET /api/todos/:id
 * @desc Get a specific todo by ID
 * @access Private
 */
todoRoutes.get('/:id', todoController.getTodoById);

/**
 * @route PUT /api/todos/:id
 * @desc Update a specific todo by ID
 * @access Private
 */
todoRoutes.put('/:id', validateUpdateTodo, todoController.updateTodo);

/**
 * @route DELETE /api/todos/:id
 * @desc Delete a specific todo by ID
 * @access Private
 */
todoRoutes.delete('/:id', todoController.deleteTodo);