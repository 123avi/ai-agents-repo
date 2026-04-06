/**
 * Error message constants
 */
export const ERROR_MESSAGES = {
  INVALID_INPUT: 'Invalid input provided',
  EMAIL_ALREADY_EXISTS: 'Email already exists',
  INVALID_CREDENTIALS: 'Invalid email or password',
  INTERNAL_SERVER_ERROR: 'Internal server error'
} as const;

export type ErrorMessage = typeof ERROR_MESSAGES[keyof typeof ERROR_MESSAGES];