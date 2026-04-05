import { QuerySanitizer } from '../query-sanitizer';
import { SanitizationError } from '../errors';

describe('QuerySanitizer', () => {
  let sanitizer: QuerySanitizer;

  beforeEach(() => {
    sanitizer = new QuerySanitizer();
  });

  describe('AC-004: Query parameter sanitization', () => {
    describe('SQL injection prevention', () => {
      it('should sanitize basic SQL injection attempts', () => {
        const maliciousInput = "'; DROP TABLE users; --";
        
        expect(() => sanitizer.sanitizeString(maliciousInput))
          .toThrow(SanitizationError);
      });

      it('should block union-based SQL injection', () => {
        const unionAttack = "1 UNION SELECT * FROM users";
        
        expect(() => sanitizer.sanitizeString(unionAttack))
          .toThrow(SanitizationError);
      });

      it('should prevent comment-based attacks', () => {
        const commentAttack = "admin'/*";
        
        expect(() => sanitizer.sanitizeString(commentAttack))
          .toThrow(SanitizationError);
      });

      it('should block time-based blind SQL injection', () => {
        const timeBasedAttack = "1; WAITFOR DELAY '00:00:05'";
        
        expect(() => sanitizer.sanitizeString(timeBasedAttack))
          .toThrow(SanitizationError);
      });
    });

    describe('Valid input handling', () => {
      it('should allow safe string inputs', () => {
        const safeString = "My todo item";
        
        const result = sanitizer.sanitizeString(safeString);
        
        expect(result).toBe(safeString);
      });

      it('should allow safe email addresses', () => {
        const email = "user@example.com";
        
        const result = sanitizer.sanitizeEmail(email);
        
        expect(result).toBe(email);
      });

      it('should handle Unicode characters safely', () => {
        const unicodeString = "My 📝 todo item";
        
        const result = sanitizer.sanitizeString(unicodeString);
        
        expect(result).toBe(unicodeString);
      });

      it('should preserve safe special characters', () => {
        const safeSpecialChars = "Buy milk & bread (2 items)";
        
        const result = sanitizer.sanitizeString(safeSpecialChars);
        
        expect(result).toBe(safeSpecialChars);
      });
    });

    describe('Parameter validation', () => {
      it('should validate integer parameters', () => {
        expect(sanitizer.sanitizeInteger('123')).toBe(123);
        expect(sanitizer.sanitizeInteger(456)).toBe(456);
        
        expect(() => sanitizer.sanitizeInteger('not-a-number'))
          .toThrow(SanitizationError);
        expect(() => sanitizer.sanitizeInteger('12.5'))
          .toThrow(SanitizationError);
      });

      it('should validate UUID parameters', () => {
        const validUuid = '123e4567-e89b-12d3-a456-426614174000';
        
        expect(sanitizer.sanitizeUuid(validUuid)).toBe(validUuid);
        
        expect(() => sanitizer.sanitizeUuid('invalid-uuid'))
          .toThrow(SanitizationError);
        expect(() => sanitizer.sanitizeUuid('123'))
          .toThrow(SanitizationError);
      });

      it('should validate email parameters', () => {
        expect(sanitizer.sanitizeEmail('user@example.com'))
          .toBe('user@example.com');
        
        expect(() => sanitizer.sanitizeEmail('invalid-email'))
          .toThrow(SanitizationError);
        expect(() => sanitizer.sanitizeEmail('@example.com'))
          .toThrow(SanitizationError);
      });
    });

    describe('Length validation', () => {
      it('should enforce maximum string length', () => {
        const longString = 'a'.repeat(1001);
        
        expect(() => sanitizer.sanitizeString(longString))
          .toThrow(SanitizationError);
      });

      it('should allow strings within length limits', () => {
        const validString = 'a'.repeat(500);
        
        const result = sanitizer.sanitizeString(validString);
        
        expect(result).toBe(validString);
      });

      it('should handle empty strings appropriately', () => {
        expect(() => sanitizer.sanitizeString(''))
          .toThrow(SanitizationError);
      });
    });

    describe('Batch sanitization', () => {
      it('should sanitize arrays of parameters', () => {
        const validStrings = ['item1', 'item2', 'item3'];
        
        const result = sanitizer.sanitizeStringArray(validStrings);
        
        expect(result).toEqual(validStrings);
      });

      it('should reject arrays with any invalid items', () => {
        const mixedArray = ['valid', "'; DROP TABLE users; --", 'also-valid'];
        
        expect(() => sanitizer.sanitizeStringArray(mixedArray))
          .toThrow(SanitizationError);
      });

      it('should handle empty arrays', () => {
        const result = sanitizer.sanitizeStringArray([]);
        
        expect(result).toEqual([]);
      });
    });

    describe('Error handling', () => {
      it('should provide detailed error messages', () => {
        const maliciousInput = "'; DROP TABLE users; --";
        
        try {
          sanitizer.sanitizeString(maliciousInput);
        } catch (error) {
          expect(error).toBeInstanceOf(SanitizationError);
          expect(error.message).toContain('Potential SQL injection detected');
        }
      });

      it('should log sanitization attempts', () => {
        const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
        const maliciousInput = "'; DROP TABLE users; --";
        
        try {
          sanitizer.sanitizeString(maliciousInput);
        } catch (error) {
          // Expected to throw
        }
        
        expect(consoleWarnSpy).toHaveBeenCalledWith(
          'Sanitization blocked suspicious input:',
          expect.objectContaining({
            input: expect.stringContaining('DROP TABLE'),
            reason: expect.any(String)
          })
        );
        consoleWarnSpy.mockRestore();
      });
    });
  });
});