import { Request, Response, NextFunction } from 'express';
import { body, validationResult } from 'express-validator';
import { HTTP_STATUS } from '../constants/http.constants';

/**
 * Validation middleware for creating todo items
 */
export const validateCreateTodo = [
  body('title')
    .trim()
    .notEmpty()
    .withMessage('Title is required')
    .isLength({ max: 255 })
    .withMessage('Title must be less than 255 characters'),
  
  body('description')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Description must be less than 1000 characters'),
  
  body('due_date')
    .optional()
    .isISO8601()
    .withMessage('Due date must be a valid ISO 8601 date'),
  
  body('status')
    .optional()
    .isIn(['open', 'done'])
    .withMessage('Status must be either "open" or "done"'),
  
  handleValidationErrors
];

/**
 * Validation middleware for updating todo items
 */
export const validateUpdateTodo = [
  body('title')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Title cannot be empty')
    .isLength({ max: 255 })
    .withMessage('Title must be less than 255 characters'),
  
  body('description')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Description must be less than 1000 characters'),
  
  body('due_date')
    .optional()
    .isISO8601()
    .withMessage('Due date must be a valid ISO 8601 date'),
  
  body('status')
    .optional()
    .isIn(['open', 'done'])
    .withMessage('Status must be either "open" or "done"'),
  
  handleValidationErrors
];

/**
 * Middleware to handle validation errors and return appropriate response
 * @param req - Express request object
 * @param res - Express response object
 * @param next - Next middleware function
 */
function handleValidationErrors(req: Request, res: Response, next: NextFunction): void {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    res.status(HTTP_STATUS.BAD_REQUEST).json({
      success: false,
      error: 'Validation failed',
      details: errors.array()
    });
    return;
  }
  
  next();
}