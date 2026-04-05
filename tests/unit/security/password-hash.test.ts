import bcrypt from 'bcrypt';
import { hashPassword, verifyPassword } from '../../../src/security/password-hash';

describe('Password Hashing Utility', () => {
  const TEST_PASSWORD = 'testPassword123!';
  const DIFFERENT_PASSWORD = 'differentPassword456!';
  const SALT_ROUNDS = 12;

  describe('hashPassword', () => {
    it('should produce different hashes for the same input', async () => {
      // AC-001: Test password hashing produces different hashes for same input
      const hash1 = await hashPassword(TEST_PASSWORD);
      const hash2 = await hashPassword(TEST_PASSWORD);

      expect(hash1).toBeDefined();
      expect(hash2).toBeDefined();
      expect(hash1).not.toBe(hash2);
      expect(hash1.length).toBeGreaterThan(50);
      expect(hash2.length).toBeGreaterThan(50);
    });

    it('should create bcrypt-compatible hashes', async () => {
      const hash = await hashPassword(TEST_PASSWORD);
      
      expect(hash).toMatch(/^\$2[aby]\$\d{2}\$/);
      expect(await bcrypt.compare(TEST_PASSWORD, hash)).toBe(true);
    });

    it('should handle empty string password', async () => {
      // AC-004: Test error handling for invalid inputs
      await expect(hashPassword('')).rejects.toThrow('Password cannot be empty');
    });

    it('should handle null password', async () => {
      // AC-004: Test error handling for invalid inputs
      await expect(hashPassword(null as any)).rejects.toThrow('Password must be a string');
    });

    it('should handle undefined password', async () => {
      // AC-004: Test error handling for invalid inputs
      await expect(hashPassword(undefined as any)).rejects.toThrow('Password must be a string');
    });

    it('should handle non-string password', async () => {
      // AC-004: Test error handling for invalid inputs
      await expect(hashPassword(123 as any)).rejects.toThrow('Password must be a string');
    });
  });

  describe('verifyPassword', () => {
    let validHash: string;

    beforeEach(async () => {
      validHash = await hashPassword(TEST_PASSWORD);
    });

    it('should return true for correct password', async () => {
      // AC-002: Test password verification returns true for correct password
      const result = await verifyPassword(TEST_PASSWORD, validHash);
      expect(result).toBe(true);
    });

    it('should return false for incorrect password', async () => {
      // AC-003: Test password verification returns false for incorrect password
      const result = await verifyPassword(DIFFERENT_PASSWORD, validHash);
      expect(result).toBe(false);
    });

    it('should return false for empty password against valid hash', async () => {
      const result = await verifyPassword('', validHash);
      expect(result).toBe(false);
    });

    it('should handle null password input', async () => {
      // AC-004: Test error handling for invalid inputs
      await expect(verifyPassword(null as any, validHash)).rejects.toThrow('Password must be a string');
    });

    it('should handle undefined password input', async () => {
      // AC-004: Test error handling for invalid inputs
      await expect(verifyPassword(undefined as any, validHash)).rejects.toThrow('Password must be a string');
    });

    it('should handle non-string password input', async () => {
      // AC-004: Test error handling for invalid inputs
      await expect(verifyPassword(123 as any, validHash)).rejects.toThrow('Password must be a string');
    });

    it('should handle null hash input', async () => {
      // AC-004: Test error handling for invalid inputs
      await expect(verifyPassword(TEST_PASSWORD, null as any)).rejects.toThrow('Hash must be a string');
    });

    it('should handle undefined hash input', async () => {
      // AC-004: Test error handling for invalid inputs
      await expect(verifyPassword(TEST_PASSWORD, undefined as any)).rejects.toThrow('Hash must be a string');
    });

    it('should handle invalid hash format', async () => {
      // AC-004: Test error handling for invalid inputs
      const invalidHash = 'invalid-hash-format';
      await expect(verifyPassword(TEST_PASSWORD, invalidHash)).rejects.toThrow();
    });

    it('should handle empty hash string', async () => {
      // AC-004: Test error handling for invalid inputs
      await expect(verifyPassword(TEST_PASSWORD, '')).rejects.toThrow('Hash cannot be empty');
    });
  });

  describe('Security Properties', () => {
    it('should use sufficient salt rounds', async () => {
      const hash = await hashPassword(TEST_PASSWORD);
      const saltRounds = parseInt(hash.split('$')[2]);
      expect(saltRounds).toBeGreaterThanOrEqual(10);
    });

    it('should be timing attack resistant', async () => {
      const hash = await hashPassword(TEST_PASSWORD);
      
      const start1 = process.hrtime.bigint();
      await verifyPassword('wrong', hash);
      const end1 = process.hrtime.bigint();
      
      const start2 = process.hrtime.bigint();
      await verifyPassword(TEST_PASSWORD, hash);
      const end2 = process.hrtime.bigint();
      
      const diff1 = Number(end1 - start1) / 1000000; // Convert to ms
      const diff2 = Number(end2 - start2) / 1000000; // Convert to ms
      
      // Both operations should take similar time (within reasonable variance)
      // This is a basic timing attack resistance check
      expect(Math.abs(diff1 - diff2)).toBeLessThan(50); // 50ms tolerance
    });
  });
});
