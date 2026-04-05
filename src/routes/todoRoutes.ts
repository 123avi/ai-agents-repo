import { Router } from 'express';
import { authMiddleware } from '../middleware/auth';
import { todoController } from '../controllers/todoController';

const router = Router();

/**
 * GET /api/todos - Retrieve all todos for authenticated user
 * Requires authentication middleware to validate JWT token
 */
router.get('/todos', authMiddleware, todoController.getTodos.bind(todoController));

export { router as todoRoutes };