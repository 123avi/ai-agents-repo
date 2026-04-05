import express from 'express';
import { TodoController } from '../controllers/todo.controller';
import { validateTodoCreate, validateTodoUpdate } from '../middleware/validation.middleware';

const router = express.Router();
const todoController = new TodoController();

/**
 * GET /api/todos
 * Get all todos for authenticated user
 */
router.get('/', todoController.getAllTodos.bind(todoController));

/**
 * GET /api/todos/:id
 * Get specific todo by ID for authenticated user
 */
router.get('/:id', todoController.getTodoById.bind(todoController));

/**
 * POST /api/todos
 * Create new todo for authenticated user
 */
router.post('/', validateTodoCreate, todoController.createTodo.bind(todoController));

/**
 * PUT /api/todos/:id
 * Update existing todo for authenticated user
 */
router.put('/:id', validateTodoUpdate, todoController.updateTodo.bind(todoController));

/**
 * DELETE /api/todos/:id
 * Delete todo for authenticated user
 */
router.delete('/:id', todoController.deleteTodo.bind(todoController));

export default router;