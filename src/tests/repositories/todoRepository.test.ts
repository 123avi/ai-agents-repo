import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import { Pool, PoolClient } from 'pg';
import { TodoRepository } from '../../repositories/TodoRepository';
import { UserRepository } from '../../repositories/UserRepository';
import { Todo, TodoStatus } from '../../types/Todo';
import { User } from '../../types/User';

/**
 * Comprehensive test suite for TodoRepository
 * Tests CRUD operations, user isolation, and security measures
 */
describe('TodoRepository', () => {
  let pool: Pool;
  let client: PoolClient;
  let todoRepository: TodoRepository;
  let userRepository: UserRepository;
  let testUser1: User;
  let testUser2: User;
  let testTodo: Todo;

  const TEST_DB_CONFIG = {
    host: process.env.TEST_DB_HOST || 'localhost',
    port: parseInt(process.env.TEST_DB_PORT || '5432'),
    database: process.env.TEST_DB_NAME || 'todo_test',
    user: process.env.TEST_DB_USER || 'test_user',
    password: process.env.TEST_DB_PASSWORD || 'test_pass'
  };

  const TEST_USER_1_EMAIL = 'test1@example.com';
  const TEST_USER_2_EMAIL = 'test2@example.com';
  const TEST_PASSWORD_HASH = '$2b$10$abcdefghijklmnopqrstuvwxyz';

  beforeAll(async () => {
    pool = new Pool(TEST_DB_CONFIG);
    client = await pool.connect();
    todoRepository = new TodoRepository(pool);
    userRepository = new UserRepository(pool);

    // Setup test schema
    await setupTestSchema();
  });

  afterAll(async () => {
    await cleanupTestData();
    client.release();
    await pool.end();
  });

  beforeEach(async () => {
    await cleanupTestData();
    await createTestUsers();
  });

  /**
   * Sets up test database schema
   */
  async function setupTestSchema(): Promise<void> {
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS todos (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        status VARCHAR(20) NOT NULL DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
  }

  /**
   * Creates test users for isolation testing
   */
  async function createTestUsers(): Promise<void> {
    testUser1 = await userRepository.create({
      email: TEST_USER_1_EMAIL,
      password_hash: TEST_PASSWORD_HASH
    });

    testUser2 = await userRepository.create({
      email: TEST_USER_2_EMAIL,
      password_hash: TEST_PASSWORD_HASH
    });
  }

  /**
   * Cleans up test data between tests
   */
  async function cleanupTestData(): Promise<void> {
    await client.query('DELETE FROM todos');
    await client.query('DELETE FROM users');
  }

  describe('AC-001: Test todo creation with user association', () => {
    it('should create a todo with valid user association', async () => {
      const todoData = {
        user_id: testUser1.id,
        title: 'Test Todo',
        description: 'Test Description',
        status: TodoStatus.PENDING
      };

      const createdTodo = await todoRepository.create(todoData);

      expect(createdTodo).toBeDefined();
      expect(createdTodo.id).toBeDefined();
      expect(createdTodo.user_id).toBe(testUser1.id);
      expect(createdTodo.title).toBe(todoData.title);
      expect(createdTodo.description).toBe(todoData.description);
      expect(createdTodo.status).toBe(todoData.status);
      expect(createdTodo.created_at).toBeDefined();
      expect(createdTodo.updated_at).toBeDefined();
    });

    it('should reject todo creation with invalid user_id', async () => {
      const INVALID_USER_ID = 99999;
      const todoData = {
        user_id: INVALID_USER_ID,
        title: 'Invalid User Todo',
        description: 'Should fail',
        status: TodoStatus.PENDING
      };

      await expect(todoRepository.create(todoData)).rejects.toThrow();
    });

    it('should require title field for todo creation', async () => {
      const todoData = {
        user_id: testUser1.id,
        title: '',
        description: 'Description without title',
        status: TodoStatus.PENDING
      };

      await expect(todoRepository.create(todoData)).rejects.toThrow();
    });
  });

  describe('AC-002: Test user data isolation in queries', () => {
    beforeEach(async () => {
      // Create todos for both users
      await todoRepository.create({
        user_id: testUser1.id,
        title: 'User 1 Todo 1',
        description: 'Private to user 1',
        status: TodoStatus.PENDING
      });

      await todoRepository.create({
        user_id: testUser1.id,
        title: 'User 1 Todo 2',
        description: 'Also private to user 1',
        status: TodoStatus.COMPLETED
      });

      await todoRepository.create({
        user_id: testUser2.id,
        title: 'User 2 Todo 1',
        description: 'Private to user 2',
        status: TodoStatus.PENDING
      });
    });

    it('should return only user1 todos when querying for user1', async () => {
      const user1Todos = await todoRepository.findByUserId(testUser1.id);

      expect(user1Todos).toHaveLength(2);
      user1Todos.forEach(todo => {
        expect(todo.user_id).toBe(testUser1.id);
        expect(todo.title).toContain('User 1');
      });
    });

    it('should return only user2 todos when querying for user2', async () => {
      const user2Todos = await todoRepository.findByUserId(testUser2.id);

      expect(user2Todos).toHaveLength(1);
      expect(user2Todos[0].user_id).toBe(testUser2.id);
      expect(user2Todos[0].title).toContain('User 2');
    });

    it('should return empty array for user with no todos', async () => {
      const newUser = await userRepository.create({
        email: 'empty@example.com',
        password_hash: TEST_PASSWORD_HASH
      });

      const emptyTodos = await todoRepository.findByUserId(newUser.id);
      expect(emptyTodos).toHaveLength(0);
    });
  });

  describe('AC-003: Test todo updates and ownership validation', () => {
    beforeEach(async () => {
      testTodo = await todoRepository.create({
        user_id: testUser1.id,
        title: 'Original Title',
        description: 'Original Description',
        status: TodoStatus.PENDING
      });
    });

    it('should update todo when user owns the todo', async () => {
      const updateData = {
        title: 'Updated Title',
        description: 'Updated Description',
        status: TodoStatus.COMPLETED
      };

      const updatedTodo = await todoRepository.updateByUserAndId(
        testUser1.id,
        testTodo.id,
        updateData
      );

      expect(updatedTodo).toBeDefined();
      expect(updatedTodo!.title).toBe(updateData.title);
      expect(updatedTodo!.description).toBe(updateData.description);
      expect(updatedTodo!.status).toBe(updateData.status);
      expect(updatedTodo!.updated_at.getTime()).toBeGreaterThan(
        testTodo.created_at.getTime()
      );
    });

    it('should reject update when user does not own the todo', async () => {
      const updateData = {
        title: 'Unauthorized Update',
        status: TodoStatus.COMPLETED
      };

      const result = await todoRepository.updateByUserAndId(
        testUser2.id,
        testTodo.id,
        updateData
      );

      expect(result).toBeNull();
    });

    it('should handle partial updates correctly', async () => {
      const partialUpdate = {
        status: TodoStatus.COMPLETED
      };

      const updatedTodo = await todoRepository.updateByUserAndId(
        testUser1.id,
        testTodo.id,
        partialUpdate
      );

      expect(updatedTodo!.status).toBe(TodoStatus.COMPLETED);
      expect(updatedTodo!.title).toBe(testTodo.title);
      expect(updatedTodo!.description).toBe(testTodo.description);
    });
  });

  describe('AC-004: Test todo deletion and not found handling', () => {
    beforeEach(async () => {
      testTodo = await todoRepository.create({
        user_id: testUser1.id,
        title: 'Todo to Delete',
        description: 'Will be deleted',
        status: TodoStatus.PENDING
      });
    });

    it('should delete todo when user owns it', async () => {
      const deleteResult = await todoRepository.deleteByUserAndId(
        testUser1.id,
        testTodo.id
      );

      expect(deleteResult).toBe(true);

      const deletedTodo = await todoRepository.findByUserAndId(
        testUser1.id,
        testTodo.id
      );
      expect(deletedTodo).toBeNull();
    });

    it('should return false when user tries to delete todo they do not own', async () => {
      const deleteResult = await todoRepository.deleteByUserAndId(
        testUser2.id,
        testTodo.id
      );

      expect(deleteResult).toBe(false);

      const stillExists = await todoRepository.findByUserAndId(
        testUser1.id,
        testTodo.id
      );
      expect(stillExists).toBeDefined();
    });

    it('should return false when trying to delete non-existent todo', async () => {
      const NON_EXISTENT_ID = 99999;
      const deleteResult = await todoRepository.deleteByUserAndId(
        testUser1.id,
        NON_EXISTENT_ID
      );

      expect(deleteResult).toBe(false);
    });

    it('should return null when finding non-existent todo', async () => {
      const NON_EXISTENT_ID = 99999;
      const notFound = await todoRepository.findByUserAndId(
        testUser1.id,
        NON_EXISTENT_ID
      );

      expect(notFound).toBeNull();
    });
  });

  describe('AC-005: Test parameterized query protection', () => {
    it('should safely handle SQL injection attempts in user_id', async () => {
      const maliciousUserId = "1; DROP TABLE todos; --" as any;

      await expect(
        todoRepository.findByUserId(maliciousUserId)
      ).rejects.toThrow();
    });

    it('should safely handle SQL injection attempts in title', async () => {
      const maliciousTitle = "'; DROP TABLE users; --";

      const todoData = {
        user_id: testUser1.id,
        title: maliciousTitle,
        description: 'Safe description',
        status: TodoStatus.PENDING
      };

      const createdTodo = await todoRepository.create(todoData);
      expect(createdTodo.title).toBe(maliciousTitle);

      const userStillExists = await userRepository.findById(testUser1.id);
      expect(userStillExists).toBeDefined();
    });

    it('should safely handle special characters in todo content', async () => {
      const specialCharTitle = "Todo with 'quotes' and \"double quotes\" and <tags>";
      const specialCharDescription = "Description with $symbols and @mentions and #hashtags";

      const todoData = {
        user_id: testUser1.id,
        title: specialCharTitle,
        description: specialCharDescription,
        status: TodoStatus.PENDING
      };

      const createdTodo = await todoRepository.create(todoData);
      expect(createdTodo.title).toBe(specialCharTitle);
      expect(createdTodo.description).toBe(specialCharDescription);
    });

    it('should safely handle numeric string inputs', async () => {
      const numericTitle = "123456";
      const numericDescription = "789.123";

      const todoData = {
        user_id: testUser1.id,
        title: numericTitle,
        description: numericDescription,
        status: TodoStatus.PENDING
      };

      const createdTodo = await todoRepository.create(todoData);
      expect(createdTodo.title).toBe(numericTitle);
      expect(createdTodo.description).toBe(numericDescription);
    });
  });
});