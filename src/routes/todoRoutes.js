const express = require('express');
const { body } = require('express-validator');
const todoController = require('../controllers/todoController');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();

// Validation rules for todo creation
const createTodoValidation = [
  body('title')
    .notEmpty()
    .withMessage('Title is required')
    .isString()
    .withMessage('Title must be a string')
    .trim()
    .isLength({ min: 1, max: 255 })
    .withMessage('Title must be between 1 and 255 characters'),
  body('description')
    .optional()
    .isString()
    .withMessage('Description must be a string')
    .trim(),
  body('due_date')
    .optional()
    .isISO8601()
    .withMessage('Due date must be in valid ISO 8601 format')
];

/**
 * POST /api/todos - Create a new todo
 * Requires authentication and validates input
 */
router.post('/', authMiddleware, createTodoValidation, todoController.createTodo);

module.exports = router;