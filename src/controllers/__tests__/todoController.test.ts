import { Request, Response, NextFunction } from 'express';
import { TodoController } from '../todoController';
import { TodoService } from '../../services/todoService';
import { AuthenticatedRequest } from '../../types/auth';
import { Todo } from '../../types/todo';

// Mock TodoService
const mockTodoService = {
  getTodosByUserId: jest.fn(),
  createTodo: jest.fn(),
  updateTodo: jest.fn(),
  deleteTodo: jest.fn(),
} as jest.Mocked<TodoService>;

describe('TodoController', () => {
  let controller: TodoController;
  let mockRequest: Partial<AuthenticatedRequest>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    controller = new TodoController(mockTodoService);
    mockRequest = {
      user: { id: 1, email: 'test@example.com' },
      body: {},
      params: {}
    };
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      send: jest.fn().mockReturnThis()
    };
    mockNext = jest.fn();
    jest.clearAllMocks();
  });

  describe('getTodos', () => {
    it('should return todos for authenticated user', async () => {
      const mockTodos: Todo[] = [
        { id: 1, title: 'Test Todo', completed: false, userId: 1, createdAt: new Date(), updatedAt: new Date() }
      ];
      mockTodoService.getTodosByUserId.mockResolvedValue(mockTodos);

      await controller.getTodos(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext);

      expect(mockTodoService.getTodosByUserId).toHaveBeenCalledWith(1);
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith(mockTodos);
    });

    it('should call next with error on service failure', async () => {
      const error = new Error('Database error');
      mockTodoService.getTodosByUserId.mockRejectedValue(error);

      await controller.getTodos(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });

  describe('createTodo', () => {
    it('should create todo and return 201 status', async () => {
      const mockTodo: Todo = {
        id: 1,
        title: 'New Todo',
        completed: false,
        userId: 1,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      mockRequest.body = { title: 'New Todo' };
      mockTodoService.createTodo.mockResolvedValue(mockTodo);

      await controller.createTodo(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext);

      expect(mockTodoService.createTodo).toHaveBeenCalledWith(1, { title: 'New Todo' });
      expect(mockResponse.status).toHaveBeenCalledWith(201);
      expect(mockResponse.json).toHaveBeenCalledWith(mockTodo);
    });
  });

  describe('updateTodo', () => {
    it('should update todo and return 200 status', async () => {
      const mockTodo: Todo = {
        id: 1,
        title: 'Updated Todo',
        completed: true,
        userId: 1,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      mockRequest.params = { id: '1' };
      mockRequest.body = { title: 'Updated Todo', completed: true };
      mockTodoService.updateTodo.mockResolvedValue(mockTodo);

      await controller.updateTodo(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext);

      expect(mockTodoService.updateTodo).toHaveBeenCalledWith(1, 1, { title: 'Updated Todo', completed: true });
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith(mockTodo);
    });

    it('should return 404 when todo not found', async () => {
      mockRequest.params = { id: '999' };
      mockTodoService.updateTodo.mockResolvedValue(null);

      await controller.updateTodo(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(404);
      expect(mockResponse.json).toHaveBeenCalledWith({ error: 'Todo not found' });
    });

    it('should return 400 for invalid todo ID', async () => {
      mockRequest.params = { id: 'invalid' };

      await controller.updateTodo(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({ error: 'Invalid todo ID' });
    });
  });

  describe('deleteTodo', () => {
    it('should delete todo and return 204 status', async () => {
      mockRequest.params = { id: '1' };
      mockTodoService.deleteTodo.mockResolvedValue(true);

      await controller.deleteTodo(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext);

      expect(mockTodoService.deleteTodo).toHaveBeenCalledWith(1, 1);
      expect(mockResponse.status).toHaveBeenCalledWith(204);
      expect(mockResponse.send).toHaveBeenCalled();
    });

    it('should return 404 when todo not found', async () => {
      mockRequest.params = { id: '999' };
      mockTodoService.deleteTodo.mockResolvedValue(false);

      await controller.deleteTodo(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(404);
      expect(mockResponse.json).toHaveBeenCalledWith({ error: 'Todo not found' });
    });
  });
});