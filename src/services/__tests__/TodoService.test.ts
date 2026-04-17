import { TodoService } from '../TodoService';
import { TodoRepository } from '../repositories/TodoRepository';
import { Todo, CreateTodoDTO, UpdateTodoDTO } from '../types/Todo';
import { AppError } from '../types/errors';

// Mock the repository
jest.mock('../repositories/TodoRepository');
const mockTodoRepository = TodoRepository as jest.MockedClass<typeof TodoRepository>;

const USER_ID_1 = 123;
const USER_ID_2 = 456;
const TODO_ID = 1;

const mockTodo: Todo = {
  id: TODO_ID,
  title: 'Test Todo',
  description: 'Test description',
  completed: false,
  userId: USER_ID_1,
  createdAt: new Date(),
  updatedAt: new Date()
};

describe('TodoService', () => {
  let todoService: TodoService;
  let mockRepository: jest.Mocked<TodoRepository>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockRepository = new mockTodoRepository() as jest.Mocked<TodoRepository>;
    todoService = new TodoService(mockRepository);
  });

  describe('createTodo', () => {
    it('should create todo with user association', async () => {
      // AC-001: Test todo creation with user association
      const createDTO: CreateTodoDTO = {
        title: 'New Todo',
        description: 'New description',
        completed: false
      };

      const expectedTodo: Todo = {
        ...mockTodo,
        ...createDTO,
        userId: USER_ID_1
      };

      mockRepository.create.mockResolvedValue(expectedTodo);

      const result = await todoService.createTodo(createDTO, USER_ID_1);

      expect(mockRepository.create).toHaveBeenCalledWith({
        ...createDTO,
        userId: USER_ID_1
      });
      expect(result).toEqual(expectedTodo);
      expect(result.userId).toBe(USER_ID_1);
    });

    it('should handle repository errors during creation', async () => {
      const createDTO: CreateTodoDTO = {
        title: 'New Todo',
        description: 'New description',
        completed: false
      };

      mockRepository.create.mockRejectedValue(new Error('Database error'));

      await expect(todoService.createTodo(createDTO, USER_ID_1))
        .rejects.toThrow('Database error');
    });
  });

  describe('getTodosForUser', () => {
    it('should retrieve todos for specific user only', async () => {
      // AC-002: Test todo retrieval for specific user
      const userTodos: Todo[] = [
        { ...mockTodo, id: 1, userId: USER_ID_1 },
        { ...mockTodo, id: 2, userId: USER_ID_1 }
      ];

      mockRepository.findByUserId.mockResolvedValue(userTodos);

      const result = await todoService.getTodosForUser(USER_ID_1);

      expect(mockRepository.findByUserId).toHaveBeenCalledWith(USER_ID_1);
      expect(result).toEqual(userTodos);
      expect(result.every(todo => todo.userId === USER_ID_1)).toBe(true);
    });

    it('should return empty array when user has no todos', async () => {
      mockRepository.findByUserId.mockResolvedValue([]);

      const result = await todoService.getTodosForUser(USER_ID_1);

      expect(result).toEqual([]);
    });
  });

  describe('updateTodo', () => {
    it('should update todo with ownership checks', async () => {
      // AC-003: Test todo update with ownership checks
      const updateDTO: UpdateTodoDTO = {
        title: 'Updated Todo',
        completed: true
      };

      const updatedTodo: Todo = {
        ...mockTodo,
        ...updateDTO,
        updatedAt: new Date()
      };

      mockRepository.findById.mockResolvedValue(mockTodo);
      mockRepository.update.mockResolvedValue(updatedTodo);

      const result = await todoService.updateTodo(TODO_ID, updateDTO, USER_ID_1);

      expect(mockRepository.findById).toHaveBeenCalledWith(TODO_ID);
      expect(mockRepository.update).toHaveBeenCalledWith(TODO_ID, updateDTO);
      expect(result).toEqual(updatedTodo);
    });

    it('should reject update when user does not own todo', async () => {
      // AC-003: Test ownership validation
      const updateDTO: UpdateTodoDTO = {
        title: 'Unauthorized Update'
      };

      mockRepository.findById.mockResolvedValue(mockTodo); // owned by USER_ID_1

      await expect(todoService.updateTodo(TODO_ID, updateDTO, USER_ID_2))
        .rejects.toThrow(AppError);
      await expect(todoService.updateTodo(TODO_ID, updateDTO, USER_ID_2))
        .rejects.toThrow('Access denied: Todo does not belong to user');

      expect(mockRepository.update).not.toHaveBeenCalled();
    });

    it('should handle non-existent todo during update', async () => {
      // AC-005: Test error handling for non-existent todos
      const updateDTO: UpdateTodoDTO = {
        title: 'Update Non-existent'
      };

      mockRepository.findById.mockResolvedValue(null);

      await expect(todoService.updateTodo(TODO_ID, updateDTO, USER_ID_1))
        .rejects.toThrow(AppError);
      await expect(todoService.updateTodo(TODO_ID, updateDTO, USER_ID_1))
        .rejects.toThrow('Todo not found');

      expect(mockRepository.update).not.toHaveBeenCalled();
    });
  });

  describe('deleteTodo', () => {
    it('should delete todo with ownership checks', async () => {
      // AC-004: Test todo deletion with ownership checks
      mockRepository.findById.mockResolvedValue(mockTodo);
      mockRepository.delete.mockResolvedValue(true);

      await todoService.deleteTodo(TODO_ID, USER_ID_1);

      expect(mockRepository.findById).toHaveBeenCalledWith(TODO_ID);
      expect(mockRepository.delete).toHaveBeenCalledWith(TODO_ID);
    });

    it('should reject deletion when user does not own todo', async () => {
      // AC-004: Test ownership validation for deletion
      mockRepository.findById.mockResolvedValue(mockTodo); // owned by USER_ID_1

      await expect(todoService.deleteTodo(TODO_ID, USER_ID_2))
        .rejects.toThrow(AppError);
      await expect(todoService.deleteTodo(TODO_ID, USER_ID_2))
        .rejects.toThrow('Access denied: Todo does not belong to user');

      expect(mockRepository.delete).not.toHaveBeenCalled();
    });

    it('should handle non-existent todo during deletion', async () => {
      // AC-005: Test error handling for non-existent todos
      mockRepository.findById.mockResolvedValue(null);

      await expect(todoService.deleteTodo(TODO_ID, USER_ID_1))
        .rejects.toThrow(AppError);
      await expect(todoService.deleteTodo(TODO_ID, USER_ID_1))
        .rejects.toThrow('Todo not found');

      expect(mockRepository.delete).not.toHaveBeenCalled();
    });
  });

  describe('getTodoById', () => {
    it('should retrieve todo by id with ownership validation', async () => {
      mockRepository.findById.mockResolvedValue(mockTodo);

      const result = await todoService.getTodoById(TODO_ID, USER_ID_1);

      expect(mockRepository.findById).toHaveBeenCalledWith(TODO_ID);
      expect(result).toEqual(mockTodo);
    });

    it('should reject access when user does not own todo', async () => {
      mockRepository.findById.mockResolvedValue(mockTodo); // owned by USER_ID_1

      await expect(todoService.getTodoById(TODO_ID, USER_ID_2))
        .rejects.toThrow(AppError);
      await expect(todoService.getTodoById(TODO_ID, USER_ID_2))
        .rejects.toThrow('Access denied: Todo does not belong to user');
    });

    it('should handle non-existent todo by id', async () => {
      // AC-005: Test error handling for non-existent todos
      mockRepository.findById.mockResolvedValue(null);

      await expect(todoService.getTodoById(TODO_ID, USER_ID_1))
        .rejects.toThrow(AppError);
      await expect(todoService.getTodoById(TODO_ID, USER_ID_1))
        .rejects.toThrow('Todo not found');
    });
  });
});