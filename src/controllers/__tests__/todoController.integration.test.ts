import request from 'supertest';
import jwt from 'jsonwebtoken';
import { app } from '../../app';
import { TodoService } from '../../services/TodoService';

// Mock the TodoService
jest.mock('../../services/TodoService');
const mockTodoService = TodoService as jest.MockedClass<typeof TodoService>;

const JWT_SECRET = process.env.JWT_SECRET || 'test-secret';
const VALID_USER_ID = 1;
const MOCK_TODO_ID = 123;

const MOCK_TODO = {
  id: MOCK_TODO_ID,
  title: 'Test Todo',
  description: 'Test Description',
  completed: false,
  userId: VALID_USER_ID,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString()
};

const MOCK_UPDATED_TODO = {
  ...MOCK_TODO,
  title: 'Updated Todo',
  completed: true
};

/**
 * Generates a valid JWT token for testing
 * @param userId - The user ID to encode in the token
 * @returns JWT token string
 */
function generateValidToken(userId: number): string {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: '1h' });
}

describe('Todo Controller Integration Tests', () => {
  let validToken: string;
  let mockTodoServiceInstance: jest.Mocked<TodoService>;

  beforeAll(() => {
    validToken = generateValidToken(VALID_USER_ID);
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockTodoServiceInstance = {
      getTodosByUserId: jest.fn(),
      createTodo: jest.fn(),
      updateTodo: jest.fn(),
      deleteTodo: jest.fn(),
      getTodoById: jest.fn()
    } as any;
    mockTodoService.mockImplementation(() => mockTodoServiceInstance);
  });

  describe('GET /todos', () => {
    it('should return 200 with user\'s todos when authenticated', async () => {
      const mockTodos = [MOCK_TODO, { ...MOCK_TODO, id: 124, title: 'Another Todo' }];
      mockTodoServiceInstance.getTodosByUserId.mockResolvedValue(mockTodos);

      const response = await request(app)
        .get('/todos')
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockTodos);
      expect(mockTodoServiceInstance.getTodosByUserId).toHaveBeenCalledWith(VALID_USER_ID);
    });

    it('should return 401 when JWT token is missing', async () => {
      const response = await request(app)
        .get('/todos');

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Access denied. No token provided.');
      expect(mockTodoServiceInstance.getTodosByUserId).not.toHaveBeenCalled();
    });

    it('should return 401 when JWT token is invalid', async () => {
      const response = await request(app)
        .get('/todos')
        .set('Authorization', 'Bearer invalid-token');

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Invalid token.');
      expect(mockTodoServiceInstance.getTodosByUserId).not.toHaveBeenCalled();
    });
  });

  describe('POST /todos', () => {
    const newTodoData = {
      title: 'New Todo',
      description: 'New Description'
    };

    it('should return 201 with created todo when authenticated', async () => {
      mockTodoServiceInstance.createTodo.mockResolvedValue(MOCK_TODO);

      const response = await request(app)
        .post('/todos')
        .set('Authorization', `Bearer ${validToken}`)
        .send(newTodoData);

      expect(response.status).toBe(201);
      expect(response.body).toEqual(MOCK_TODO);
      expect(mockTodoServiceInstance.createTodo).toHaveBeenCalledWith({
        ...newTodoData,
        userId: VALID_USER_ID
      });
    });

    it('should return 401 when JWT token is missing', async () => {
      const response = await request(app)
        .post('/todos')
        .send(newTodoData);

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Access denied. No token provided.');
      expect(mockTodoServiceInstance.createTodo).not.toHaveBeenCalled();
    });

    it('should return 401 when JWT token is invalid', async () => {
      const response = await request(app)
        .post('/todos')
        .set('Authorization', 'Bearer invalid-token')
        .send(newTodoData);

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Invalid token.');
      expect(mockTodoServiceInstance.createTodo).not.toHaveBeenCalled();
    });
  });

  describe('PUT /todos/:id', () => {
    const updateData = {
      title: 'Updated Todo',
      completed: true
    };

    it('should return 200 with updated todo when authenticated and todo exists', async () => {
      mockTodoServiceInstance.getTodoById.mockResolvedValue(MOCK_TODO);
      mockTodoServiceInstance.updateTodo.mockResolvedValue(MOCK_UPDATED_TODO);

      const response = await request(app)
        .put(`/todos/${MOCK_TODO_ID}`)
        .set('Authorization', `Bearer ${validToken}`)
        .send(updateData);

      expect(response.status).toBe(200);
      expect(response.body).toEqual(MOCK_UPDATED_TODO);
      expect(mockTodoServiceInstance.getTodoById).toHaveBeenCalledWith(MOCK_TODO_ID, VALID_USER_ID);
      expect(mockTodoServiceInstance.updateTodo).toHaveBeenCalledWith(MOCK_TODO_ID, updateData);
    });

    it('should return 404 when todo does not exist or belongs to another user', async () => {
      mockTodoServiceInstance.getTodoById.mockResolvedValue(null);

      const response = await request(app)
        .put(`/todos/${MOCK_TODO_ID}`)
        .set('Authorization', `Bearer ${validToken}`)
        .send(updateData);

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Todo not found');
      expect(mockTodoServiceInstance.updateTodo).not.toHaveBeenCalled();
    });

    it('should return 401 when JWT token is missing', async () => {
      const response = await request(app)
        .put(`/todos/${MOCK_TODO_ID}`)
        .send(updateData);

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Access denied. No token provided.');
      expect(mockTodoServiceInstance.updateTodo).not.toHaveBeenCalled();
    });

    it('should return 401 when JWT token is invalid', async () => {
      const response = await request(app)
        .put(`/todos/${MOCK_TODO_ID}`)
        .set('Authorization', 'Bearer invalid-token')
        .send(updateData);

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Invalid token.');
      expect(mockTodoServiceInstance.updateTodo).not.toHaveBeenCalled();
    });
  });

  describe('DELETE /todos/:id', () => {
    it('should return 204 on successful deletion when authenticated and todo exists', async () => {
      mockTodoServiceInstance.getTodoById.mockResolvedValue(MOCK_TODO);
      mockTodoServiceInstance.deleteTodo.mockResolvedValue(undefined);

      const response = await request(app)
        .delete(`/todos/${MOCK_TODO_ID}`)
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(204);
      expect(response.body).toEqual({});
      expect(mockTodoServiceInstance.getTodoById).toHaveBeenCalledWith(MOCK_TODO_ID, VALID_USER_ID);
      expect(mockTodoServiceInstance.deleteTodo).toHaveBeenCalledWith(MOCK_TODO_ID);
    });

    it('should return 404 when todo does not exist or belongs to another user', async () => {
      mockTodoServiceInstance.getTodoById.mockResolvedValue(null);

      const response = await request(app)
        .delete(`/todos/${MOCK_TODO_ID}`)
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Todo not found');
      expect(mockTodoServiceInstance.deleteTodo).not.toHaveBeenCalled();
    });

    it('should return 401 when JWT token is missing', async () => {
      const response = await request(app)
        .delete(`/todos/${MOCK_TODO_ID}`);

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Access denied. No token provided.');
      expect(mockTodoServiceInstance.deleteTodo).not.toHaveBeenCalled();
    });

    it('should return 401 when JWT token is invalid', async () => {
      const response = await request(app)
        .delete(`/todos/${MOCK_TODO_ID}`)
        .set('Authorization', 'Bearer invalid-token');

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Invalid token.');
      expect(mockTodoServiceInstance.deleteTodo).not.toHaveBeenCalled();
    });
  });
});