import bcrypt from 'bcrypt';
import { PasswordHasher } from '../password-hasher';

describe('PasswordHasher', () => {
  let passwordHasher: PasswordHasher;

  beforeEach(() => {
    passwordHasher = new PasswordHasher();
  });

  describe('hashPassword', () => {
    it('should hash password with minimum 10 rounds', async () => {
      // AC-001: Test password hashing with minimum 10 rounds
      const password = 'testPassword123';
      const hash = await passwordHasher.hashPassword(password);

      expect(hash).toBeDefined();
      expect(hash).not.toBe(password);
      expect(hash.startsWith('$2b$')).toBe(true);
      
      // Extract salt rounds from hash (format: $2b$rounds$...)
      const rounds = parseInt(hash.split('$')[2]);
      expect(rounds).toBeGreaterThanOrEqual(10);
    });

    it('should hash different passwords differently', async () => {
      const password1 = 'password123';
      const password2 = 'password456';
      
      const hash1 = await passwordHasher.hashPassword(password1);
      const hash2 = await passwordHasher.hashPassword(password2);

      expect(hash1).not.toBe(hash2);
    });

    it('should produce different hashes for same password due to salt', async () => {
      const password = 'samePassword123';
      
      const hash1 = await passwordHasher.hashPassword(password);
      const hash2 = await passwordHasher.hashPassword(password);

      expect(hash1).not.toBe(hash2);
    });

    it('should handle weak passwords', async () => {
      const weakPassword = '123';
      const hash = await passwordHasher.hashPassword(weakPassword);

      expect(hash).toBeDefined();
      expect(hash).not.toBe(weakPassword);
    });

    it('should handle strong passwords', async () => {
      const strongPassword = 'Str0ngP@ssw0rd!WithSymb0ls123';
      const hash = await passwordHasher.hashPassword(strongPassword);

      expect(hash).toBeDefined();
      expect(hash).not.toBe(strongPassword);
    });

    it('should reject null password', async () => {
      // AC-004: Test error handling for invalid inputs
      await expect(passwordHasher.hashPassword(null as any)).rejects.toThrow();
    });

    it('should reject undefined password', async () => {
      // AC-004: Test error handling for invalid inputs
      await expect(passwordHasher.hashPassword(undefined as any)).rejects.toThrow();
    });

    it('should reject empty string password', async () => {
      // AC-004: Test error handling for invalid inputs
      await expect(passwordHasher.hashPassword('')).rejects.toThrow();
    });

    it('should handle non-string input', async () => {
      // AC-004: Test error handling for invalid inputs
      await expect(passwordHasher.hashPassword(123 as any)).rejects.toThrow();
    });
  });

  describe('comparePassword', () => {
    it('should return true for matching passwords', async () => {
      // AC-002: Test password comparison for matching passwords
      const password = 'matchingPassword123';
      const hash = await passwordHasher.hashPassword(password);
      
      const isMatch = await passwordHasher.comparePassword(password, hash);
      
      expect(isMatch).toBe(true);
    });

    it('should return false for non-matching passwords', async () => {
      // AC-003: Test password comparison for non-matching passwords
      const password = 'correctPassword123';
      const wrongPassword = 'wrongPassword456';
      const hash = await passwordHasher.hashPassword(password);
      
      const isMatch = await passwordHasher.comparePassword(wrongPassword, hash);
      
      expect(isMatch).toBe(false);
    });

    it('should return false for empty password against valid hash', async () => {
      // AC-003: Test password comparison for non-matching passwords
      const password = 'validPassword123';
      const hash = await passwordHasher.hashPassword(password);
      
      const isMatch = await passwordHasher.comparePassword('', hash);
      
      expect(isMatch).toBe(false);
    });

    it('should handle case sensitive passwords correctly', async () => {
      const password = 'CaseSensitive123';
      const hash = await passwordHasher.hashPassword(password);
      
      const matchExact = await passwordHasher.comparePassword('CaseSensitive123', hash);
      const matchWrongCase = await passwordHasher.comparePassword('casesensitive123', hash);
      
      expect(matchExact).toBe(true);
      expect(matchWrongCase).toBe(false);
    });

    it('should reject null password for comparison', async () => {
      // AC-004: Test error handling for invalid inputs
      const hash = await passwordHasher.hashPassword('validPassword');
      
      await expect(passwordHasher.comparePassword(null as any, hash)).rejects.toThrow();
    });

    it('should reject undefined password for comparison', async () => {
      // AC-004: Test error handling for invalid inputs
      const hash = await passwordHasher.hashPassword('validPassword');
      
      await expect(passwordHasher.comparePassword(undefined as any, hash)).rejects.toThrow();
    });

    it('should reject invalid hash format', async () => {
      // AC-004: Test error handling for invalid inputs
      const password = 'validPassword123';
      const invalidHash = 'not-a-valid-hash';
      
      await expect(passwordHasher.comparePassword(password, invalidHash)).rejects.toThrow();
    });

    it('should reject null hash for comparison', async () => {
      // AC-004: Test error handling for invalid inputs
      await expect(passwordHasher.comparePassword('password', null as any)).rejects.toThrow();
    });
  });

  describe('async operation completion', () => {
    it('should complete hashPassword as async operation', async () => {
      // AC-005: Verify async operation completion
      const password = 'asyncTestPassword123';
      const startTime = Date.now();
      
      const hashPromise = passwordHasher.hashPassword(password);
      expect(hashPromise).toBeInstanceOf(Promise);
      
      const hash = await hashPromise;
      const endTime = Date.now();
      
      expect(hash).toBeDefined();
      expect(endTime - startTime).toBeGreaterThan(0); // Should take some time due to hashing
    });

    it('should complete comparePassword as async operation', async () => {
      // AC-005: Verify async operation completion
      const password = 'asyncCompareTest123';
      const hash = await passwordHasher.hashPassword(password);
      const startTime = Date.now();
      
      const comparePromise = passwordHasher.comparePassword(password, hash);
      expect(comparePromise).toBeInstanceOf(Promise);
      
      const isMatch = await comparePromise;
      const endTime = Date.now();
      
      expect(isMatch).toBe(true);
      expect(endTime - startTime).toBeGreaterThan(0);
    });

    it('should handle concurrent hash operations', async () => {
      // AC-005: Verify async operation completion
      const passwords = ['password1', 'password2', 'password3'];
      
      const hashPromises = passwords.map(pwd => passwordHasher.hashPassword(pwd));
      const hashes = await Promise.all(hashPromises);
      
      expect(hashes).toHaveLength(3);
      hashes.forEach((hash, index) => {
        expect(hash).toBeDefined();
        expect(hash).not.toBe(passwords[index]);
      });
      
      // All hashes should be different
      expect(new Set(hashes).size).toBe(3);
    });

    it('should handle concurrent compare operations', async () => {
      // AC-005: Verify async operation completion
      const password = 'concurrentTest123';
      const hash = await passwordHasher.hashPassword(password);
      
      const comparePromises = Array(5).fill(null).map(() => 
        passwordHasher.comparePassword(password, hash)
      );
      
      const results = await Promise.all(comparePromises);
      
      expect(results).toHaveLength(5);
      results.forEach(result => {
        expect(result).toBe(true);
      });
    });
  });
});