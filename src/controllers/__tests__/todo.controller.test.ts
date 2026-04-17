import request from 'supertest';
import express from 'express';
import jwt from 'jsonwebtoken';
import { todoController } from '../todo.controller';
import { todoService } from '../../services/todo.service';
import { authMiddleware } from '../../middleware/auth.middleware';

// Mock dependencies
jest.mock('../../services/todo.service');
jest.mock('jsonwebtoken');

const mockTodoService = todoService as jest.Mocked<typeof todoService>;
const mockJwt = jwt as jest.Mocked<typeof jwt>;

// Test constants
const VALID_JWT_SECRET = 'test-jwt-secret';
const MOCK_USER_ID = 1;
const VALID_TOKEN = 'valid.jwt.token';
const INVALID_TOKEN = 'invalid.token';
const MALFORMED_JSON = '{ "title": invalid json }';
const MAX_TITLE_LENGTH = 1000;
const LARGE_TITLE = 'a'.repeat(MAX_TITLE_LENGTH + 1);

// Sample todo data
const mockTodo = {
  id: 1,
  title: 'Test Todo',
  completed: false,
  userId: MOCK_USER_ID,
  createdAt: new Date(),
  updatedAt: new Date()
};

const mockTodos = [mockTodo];

describe('Todo Controller Integration Tests', () => {
  let app: express.Application;

  beforeEach(() => {
    // Setup express app with middleware
    app = express();
    app.use(express.json({ limit: '1mb' }));
    
    // Mock JWT verification
    mockJwt.verify.mockImplementation((token: string, secret: string) => {
      if (token === VALID_TOKEN && secret === VALID_JWT_SECRET) {
        return { userId: MOCK_USER_ID };
      }
      throw new Error('Invalid token');
    });

    // Setup routes with auth middleware
    app.get('/todos', authMiddleware, todoController.getTodos);
    app.post('/todos', authMiddleware, todoController.createTodo);
    app.put('/todos/:id', authMiddleware, todoController.updateTodo);
    app.delete('/todos/:id', authMiddleware, todoController.deleteTodo);

    // Reset all mocks
    jest.clearAllMocks();
  });

  describe('GET /todos', () => {
    it('should return 200 with user todos when authenticated', async () => {
      mockTodoService.getTodosByUserId.mockResolvedValue(mockTodos);

      const response = await request(app)
        .get('/todos')
        .set('Authorization', `Bearer ${VALID_TOKEN}`);

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockTodos);
      expect(mockTodoService.getTodosByUserId).toHaveBeenCalledWith(MOCK_USER_ID);
    });

    it('should return 401 when JWT token is missing', async () => {
      const response = await request(app)
        .get('/todos');

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error');
      expect(mockTodoService.getTodosByUserId).not.toHaveBeenCalled();
    });

    it('should return 401 when JWT token is invalid', async () => {
      const response = await request(app)
        .get('/todos')
        .set('Authorization', `Bearer ${INVALID_TOKEN}`);

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error');
      expect(mockTodoService.getTodosByUserId).not.toHaveBeenCalled();
    });

    it('should return 500 when service layer fails', async () => {
      mockTodoService.getTodosByUserId.mockRejectedValue(new Error('Database connection failed'));

      const response = await request(app)
        .get('/todos')
        .set('Authorization', `Bearer ${VALID_TOKEN}`);

      expect(response.status).toBe(500);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('POST /todos', () => {
    const validTodoData = { title: 'New Todo', completed: false };

    it('should return 201 with created todo when valid data provided', async () => {
      mockTodoService.createTodo.mockResolvedValue(mockTodo);

      const response = await request(app)
        .post('/todos')
        .set('Authorization', `Bearer ${VALID_TOKEN}`)
        .send(validTodoData);

      expect(response.status).toBe(201);
      expect(response.body).toEqual(mockTodo);
      expect(mockTodoService.createTodo).toHaveBeenCalledWith({
        ...validTodoData,
        userId: MOCK_USER_ID
      });
    });

    it('should return 400 when title is missing', async () => {
      const response = await request(app)
        .post('/todos')
        .set('Authorization', `Bearer ${VALID_TOKEN}`)
        .send({ completed: false });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
      expect(mockTodoService.createTodo).not.toHaveBeenCalled();
    });

    it('should return 400 when title is empty string', async () => {
      const response = await request(app)
        .post('/todos')
        .set('Authorization', `Bearer ${VALID_TOKEN}`)
        .send({ title: '', completed: false });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
      expect(mockTodoService.createTodo).not.toHaveBeenCalled();
    });

    it('should return 400 when title is not a string', async () => {
      const response = await request(app)
        .post('/todos')
        .set('Authorization', `Bearer ${VALID_TOKEN}`)
        .send({ title: 123, completed: false });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
      expect(mockTodoService.createTodo).not.toHaveBeenCalled();
    });

    it('should return 400 when completed is not a boolean', async () => {
      const response = await request(app)
        .post('/todos')
        .set('Authorization', `Bearer ${VALID_TOKEN}`)
        .send({ title: 'Test Todo', completed: 'true' });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
      expect(mockTodoService.createTodo).not.toHaveBeenCalled();
    });

    it('should return 400 when title exceeds maximum length', async () => {
      const response = await request(app)
        .post('/todos')
        .set('Authorization', `Bearer ${VALID_TOKEN}`)
        .send({ title: LARGE_TITLE, completed: false });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
      expect(mockTodoService.createTodo).not.toHaveBeenCalled();
    });

    it('should return 400 for malformed JSON payload', async () => {
      const response = await request(app)
        .post('/todos')
        .set('Authorization', `Bearer ${VALID_TOKEN}`)
        .set('Content-Type', 'application/json')
        .send(MALFORMED_JSON);

      expect(response.status).toBe(400);
      expect(mockTodoService.createTodo).not.toHaveBeenCalled();
    });

    it('should return 401 when JWT token is missing', async () => {
      const response = await request(app)
        .post('/todos')
        .send(validTodoData);

      expect(response.status).toBe(401);
      expect(mockTodoService.createTodo).not.toHaveBeenCalled();
    });

    it('should return 500 when service layer fails', async () => {
      mockTodoService.createTodo.mockRejectedValue(new Error('Database insert failed'));

      const response = await request(app)
        .post('/todos')
        .set('Authorization', `Bearer ${VALID_TOKEN}`)
        .send(validTodoData);

      expect(response.status).toBe(500);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('PUT /todos/:id', () => {
    const todoId = '1';
    const updatedTodo = { ...mockTodo, title: 'Updated Todo', completed: true };

    it('should return 200 with updated todo when valid full update', async () => {
      mockTodoService.updateTodo.mockResolvedValue(updatedTodo);

      const response = await request(app)
        .put(`/todos/${todoId}`)
        .set('Authorization', `Bearer ${VALID_TOKEN}`)
        .send({ title: 'Updated Todo', completed: true });

      expect(response.status).toBe(200);
      expect(response.body).toEqual(updatedTodo);
      expect(mockTodoService.updateTodo).toHaveBeenCalledWith(
        parseInt(todoId),
        MOCK_USER_ID,
        { title: 'Updated Todo', completed: true }
      );
    });

    it('should return 200 with partial update (title only)', async () => {
      const partialUpdate = { ...mockTodo, title: 'Partially Updated' };
      mockTodoService.updateTodo.mockResolvedValue(partialUpdate);

      const response = await request(app)
        .put(`/todos/${todoId}`)
        .set('Authorization', `Bearer ${VALID_TOKEN}`)
        .send({ title: 'Partially Updated' });

      expect(response.status).toBe(200);
      expect(response.body).toEqual(partialUpdate);
      expect(mockTodoService.updateTodo).toHaveBeenCalledWith(
        parseInt(todoId),
        MOCK_USER_ID,
        { title: 'Partially Updated' }
      );
    });

    it('should return 200 with partial update (completed only)', async () => {
      const partialUpdate = { ...mockTodo, completed: true };
      mockTodoService.updateTodo.mockResolvedValue(partialUpdate);

      const response = await request(app)
        .put(`/todos/${todoId}`)
        .set('Authorization', `Bearer ${VALID_TOKEN}`)
        .send({ completed: true });

      expect(response.status).toBe(200);
      expect(response.body).toEqual(partialUpdate);
      expect(mockTodoService.updateTodo).toHaveBeenCalledWith(
        parseInt(todoId),
        MOCK_USER_ID,
        { completed: true }
      );
    });

    it('should return 400 when title is empty string', async () => {
      const response = await request(app)
        .put(`/todos/${todoId}`)
        .set('Authorization', `Bearer ${VALID_TOKEN}`)
        .send({ title: '' });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
      expect(mockTodoService.updateTodo).not.toHaveBeenCalled();
    });

    it('should return 400 when title is not a string', async () => {
      const response = await request(app)
        .put(`/todos/${todoId}`)
        .set('Authorization', `Bearer ${VALID_TOKEN}`)
        .send({ title: 123 });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
      expect(mockTodoService.updateTodo).not.toHaveBeenCalled();
    });

    it('should return 400 when completed is not a boolean', async () => {
      const response = await request(app)
        .put(`/todos/${todoId}`)
        .set('Authorization', `Bearer ${VALID_TOKEN}`)
        .send({ completed: 'false' });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
      expect(mockTodoService.updateTodo).not.toHaveBeenCalled();
    });

    it('should return 400 when title exceeds maximum length', async () => {
      const response = await request(app)
        .put(`/todos/${todoId}`)
        .set('Authorization', `Bearer ${VALID_TOKEN}`)
        .send({ title: LARGE_TITLE });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
      expect(mockTodoService.updateTodo).not.toHaveBeenCalled();
    });

    it('should return 400 for malformed JSON payload', async () => {
      const response = await request(app)
        .put(`/todos/${todoId}`)
        .set('Authorization', `Bearer ${VALID_TOKEN}`)
        .set('Content-Type', 'application/json')
        .send(MALFORMED_JSON);

      expect(response.status).toBe(400);
      expect(mockTodoService.updateTodo).not.toHaveBeenCalled();
    });

    it('should return 400 when todo ID is not numeric', async () => {
      const response = await request(app)
        .put('/todos/invalid-id')
        .set('Authorization', `Bearer ${VALID_TOKEN}`)
        .send({ title: 'Updated Todo' });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
      expect(mockTodoService.updateTodo).not.toHaveBeenCalled();
    });

    it('should return 400 when todo ID is negative', async () => {
      const response = await request(app)
        .put('/todos/-1')
        .set('Authorization', `Bearer ${VALID_TOKEN}`)
        .send({ title: 'Updated Todo' });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
      expect(mockTodoService.updateTodo).not.toHaveBeenCalled();
    });

    it('should return 404 when todo does not exist', async () => {
      mockTodoService.updateTodo.mockResolvedValue(null);

      const response = await request(app)
        .put(`/todos/${todoId}`)
        .set('Authorization', `Bearer ${VALID_TOKEN}`)
        .send({ title: 'Updated Todo' });

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('error');
    });

    it('should return 401 when JWT token is missing', async () => {
      const response = await request(app)
        .put(`/todos/${todoId}`)
        .send({ title: 'Updated Todo' });

      expect(response.status).toBe(401);
      expect(mockTodoService.updateTodo).not.toHaveBeenCalled();
    });

    it('should return 500 when service layer fails', async () => {
      mockTodoService.updateTodo.mockRejectedValue(new Error('Database update failed'));

      const response = await request(app)
        .put(`/todos/${todoId}`)
        .set('Authorization', `Bearer ${VALID_TOKEN}`)
        .send({ title: 'Updated Todo' });

      expect(response.status).toBe(500);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('DELETE /todos/:id', () => {
    const todoId = '1';

    it('should return 204 when todo is successfully deleted', async () => {
      mockTodoService.deleteTodo.mockResolvedValue(true);

      const response = await request(app)
        .delete(`/todos/${todoId}`)
        .set('Authorization', `Bearer ${VALID_TOKEN}`);

      expect(response.status).toBe(204);
      expect(response.body).toEqual({});
      expect(mockTodoService.deleteTodo).toHaveBeenCalledWith(
        parseInt(todoId),
        MOCK_USER_ID
      );
    });

    it('should return 400 when todo ID is not numeric', async () => {
      const response = await request(app)
        .delete('/todos/invalid-id')
        .set('Authorization', `Bearer ${VALID_TOKEN}`);

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
      expect(mockTodoService.deleteTodo).not.toHaveBeenCalled();
    });

    it('should return 400 when todo ID is negative', async () => {
      const response = await request(app)
        .delete('/todos/-1')
        .set('Authorization', `Bearer ${VALID_TOKEN}`);

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
      expect(mockTodoService.deleteTodo).not.toHaveBeenCalled();
    });

    it('should return 404 when todo does not exist', async () => {
      mockTodoService.deleteTodo.mockResolvedValue(false);

      const response = await request(app)
        .delete(`/todos/${todoId}`)
        .set('Authorization', `Bearer ${VALID_TOKEN}`);

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('error');
    });

    it('should return 401 when JWT token is missing', async () => {
      const response = await request(app)
        .delete(`/todos/${todoId}`);

      expect(response.status).toBe(401);
      expect(mockTodoService.deleteTodo).not.toHaveBeenCalled();
    });

    it('should return 500 when service layer fails', async () => {
      mockTodoService.deleteTodo.mockRejectedValue(new Error('Database delete failed'));

      const response = await request(app)
        .delete(`/todos/${todoId}`)
        .set('Authorization', `Bearer ${VALID_TOKEN}`);

      expect(response.status).toBe(500);
      expect(response.body).toHaveProperty('error');
    });
  });
});