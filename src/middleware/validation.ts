const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD_LENGTH = 8;

interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

interface RegisterInput {
  email?: string;
  password?: string;
}

interface LoginInput {
  email?: string;
  password?: string;
}

/**
 * Validates user registration input data.
 * @param input - Registration input containing email and password
 * @returns ValidationResult - Object containing validation status and errors
 */
export function validateRegisterInput(input: RegisterInput): ValidationResult {
  const errors: string[] = [];

  if (!input.email) {
    errors.push('Email is required');
  } else if (!EMAIL_REGEX.test(input.email)) {
    errors.push('Invalid email format');
  }

  if (!input.password) {
    errors.push('Password is required');
  } else if (input.password.length < MIN_PASSWORD_LENGTH) {
    errors.push(`Password must be at least ${MIN_PASSWORD_LENGTH} characters long`);
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Validates user login input data.
 * @param input - Login input containing email and password
 * @returns ValidationResult - Object containing validation status and errors
 */
export function validateLoginInput(input: LoginInput): ValidationResult {
  const errors: string[] = [];

  if (!input.email) {
    errors.push('Email is required');
  } else if (!EMAIL_REGEX.test(input.email)) {
    errors.push('Invalid email format');
  }

  if (!input.password) {
    errors.push('Password is required');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}