const express = require('express');
const { updateTodo } = require('../controllers/todoController');
const { authenticate } = require('../middleware/auth');
const { updateTodoValidation } = require('../middleware/todoValidation');

const router = express.Router();

/**
 * PUT /api/todos/:id
 * Updates a todo item with ownership validation
 * Requires authentication and validates input fields
 */
router.put('/:id', authenticate, updateTodoValidation, updateTodo);

module.exports = router;