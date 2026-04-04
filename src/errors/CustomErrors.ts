/**
 * Base custom error class with HTTP status code support.
 */
export abstract class CustomError extends Error {
  abstract readonly statusCode: number;
  abstract readonly isOperational: boolean;

  constructor(message: string) {
    super(message);
    Object.setPrototypeOf(this, CustomError.prototype);
  }
}

/**
 * Error thrown when requested resource is not found.
 */
export class NotFoundError extends CustomError {
  readonly statusCode = 404;
  readonly isOperational = true;

  constructor(message: string = 'Resource not found') {
    super(message);
    Object.setPrototypeOf(this, NotFoundError.prototype);
  }
}

/**
 * Error thrown when user lacks permission to access resource.
 */
export class ForbiddenError extends CustomError {
  readonly statusCode = 403;
  readonly isOperational = true;

  constructor(message: string = 'Access forbidden') {
    super(message);
    Object.setPrototypeOf(this, ForbiddenError.prototype);
  }
}

/**
 * Error thrown when request data fails validation.
 */
export class ValidationError extends CustomError {
  readonly statusCode = 400;
  readonly isOperational = true;

  constructor(message: string = 'Validation failed') {
    super(message);
    Object.setPrototypeOf(this, ValidationError.prototype);
  }
}