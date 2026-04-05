const todoService = require('../services/todoService');
const { validationResult } = require('express-validator');
const { logger } = require('../utils/logger');

/**
 * Updates a todo item for the authenticated user
 * @param {Request} req - Express request object with todo ID in params and update data in body
 * @param {Response} res - Express response object
 * @param {NextFunction} next - Express next middleware function
 * @returns {Promise<void>} JSON response with updated todo or error
 */
const updateTodo = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid field values',
          details: errors.array()
        }
      });
    }

    const todoId = parseInt(req.params.id);
    const userId = req.user.id;
    const updateData = req.body;

    const updatedTodo = await todoService.updateTodo(todoId, userId, updateData);

    res.status(200).json({
      success: true,
      data: updatedTodo
    });
  } catch (error) {
    logger.error('Error updating todo:', { error: error.message, userId: req.user?.id, todoId: req.params.id });
    next(error);
  }
};

module.exports = {
  updateTodo
};