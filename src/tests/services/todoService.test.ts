import { TodoService } from '../../services/todoService';
import { TodoRepository } from '../../repositories/todoRepository';
import { Todo, CreateTodoRequest, UpdateTodoRequest } from '../../types/todo';
import { UnauthorizedError, ValidationError, NotFoundError } from '../../errors';

// Mock the repository
jest.mock('../../repositories/todoRepository');
const MockedTodoRepository = TodoRepository as jest.MockedClass<typeof TodoRepository>;

describe('TodoService', () => {
  let todoService: TodoService;
  let mockTodoRepository: jest.Mocked<TodoRepository>;

  const MOCK_USER_ID = 'user-123';
  const MOCK_TODO_ID = 'todo-456';
  const MOCK_OTHER_USER_ID = 'user-789';

  const MOCK_TODO: Todo = {
    id: MOCK_TODO_ID,
    title: 'Test Todo',
    description: 'Test Description',
    status: 'open',
    userId: MOCK_USER_ID,
    createdAt: new Date(),
    updatedAt: new Date()
  };

  beforeEach(() => {
    mockTodoRepository = new MockedTodoRepository() as jest.Mocked<TodoRepository>;
    todoService = new TodoService(mockTodoRepository);
    jest.clearAllMocks();
  });

  describe('createTodo', () => {
    const createRequest: CreateTodoRequest = {
      title: 'New Todo',
      description: 'New Description'
    };

    it('should create todo with default open status', async () => {
      // AC-001: Test default status assignment
      const expectedTodo = {
        ...createRequest,
        status: 'open',
        userId: MOCK_USER_ID
      };
      
      mockTodoRepository.create.mockResolvedValue(MOCK_TODO);

      const result = await todoService.createTodo(createRequest, MOCK_USER_ID);

      expect(mockTodoRepository.create).toHaveBeenCalledWith(expectedTodo);
      expect(result).toEqual(MOCK_TODO);
    });

    it('should validate required title field', async () => {
      // AC-002: Test status field validation
      const invalidRequest = { ...createRequest, title: '' };

      await expect(
        todoService.createTodo(invalidRequest, MOCK_USER_ID)
      ).rejects.toThrow(ValidationError);

      expect(mockTodoRepository.create).not.toHaveBeenCalled();
    });

    it('should validate title length', async () => {
      // AC-002: Test status field validation
      const longTitle = 'a'.repeat(256);
      const invalidRequest = { ...createRequest, title: longTitle };

      await expect(
        todoService.createTodo(invalidRequest, MOCK_USER_ID)
      ).rejects.toThrow(ValidationError);
    });
  });

  describe('getTodosByUserId', () => {
    it('should return todos for authorized user', async () => {
      // AC-004: Test CRUD operations success paths
      const mockTodos = [MOCK_TODO];
      mockTodoRepository.findByUserId.mockResolvedValue(mockTodos);

      const result = await todoService.getTodosByUserId(MOCK_USER_ID);

      expect(mockTodoRepository.findByUserId).toHaveBeenCalledWith(MOCK_USER_ID);
      expect(result).toEqual(mockTodos);
    });

    it('should return empty array when no todos found', async () => {
      // AC-005: Test error scenarios and edge cases
      mockTodoRepository.findByUserId.mockResolvedValue([]);

      const result = await todoService.getTodosByUserId(MOCK_USER_ID);

      expect(result).toEqual([]);
    });
  });

  describe('getTodoById', () => {
    it('should return todo for owner', async () => {
      // AC-004: Test CRUD operations success paths
      mockTodoRepository.findById.mockResolvedValue(MOCK_TODO);

      const result = await todoService.getTodoById(MOCK_TODO_ID, MOCK_USER_ID);

      expect(result).toEqual(MOCK_TODO);
    });

    it('should throw UnauthorizedError for non-owner', async () => {
      // AC-003: Test user ownership enforcement
      mockTodoRepository.findById.mockResolvedValue(MOCK_TODO);

      await expect(
        todoService.getTodoById(MOCK_TODO_ID, MOCK_OTHER_USER_ID)
      ).rejects.toThrow(UnauthorizedError);
    });

    it('should throw NotFoundError when todo does not exist', async () => {
      // AC-005: Test error scenarios and edge cases
      mockTodoRepository.findById.mockResolvedValue(null);

      await expect(
        todoService.getTodoById(MOCK_TODO_ID, MOCK_USER_ID)
      ).rejects.toThrow(NotFoundError);
    });
  });

  describe('updateTodo', () => {
    const updateRequest: UpdateTodoRequest = {
      title: 'Updated Todo',
      status: 'done'
    };

    it('should update todo for owner', async () => {
      // AC-004: Test CRUD operations success paths
      const updatedTodo = { ...MOCK_TODO, ...updateRequest };
      mockTodoRepository.findById.mockResolvedValue(MOCK_TODO);
      mockTodoRepository.update.mockResolvedValue(updatedTodo);

      const result = await todoService.updateTodo(
        MOCK_TODO_ID,
        updateRequest,
        MOCK_USER_ID
      );

      expect(mockTodoRepository.update).toHaveBeenCalledWith(
        MOCK_TODO_ID,
        updateRequest
      );
      expect(result).toEqual(updatedTodo);
    });

    it('should validate status field values', async () => {
      // AC-002: Test status field validation
      const invalidRequest = { ...updateRequest, status: 'invalid' as any };
      mockTodoRepository.findById.mockResolvedValue(MOCK_TODO);

      await expect(
        todoService.updateTodo(MOCK_TODO_ID, invalidRequest, MOCK_USER_ID)
      ).rejects.toThrow(ValidationError);
    });

    it('should enforce user ownership', async () => {
      // AC-003: Test user ownership enforcement
      mockTodoRepository.findById.mockResolvedValue(MOCK_TODO);

      await expect(
        todoService.updateTodo(MOCK_TODO_ID, updateRequest, MOCK_OTHER_USER_ID)
      ).rejects.toThrow(UnauthorizedError);
    });

    it('should handle non-existent todo', async () => {
      // AC-005: Test error scenarios and edge cases
      mockTodoRepository.findById.mockResolvedValue(null);

      await expect(
        todoService.updateTodo(MOCK_TODO_ID, updateRequest, MOCK_USER_ID)
      ).rejects.toThrow(NotFoundError);
    });
  });

  describe('deleteTodo', () => {
    it('should delete todo for owner', async () => {
      // AC-004: Test CRUD operations success paths
      mockTodoRepository.findById.mockResolvedValue(MOCK_TODO);
      mockTodoRepository.delete.mockResolvedValue(true);

      await todoService.deleteTodo(MOCK_TODO_ID, MOCK_USER_ID);

      expect(mockTodoRepository.delete).toHaveBeenCalledWith(MOCK_TODO_ID);
    });

    it('should enforce user ownership', async () => {
      // AC-003: Test user ownership enforcement
      mockTodoRepository.findById.mockResolvedValue(MOCK_TODO);

      await expect(
        todoService.deleteTodo(MOCK_TODO_ID, MOCK_OTHER_USER_ID)
      ).rejects.toThrow(UnauthorizedError);
    });

    it('should handle non-existent todo', async () => {
      // AC-005: Test error scenarios and edge cases
      mockTodoRepository.findById.mockResolvedValue(null);

      await expect(
        todoService.deleteTodo(MOCK_TODO_ID, MOCK_USER_ID)
      ).rejects.toThrow(NotFoundError);
    });

    it('should handle repository delete failure', async () => {
      // AC-005: Test error scenarios and edge cases
      mockTodoRepository.findById.mockResolvedValue(MOCK_TODO);
      mockTodoRepository.delete.mockResolvedValue(false);

      await expect(
        todoService.deleteTodo(MOCK_TODO_ID, MOCK_USER_ID)
      ).rejects.toThrow(Error);
    });
  });

  describe('validateTodoData', () => {
    it('should validate empty title', () => {
      // AC-002: Test status field validation
      expect(() => {
        (todoService as any).validateTodoData({ title: '', description: 'test' });
      }).toThrow(ValidationError);
    });

    it('should validate title length', () => {
      // AC-002: Test status field validation
      const longTitle = 'a'.repeat(256);
      expect(() => {
        (todoService as any).validateTodoData({ title: longTitle });
      }).toThrow(ValidationError);
    });

    it('should validate description length', () => {
      // AC-002: Test status field validation
      const longDescription = 'a'.repeat(1001);
      expect(() => {
        (todoService as any).validateTodoData({ 
          title: 'test', 
          description: longDescription 
        });
      }).toThrow(ValidationError);
    });

    it('should validate valid status values', () => {
      // AC-002: Test status field validation
      expect(() => {
        (todoService as any).validateTodoData({ 
          title: 'test', 
          status: 'invalid' 
        });
      }).toThrow(ValidationError);
    });

    it('should accept valid todo data', () => {
      // AC-002: Test status field validation
      expect(() => {
        (todoService as any).validateTodoData({
          title: 'Valid Title',
          description: 'Valid description',
          status: 'open'
        });
      }).not.toThrow();
    });
  });
});