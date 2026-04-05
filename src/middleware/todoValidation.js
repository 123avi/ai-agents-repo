const { body, param } = require('express-validator');

const VALID_STATUSES = ['open', 'done'];
const MAX_TITLE_LENGTH = 255;
const MAX_DESCRIPTION_LENGTH = 1000;

/**
 * Validation middleware for updating todos
 * Validates title, description, due_date, and status fields
 */
const updateTodoValidation = [
  // Validate todo ID parameter
  param('id')
    .isInt({ min: 1 })
    .withMessage('Todo ID must be a positive integer'),

  // Validate title if provided
  body('title')
    .optional()
    .isLength({ min: 1, max: MAX_TITLE_LENGTH })
    .withMessage(`Title must be between 1 and ${MAX_TITLE_LENGTH} characters`)
    .trim(),

  // Validate description if provided
  body('description')
    .optional()
    .isLength({ max: MAX_DESCRIPTION_LENGTH })
    .withMessage(`Description cannot exceed ${MAX_DESCRIPTION_LENGTH} characters`)
    .trim(),

  // Validate due_date if provided
  body('due_date')
    .optional()
    .isISO8601()
    .withMessage('Due date must be a valid ISO 8601 date'),

  // Validate status if provided
  body('status')
    .optional()
    .isIn(VALID_STATUSES)
    .withMessage(`Status must be one of: ${VALID_STATUSES.join(', ')}`),

  // Ensure at least one field is provided
  body()
    .custom((body) => {
      const allowedFields = ['title', 'description', 'due_date', 'status'];
      const hasValidField = allowedFields.some(field => body[field] !== undefined);
      if (!hasValidField) {
        throw new Error('At least one field must be provided for update');
      }
      return true;
    })
];

module.exports = {
  updateTodoValidation
};