import { TodoService } from '../TodoService.js';
import { TodoRepository } from '../../repositories/TodoRepository.js';
import { NotFoundError, ForbiddenError, ValidationError } from '../../errors/CustomErrors.js';
import { Todo, CreateTodoRequest, UpdateTodoRequest } from '../../types/todo.js';

// Mock the logger to avoid console output during tests
jest.mock('../../utils/logger.js', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn()
  }
}));

describe('TodoService', () => {
  let todoService: TodoService;
  let mockTodoRepository: jest.Mocked<TodoRepository>;

  const mockTodo: Todo = {
    id: 1,
    title: 'Test Todo',
    description: 'Test Description',
    status: 'open',
    user_id: 1,
    created_at: new Date(),
    updated_at: new Date()
  };

  beforeEach(() => {
    mockTodoRepository = {
      create: jest.fn(),
      findById: jest.fn(),
      findByUserId: jest.fn(),
      update: jest.fn(),
      delete: jest.fn()
    } as jest.Mocked<TodoRepository>;

    todoService = new TodoService(mockTodoRepository);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createTodo', () => {
    it('should create todo with default status open', async () => {
      const createRequest: CreateTodoRequest = {
        title: 'New Todo',
        description: 'New Description'
      };

      mockTodoRepository.create.mockResolvedValue(mockTodo);

      const result = await todoService.createTodo(1, createRequest);

      expect(mockTodoRepository.create).toHaveBeenCalledWith({
        title: 'New Todo',
        description: 'New Description',
        user_id: 1,
        status: 'open'
      });
      expect(result).toEqual(mockTodo);
    });

    it('should create todo with provided status', async () => {
      const createRequest: CreateTodoRequest = {
        title: 'New Todo',
        status: 'completed'
      };

      mockTodoRepository.create.mockResolvedValue({ ...mockTodo, status: 'completed' });

      await todoService.createTodo(1, createRequest);

      expect(mockTodoRepository.create).toHaveBeenCalledWith({
        title: 'New Todo',
        user_id: 1,
        status: 'completed'
      });
    });

    it('should throw ValidationError for empty title', async () => {
      const createRequest: CreateTodoRequest = {
        title: ''
      };

      await expect(todoService.createTodo(1, createRequest))
        .rejects
        .toThrow(ValidationError);
    });

    it('should throw ValidationError for title exceeding 255 characters', async () => {
      const createRequest: CreateTodoRequest = {
        title: 'a'.repeat(256)
      };

      await expect(todoService.createTodo(1, createRequest))
        .rejects
        .toThrow(ValidationError);
    });

    it('should throw ValidationError for invalid status', async () => {
      const createRequest: CreateTodoRequest = {
        title: 'Valid Title',
        status: 'invalid' as any
      };

      await expect(todoService.createTodo(1, createRequest))
        .rejects
        .toThrow(ValidationError);
    });

    it('should throw ValidationError for description exceeding 1000 characters', async () => {
      const createRequest: CreateTodoRequest = {
        title: 'Valid Title',
        description: 'a'.repeat(1001)
      };

      await expect(todoService.createTodo(1, createRequest))
        .rejects
        .toThrow(ValidationError);
    });
  });

  describe('getUserTodos', () => {
    it('should return todos for specified user', async () => {
      const todos = [mockTodo, { ...mockTodo, id: 2 }];
      mockTodoRepository.findByUserId.mockResolvedValue(todos);

      const result = await todoService.getUserTodos(1);

      expect(mockTodoRepository.findByUserId).toHaveBeenCalledWith(1);
      expect(result).toEqual(todos);
    });

    it('should return empty array if user has no todos', async () => {
      mockTodoRepository.findByUserId.mockResolvedValue([]);

      const result = await todoService.getUserTodos(1);

      expect(result).toEqual([]);
    });
  });

  describe('updateTodo', () => {
    it('should update todo when user owns it', async () => {
      const updateRequest: UpdateTodoRequest = {
        title: 'Updated Title'
      };
      const updatedTodo = { ...mockTodo, title: 'Updated Title' };

      mockTodoRepository.findById.mockResolvedValue(mockTodo);
      mockTodoRepository.update.mockResolvedValue(updatedTodo);

      const result = await todoService.updateTodo(1, 1, updateRequest);

      expect(mockTodoRepository.findById).toHaveBeenCalledWith(1);
      expect(mockTodoRepository.update).toHaveBeenCalledWith(1, updateRequest);
      expect(result).toEqual(updatedTodo);
    });

    it('should throw NotFoundError when todo does not exist', async () => {
      mockTodoRepository.findById.mockResolvedValue(null);

      await expect(todoService.updateTodo(999, 1, { title: 'Updated' }))
        .rejects
        .toThrow(NotFoundError);
    });

    it('should throw ForbiddenError when user does not own todo', async () => {
      const otherUserTodo = { ...mockTodo, user_id: 2 };
      mockTodoRepository.findById.mockResolvedValue(otherUserTodo);

      await expect(todoService.updateTodo(1, 1, { title: 'Updated' }))
        .rejects
        .toThrow(ForbiddenError);
    });

    it('should throw ValidationError for empty title update', async () => {
      mockTodoRepository.findById.mockResolvedValue(mockTodo);

      await expect(todoService.updateTodo(1, 1, { title: '' }))
        .rejects
        .toThrow(ValidationError);
    });
  });

  describe('deleteTodo', () => {
    it('should delete todo when user owns it', async () => {
      mockTodoRepository.findById.mockResolvedValue(mockTodo);
      mockTodoRepository.delete.mockResolvedValue(undefined);

      await todoService.deleteTodo(1, 1);

      expect(mockTodoRepository.findById).toHaveBeenCalledWith(1);
      expect(mockTodoRepository.delete).toHaveBeenCalledWith(1);
    });

    it('should throw NotFoundError when todo does not exist', async () => {
      mockTodoRepository.findById.mockResolvedValue(null);

      await expect(todoService.deleteTodo(999, 1))
        .rejects
        .toThrow(NotFoundError);
    });

    it('should throw ForbiddenError when user does not own todo', async () => {
      const otherUserTodo = { ...mockTodo, user_id: 2 };
      mockTodoRepository.findById.mockResolvedValue(otherUserTodo);

      await expect(todoService.deleteTodo(1, 1))
        .rejects
        .toThrow(ForbiddenError);
    });
  });

  describe('validation', () => {
    it('should accept valid todo data', async () => {
      const validRequest: CreateTodoRequest = {
        title: 'Valid Title',
        description: 'Valid description',
        status: 'open'
      };

      mockTodoRepository.create.mockResolvedValue(mockTodo);

      await expect(todoService.createTodo(1, validRequest))
        .resolves
        .toBeDefined();
    });

    it('should accept todo without description', async () => {
      const validRequest: CreateTodoRequest = {
        title: 'Valid Title'
      };

      mockTodoRepository.create.mockResolvedValue(mockTodo);

      await expect(todoService.createTodo(1, validRequest))
        .resolves
        .toBeDefined();
    });
  });
});