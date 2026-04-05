const todoService = require('../services/todoService');
const { validationResult } = require('express-validator');
const logger = require('../utils/logger');

/**
 * Handles todo creation requests
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
const createTodo = async (req, res, next) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Missing required title field',
          details: errors.array()
        }
      });
    }

    const { title, description, due_date } = req.body;
    const userId = req.user.id;

    const newTodo = await todoService.createTodo({
      title,
      description,
      due_date,
      user_id: userId
    });

    logger.info(`Todo created successfully for user ${userId}`);

    res.status(201).json({
      success: true,
      data: newTodo
    });
  } catch (error) {
    logger.error('Error creating todo:', error);
    next(error);
  }
};

module.exports = {
  createTodo
};