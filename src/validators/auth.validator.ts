/**
 * Login request validation result interface
 */
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

/**
 * Login request body interface
 */
export interface LoginRequest {
  email?: string;
  password?: string;
}

// Email validation regex pattern
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD_LENGTH = 6;

/**
 * Validates login request body for required fields and format
 * @param body - Request body object
 * @returns Validation result with errors if any
 */
export function validateLoginRequest(body: any): ValidationResult {
  const errors: string[] = [];

  // Check required fields
  if (!body.email) {
    errors.push('Email is required');
  } else if (!EMAIL_REGEX.test(body.email)) {
    errors.push('Valid email address is required');
  }

  if (!body.password) {
    errors.push('Password is required');
  } else if (body.password.length < MIN_PASSWORD_LENGTH) {
    errors.push(`Password must be at least ${MIN_PASSWORD_LENGTH} characters`);
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}