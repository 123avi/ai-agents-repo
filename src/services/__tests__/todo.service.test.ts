import { TodoService } from '../todo.service';
import { TodoRepository } from '../../repositories/todo.repository';
import { Todo } from '../../models/todo.model';
import { CreateTodoDTO, UpdateTodoDTO } from '../../dtos/todo.dto';
import { AppError } from '../../utils/app-error';

// Mock the dependencies
jest.mock('../../repositories/todo.repository');
jest.mock('../../models/todo.model');
jest.mock('../../dtos/todo.dto');
jest.mock('../../utils/app-error');

// Test data constants
const TEST_USER_ALICE = 1001;
const TEST_USER_BOB = 1002;
const TEST_TODO_ID = 2001;
const FORBIDDEN_STATUS_CODE = 403;
const NOT_FOUND_STATUS_CODE = 404;

describe('TodoService', () => {
  let todoService: TodoService;
  let mockTodoRepository: jest.Mocked<TodoRepository>;

  beforeEach(() => {
    // Verify imports exist by checking constructors
    expect(TodoRepository).toBeDefined();
    expect(Todo).toBeDefined();
    expect(AppError).toBeDefined();
    
    mockTodoRepository = new TodoRepository() as jest.Mocked<TodoRepository>;
    todoService = new TodoService(mockTodoRepository);

    // Reset all mocks
    jest.clearAllMocks();
  });

  describe('createTodo', () => {
    const validCreateDTO: CreateTodoDTO = {
      title: 'Test Todo',
      description: 'Test Description',
      completed: false
    };

    it('should create todo with user association', async () => {
      // AC-001: Test todo creation with user association
      const expectedTodo = {
        id: TEST_TODO_ID,
        userId: TEST_USER_ALICE,
        ...validCreateDTO
      };
      
      mockTodoRepository.create.mockResolvedValue(expectedTodo as Todo);

      const result = await todoService.createTodo(TEST_USER_ALICE, validCreateDTO);

      expect(mockTodoRepository.create).toHaveBeenCalledWith({
        ...validCreateDTO,
        userId: TEST_USER_ALICE
      });
      expect(result).toEqual(expectedTodo);
    });

    it('should throw error for invalid CreateTodoDTO data', async () => {
      const invalidCreateDTO = {
        title: '',
        description: null,
        completed: 'invalid'
      } as any;

      mockTodoRepository.create.mockRejectedValue(
        new AppError('Validation failed: title is required', 400)
      );

      await expect(todoService.createTodo(TEST_USER_ALICE, invalidCreateDTO))
        .rejects
        .toThrow('Validation failed: title is required');
    });
  });

  describe('getTodosByUser', () => {
    it('should retrieve todos for specific user', async () => {
      // AC-002: Test todo retrieval for specific user
      const userTodos = [
        { id: TEST_TODO_ID, userId: TEST_USER_ALICE, title: 'User 1 Todo', completed: false },
        { id: TEST_TODO_ID + 1, userId: TEST_USER_ALICE, title: 'User 1 Todo 2', completed: true }
      ];
      
      mockTodoRepository.findByUserId.mockResolvedValue(userTodos as Todo[]);

      const result = await todoService.getTodosByUser(TEST_USER_ALICE);

      expect(mockTodoRepository.findByUserId).toHaveBeenCalledWith(TEST_USER_ALICE);
      expect(result).toEqual(userTodos);
      expect(result).toHaveLength(2);
    });

    it('should return empty array for user with no todos', async () => {
      mockTodoRepository.findByUserId.mockResolvedValue([]);

      const result = await todoService.getTodosByUser(TEST_USER_BOB);

      expect(result).toEqual([]);
    });
  });

  describe('updateTodo', () => {
    const updateDTO: UpdateTodoDTO = {
      title: 'Updated Todo',
      completed: true
    };

    it('should update todo with ownership validation', async () => {
      // AC-003: Test todo update with ownership checks
      const existingTodo = {
        id: TEST_TODO_ID,
        userId: TEST_USER_ALICE,
        title: 'Original Todo',
        completed: false
      };
      
      const updatedTodo = {
        ...existingTodo,
        ...updateDTO
      };

      mockTodoRepository.findById.mockResolvedValue(existingTodo as Todo);
      mockTodoRepository.update.mockResolvedValue(updatedTodo as Todo);

      const result = await todoService.updateTodo(TEST_TODO_ID, TEST_USER_ALICE, updateDTO);

      expect(mockTodoRepository.findById).toHaveBeenCalledWith(TEST_TODO_ID);
      expect(mockTodoRepository.update).toHaveBeenCalledWith(TEST_TODO_ID, updateDTO);
      expect(result).toEqual(updatedTodo);
    });

    it('should throw error when user tries to update another users todo', async () => {
      const todoOwnedByAlice = {
        id: TEST_TODO_ID,
        userId: TEST_USER_ALICE,
        title: 'Alice Todo',
        completed: false
      };

      mockTodoRepository.findById.mockResolvedValue(todoOwnedByAlice as Todo);

      await expect(todoService.updateTodo(TEST_TODO_ID, TEST_USER_BOB, updateDTO))
        .rejects
        .toThrow(expect.objectContaining({
          message: 'Access denied',
          statusCode: FORBIDDEN_STATUS_CODE
        }));

      expect(mockTodoRepository.update).not.toHaveBeenCalled();
    });
  });

  describe('deleteTodo', () => {
    it('should delete todo with ownership validation', async () => {
      // AC-004: Test todo deletion with ownership checks
      const todoToDelete = {
        id: TEST_TODO_ID,
        userId: TEST_USER_ALICE,
        title: 'Todo to delete',
        completed: false
      };

      mockTodoRepository.findById.mockResolvedValue(todoToDelete as Todo);
      mockTodoRepository.delete.mockResolvedValue(undefined);

      await todoService.deleteTodo(TEST_TODO_ID, TEST_USER_ALICE);

      expect(mockTodoRepository.findById).toHaveBeenCalledWith(TEST_TODO_ID);
      expect(mockTodoRepository.delete).toHaveBeenCalledWith(TEST_TODO_ID);
    });

    it('should throw error when user tries to delete another users todo', async () => {
      const todoOwnedByAlice = {
        id: TEST_TODO_ID,
        userId: TEST_USER_ALICE,
        title: 'Alice Todo',
        completed: false
      };

      mockTodoRepository.findById.mockResolvedValue(todoOwnedByAlice as Todo);

      await expect(todoService.deleteTodo(TEST_TODO_ID, TEST_USER_BOB))
        .rejects
        .toThrow(expect.objectContaining({
          message: 'Access denied',
          statusCode: FORBIDDEN_STATUS_CODE
        }));

      expect(mockTodoRepository.delete).not.toHaveBeenCalled();
    });
  });

  describe('error handling for non-existent todos', () => {
    it('should throw error when trying to update non-existent todo', async () => {
      // AC-005: Test error handling for non-existent todos
      mockTodoRepository.findById.mockResolvedValue(null);

      await expect(todoService.updateTodo(TEST_TODO_ID, TEST_USER_ALICE, { title: 'Updated' }))
        .rejects
        .toThrow(expect.objectContaining({
          message: 'Todo not found',
          statusCode: NOT_FOUND_STATUS_CODE
        }));
    });

    it('should throw error when trying to delete non-existent todo', async () => {
      mockTodoRepository.findById.mockResolvedValue(null);

      await expect(todoService.deleteTodo(TEST_TODO_ID, TEST_USER_ALICE))
        .rejects
        .toThrow(expect.objectContaining({
          message: 'Todo not found',
          statusCode: NOT_FOUND_STATUS_CODE
        }));
    });
  });
});