import Joi from 'joi';
import { Request, Response, NextFunction } from 'express';

/** Minimum password length as per security requirements */
const MIN_PASSWORD_LENGTH = 8;

/** Valid todo status values */
const VALID_TODO_STATUSES = ['open', 'done'] as const;

/** HTTP status code for validation errors */
const VALIDATION_ERROR_STATUS = 400;

/**
 * User registration validation schema
 * Validates email format and password minimum length requirements
 */
export const registerSchema = Joi.object({
  email: Joi.string().email().required().messages({
    'string.email': 'Email must be a valid email address',
    'any.required': 'Email is required'
  }),
  password: Joi.string().min(MIN_PASSWORD_LENGTH).required().messages({
    'string.min': `Password must be at least ${MIN_PASSWORD_LENGTH} characters long`,
    'any.required': 'Password is required'
  })
});

/**
 * User login validation schema
 * Validates email format and password presence
 */
export const loginSchema = Joi.object({
  email: Joi.string().email().required().messages({
    'string.email': 'Email must be a valid email address',
    'any.required': 'Email is required'
  }),
  password: Joi.string().required().messages({
    'any.required': 'Password is required'
  })
});

/**
 * Todo creation validation schema
 * Validates required title field and optional status
 */
export const createTodoSchema = Joi.object({
  title: Joi.string().required().messages({
    'any.required': 'Title is required',
    'string.empty': 'Title cannot be empty'
  }),
  status: Joi.string().valid(...VALID_TODO_STATUSES).optional().messages({
    'any.only': `Status must be one of: ${VALID_TODO_STATUSES.join(', ')}`
  })
});

/**
 * Todo update validation schema
 * Validates optional title and status fields
 */
export const updateTodoSchema = Joi.object({
  title: Joi.string().optional(),
  status: Joi.string().valid(...VALID_TODO_STATUSES).optional().messages({
    'any.only': `Status must be one of: ${VALID_TODO_STATUSES.join(', ')}`
  })
}).min(1).messages({
  'object.min': 'At least one field must be provided for update'
});

/**
 * Express middleware factory for request validation
 * @param schema - Joi schema to validate against
 * @returns Express middleware function
 */
export const validateRequest = (schema: Joi.Schema) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      const { error, value } = schema.validate(req.body, { 
        abortEarly: false,
        stripUnknown: true
      });

      if (error) {
        const errorMessage = formatValidationError(error);
        res.status(VALIDATION_ERROR_STATUS).json({ 
          error: errorMessage,
          details: error.details.map(detail => detail.message)
        });
        return;
      }

      req.body = value;
      next();
    } catch (err) {
      console.error('Validation middleware error:', err);
      res.status(500).json({ error: 'Internal server error during validation' });
    }
  };
};

/**
 * Formats Joi validation error into user-friendly message
 * @param error - Joi validation error
 * @returns Formatted error message
 */
function formatValidationError(error: Joi.ValidationError): string {
  const messages = error.details.map(detail => detail.message);
  return messages.join('. ');
}