import { HashService } from '../HashService';
import bcrypt from 'bcrypt';

// Mock bcrypt
jest.mock('bcrypt');
const mockBcrypt = bcrypt as jest.Mocked<typeof bcrypt>;

describe('HashService', () => {
  let hashService: HashService;

  beforeEach(() => {
    hashService = new HashService();
    jest.clearAllMocks();
  });

  describe('hash', () => {
    it('should hash password with specified salt rounds', async () => {
      const password = 'password123';
      const saltRounds = 10;
      const hashedPassword = 'hashed-password';

      mockBcrypt.hash.mockResolvedValue(hashedPassword);

      const result = await hashService.hash(password, saltRounds);

      expect(mockBcrypt.hash).toHaveBeenCalledWith(password, saltRounds);
      expect(result).toBe(hashedPassword);
    });
  });

  describe('compare', () => {
    it('should return true when passwords match', async () => {
      const password = 'password123';
      const hashedPassword = 'hashed-password';

      mockBcrypt.compare.mockResolvedValue(true);

      const result = await hashService.compare(password, hashedPassword);

      expect(mockBcrypt.compare).toHaveBeenCalledWith(password, hashedPassword);
      expect(result).toBe(true);
    });

    it('should return false when passwords do not match', async () => {
      const password = 'password123';
      const hashedPassword = 'different-hashed-password';

      mockBcrypt.compare.mockResolvedValue(false);

      const result = await hashService.compare(password, hashedPassword);

      expect(mockBcrypt.compare).toHaveBeenCalledWith(password, hashedPassword);
      expect(result).toBe(false);
    });
  });
});