/**
 * Valid todo status values
 */
export const VALID_TODO_STATUSES = ['pending', 'in-progress', 'completed'] as const;

/**
 * Type for valid todo statuses
 */
export type TodoStatus = typeof VALID_TODO_STATUSES[number];

/**
 * Validates if a string is a valid todo status
 * @param status - The status string to validate
 * @returns true if status is valid, false otherwise
 */
export function isValidTodoStatus(status: string): status is TodoStatus {
  return VALID_TODO_STATUSES.includes(status as TodoStatus);
}

/**
 * Validates and parses a todo ID parameter
 * @param idParam - The ID parameter from request
 * @returns Parsed positive integer ID
 * @throws Error if ID is invalid
 */
export function validateTodoId(idParam: string): number {
  const id = parseInt(idParam, 10);
  if (isNaN(id) || id <= 0) {
    throw new Error('Invalid todo ID: must be a positive integer');
  }
  return id;
}