import { Pool, PoolClient } from 'pg';
import { TodoRepository } from '../todo.repository';
import { CreateTodoDto, UpdateTodoDto, TodoStatus } from '../../types/todo.types';

// Mock pg module
jest.mock('pg');

describe('TodoRepository', () => {
  let mockPool: jest.Mocked<Pool>;
  let mockClient: jest.Mocked<PoolClient>;
  let todoRepository: TodoRepository;

  const MOCK_USER_ID_1 = 'user-123';
  const MOCK_USER_ID_2 = 'user-456';
  const MOCK_TODO_ID = 'todo-789';

  beforeEach(() => {
    mockClient = {
      query: jest.fn(),
      release: jest.fn()
    } as unknown as jest.Mocked<PoolClient>;

    mockPool = {
      connect: jest.fn().mockResolvedValue(mockClient),
      query: jest.fn()
    } as unknown as jest.Mocked<Pool>;

    todoRepository = new TodoRepository(mockPool);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createTodo', () => {
    it('should create a todo with user association', async () => {
      // AC-001: Test todo creation with user association
      const createTodoDto: CreateTodoDto = {
        title: 'Test Todo',
        description: 'Test Description',
        due_date: new Date('2024-12-31'),
        status: TodoStatus.OPEN
      };

      const expectedTodo = {
        id: MOCK_TODO_ID,
        title: createTodoDto.title,
        description: createTodoDto.description,
        due_date: createTodoDto.due_date,
        status: createTodoDto.status,
        user_id: MOCK_USER_ID_1,
        created_at: new Date(),
        updated_at: new Date()
      };

      mockClient.query.mockResolvedValueOnce({ rows: [expectedTodo], rowCount: 1 });

      const result = await todoRepository.createTodo(MOCK_USER_ID_1, createTodoDto);

      expect(mockClient.query).toHaveBeenCalledWith(
        'INSERT INTO todos (title, description, due_date, status, user_id) VALUES ($1, $2, $3, $4, $5) RETURNING *',
        [createTodoDto.title, createTodoDto.description, createTodoDto.due_date, createTodoDto.status, MOCK_USER_ID_1]
      );
      expect(result).toEqual(expectedTodo);
    });

    it('should create a todo with default status when not provided', async () => {
      const createTodoDto: CreateTodoDto = {
        title: 'Test Todo',
        description: 'Test Description'
      };

      const expectedTodo = {
        id: MOCK_TODO_ID,
        title: createTodoDto.title,
        description: createTodoDto.description,
        due_date: null,
        status: TodoStatus.OPEN,
        user_id: MOCK_USER_ID_1,
        created_at: new Date(),
        updated_at: new Date()
      };

      mockClient.query.mockResolvedValueOnce({ rows: [expectedTodo], rowCount: 1 });

      await todoRepository.createTodo(MOCK_USER_ID_1, createTodoDto);

      expect(mockClient.query).toHaveBeenCalledWith(
        'INSERT INTO todos (title, description, due_date, status, user_id) VALUES ($1, $2, $3, $4, $5) RETURNING *',
        [createTodoDto.title, createTodoDto.description, undefined, TodoStatus.OPEN, MOCK_USER_ID_1]
      );
    });
  });

  describe('getTodosByUserId', () => {
    it('should return only todos for the specified user', async () => {
      // AC-002: Test user isolation in queries
      const mockTodos = [
        {
          id: 'todo-1',
          title: 'User 1 Todo 1',
          user_id: MOCK_USER_ID_1
        },
        {
          id: 'todo-2',
          title: 'User 1 Todo 2',
          user_id: MOCK_USER_ID_1
        }
      ];

      mockClient.query.mockResolvedValueOnce({ rows: mockTodos, rowCount: 2 });

      const result = await todoRepository.getTodosByUserId(MOCK_USER_ID_1);

      expect(mockClient.query).toHaveBeenCalledWith(
        'SELECT * FROM todos WHERE user_id = $1 ORDER BY created_at DESC',
        [MOCK_USER_ID_1]
      );
      expect(result).toEqual(mockTodos);
      expect(result).toHaveLength(2);
      result.forEach(todo => {
        expect(todo.user_id).toBe(MOCK_USER_ID_1);
      });
    });

    it('should return empty array when user has no todos', async () => {
      mockClient.query.mockResolvedValueOnce({ rows: [], rowCount: 0 });

      const result = await todoRepository.getTodosByUserId(MOCK_USER_ID_1);

      expect(result).toEqual([]);
    });
  });

  describe('getTodoById', () => {
    it('should return todo when it belongs to the user', async () => {
      const mockTodo = {
        id: MOCK_TODO_ID,
        title: 'Test Todo',
        user_id: MOCK_USER_ID_1
      };

      mockClient.query.mockResolvedValueOnce({ rows: [mockTodo], rowCount: 1 });

      const result = await todoRepository.getTodoById(MOCK_TODO_ID, MOCK_USER_ID_1);

      expect(mockClient.query).toHaveBeenCalledWith(
        'SELECT * FROM todos WHERE id = $1 AND user_id = $2',
        [MOCK_TODO_ID, MOCK_USER_ID_1]
      );
      expect(result).toEqual(mockTodo);
    });

    it('should return null when todo does not exist', async () => {
      // AC-005: Test not found scenarios
      mockClient.query.mockResolvedValueOnce({ rows: [], rowCount: 0 });

      const result = await todoRepository.getTodoById('non-existent-id', MOCK_USER_ID_1);

      expect(result).toBeNull();
    });

    it('should return null when todo belongs to different user', async () => {
      // AC-004: Test cross-user access prevention
      mockClient.query.mockResolvedValueOnce({ rows: [], rowCount: 0 });

      const result = await todoRepository.getTodoById(MOCK_TODO_ID, MOCK_USER_ID_2);

      expect(mockClient.query).toHaveBeenCalledWith(
        'SELECT * FROM todos WHERE id = $1 AND user_id = $2',
        [MOCK_TODO_ID, MOCK_USER_ID_2]
      );
      expect(result).toBeNull();
    });
  });

  describe('updateTodo', () => {
    it('should update todo when it belongs to the user', async () => {
      // AC-003: Test todo updates
      const updateTodoDto: UpdateTodoDto = {
        title: 'Updated Title',
        status: TodoStatus.DONE
      };

      const updatedTodo = {
        id: MOCK_TODO_ID,
        title: updateTodoDto.title,
        status: updateTodoDto.status,
        user_id: MOCK_USER_ID_1,
        updated_at: new Date()
      };

      mockClient.query.mockResolvedValueOnce({ rows: [updatedTodo], rowCount: 1 });

      const result = await todoRepository.updateTodo(MOCK_TODO_ID, MOCK_USER_ID_1, updateTodoDto);

      expect(mockClient.query).toHaveBeenCalledWith(
        'UPDATE todos SET title = $1, status = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3 AND user_id = $4 RETURNING *',
        [updateTodoDto.title, updateTodoDto.status, MOCK_TODO_ID, MOCK_USER_ID_1]
      );
      expect(result).toEqual(updatedTodo);
    });

    it('should return null when updating non-existent todo', async () => {
      // AC-005: Test not found scenarios
      const updateTodoDto: UpdateTodoDto = {
        title: 'Updated Title'
      };

      mockClient.query.mockResolvedValueOnce({ rows: [], rowCount: 0 });

      const result = await todoRepository.updateTodo('non-existent-id', MOCK_USER_ID_1, updateTodoDto);

      expect(result).toBeNull();
    });

    it('should return null when updating todo of different user', async () => {
      // AC-004: Test cross-user access prevention
      const updateTodoDto: UpdateTodoDto = {
        title: 'Updated Title'
      };

      mockClient.query.mockResolvedValueOnce({ rows: [], rowCount: 0 });

      const result = await todoRepository.updateTodo(MOCK_TODO_ID, MOCK_USER_ID_2, updateTodoDto);

      expect(result).toBeNull();
    });
  });

  describe('deleteTodo', () => {
    it('should delete todo when it belongs to the user', async () => {
      // AC-003: Test todo deletes
      mockClient.query.mockResolvedValueOnce({ rows: [], rowCount: 1 });

      const result = await todoRepository.deleteTodo(MOCK_TODO_ID, MOCK_USER_ID_1);

      expect(mockClient.query).toHaveBeenCalledWith(
        'DELETE FROM todos WHERE id = $1 AND user_id = $2',
        [MOCK_TODO_ID, MOCK_USER_ID_1]
      );
      expect(result).toBe(true);
    });

    it('should return false when deleting non-existent todo', async () => {
      // AC-005: Test not found scenarios
      mockClient.query.mockResolvedValueOnce({ rows: [], rowCount: 0 });

      const result = await todoRepository.deleteTodo('non-existent-id', MOCK_USER_ID_1);

      expect(result).toBe(false);
    });

    it('should return false when deleting todo of different user', async () => {
      // AC-004: Test cross-user access prevention
      mockClient.query.mockResolvedValueOnce({ rows: [], rowCount: 0 });

      const result = await todoRepository.deleteTodo(MOCK_TODO_ID, MOCK_USER_ID_2);

      expect(result).toBe(false);
    });
  });

  describe('error handling', () => {
    it('should handle database connection errors', async () => {
      const dbError = new Error('Connection failed');
      mockPool.connect.mockRejectedValueOnce(dbError);

      await expect(todoRepository.getTodosByUserId(MOCK_USER_ID_1)).rejects.toThrow('Connection failed');
    });

    it('should release client connection on error', async () => {
      const dbError = new Error('Query failed');
      mockClient.query.mockRejectedValueOnce(dbError);

      await expect(todoRepository.getTodoById(MOCK_TODO_ID, MOCK_USER_ID_1)).rejects.toThrow('Query failed');
      expect(mockClient.release).toHaveBeenCalled();
    });
  });
});