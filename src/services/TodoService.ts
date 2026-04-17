import { TodoRepository } from '../repositories/TodoRepository.js';
import { Todo, CreateTodoRequest, UpdateTodoRequest } from '../types/todo.js';
import { NotFoundError, ForbiddenError, ValidationError } from '../errors/CustomErrors.js';
import { logger } from '../utils/logger.js';

/**
 * Todo business logic service with user authorization and data validation.
 * Handles CRUD operations for todos with proper ownership checks.
 */
export class TodoService {
  constructor(private todoRepository: TodoRepository) {}

  /**
   * Creates a new todo associated with the specified user.
   * Sets default status to 'open' and validates input data.
   * 
   * @param userId - ID of the user creating the todo
   * @param todoData - Todo creation data
   * @returns Promise<Todo> - The created todo
   * @throws ValidationError - If required fields are missing or invalid
   */
  async createTodo(userId: number, todoData: CreateTodoRequest): Promise<Todo> {
    try {
      this.validateCreateTodoData(todoData);
      
      const todoWithDefaults = {
        ...todoData,
        user_id: userId,
        status: todoData.status || 'open'
      };
      
      const createdTodo = await this.todoRepository.create(todoWithDefaults);
      logger.info(`Todo created for user ${userId}`, { todoId: createdTodo.id });
      
      return createdTodo;
    } catch (error) {
      logger.error('Failed to create todo', { userId, error });
      throw error;
    }
  }

  /**
   * Retrieves all todos for a specific user.
   * 
   * @param userId - ID of the user whose todos to retrieve
   * @returns Promise<Todo[]> - Array of user's todos
   */
  async getUserTodos(userId: number): Promise<Todo[]> {
    try {
      const todos = await this.todoRepository.findByUserId(userId);
      logger.info(`Retrieved ${todos.length} todos for user ${userId}`);
      return todos;
    } catch (error) {
      logger.error('Failed to retrieve todos', { userId, error });
      throw error;
    }
  }

  /**
   * Updates a todo with ownership validation.
   * Only the owner can update their todo.
   * 
   * @param todoId - ID of the todo to update
   * @param userId - ID of the user attempting the update
   * @param updateData - Todo update data
   * @returns Promise<Todo> - The updated todo
   * @throws NotFoundError - If todo doesn't exist
   * @throws ForbiddenError - If user doesn't own the todo
   * @throws ValidationError - If update data is invalid
   */
  async updateTodo(todoId: number, userId: number, updateData: UpdateTodoRequest): Promise<Todo> {
    try {
      await this.validateTodoOwnership(todoId, userId);
      this.validateUpdateTodoData(updateData);
      
      const updatedTodo = await this.todoRepository.update(todoId, updateData);
      logger.info(`Todo updated`, { todoId, userId });
      
      return updatedTodo;
    } catch (error) {
      logger.error('Failed to update todo', { todoId, userId, error });
      throw error;
    }
  }

  /**
   * Deletes a todo with ownership validation.
   * Only the owner can delete their todo.
   * 
   * @param todoId - ID of the todo to delete
   * @param userId - ID of the user attempting the deletion
   * @returns Promise<void>
   * @throws NotFoundError - If todo doesn't exist
   * @throws ForbiddenError - If user doesn't own the todo
   */
  async deleteTodo(todoId: number, userId: number): Promise<void> {
    try {
      await this.validateTodoOwnership(todoId, userId);
      
      await this.todoRepository.delete(todoId);
      logger.info(`Todo deleted`, { todoId, userId });
    } catch (error) {
      logger.error('Failed to delete todo', { todoId, userId, error });
      throw error;
    }
  }

  /**
   * Validates todo ownership for update/delete operations.
   * 
   * @private
   * @param todoId - ID of the todo
   * @param userId - ID of the user
   * @throws NotFoundError - If todo doesn't exist
   * @throws ForbiddenError - If user doesn't own the todo
   */
  private async validateTodoOwnership(todoId: number, userId: number): Promise<void> {
    const todo = await this.todoRepository.findById(todoId);
    
    if (!todo) {
      throw new NotFoundError('Todo not found');
    }
    
    if (todo.user_id !== userId) {
      throw new ForbiddenError('Access denied: todo belongs to another user');
    }
  }

  /**
   * Validates create todo request data.
   * 
   * @private
   * @param todoData - Todo creation data to validate
   * @throws ValidationError - If data is invalid
   */
  private validateCreateTodoData(todoData: CreateTodoRequest): void {
    if (!todoData.title?.trim()) {
      throw new ValidationError('Title is required and cannot be empty');
    }
    
    if (todoData.title.length > 255) {
      throw new ValidationError('Title cannot exceed 255 characters');
    }
    
    if (todoData.description && todoData.description.length > 1000) {
      throw new ValidationError('Description cannot exceed 1000 characters');
    }
    
    if (todoData.status && !['open', 'completed'].includes(todoData.status)) {
      throw new ValidationError('Status must be either "open" or "completed"');
    }
  }

  /**
   * Validates update todo request data.
   * 
   * @private
   * @param updateData - Todo update data to validate
   * @throws ValidationError - If data is invalid
   */
  private validateUpdateTodoData(updateData: UpdateTodoRequest): void {
    if (updateData.title !== undefined) {
      if (!updateData.title?.trim()) {
        throw new ValidationError('Title cannot be empty');
      }
      
      if (updateData.title.length > 255) {
        throw new ValidationError('Title cannot exceed 255 characters');
      }
    }
    
    if (updateData.description !== undefined && updateData.description && updateData.description.length > 1000) {
      throw new ValidationError('Description cannot exceed 1000 characters');
    }
    
    if (updateData.status && !['open', 'completed'].includes(updateData.status)) {
      throw new ValidationError('Status must be either "open" or "completed"');
    }
  }
}