const express = require('express');
const todoController = require('../controllers/todoController');
const authenticateToken = require('../middleware/auth');

const router = express.Router();

/**
 * @route GET /api/todos
 * @description Retrieve all todo items for authenticated user
 * @middleware authenticateToken - Validates JWT token and extracts user ID
 */
router.get('/todos', authenticateToken, todoController.getTodos);

module.exports = router;