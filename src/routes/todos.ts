import express from 'express';
import { authenticateToken } from '../middleware/auth';
import { createTodoController } from '../controllers/todoController';
import { validateCreateTodo } from '../middleware/validation';

const router = express.Router();

/**
 * POST /api/todos endpoint for creating new todo items
 * Requires authentication and validates input data
 */
router.post('/', authenticateToken, validateCreateTodo, createTodoController);

export default router;