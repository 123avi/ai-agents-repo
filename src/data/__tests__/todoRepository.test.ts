import { Pool, PoolClient } from 'pg';
import { TodoRepository } from '../todoRepository';
import { Todo } from '../../types/Todo';

// Mock the pg module
jest.mock('pg', () => ({
  Pool: jest.fn().mockImplementation(() => ({
    connect: jest.fn(),
    query: jest.fn(),
    end: jest.fn()
  }))
}));

describe('TodoRepository', () => {
  let todoRepository: TodoRepository;
  let mockPool: jest.Mocked<Pool>;
  let mockClient: jest.Mocked<PoolClient>;

  const MOCK_USER_ID_1 = 1;
  const MOCK_USER_ID_2 = 2;
  const MOCK_TODO_ID = 100;

  const mockTodo: Todo = {
    id: MOCK_TODO_ID,
    title: 'Test Todo',
    description: 'Test Description',
    completed: false,
    userId: MOCK_USER_ID_1,
    createdAt: new Date('2024-01-01T00:00:00Z'),
    updatedAt: new Date('2024-01-01T00:00:00Z')
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockClient = {
      query: jest.fn(),
      release: jest.fn()
    } as any;
    
    mockPool = {
      connect: jest.fn().mockResolvedValue(mockClient),
      query: jest.fn(),
      end: jest.fn()
    } as any;
    
    (Pool as jest.MockedClass<typeof Pool>).mockImplementation(() => mockPool);
    
    todoRepository = new TodoRepository(mockPool);
  });

  describe('AC-001: Todo creation with user association', () => {
    it('should create a todo with correct user association', async () => {
      const todoData = {
        title: 'New Todo',
        description: 'New Description',
        userId: MOCK_USER_ID_1
      };

      const mockResult = {
        rows: [{
          id: MOCK_TODO_ID,
          title: todoData.title,
          description: todoData.description,
          completed: false,
          user_id: todoData.userId,
          created_at: new Date(),
          updated_at: new Date()
        }]
      };

      mockClient.query.mockResolvedValue(mockResult);

      const result = await todoRepository.create(todoData);

      expect(mockPool.connect).toHaveBeenCalled();
      expect(mockClient.query).toHaveBeenCalledWith(
        'INSERT INTO todos (title, description, completed, user_id, created_at, updated_at) VALUES ($1, $2, $3, $4, NOW(), NOW()) RETURNING *',
        [todoData.title, todoData.description, false, todoData.userId]
      );
      expect(mockClient.release).toHaveBeenCalled();
      expect(result.userId).toBe(MOCK_USER_ID_1);
      expect(result.title).toBe(todoData.title);
    });

    it('should throw error when database operation fails during creation', async () => {
      const todoData = {
        title: 'New Todo',
        description: 'New Description',
        userId: MOCK_USER_ID_1
      };

      const dbError = new Error('Database connection failed');
      mockClient.query.mockRejectedValue(dbError);

      await expect(todoRepository.create(todoData)).rejects.toThrow('Database connection failed');
      expect(mockClient.release).toHaveBeenCalled();
    });
  });

  describe('AC-002: Todo retrieval filtered by user', () => {
    it('should retrieve todos only for specified user', async () => {
      const mockResult = {
        rows: [
          {
            id: 1,
            title: 'User 1 Todo 1',
            description: 'Description 1',
            completed: false,
            user_id: MOCK_USER_ID_1,
            created_at: new Date(),
            updated_at: new Date()
          },
          {
            id: 2,
            title: 'User 1 Todo 2',
            description: 'Description 2',
            completed: true,
            user_id: MOCK_USER_ID_1,
            created_at: new Date(),
            updated_at: new Date()
          }
        ]
      };

      mockClient.query.mockResolvedValue(mockResult);

      const result = await todoRepository.findByUserId(MOCK_USER_ID_1);

      expect(mockPool.connect).toHaveBeenCalled();
      expect(mockClient.query).toHaveBeenCalledWith(
        'SELECT * FROM todos WHERE user_id = $1 ORDER BY created_at DESC',
        [MOCK_USER_ID_1]
      );
      expect(mockClient.release).toHaveBeenCalled();
      expect(result).toHaveLength(2);
      expect(result.every(todo => todo.userId === MOCK_USER_ID_1)).toBe(true);
    });

    it('should return empty array when user has no todos', async () => {
      const mockResult = { rows: [] };
      mockClient.query.mockResolvedValue(mockResult);

      const result = await todoRepository.findByUserId(MOCK_USER_ID_1);

      expect(result).toEqual([]);
    });

    it('should throw error when database operation fails during retrieval', async () => {
      const dbError = new Error('Connection timeout');
      mockClient.query.mockRejectedValue(dbError);

      await expect(todoRepository.findByUserId(MOCK_USER_ID_1)).rejects.toThrow('Connection timeout');
      expect(mockClient.release).toHaveBeenCalled();
    });
  });

  describe('AC-003: Todo update with ownership validation', () => {
    it('should update todo when user owns the todo', async () => {
      const updateData = {
        title: 'Updated Title',
        description: 'Updated Description',
        completed: true
      };

      const mockResult = {
        rows: [{
          id: MOCK_TODO_ID,
          title: updateData.title,
          description: updateData.description,
          completed: updateData.completed,
          user_id: MOCK_USER_ID_1,
          created_at: new Date(),
          updated_at: new Date()
        }],
        rowCount: 1
      };

      mockClient.query.mockResolvedValue(mockResult);

      const result = await todoRepository.update(MOCK_TODO_ID, updateData, MOCK_USER_ID_1);

      expect(mockClient.query).toHaveBeenCalledWith(
        'UPDATE todos SET title = $1, description = $2, completed = $3, updated_at = NOW() WHERE id = $4 AND user_id = $5 RETURNING *',
        [updateData.title, updateData.description, updateData.completed, MOCK_TODO_ID, MOCK_USER_ID_1]
      );
      expect(result).toBeDefined();
      expect(result!.title).toBe(updateData.title);
    });

    it('should return null when user does not own the todo', async () => {
      const updateData = {
        title: 'Updated Title',
        description: 'Updated Description',
        completed: true
      };

      const mockResult = { rows: [], rowCount: 0 };
      mockClient.query.mockResolvedValue(mockResult);

      const result = await todoRepository.update(MOCK_TODO_ID, updateData, MOCK_USER_ID_2);

      expect(result).toBeNull();
    });

    it('should throw error when database operation fails during update', async () => {
      const updateData = { title: 'Updated Title' };
      const dbError = new Error('Update failed');
      mockClient.query.mockRejectedValue(dbError);

      await expect(todoRepository.update(MOCK_TODO_ID, updateData, MOCK_USER_ID_1)).rejects.toThrow('Update failed');
      expect(mockClient.release).toHaveBeenCalled();
    });
  });

  describe('AC-004: Todo deletion with ownership validation', () => {
    it('should delete todo when user owns the todo', async () => {
      const mockResult = { rowCount: 1 };
      mockClient.query.mockResolvedValue(mockResult);

      const result = await todoRepository.delete(MOCK_TODO_ID, MOCK_USER_ID_1);

      expect(mockClient.query).toHaveBeenCalledWith(
        'DELETE FROM todos WHERE id = $1 AND user_id = $2',
        [MOCK_TODO_ID, MOCK_USER_ID_1]
      );
      expect(result).toBe(true);
    });

    it('should return false when user does not own the todo', async () => {
      const mockResult = { rowCount: 0 };
      mockClient.query.mockResolvedValue(mockResult);

      const result = await todoRepository.delete(MOCK_TODO_ID, MOCK_USER_ID_2);

      expect(result).toBe(false);
    });

    it('should throw error when database operation fails during deletion', async () => {
      const dbError = new Error('Delete failed');
      mockClient.query.mockRejectedValue(dbError);

      await expect(todoRepository.delete(MOCK_TODO_ID, MOCK_USER_ID_1)).rejects.toThrow('Delete failed');
      expect(mockClient.release).toHaveBeenCalled();
    });
  });

  describe('AC-005: User isolation between different users', () => {
    it('should ensure user 1 cannot access user 2 todos via findByUserId', async () => {
      const user1Result = {
        rows: [{
          id: 1,
          title: 'User 1 Todo',
          description: 'User 1 Description',
          completed: false,
          user_id: MOCK_USER_ID_1,
          created_at: new Date(),
          updated_at: new Date()
        }]
      };

      const user2Result = {
        rows: [{
          id: 2,
          title: 'User 2 Todo',
          description: 'User 2 Description',
          completed: false,
          user_id: MOCK_USER_ID_2,
          created_at: new Date(),
          updated_at: new Date()
        }]
      };

      // First call for user 1
      mockClient.query.mockResolvedValueOnce(user1Result);
      // Second call for user 2
      mockClient.query.mockResolvedValueOnce(user2Result);

      const user1Todos = await todoRepository.findByUserId(MOCK_USER_ID_1);
      const user2Todos = await todoRepository.findByUserId(MOCK_USER_ID_2);

      expect(user1Todos).toHaveLength(1);
      expect(user1Todos[0].userId).toBe(MOCK_USER_ID_1);
      expect(user2Todos).toHaveLength(1);
      expect(user2Todos[0].userId).toBe(MOCK_USER_ID_2);
      
      // Verify no cross-contamination
      expect(user1Todos[0].userId).not.toBe(MOCK_USER_ID_2);
      expect(user2Todos[0].userId).not.toBe(MOCK_USER_ID_1);
    });

    it('should ensure update operations respect user ownership', async () => {
      const updateData = { title: 'Malicious Update' };
      
      // User 2 tries to update User 1's todo
      const mockResult = { rows: [], rowCount: 0 };
      mockClient.query.mockResolvedValue(mockResult);

      const result = await todoRepository.update(MOCK_TODO_ID, updateData, MOCK_USER_ID_2);

      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('WHERE id = $4 AND user_id = $5'),
        expect.arrayContaining([MOCK_TODO_ID, MOCK_USER_ID_2])
      );
      expect(result).toBeNull();
    });

    it('should ensure delete operations respect user ownership', async () => {
      // User 2 tries to delete User 1's todo
      const mockResult = { rowCount: 0 };
      mockClient.query.mockResolvedValue(mockResult);

      const result = await todoRepository.delete(MOCK_TODO_ID, MOCK_USER_ID_2);

      expect(mockClient.query).toHaveBeenCalledWith(
        'DELETE FROM todos WHERE id = $1 AND user_id = $2',
        [MOCK_TODO_ID, MOCK_USER_ID_2]
      );
      expect(result).toBe(false);
    });

    it('should verify all queries include user_id filtering', async () => {
      const updateData = { title: 'Test' };
      
      // Test findByUserId
      mockClient.query.mockResolvedValueOnce({ rows: [] });
      await todoRepository.findByUserId(MOCK_USER_ID_1);
      
      // Test update
      mockClient.query.mockResolvedValueOnce({ rows: [], rowCount: 0 });
      await todoRepository.update(MOCK_TODO_ID, updateData, MOCK_USER_ID_1);
      
      // Test delete
      mockClient.query.mockResolvedValueOnce({ rowCount: 0 });
      await todoRepository.delete(MOCK_TODO_ID, MOCK_USER_ID_1);

      const calls = mockClient.query.mock.calls;
      
      // Verify findByUserId includes user_id filter
      expect(calls[0][0]).toContain('WHERE user_id = $1');
      
      // Verify update includes user_id filter
      expect(calls[1][0]).toContain('WHERE id = $4 AND user_id = $5');
      
      // Verify delete includes user_id filter
      expect(calls[2][0]).toContain('WHERE id = $1 AND user_id = $2');
    });
  });
});