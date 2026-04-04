import { TodoService } from '../todo.service';
import { ITodoRepository } from '../../repositories/todo.repository.interface';
import { CreateTodoDTO, UpdateTodoDTO } from '../../dto/todo.dto';
import { AppError } from '../../errors/app.error';
import { Todo } from '../../entities/todo.entity';

// Mock repository
const mockTodoRepository: jest.Mocked<ITodoRepository> = {
  create: jest.fn(),
  findById: jest.fn(),
  findByUserId: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
};

describe('TodoService', () => {
  let todoService: TodoService;
  const VALID_USER_ID = 1;
  const OTHER_USER_ID = 2;
  const VALID_TODO_ID = 1;
  const NON_EXISTENT_TODO_ID = 999;

  beforeEach(() => {
    todoService = new TodoService(mockTodoRepository);
    jest.clearAllMocks();
  });

  describe('createTodo', () => {
    const validCreateDTO: CreateTodoDTO = {
      title: 'Test Todo',
      description: 'Test Description',
    };

    it('should create a todo with user association', async () => {
      // Arrange
      const expectedTodo: Todo = {
        id: 1,
        title: validCreateDTO.title,
        description: validCreateDTO.description,
        completed: false,
        userId: VALID_USER_ID,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockTodoRepository.create.mockResolvedValue(expectedTodo);

      // Act
      const result = await todoService.createTodo(validCreateDTO, VALID_USER_ID);

      // Assert
      expect(mockTodoRepository.create).toHaveBeenCalledWith({
        ...validCreateDTO,
        userId: VALID_USER_ID,
      });
      expect(result).toEqual(expectedTodo);
    });

    it('should handle repository errors during creation', async () => {
      // Arrange
      const dbError = new Error('Database connection failed');
      mockTodoRepository.create.mockRejectedValue(dbError);

      // Act & Assert
      await expect(todoService.createTodo(validCreateDTO, VALID_USER_ID))
        .rejects.toThrow('Database connection failed');
      
      expect(mockTodoRepository.create).toHaveBeenCalledWith({
        ...validCreateDTO,
        userId: VALID_USER_ID,
      });
    });

    describe('DTO validation boundary tests', () => {
      it('should handle extremely long titles', async () => {
        // Arrange
        const longTitle = 'a'.repeat(1000);
        const longTitleDTO: CreateTodoDTO = {
          title: longTitle,
          description: 'Test Description',
        };
        const expectedTodo: Todo = {
          id: 1,
          title: longTitle,
          description: 'Test Description',
          completed: false,
          userId: VALID_USER_ID,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        mockTodoRepository.create.mockResolvedValue(expectedTodo);

        // Act
        const result = await todoService.createTodo(longTitleDTO, VALID_USER_ID);

        // Assert
        expect(result.title).toBe(longTitle);
        expect(mockTodoRepository.create).toHaveBeenCalledWith({
          ...longTitleDTO,
          userId: VALID_USER_ID,
        });
      });

      it('should handle special characters in title and description', async () => {
        // Arrange
        const specialCharDTO: CreateTodoDTO = {
          title: 'Todo with émojis 🚀 and symbols @#$%^&*()',
          description: 'Description with quotes "double" and \'single\' and newlines\n\r',
        };
        const expectedTodo: Todo = {
          id: 1,
          title: specialCharDTO.title,
          description: specialCharDTO.description,
          completed: false,
          userId: VALID_USER_ID,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        mockTodoRepository.create.mockResolvedValue(expectedTodo);

        // Act
        const result = await todoService.createTodo(specialCharDTO, VALID_USER_ID);

        // Assert
        expect(result).toEqual(expectedTodo);
        expect(mockTodoRepository.create).toHaveBeenCalledWith({
          ...specialCharDTO,
          userId: VALID_USER_ID,
        });
      });

      it('should handle empty strings in optional description', async () => {
        // Arrange
        const emptyDescDTO: CreateTodoDTO = {
          title: 'Test Todo',
          description: '',
        };
        const expectedTodo: Todo = {
          id: 1,
          title: 'Test Todo',
          description: '',
          completed: false,
          userId: VALID_USER_ID,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        mockTodoRepository.create.mockResolvedValue(expectedTodo);

        // Act
        const result = await todoService.createTodo(emptyDescDTO, VALID_USER_ID);

        // Assert
        expect(result.description).toBe('');
        expect(mockTodoRepository.create).toHaveBeenCalledWith({
          ...emptyDescDTO,
          userId: VALID_USER_ID,
        });
      });
    });
  });

  describe('getTodosByUserId', () => {
    it('should retrieve todos for specific user', async () => {
      // Arrange
      const expectedTodos: Todo[] = [
        {
          id: 1,
          title: 'Todo 1',
          description: 'Description 1',
          completed: false,
          userId: VALID_USER_ID,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 2,
          title: 'Todo 2',
          description: 'Description 2',
          completed: true,
          userId: VALID_USER_ID,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];
      mockTodoRepository.findByUserId.mockResolvedValue(expectedTodos);

      // Act
      const result = await todoService.getTodosByUserId(VALID_USER_ID);

      // Assert
      expect(mockTodoRepository.findByUserId).toHaveBeenCalledWith(VALID_USER_ID);
      expect(result).toEqual(expectedTodos);
    });

    it('should return empty array when user has no todos', async () => {
      // Arrange
      mockTodoRepository.findByUserId.mockResolvedValue([]);

      // Act
      const result = await todoService.getTodosByUserId(VALID_USER_ID);

      // Assert
      expect(result).toEqual([]);
      expect(mockTodoRepository.findByUserId).toHaveBeenCalledWith(VALID_USER_ID);
    });
  });

  describe('updateTodo', () => {
    const validUpdateDTO: UpdateTodoDTO = {
      title: 'Updated Todo',
      description: 'Updated Description',
      completed: true,
    };

    it('should update todo with ownership checks', async () => {
      // Arrange
      const existingTodo: Todo = {
        id: VALID_TODO_ID,
        title: 'Original Todo',
        description: 'Original Description',
        completed: false,
        userId: VALID_USER_ID,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      const updatedTodo: Todo = {
        ...existingTodo,
        ...validUpdateDTO,
        updatedAt: new Date(),
      };
      mockTodoRepository.findById.mockResolvedValue(existingTodo);
      mockTodoRepository.update.mockResolvedValue(updatedTodo);

      // Act
      const result = await todoService.updateTodo(VALID_TODO_ID, validUpdateDTO, VALID_USER_ID);

      // Assert
      expect(mockTodoRepository.findById).toHaveBeenCalledWith(VALID_TODO_ID);
      expect(mockTodoRepository.update).toHaveBeenCalledWith(VALID_TODO_ID, validUpdateDTO);
      expect(result).toEqual(updatedTodo);
    });

    it('should throw AppError when todo does not exist', async () => {
      // Arrange
      mockTodoRepository.findById.mockResolvedValue(null);

      // Act & Assert
      await expect(todoService.updateTodo(NON_EXISTENT_TODO_ID, validUpdateDTO, VALID_USER_ID))
        .rejects.toThrow(AppError);
      
      const thrownError = await todoService.updateTodo(NON_EXISTENT_TODO_ID, validUpdateDTO, VALID_USER_ID)
        .catch(error => error);
      
      expect(thrownError).toBeInstanceOf(AppError);
      expect(thrownError.message).toBe('Todo not found');
      expect(thrownError.statusCode).toBe(404);
      expect(mockTodoRepository.update).not.toHaveBeenCalled();
    });

    it('should throw AppError when user does not own the todo', async () => {
      // Arrange
      const otherUserTodo: Todo = {
        id: VALID_TODO_ID,
        title: 'Other User Todo',
        description: 'Other User Description',
        completed: false,
        userId: OTHER_USER_ID,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockTodoRepository.findById.mockResolvedValue(otherUserTodo);

      // Act & Assert
      await expect(todoService.updateTodo(VALID_TODO_ID, validUpdateDTO, VALID_USER_ID))
        .rejects.toThrow(AppError);
      
      const thrownError = await todoService.updateTodo(VALID_TODO_ID, validUpdateDTO, VALID_USER_ID)
        .catch(error => error);
      
      expect(thrownError).toBeInstanceOf(AppError);
      expect(thrownError.message).toBe('Unauthorized to update this todo');
      expect(thrownError.statusCode).toBe(403);
      expect(mockTodoRepository.update).not.toHaveBeenCalled();
    });
  });

  describe('deleteTodo', () => {
    it('should delete todo with ownership checks', async () => {
      // Arrange
      const existingTodo: Todo = {
        id: VALID_TODO_ID,
        title: 'Todo to Delete',
        description: 'Description to Delete',
        completed: false,
        userId: VALID_USER_ID,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockTodoRepository.findById.mockResolvedValue(existingTodo);
      mockTodoRepository.delete.mockResolvedValue(undefined);

      // Act
      await todoService.deleteTodo(VALID_TODO_ID, VALID_USER_ID);

      // Assert
      expect(mockTodoRepository.findById).toHaveBeenCalledWith(VALID_TODO_ID);
      expect(mockTodoRepository.delete).toHaveBeenCalledWith(VALID_TODO_ID);
    });

    it('should throw AppError when todo does not exist', async () => {
      // Arrange
      mockTodoRepository.findById.mockResolvedValue(null);

      // Act & Assert
      await expect(todoService.deleteTodo(NON_EXISTENT_TODO_ID, VALID_USER_ID))
        .rejects.toThrow(AppError);
      
      const thrownError = await todoService.deleteTodo(NON_EXISTENT_TODO_ID, VALID_USER_ID)
        .catch(error => error);
      
      expect(thrownError).toBeInstanceOf(AppError);
      expect(thrownError.message).toBe('Todo not found');
      expect(thrownError.statusCode).toBe(404);
      expect(mockTodoRepository.delete).not.toHaveBeenCalled();
    });

    it('should throw AppError when user does not own the todo', async () => {
      // Arrange
      const otherUserTodo: Todo = {
        id: VALID_TODO_ID,
        title: 'Other User Todo',
        description: 'Other User Description',
        completed: false,
        userId: OTHER_USER_ID,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockTodoRepository.findById.mockResolvedValue(otherUserTodo);

      // Act & Assert
      await expect(todoService.deleteTodo(VALID_TODO_ID, VALID_USER_ID))
        .rejects.toThrow(AppError);
      
      const thrownError = await todoService.deleteTodo(VALID_TODO_ID, VALID_USER_ID)
        .catch(error => error);
      
      expect(thrownError).toBeInstanceOf(AppError);
      expect(thrownError.message).toBe('Unauthorized to delete this todo');
      expect(thrownError.statusCode).toBe(403);
      expect(mockTodoRepository.delete).not.toHaveBeenCalled();
    });
  });
});