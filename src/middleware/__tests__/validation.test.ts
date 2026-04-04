import { validateRegisterInput, validateLoginInput } from '../validation';

describe('Validation Middleware', () => {
  describe('validateRegisterInput', () => {
    it('should validate correct registration input', () => {
      const validInput = {
        email: 'test@example.com',
        password: 'password123'
      };

      const result = validateRegisterInput(validInput);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject missing email', () => {
      const invalidInput = {
        password: 'password123'
      };

      const result = validateRegisterInput(invalidInput);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Email is required');
    });

    it('should reject invalid email format', () => {
      const invalidInput = {
        email: 'invalid-email',
        password: 'password123'
      };

      const result = validateRegisterInput(invalidInput);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Invalid email format');
    });

    it('should reject missing password', () => {
      const invalidInput = {
        email: 'test@example.com'
      };

      const result = validateRegisterInput(invalidInput);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Password is required');
    });

    it('should reject short password', () => {
      const invalidInput = {
        email: 'test@example.com',
        password: '123'
      };

      const result = validateRegisterInput(invalidInput);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Password must be at least 8 characters long');
    });

    it('should return multiple errors', () => {
      const invalidInput = {
        email: 'invalid-email',
        password: '123'
      };

      const result = validateRegisterInput(invalidInput);

      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(2);
      expect(result.errors).toContain('Invalid email format');
      expect(result.errors).toContain('Password must be at least 8 characters long');
    });
  });

  describe('validateLoginInput', () => {
    it('should validate correct login input', () => {
      const validInput = {
        email: 'test@example.com',
        password: 'password123'
      };

      const result = validateLoginInput(validInput);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject missing email', () => {
      const invalidInput = {
        password: 'password123'
      };

      const result = validateLoginInput(invalidInput);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Email is required');
    });

    it('should reject invalid email format', () => {
      const invalidInput = {
        email: 'invalid-email',
        password: 'password123'
      };

      const result = validateLoginInput(invalidInput);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Invalid email format');
    });

    it('should reject missing password', () => {
      const invalidInput = {
        email: 'test@example.com'
      };

      const result = validateLoginInput(invalidInput);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Password is required');
    });
  });
});