import { PasswordHashingService } from '../passwordHashingService';
import bcrypt from 'bcrypt';

// Mock bcrypt
jest.mock('bcrypt');
const mockBcrypt = bcrypt as jest.Mocked<typeof bcrypt>;

describe('PasswordHashingService', () => {
  let service: PasswordHashingService;
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetAllMocks();
    process.env = { ...originalEnv };
    service = new PasswordHashingService();
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe('constructor', () => {
    it('should use environment variable for salt rounds', () => {
      process.env.BCRYPT_SALT_ROUNDS = '15';
      const serviceWithEnv = new PasswordHashingService();
      expect(serviceWithEnv).toBeInstanceOf(PasswordHashingService);
    });

    it('should use provided salt rounds over environment', () => {
      process.env.BCRYPT_SALT_ROUNDS = '15';
      const serviceWithCustom = new PasswordHashingService(12);
      expect(serviceWithCustom).toBeInstanceOf(PasswordHashingService);
    });

    it('should throw error if salt rounds less than 10', () => {
      expect(() => new PasswordHashingService(9)).toThrow('Salt rounds must be at least 10');
    });

    it('should default to 12 salt rounds if no environment variable set', () => {
      delete process.env.BCRYPT_SALT_ROUNDS;
      const serviceWithDefault = new PasswordHashingService();
      expect(serviceWithDefault).toBeInstanceOf(PasswordHashingService);
    });
  });

  describe('hashPassword', () => {
    it('should hash password with bcrypt', async () => {
      const password = 'testpassword123';
      const hashedPassword = '$2b$12$hashedpassword';
      mockBcrypt.hash.mockResolvedValue(hashedPassword);

      const result = await service.hashPassword(password);

      expect(mockBcrypt.hash).toHaveBeenCalledWith(password, 12);
      expect(result).toBe(hashedPassword);
    });

    it('should throw error for empty password', async () => {
      await expect(service.hashPassword('')).rejects.toThrow('Password must be a non-empty string');
    });

    it('should throw error for non-string password', async () => {
      await expect(service.hashPassword(null as any)).rejects.toThrow('Password must be a non-empty string');
      await expect(service.hashPassword(undefined as any)).rejects.toThrow('Password must be a non-empty string');
    });

    it('should handle bcrypt errors', async () => {
      const password = 'testpassword123';
      mockBcrypt.hash.mockRejectedValue(new Error('Bcrypt error'));

      await expect(service.hashPassword(password)).rejects.toThrow('Password hashing failed: Bcrypt error');
    });

    it('should handle unknown errors', async () => {
      const password = 'testpassword123';
      mockBcrypt.hash.mockRejectedValue('Unknown error');

      await expect(service.hashPassword(password)).rejects.toThrow('Password hashing failed: Unknown hashing error');
    });
  });

  describe('comparePassword', () => {
    it('should compare password with hashed password', async () => {
      const password = 'testpassword123';
      const hashedPassword = '$2b$12$hashedpassword';
      mockBcrypt.compare.mockResolvedValue(true);

      const result = await service.comparePassword(password, hashedPassword);

      expect(mockBcrypt.compare).toHaveBeenCalledWith(password, hashedPassword);
      expect(result).toBe(true);
    });

    it('should return false for non-matching passwords', async () => {
      const password = 'testpassword123';
      const hashedPassword = '$2b$12$hashedpassword';
      mockBcrypt.compare.mockResolvedValue(false);

      const result = await service.comparePassword(password, hashedPassword);

      expect(result).toBe(false);
    });

    it('should throw error for empty password', async () => {
      const hashedPassword = '$2b$12$hashedpassword';
      await expect(service.comparePassword('', hashedPassword)).rejects.toThrow('Password must be a non-empty string');
    });

    it('should throw error for empty hashed password', async () => {
      const password = 'testpassword123';
      await expect(service.comparePassword(password, '')).rejects.toThrow('Hashed password must be a non-empty string');
    });

    it('should throw error for non-string parameters', async () => {
      const hashedPassword = '$2b$12$hashedpassword';
      await expect(service.comparePassword(null as any, hashedPassword)).rejects.toThrow('Password must be a non-empty string');
      await expect(service.comparePassword('password', null as any)).rejects.toThrow('Hashed password must be a non-empty string');
    });

    it('should handle bcrypt errors', async () => {
      const password = 'testpassword123';
      const hashedPassword = '$2b$12$hashedpassword';
      mockBcrypt.compare.mockRejectedValue(new Error('Bcrypt compare error'));

      await expect(service.comparePassword(password, hashedPassword)).rejects.toThrow('Password comparison failed: Bcrypt compare error');
    });

    it('should handle unknown errors', async () => {
      const password = 'testpassword123';
      const hashedPassword = '$2b$12$hashedpassword';
      mockBcrypt.compare.mockRejectedValue('Unknown error');

      await expect(service.comparePassword(password, hashedPassword)).rejects.toThrow('Password comparison failed: Unknown comparison error');
    });
  });

  describe('integration with different salt rounds', () => {
    it('should work with minimum 10 salt rounds', () => {
      const serviceMin = new PasswordHashingService(10);
      expect(serviceMin).toBeInstanceOf(PasswordHashingService);
    });

    it('should work with higher salt rounds', () => {
      const serviceHigh = new PasswordHashingService(15);
      expect(serviceHigh).toBeInstanceOf(PasswordHashingService);
    });
  });
});