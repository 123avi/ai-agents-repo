import { TodoRepository } from '../repositories/todo.repository';
import { Todo, CreateTodoRequest, UpdateTodoRequest } from '../types/todo.types';
import { Logger } from '../utils/logger';

/**
 * Service class for managing todo business logic
 * Handles CRUD operations, status management, and user ownership validation
 */
export class TodoService {
  private todoRepository: TodoRepository;
  private logger: Logger;

  /**
   * Creates a new TodoService instance
   * @param todoRepository - Repository for data access operations
   */
  constructor(todoRepository: TodoRepository) {
    this.todoRepository = todoRepository;
    this.logger = new Logger('TodoService');
  }

  /**
   * Creates a new todo for the specified user
   * @param userId - ID of the user creating the todo
   * @param todoData - Todo creation data
   * @returns Created todo object
   * @throws Error if validation fails or creation fails
   */
  async createTodo(userId: string, todoData: CreateTodoRequest): Promise<Todo> {
    try {
      this.validateCreateTodoRequest(todoData);
      
      const todoToCreate = {
        ...todoData,
        userId,
        status: this.getDefaultStatus()
      };

      this.logger.info(`Creating todo for user ${userId}`);
      return await this.todoRepository.create(todoToCreate);
    } catch (error) {
      this.logger.error('Failed to create todo', error);
      throw error;
    }
  }

  /**
   * Retrieves all todos for the specified user
   * @param userId - ID of the user
   * @returns Array of user's todos
   */
  async getTodos(userId: string): Promise<Todo[]> {
    try {
      this.logger.info(`Retrieving todos for user ${userId}`);
      return await this.todoRepository.findByUserId(userId);
    } catch (error) {
      this.logger.error('Failed to retrieve todos', error);
      throw error;
    }
  }

  /**
   * Retrieves a specific todo by ID for the specified user
   * @param todoId - ID of the todo
   * @param userId - ID of the user
   * @returns Todo object if found and owned by user
   * @throws Error if todo not found or not owned by user
   */
  async getTodoById(todoId: string, userId: string): Promise<Todo> {
    try {
      const todo = await this.todoRepository.findById(todoId);
      
      if (!todo) {
        throw new Error('Todo not found');
      }
      
      this.enforceUserOwnership(todo, userId);
      
      this.logger.info(`Retrieved todo ${todoId} for user ${userId}`);
      return todo;
    } catch (error) {
      this.logger.error('Failed to retrieve todo', error);
      throw error;
    }
  }

  /**
   * Updates a specific todo for the specified user
   * @param todoId - ID of the todo to update
   * @param userId - ID of the user
   * @param updateData - Update data
   * @returns Updated todo object
   * @throws Error if todo not found, not owned by user, or validation fails
   */
  async updateTodo(todoId: string, userId: string, updateData: UpdateTodoRequest): Promise<Todo> {
    try {
      this.validateUpdateTodoRequest(updateData);
      
      const existingTodo = await this.getTodoById(todoId, userId);
      
      const updatedTodo = await this.todoRepository.update(todoId, updateData);
      
      this.logger.info(`Updated todo ${todoId} for user ${userId}`);
      return updatedTodo;
    } catch (error) {
      this.logger.error('Failed to update todo', error);
      throw error;
    }
  }

  /**
   * Deletes a specific todo for the specified user
   * @param todoId - ID of the todo to delete
   * @param userId - ID of the user
   * @throws Error if todo not found or not owned by user
   */
  async deleteTodo(todoId: string, userId: string): Promise<void> {
    try {
      const existingTodo = await this.getTodoById(todoId, userId);
      
      await this.todoRepository.delete(todoId);
      
      this.logger.info(`Deleted todo ${todoId} for user ${userId}`);
    } catch (error) {
      this.logger.error('Failed to delete todo', error);
      throw error;
    }
  }

  /**
   * Gets the default status for new todos
   * @returns Default status value
   * @private
   */
  private getDefaultStatus(): string {
    return 'open';
  }

  /**
   * Validates todo creation request
   * @param todoData - Todo creation data to validate
   * @throws Error if validation fails
   * @private
   */
  private validateCreateTodoRequest(todoData: CreateTodoRequest): void {
    if (!todoData.title || typeof todoData.title !== 'string' || todoData.title.trim().length === 0) {
      throw new Error('Title is required and must be a non-empty string');
    }
    
    if (todoData.description !== undefined && typeof todoData.description !== 'string') {
      throw new Error('Description must be a string if provided');
    }
    
    if (todoData.due_date !== undefined && !(todoData.due_date instanceof Date)) {
      throw new Error('Due date must be a Date object if provided');
    }
  }

  /**
   * Validates todo update request
   * @param updateData - Update data to validate
   * @throws Error if validation fails
   * @private
   */
  private validateUpdateTodoRequest(updateData: UpdateTodoRequest): void {
    const validStatuses = ['open', 'done'];
    
    if (updateData.title !== undefined && (typeof updateData.title !== 'string' || updateData.title.trim().length === 0)) {
      throw new Error('Title must be a non-empty string if provided');
    }
    
    if (updateData.description !== undefined && typeof updateData.description !== 'string') {
      throw new Error('Description must be a string if provided');
    }
    
    if (updateData.status !== undefined && !validStatuses.includes(updateData.status)) {
      throw new Error(`Status must be one of: ${validStatuses.join(', ')}`);
    }
    
    if (updateData.due_date !== undefined && !(updateData.due_date instanceof Date)) {
      throw new Error('Due date must be a Date object if provided');
    }
  }

  /**
   * Enforces user ownership of a todo
   * @param todo - Todo to check ownership for
   * @param userId - ID of the user
   * @throws Error if user does not own the todo
   * @private
   */
  private enforceUserOwnership(todo: Todo, userId: string): void {
    if (todo.userId !== userId) {
      throw new Error('Access denied: Todo does not belong to user');
    }
  }
}