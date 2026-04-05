/**
 * Email validation using RFC 5322 compliant regex
 */
const EMAIL_REGEX = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;

/**
 * Password requirements: minimum 8 characters, at least one uppercase, lowercase, and number
 */
const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]{8,}$/;

/**
 * Validate email format
 * 
 * @param email - Email address to validate
 * @returns boolean - True if email format is valid
 */
export function validateEmail(email: string): boolean {
  if (!email || typeof email !== 'string') {
    return false;
  }
  
  return EMAIL_REGEX.test(email.trim());
}

/**
 * Validate password strength
 * Requires at least 8 characters with uppercase, lowercase, and number
 * 
 * @param password - Password to validate
 * @returns boolean - True if password meets requirements
 */
export function validatePassword(password: string): boolean {
  if (!password || typeof password !== 'string') {
    return false;
  }
  
  return PASSWORD_REGEX.test(password);
}