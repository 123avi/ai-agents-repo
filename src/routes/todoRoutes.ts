import { Router } from 'express';
import { authenticateToken } from '../middleware/auth';
import {
  createTodo,
  getTodos,
  getTodoById,
  updateTodo,
  deleteTodo
} from '../controllers/todoController';

/**
 * Todo routes with JWT authentication middleware
 */
const router = Router();

// Apply JWT authentication to all todo routes
router.use(authenticateToken);

/**
 * POST /api/todos - Create a new todo
 */
router.post('/', createTodo);

/**
 * GET /api/todos - Get user's todos with optional status filter
 */
router.get('/', getTodos);

/**
 * GET /api/todos/:id - Get a specific todo by ID
 */
router.get('/:id', getTodoById);

/**
 * PUT /api/todos/:id - Update a todo by ID
 */
router.put('/:id', updateTodo);

/**
 * DELETE /api/todos/:id - Delete a todo by ID
 */
router.delete('/:id', deleteTodo);

export default router;