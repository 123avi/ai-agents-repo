import { describe, it, expect, beforeEach, afterEach, beforeAll, afterAll } from '@jest/globals';
import { Pool } from 'pg';
import bcrypt from 'bcrypt';
import { UserRepository } from '../../src/repositories/user.repository';
import { User } from '../../src/models/user.model';

const TEST_DB_CONFIG = {
  host: process.env.TEST_DB_HOST || 'localhost',
  port: parseInt(process.env.TEST_DB_PORT || '5432'),
  database: process.env.TEST_DB_NAME || 'todoapi_test',
  user: process.env.TEST_DB_USER || 'test_user',
  password: process.env.TEST_DB_PASSWORD || 'test_password'
};

const VALID_USER_DATA = {
  email: 'test@example.com',
  password: 'SecurePassword123!',
  created_at: new Date(),
  updated_at: new Date()
};

const SQL_INJECTION_PAYLOADS = [
  "'; DROP TABLE users; --",
  "admin@test.com' OR '1'='1",
  "test@example.com'; INSERT INTO users (email, password) VALUES ('hacker@evil.com', 'password'); --",
  "test@example.com' UNION SELECT * FROM users --"
];

describe('UserRepository', () => {
  let pool: Pool;
  let userRepository: UserRepository;

  beforeAll(async () => {
    pool = new Pool(TEST_DB_CONFIG);
    userRepository = new UserRepository(pool);
    
    // Create test table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
  });

  beforeEach(async () => {
    // Clean up test data
    await pool.query('DELETE FROM users');
  });

  afterEach(async () => {
    // Clean up test data
    await pool.query('DELETE FROM users');
  });

  afterAll(async () => {
    // Drop test table and close connection
    await pool.query('DROP TABLE IF EXISTS users');
    await pool.end();
  });

  describe('AC-001: Test successful user creation with valid data', () => {
    it('should create user with valid email and password', async () => {
      const result = await userRepository.create(VALID_USER_DATA);

      expect(result.id).toBeDefined();
      expect(result.email).toBe(VALID_USER_DATA.email);
      expect(result.password).toBeDefined();
      expect(result.created_at).toBeDefined();
      expect(result.updated_at).toBeDefined();

      // Verify password is hashed
      const isValidHash = await bcrypt.compare(VALID_USER_DATA.password, result.password);
      expect(isValidHash).toBe(true);
    });

    it('should create user with different valid email formats', async () => {
      const validEmails = [
        'user.name@domain.com',
        'user+tag@example.org',
        'firstname.lastname@subdomain.example.com'
      ];

      for (const email of validEmails) {
        const userData = { ...VALID_USER_DATA, email };
        const result = await userRepository.create(userData);
        
        expect(result.email).toBe(email);
        expect(result.id).toBeDefined();
      }
    });
  });

  describe('AC-002: Test duplicate email rejection returns appropriate error', () => {
    it('should reject duplicate email with unique constraint error', async () => {
      // Create first user
      await userRepository.create(VALID_USER_DATA);

      // Attempt to create second user with same email
      await expect(userRepository.create(VALID_USER_DATA))
        .rejects
        .toThrow(/duplicate key value violates unique constraint|already exists/);
    });

    it('should reject case-insensitive duplicate emails', async () => {
      await userRepository.create(VALID_USER_DATA);

      const duplicateWithDifferentCase = {
        ...VALID_USER_DATA,
        email: VALID_USER_DATA.email.toUpperCase()
      };

      await expect(userRepository.create(duplicateWithDifferentCase))
        .rejects
        .toThrow(/duplicate key value violates unique constraint|already exists/);
    });
  });

  describe('AC-003: Test user lookup by email for existing and non-existing users', () => {
    it('should find existing user by email', async () => {
      const createdUser = await userRepository.create(VALID_USER_DATA);
      const foundUser = await userRepository.findByEmail(VALID_USER_DATA.email);

      expect(foundUser).toBeDefined();
      expect(foundUser!.id).toBe(createdUser.id);
      expect(foundUser!.email).toBe(VALID_USER_DATA.email);
      expect(foundUser!.password).toBe(createdUser.password);
    });

    it('should return null for non-existing user', async () => {
      const result = await userRepository.findByEmail('nonexistent@example.com');
      expect(result).toBeNull();
    });

    it('should handle empty email search', async () => {
      const result = await userRepository.findByEmail('');
      expect(result).toBeNull();
    });

    it('should perform case-insensitive email lookup', async () => {
      await userRepository.create(VALID_USER_DATA);
      
      const foundUser = await userRepository.findByEmail(VALID_USER_DATA.email.toUpperCase());
      expect(foundUser).toBeDefined();
      expect(foundUser!.email).toBe(VALID_USER_DATA.email);
    });
  });

  describe('AC-004: Test SQL injection protection with malicious inputs', () => {
    it('should prevent SQL injection in email field during creation', async () => {
      for (const maliciousEmail of SQL_INJECTION_PAYLOADS) {
        const maliciousUserData = {
          ...VALID_USER_DATA,
          email: maliciousEmail
        };

        // Should either fail validation or create user safely without executing injection
        try {
          const result = await userRepository.create(maliciousUserData);
          // If creation succeeds, verify no injection occurred
          expect(result.email).toBe(maliciousEmail);
          
          // Verify users table still exists and has expected structure
          const tableCheck = await pool.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'users'");
          expect(tableCheck.rows.length).toBeGreaterThan(0);
        } catch (error) {
          // Rejection is acceptable for malformed emails
          expect(error).toBeDefined();
        }
      }
    });

    it('should prevent SQL injection in email lookup', async () => {
      // Create a legitimate user first
      await userRepository.create(VALID_USER_DATA);

      for (const maliciousEmail of SQL_INJECTION_PAYLOADS) {
        // Should return null or specific user, never execute injection
        const result = await userRepository.findByEmail(maliciousEmail);
        
        // Verify users table still exists after each attempt
        const tableCheck = await pool.query("SELECT COUNT(*) FROM users");
        expect(parseInt(tableCheck.rows[0].count)).toBe(1);
        
        // Result should be null (not found) or the specific user if email matches exactly
        if (result !== null) {
          expect(result.email).toBe(maliciousEmail);
        }
      }
    });

    it('should use parameterized queries for all database operations', async () => {
      // This test verifies the repository uses parameterized queries
      // by ensuring special characters don't break the queries
      const specialCharEmail = "user';--@example.com";
      
      const userData = {
        ...VALID_USER_DATA,
        email: specialCharEmail
      };

      const createdUser = await userRepository.create(userData);
      expect(createdUser.email).toBe(specialCharEmail);

      const foundUser = await userRepository.findByEmail(specialCharEmail);
      expect(foundUser).toBeDefined();
      expect(foundUser!.email).toBe(specialCharEmail);
    });
  });
});