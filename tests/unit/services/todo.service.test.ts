import { TodoService } from '../../../src/services/todo.service';
import { TodoRepository } from '../../../src/repositories/todo.repository';
import { Todo, TodoStatus, CreateTodoRequest, UpdateTodoRequest } from '../../../src/types/todo.types';
import { UnauthorizedError, ValidationError } from '../../../src/utils/errors';

// Mock the repository
jest.mock('../../../src/repositories/todo.repository');
const MockedTodoRepository = TodoRepository as jest.MockedClass<typeof TodoRepository>;

describe('TodoService', () => {
  let todoService: TodoService;
  let mockTodoRepository: jest.Mocked<TodoRepository>;

  const TEST_USER_ID = 'user-123';
  const OTHER_USER_ID = 'user-456';
  const TODO_ID = 'todo-123';

  const VALID_TODO: Todo = {
    id: TODO_ID,
    title: 'Test Todo',
    description: 'Test Description',
    status: TodoStatus.PENDING,
    userId: TEST_USER_ID,
    createdAt: new Date(),
    updatedAt: new Date()
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockTodoRepository = new MockedTodoRepository() as jest.Mocked<TodoRepository>;
    todoService = new TodoService(mockTodoRepository);
  });

  describe('createTodo', () => {
    it('should create todo with valid title and description', async () => {
      const createRequest: CreateTodoRequest = {
        title: 'Valid Title',
        description: 'Valid description'
      };
      
      mockTodoRepository.create.mockResolvedValue(VALID_TODO);

      const result = await todoService.createTodo(createRequest, TEST_USER_ID);

      expect(mockTodoRepository.create).toHaveBeenCalledWith({
        ...createRequest,
        userId: TEST_USER_ID,
        status: TodoStatus.PENDING
      });
      expect(result).toEqual(VALID_TODO);
    });

    it('should reject empty title', async () => {
      const createRequest: CreateTodoRequest = {
        title: '',
        description: 'Valid description'
      };

      await expect(
        todoService.createTodo(createRequest, TEST_USER_ID)
      ).rejects.toThrow(new ValidationError('Title is required and cannot be empty'));

      expect(mockTodoRepository.create).not.toHaveBeenCalled();
    });

    it('should reject title over 200 characters', async () => {
      const longTitle = 'a'.repeat(201);
      const createRequest: CreateTodoRequest = {
        title: longTitle,
        description: 'Valid description'
      };

      await expect(
        todoService.createTodo(createRequest, TEST_USER_ID)
      ).rejects.toThrow(new ValidationError('Title must be 200 characters or less'));
    });

    it('should reject description over 1000 characters', async () => {
      const longDescription = 'a'.repeat(1001);
      const createRequest: CreateTodoRequest = {
        title: 'Valid Title',
        description: longDescription
      };

      await expect(
        todoService.createTodo(createRequest, TEST_USER_ID)
      ).rejects.toThrow(new ValidationError('Description must be 1000 characters or less'));
    });

    it('should allow empty description', async () => {
      const createRequest: CreateTodoRequest = {
        title: 'Valid Title',
        description: ''
      };
      
      mockTodoRepository.create.mockResolvedValue(VALID_TODO);

      await todoService.createTodo(createRequest, TEST_USER_ID);

      expect(mockTodoRepository.create).toHaveBeenCalled();
    });

    it('should default status to PENDING', async () => {
      const createRequest: CreateTodoRequest = {
        title: 'Valid Title',
        description: 'Valid description'
      };
      
      mockTodoRepository.create.mockResolvedValue(VALID_TODO);

      await todoService.createTodo(createRequest, TEST_USER_ID);

      expect(mockTodoRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ status: TodoStatus.PENDING })
      );
    });
  });

  describe('updateTodo', () => {
    it('should update todo with valid partial data', async () => {
      const updateRequest: UpdateTodoRequest = {
        title: 'Updated Title'
      };
      
      const updatedTodo = { ...VALID_TODO, title: 'Updated Title' };
      mockTodoRepository.findById.mockResolvedValue(VALID_TODO);
      mockTodoRepository.update.mockResolvedValue(updatedTodo);

      const result = await todoService.updateTodo(TODO_ID, updateRequest, TEST_USER_ID);

      expect(result).toEqual(updatedTodo);
    });

    it('should validate title length on update', async () => {
      const updateRequest: UpdateTodoRequest = {
        title: 'a'.repeat(201)
      };

      await expect(
        todoService.updateTodo(TODO_ID, updateRequest, TEST_USER_ID)
      ).rejects.toThrow(new ValidationError('Title must be 200 characters or less'));
    });

    it('should validate description length on update', async () => {
      const updateRequest: UpdateTodoRequest = {
        description: 'a'.repeat(1001)
      };

      await expect(
        todoService.updateTodo(TODO_ID, updateRequest, TEST_USER_ID)
      ).rejects.toThrow(new ValidationError('Description must be 1000 characters or less'));
    });

    it('should validate status values', async () => {
      const updateRequest: UpdateTodoRequest = {
        status: 'INVALID_STATUS' as TodoStatus
      };

      await expect(
        todoService.updateTodo(TODO_ID, updateRequest, TEST_USER_ID)
      ).rejects.toThrow(new ValidationError('Status must be one of: PENDING, IN_PROGRESS, COMPLETED'));
    });

    it('should allow valid status updates', async () => {
      const updateRequest: UpdateTodoRequest = {
        status: TodoStatus.COMPLETED
      };
      
      const updatedTodo = { ...VALID_TODO, status: TodoStatus.COMPLETED };
      mockTodoRepository.findById.mockResolvedValue(VALID_TODO);
      mockTodoRepository.update.mockResolvedValue(updatedTodo);

      await todoService.updateTodo(TODO_ID, updateRequest, TEST_USER_ID);

      expect(mockTodoRepository.update).toHaveBeenCalledWith(
        TODO_ID,
        expect.objectContaining({ status: TodoStatus.COMPLETED })
      );
    });

    it('should reject unauthorized access to other users todo', async () => {
      const otherUserTodo = { ...VALID_TODO, userId: OTHER_USER_ID };
      mockTodoRepository.findById.mockResolvedValue(otherUserTodo);

      const updateRequest: UpdateTodoRequest = {
        title: 'Hacked Title'
      };

      await expect(
        todoService.updateTodo(TODO_ID, updateRequest, TEST_USER_ID)
      ).rejects.toThrow(new UnauthorizedError('Access denied: Todo does not belong to user'));

      expect(mockTodoRepository.update).not.toHaveBeenCalled();
    });
  });

  describe('getTodo', () => {
    it('should return todo for authorized user', async () => {
      mockTodoRepository.findById.mockResolvedValue(VALID_TODO);

      const result = await todoService.getTodo(TODO_ID, TEST_USER_ID);

      expect(result).toEqual(VALID_TODO);
    });

    it('should reject unauthorized access to other users todo', async () => {
      const otherUserTodo = { ...VALID_TODO, userId: OTHER_USER_ID };
      mockTodoRepository.findById.mockResolvedValue(otherUserTodo);

      await expect(
        todoService.getTodo(TODO_ID, TEST_USER_ID)
      ).rejects.toThrow(new UnauthorizedError('Access denied: Todo does not belong to user'));
    });

    it('should return null when todo not found', async () => {
      mockTodoRepository.findById.mockResolvedValue(null);

      const result = await todoService.getTodo(TODO_ID, TEST_USER_ID);

      expect(result).toBeNull();
    });
  });

  describe('getUserTodos', () => {
    it('should return todos only for requesting user', async () => {
      const userTodos = [VALID_TODO, { ...VALID_TODO, id: 'todo-456' }];
      mockTodoRepository.findByUserId.mockResolvedValue(userTodos);

      const result = await todoService.getUserTodos(TEST_USER_ID);

      expect(mockTodoRepository.findByUserId).toHaveBeenCalledWith(TEST_USER_ID);
      expect(result).toEqual(userTodos);
    });
  });

  describe('deleteTodo', () => {
    it('should delete todo for authorized user', async () => {
      mockTodoRepository.findById.mockResolvedValue(VALID_TODO);
      mockTodoRepository.delete.mockResolvedValue(true);

      const result = await todoService.deleteTodo(TODO_ID, TEST_USER_ID);

      expect(mockTodoRepository.delete).toHaveBeenCalledWith(TODO_ID);
      expect(result).toBe(true);
    });

    it('should reject unauthorized deletion of other users todo', async () => {
      const otherUserTodo = { ...VALID_TODO, userId: OTHER_USER_ID };
      mockTodoRepository.findById.mockResolvedValue(otherUserTodo);

      await expect(
        todoService.deleteTodo(TODO_ID, TEST_USER_ID)
      ).rejects.toThrow(new UnauthorizedError('Access denied: Todo does not belong to user'));

      expect(mockTodoRepository.delete).not.toHaveBeenCalled();
    });
  });
});