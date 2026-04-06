import { TodoRepository } from '../TodoRepository';
import { Pool, PoolClient } from 'pg';
import { Todo, TodoStatus } from '../../types/Todo';

// Mock pg module
jest.mock('pg');

const mockPool = {
  connect: jest.fn(),
  query: jest.fn(),
  end: jest.fn()
};

const mockClient = {
  query: jest.fn(),
  release: jest.fn()
};

(Pool as jest.MockedClass<typeof Pool>).mockImplementation(() => mockPool as any);

describe('TodoRepository', () => {
  let todoRepository: TodoRepository;
  const mockUserId = 'user-123';
  const mockTodo: Todo = {
    id: 'todo-123',
    userId: mockUserId,
    title: 'Test Todo',
    description: 'Test Description',
    status: TodoStatus.PENDING,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01')
  };

  beforeEach(() => {
    jest.clearAllMocks();
    todoRepository = new TodoRepository(mockPool as any);
  });

  describe('CRUD Operations (AC-001)', () => {
    describe('create', () => {
      it('should create a new todo successfully', async () => {
        const todoData = {
          title: 'New Todo',
          description: 'New Description'
        };
        
        mockPool.query.mockResolvedValueOnce({
          rows: [mockTodo]
        });

        const result = await todoRepository.create(mockUserId, todoData);

        expect(mockPool.query).toHaveBeenCalledWith(
          expect.stringContaining('INSERT INTO todos'),
          expect.arrayContaining([mockUserId, todoData.title, todoData.description])
        );
        expect(result).toEqual(mockTodo);
      });

      it('should handle database errors during creation', async () => {
        const todoData = {
          title: 'New Todo',
          description: 'New Description'
        };
        
        const dbError = new Error('Database connection failed');
        mockPool.query.mockRejectedValueOnce(dbError);

        await expect(todoRepository.create(mockUserId, todoData))
          .rejects.toThrow('Database connection failed');
      });
    });

    describe('findById', () => {
      it('should retrieve a todo by id for the correct user', async () => {
        mockPool.query.mockResolvedValueOnce({
          rows: [mockTodo]
        });

        const result = await todoRepository.findById(mockTodo.id, mockUserId);

        expect(mockPool.query).toHaveBeenCalledWith(
          expect.stringContaining('SELECT * FROM todos WHERE id = $1 AND user_id = $2'),
          [mockTodo.id, mockUserId]
        );
        expect(result).toEqual(mockTodo);
      });

      it('should return null when todo not found', async () => {
        mockPool.query.mockResolvedValueOnce({
          rows: []
        });

        const result = await todoRepository.findById('nonexistent', mockUserId);

        expect(result).toBeNull();
      });

      it('should handle database errors during retrieval', async () => {
        const dbError = new Error('Query timeout');
        mockPool.query.mockRejectedValueOnce(dbError);

        await expect(todoRepository.findById(mockTodo.id, mockUserId))
          .rejects.toThrow('Query timeout');
      });
    });

    describe('update', () => {
      it('should update a todo successfully', async () => {
        const updateData = {
          title: 'Updated Todo',
          description: 'Updated Description',
          status: TodoStatus.COMPLETED
        };
        
        const updatedTodo = { ...mockTodo, ...updateData };
        mockPool.query.mockResolvedValueOnce({
          rows: [updatedTodo]
        });

        const result = await todoRepository.update(mockTodo.id, mockUserId, updateData);

        expect(mockPool.query).toHaveBeenCalledWith(
          expect.stringContaining('UPDATE todos SET'),
          expect.arrayContaining([updateData.title, updateData.description, updateData.status, mockTodo.id, mockUserId])
        );
        expect(result).toEqual(updatedTodo);
      });

      it('should return null when updating non-existent todo', async () => {
        const updateData = { title: 'Updated' };
        mockPool.query.mockResolvedValueOnce({
          rows: []
        });

        const result = await todoRepository.update('nonexistent', mockUserId, updateData);

        expect(result).toBeNull();
      });

      it('should handle database errors during update', async () => {
        const updateData = { title: 'Updated' };
        const dbError = new Error('Constraint violation');
        mockPool.query.mockRejectedValueOnce(dbError);

        await expect(todoRepository.update(mockTodo.id, mockUserId, updateData))
          .rejects.toThrow('Constraint violation');
      });
    });

    describe('delete', () => {
      it('should delete a todo successfully', async () => {
        mockPool.query.mockResolvedValueOnce({
          rowCount: 1
        });

        const result = await todoRepository.delete(mockTodo.id, mockUserId);

        expect(mockPool.query).toHaveBeenCalledWith(
          expect.stringContaining('DELETE FROM todos WHERE id = $1 AND user_id = $2'),
          [mockTodo.id, mockUserId]
        );
        expect(result).toBe(true);
      });

      it('should return false when deleting non-existent todo', async () => {
        mockPool.query.mockResolvedValueOnce({
          rowCount: 0
        });

        const result = await todoRepository.delete('nonexistent', mockUserId);

        expect(result).toBe(false);
      });

      it('should handle database errors during deletion', async () => {
        const dbError = new Error('Connection lost');
        mockPool.query.mockRejectedValueOnce(dbError);

        await expect(todoRepository.delete(mockTodo.id, mockUserId))
          .rejects.toThrow('Connection lost');
      });
    });
  });

  describe('User Scoping (AC-002)', () => {
    it('should prevent cross-user access in findById', async () => {
      const otherUserId = 'other-user-456';
      mockPool.query.mockResolvedValueOnce({
        rows: []
      });

      const result = await todoRepository.findById(mockTodo.id, otherUserId);

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('WHERE id = $1 AND user_id = $2'),
        [mockTodo.id, otherUserId]
      );
      expect(result).toBeNull();
    });

    it('should prevent cross-user access in update', async () => {
      const otherUserId = 'other-user-456';
      const updateData = { title: 'Hacked' };
      mockPool.query.mockResolvedValueOnce({
        rows: []
      });

      const result = await todoRepository.update(mockTodo.id, otherUserId, updateData);

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('WHERE id = $1 AND user_id = $2'),
        expect.arrayContaining([mockTodo.id, otherUserId])
      );
      expect(result).toBeNull();
    });

    it('should prevent cross-user access in delete', async () => {
      const otherUserId = 'other-user-456';
      mockPool.query.mockResolvedValueOnce({
        rowCount: 0
      });

      const result = await todoRepository.delete(mockTodo.id, otherUserId);

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('WHERE id = $1 AND user_id = $2'),
        [mockTodo.id, otherUserId]
      );
      expect(result).toBe(false);
    });

    it('should only return user-owned todos in findByUserId', async () => {
      const userTodos = [mockTodo, { ...mockTodo, id: 'todo-456' }];
      mockPool.query.mockResolvedValueOnce({
        rows: userTodos
      });

      const result = await todoRepository.findByUserId(mockUserId);

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('WHERE user_id = $1'),
        [mockUserId]
      );
      expect(result).toEqual(userTodos);
    });
  });

  describe('Status Filtering (AC-003)', () => {
    it('should filter todos by status', async () => {
      const completedTodos = [{ ...mockTodo, status: TodoStatus.COMPLETED }];
      mockPool.query.mockResolvedValueOnce({
        rows: completedTodos
      });

      const result = await todoRepository.findByUserIdAndStatus(mockUserId, TodoStatus.COMPLETED);

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('WHERE user_id = $1 AND status = $2'),
        [mockUserId, TodoStatus.COMPLETED]
      );
      expect(result).toEqual(completedTodos);
    });

    it('should filter pending todos', async () => {
      const pendingTodos = [mockTodo];
      mockPool.query.mockResolvedValueOnce({
        rows: pendingTodos
      });

      const result = await todoRepository.findByUserIdAndStatus(mockUserId, TodoStatus.PENDING);

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('WHERE user_id = $1 AND status = $2'),
        [mockUserId, TodoStatus.PENDING]
      );
      expect(result).toEqual(pendingTodos);
    });

    it('should return empty array when no todos match status filter', async () => {
      mockPool.query.mockResolvedValueOnce({
        rows: []
      });

      const result = await todoRepository.findByUserIdAndStatus(mockUserId, TodoStatus.IN_PROGRESS);

      expect(result).toEqual([]);
    });

    it('should handle database errors during status filtering', async () => {
      const dbError = new Error('Index unavailable');
      mockPool.query.mockRejectedValueOnce(dbError);

      await expect(todoRepository.findByUserIdAndStatus(mockUserId, TodoStatus.COMPLETED))
        .rejects.toThrow('Index unavailable');
    });
  });

  describe('Database Error Handling (AC-004)', () => {
    it('should handle connection pool exhaustion', async () => {
      const poolError = new Error('Pool exhausted');
      mockPool.query.mockRejectedValueOnce(poolError);

      await expect(todoRepository.findByUserId(mockUserId))
        .rejects.toThrow('Pool exhausted');
    });

    it('should handle transaction rollback scenarios', async () => {
      mockPool.connect.mockResolvedValueOnce(mockClient);
      mockClient.query
        .mockResolvedValueOnce(undefined) // BEGIN
        .mockRejectedValueOnce(new Error('Constraint violation')) // Main query
        .mockResolvedValueOnce(undefined); // ROLLBACK

      await expect(todoRepository.createWithTransaction(mockUserId, { title: 'Test', description: 'Test' }))
        .rejects.toThrow('Constraint violation');
      
      expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should handle database timeout errors', async () => {
      const timeoutError = new Error('Query timeout exceeded');
      timeoutError.name = 'TimeoutError';
      mockPool.query.mockRejectedValueOnce(timeoutError);

      await expect(todoRepository.findById(mockTodo.id, mockUserId))
        .rejects.toThrow('Query timeout exceeded');
    });

    it('should handle invalid SQL parameter errors', async () => {
      const paramError = new Error('Invalid parameter type');
      mockPool.query.mockRejectedValueOnce(paramError);

      await expect(todoRepository.update(mockTodo.id, mockUserId, { status: 'INVALID_STATUS' as any }))
        .rejects.toThrow('Invalid parameter type');
    });
  });
});
