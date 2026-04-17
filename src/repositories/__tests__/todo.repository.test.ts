import { Pool, PoolClient } from 'pg';
import { TodoRepository, CreateTodoDto, UpdateTodoDto, TodoItem } from '../todo.repository';
import { logger } from '../../utils/logger';

// Mock the logger to avoid actual logging during tests
jest.mock('../../utils/logger', () => ({
  logger: {
    info: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
  }
}));

describe('TodoRepository', () => {
  let mockPool: jest.Mocked<Pool>;
  let mockClient: jest.Mocked<PoolClient>;
  let todoRepository: TodoRepository;

  const mockTodoRow = {
    id: 1,
    title: 'Test Todo',
    description: 'Test Description',
    status: 'open',
    user_id: 100,
    created_at: new Date('2024-01-01T00:00:00Z'),
    updated_at: new Date('2024-01-01T00:00:00Z')
  };

  const expectedTodoItem: TodoItem = {
    id: 1,
    title: 'Test Todo',
    description: 'Test Description',
    status: 'open',
    user_id: 100,
    created_at: new Date('2024-01-01T00:00:00Z'),
    updated_at: new Date('2024-01-01T00:00:00Z')
  };

  beforeEach(() => {
    mockClient = {
      query: jest.fn(),
      release: jest.fn()
    } as any;

    mockPool = {
      connect: jest.fn().mockResolvedValue(mockClient)
    } as any;

    todoRepository = new TodoRepository(mockPool);
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a todo with default status open', async () => {
      const createDto: CreateTodoDto = {
        title: 'New Todo',
        description: 'New Description',
        user_id: 100
      };

      mockClient.query.mockResolvedValue({ rows: [mockTodoRow] });

      const result = await todoRepository.create(createDto);

      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO todos'),
        ['New Todo', 'New Description', 'open', 100]
      );
      expect(result).toEqual(expectedTodoItem);
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should create todo without description', async () => {
      const createDto: CreateTodoDto = {
        title: 'New Todo',
        user_id: 100
      };

      mockClient.query.mockResolvedValue({ rows: [{ ...mockTodoRow, description: null }] });

      const result = await todoRepository.create(createDto);

      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO todos'),
        ['New Todo', null, 'open', 100]
      );
      expect(result.description).toBeNull();
    });

    it('should validate required title', async () => {
      const createDto: CreateTodoDto = {
        title: '',
        user_id: 100
      };

      await expect(todoRepository.create(createDto)).rejects.toThrow('Title is required');
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should validate title length', async () => {
      const createDto: CreateTodoDto = {
        title: 'x'.repeat(256),
        user_id: 100
      };

      await expect(todoRepository.create(createDto)).rejects.toThrow('Title must be 255 characters or less');
    });

    it('should validate user_id', async () => {
      const createDto: CreateTodoDto = {
        title: 'Valid Title',
        user_id: 0
      };

      await expect(todoRepository.create(createDto)).rejects.toThrow('Valid user_id is required');
    });

    it('should handle database errors', async () => {
      const createDto: CreateTodoDto = {
        title: 'New Todo',
        user_id: 100
      };

      const dbError = new Error('Database error');
      mockClient.query.mockRejectedValue(dbError);

      await expect(todoRepository.create(createDto)).rejects.toThrow('Database error');
      expect(logger.error).toHaveBeenCalledWith('Failed to create todo', { error: dbError, userId: 100 });
      expect(mockClient.release).toHaveBeenCalled();
    });
  });

  describe('findByUserId', () => {
    it('should find todos for specific user only', async () => {
      const userId = 100;
      mockClient.query.mockResolvedValue({ rows: [mockTodoRow] });

      const result = await todoRepository.findByUserId(userId);

      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('WHERE user_id = $1'),
        [userId]
      );
      expect(result).toEqual([expectedTodoItem]);
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should return empty array when no todos found', async () => {
      const userId = 100;
      mockClient.query.mockResolvedValue({ rows: [] });

      const result = await todoRepository.findByUserId(userId);

      expect(result).toEqual([]);
    });

    it('should handle database errors', async () => {
      const userId = 100;
      const dbError = new Error('Database error');
      mockClient.query.mockRejectedValue(dbError);

      await expect(todoRepository.findByUserId(userId)).rejects.toThrow('Database error');
      expect(logger.error).toHaveBeenCalledWith('Failed to find todos', { error: dbError, userId });
      expect(mockClient.release).toHaveBeenCalled();
    });
  });

  describe('update', () => {
    it('should update todo with ownership validation', async () => {
      const todoId = 1;
      const userId = 100;
      const updates: UpdateTodoDto = {
        title: 'Updated Title',
        status: 'completed'
      };

      const updatedRow = { ...mockTodoRow, title: 'Updated Title', status: 'completed' };
      mockClient.query.mockResolvedValue({ rows: [updatedRow] });

      const result = await todoRepository.update(todoId, userId, updates);

      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('WHERE id = $3 AND user_id = $4'),
        ['Updated Title', 'completed', todoId, userId]
      );
      expect(result?.title).toBe('Updated Title');
      expect(result?.status).toBe('completed');
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should return null when todo not found or unauthorized', async () => {
      const todoId = 1;
      const userId = 100;
      const updates: UpdateTodoDto = { title: 'Updated Title' };

      mockClient.query.mockResolvedValue({ rows: [] });

      const result = await todoRepository.update(todoId, userId, updates);

      expect(result).toBeNull();
      expect(logger.warn).toHaveBeenCalledWith(
        'Todo update failed - not found or unauthorized',
        { todoId, userId }
      );
    });

    it('should validate empty title', async () => {
      const updates: UpdateTodoDto = { title: '' };

      await expect(todoRepository.update(1, 100, updates)).rejects.toThrow('Title cannot be empty');
    });

    it('should validate invalid status', async () => {
      const updates: UpdateTodoDto = { status: 'invalid' as any };

      await expect(todoRepository.update(1, 100, updates)).rejects.toThrow('Status must be either "open" or "completed"');
    });

    it('should throw error when no valid updates provided', async () => {
      const updates: UpdateTodoDto = {};

      await expect(todoRepository.update(1, 100, updates)).rejects.toThrow('No valid updates provided');
      expect(mockClient.release).toHaveBeenCalled();
    });
  });

  describe('delete', () => {
    it('should delete todo with ownership validation', async () => {
      const todoId = 1;
      const userId = 100;

      mockClient.query.mockResolvedValue({ rowCount: 1 });

      const result = await todoRepository.delete(todoId, userId);

      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('WHERE id = $1 AND user_id = $2'),
        [todoId, userId]
      );
      expect(result).toBe(true);
      expect(logger.info).toHaveBeenCalledWith('Todo deleted', { todoId, userId });
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should return false when todo not found or unauthorized', async () => {
      const todoId = 1;
      const userId = 100;

      mockClient.query.mockResolvedValue({ rowCount: 0 });

      const result = await todoRepository.delete(todoId, userId);

      expect(result).toBe(false);
      expect(logger.warn).toHaveBeenCalledWith(
        'Todo deletion failed - not found or unauthorized',
        { todoId, userId }
      );
    });

    it('should handle database errors', async () => {
      const todoId = 1;
      const userId = 100;
      const dbError = new Error('Database error');
      mockClient.query.mockRejectedValue(dbError);

      await expect(todoRepository.delete(todoId, userId)).rejects.toThrow('Database error');
      expect(logger.error).toHaveBeenCalledWith('Failed to delete todo', { error: dbError, todoId, userId });
      expect(mockClient.release).toHaveBeenCalled();
    });
  });

  describe('database connection', () => {
    it('should handle connection pool errors', async () => {
      const connectionError = new Error('Connection failed');
      mockPool.connect.mockRejectedValue(connectionError);

      await expect(todoRepository.create({ title: 'Test', user_id: 1 })).rejects.toThrow('Database connection failed');
      expect(logger.error).toHaveBeenCalledWith('Failed to get database client', { error: connectionError });
    });
  });
});