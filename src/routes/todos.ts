import express from 'express';
import { authenticateToken } from '../middleware/auth';
import { todoController } from '../controllers/todoController';

const router = express.Router();

// Apply authentication middleware to all todo routes
router.use(authenticateToken);

// DELETE /api/todos/:id - Delete a specific todo item
router.delete('/:id', todoController.deleteTodo);

export { router as todoRouter };