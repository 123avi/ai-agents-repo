/**
 * Input sanitization utilities
 * Provides XSS protection for user input fields
 */

const XSS_PATTERNS = [
  /<script[^>]*>.*?<\/script>/gi,
  /<iframe[^>]*>.*?<\/iframe>/gi,
  /<object[^>]*>.*?<\/object>/gi,
  /<embed[^>]*>.*?<\/embed>/gi,
  /on\w+\s*=/gi,
  /javascript:/gi
];

const HTML_ENTITIES: Record<string, string> = {
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#x27;',
  '&': '&amp;'
};

/**
 * Sanitize input string to prevent XSS attacks
 * @param input - Raw user input string
 * @returns Sanitized string safe for storage and display
 */
export const sanitize = (input: string): string => {
  if (!input || typeof input !== 'string') {
    return '';
  }

  let sanitized = input.trim();

  // Remove dangerous script patterns
  XSS_PATTERNS.forEach(pattern => {
    sanitized = sanitized.replace(pattern, '');
  });

  // Encode HTML entities
  sanitized = sanitized.replace(/[<>"'&]/g, (match) => {
    return HTML_ENTITIES[match] || match;
  });

  return sanitized;
};