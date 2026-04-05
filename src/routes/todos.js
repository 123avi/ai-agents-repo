const express = require('express');
const todoController = require('../controllers/todoController');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();

/**
 * DELETE /api/todos/:id - Delete a todo item
 * Requires authentication and validates ownership
 */
router.delete('/:id', authMiddleware.authenticate, todoController.deleteTodo);

module.exports = router;