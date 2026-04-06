import { Todo, TodoStatus, CreateTodoRequest, UpdateTodoRequest, TodoValidationError } from '../types/todo';
import { TodoRepository } from '../repositories/TodoRepository';

/** Maximum allowed length for todo title */
const MAX_TITLE_LENGTH = 200;

/** Maximum allowed length for todo description */
const MAX_DESCRIPTION_LENGTH = 1000;

/** Valid status values for todos */
const VALID_STATUSES: TodoStatus[] = ['open', 'in_progress', 'completed'];

/** Default status for new todos */
const DEFAULT_STATUS: TodoStatus = 'open';

/**
 * Service class for managing todo business logic and CRUD operations.
 * Handles validation, user ownership enforcement, and data persistence.
 */
export class TodoService {
  constructor(private todoRepository: TodoRepository) {}

  /**
   * Creates a new todo item with validation and user ownership.
   * @param request - Todo creation data with title, description, and optional fields
   * @param userId - ID of the user creating the todo
   * @returns Promise resolving to the created todo
   * @throws TodoValidationError for validation failures
   */
  async createTodo(request: CreateTodoRequest, userId: string): Promise<Todo> {
    this.validateCreateRequest(request);

    const todoData: Todo = {
      id: '',
      title: request.title.trim(),
      description: request.description?.trim() || null,
      status: request.status || DEFAULT_STATUS,
      due_date: request.due_date || null,
      user_id: userId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    return await this.todoRepository.create(todoData);
  }

  /**
   * Updates an existing todo with partial data and validation.
   * @param todoId - ID of the todo to update
   * @param request - Partial update data
   * @param userId - ID of the user performing the update
   * @returns Promise resolving to the updated todo
   * @throws TodoValidationError for validation failures or ownership violations
   */
  async updateTodo(todoId: string, request: UpdateTodoRequest, userId: string): Promise<Todo> {
    await this.enforceUserOwnership(todoId, userId);
    this.validateUpdateRequest(request);

    const updateData: Partial<Todo> = {
      ...request,
      updated_at: new Date().toISOString()
    };

    if (updateData.title) {
      updateData.title = updateData.title.trim();
    }
    if (updateData.description !== undefined) {
      updateData.description = updateData.description?.trim() || null;
    }

    return await this.todoRepository.update(todoId, updateData);
  }

  /**
   * Retrieves a todo by ID with user ownership validation.
   * @param todoId - ID of the todo to retrieve
   * @param userId - ID of the requesting user
   * @returns Promise resolving to the todo or null if not found
   * @throws TodoValidationError for ownership violations
   */
  async getTodo(todoId: string, userId: string): Promise<Todo | null> {
    const todo = await this.todoRepository.findById(todoId);
    if (todo && todo.user_id !== userId) {
      throw new TodoValidationError('Access denied: Todo belongs to another user');
    }
    return todo;
  }

  /**
   * Retrieves all todos for a specific user.
   * @param userId - ID of the user whose todos to retrieve
   * @returns Promise resolving to array of user's todos
   */
  async getUserTodos(userId: string): Promise<Todo[]> {
    return await this.todoRepository.findByUserId(userId);
  }

  /**
   * Deletes a todo with user ownership validation.
   * @param todoId - ID of the todo to delete
   * @param userId - ID of the user performing the deletion
   * @returns Promise resolving to boolean indicating success
   * @throws TodoValidationError for ownership violations
   */
  async deleteTodo(todoId: string, userId: string): Promise<boolean> {
    await this.enforceUserOwnership(todoId, userId);
    return await this.todoRepository.delete(todoId);
  }

  /**
   * Validates todo creation request data.
   * @param request - Todo creation request to validate
   * @throws TodoValidationError for validation failures
   */
  private validateCreateRequest(request: CreateTodoRequest): void {
    if (!request.title || request.title.trim().length === 0) {
      throw new TodoValidationError('Title is required');
    }

    if (request.title.trim().length > MAX_TITLE_LENGTH) {
      throw new TodoValidationError(`Title must not exceed ${MAX_TITLE_LENGTH} characters`);
    }

    if (request.description && request.description.trim().length > MAX_DESCRIPTION_LENGTH) {
      throw new TodoValidationError(`Description must not exceed ${MAX_DESCRIPTION_LENGTH} characters`);
    }

    if (request.status && !VALID_STATUSES.includes(request.status)) {
      throw new TodoValidationError(`Status must be one of: ${VALID_STATUSES.join(', ')}`);
    }

    if (request.due_date && !this.isValidISODate(request.due_date)) {
      throw new TodoValidationError('Due date must be in valid ISO format');
    }
  }

  /**
   * Validates todo update request data.
   * @param request - Todo update request to validate
   * @throws TodoValidationError for validation failures
   */
  private validateUpdateRequest(request: UpdateTodoRequest): void {
    if (request.title !== undefined) {
      if (!request.title || request.title.trim().length === 0) {
        throw new TodoValidationError('Title cannot be empty');
      }
      if (request.title.trim().length > MAX_TITLE_LENGTH) {
        throw new TodoValidationError(`Title must not exceed ${MAX_TITLE_LENGTH} characters`);
      }
    }

    if (request.description !== undefined && request.description && 
        request.description.trim().length > MAX_DESCRIPTION_LENGTH) {
      throw new TodoValidationError(`Description must not exceed ${MAX_DESCRIPTION_LENGTH} characters`);
    }

    if (request.status && !VALID_STATUSES.includes(request.status)) {
      throw new TodoValidationError(`Status must be one of: ${VALID_STATUSES.join(', ')}`);
    }

    if (request.due_date && !this.isValidISODate(request.due_date)) {
      throw new TodoValidationError('Due date must be in valid ISO format');
    }
  }

  /**
   * Enforces user ownership of a todo item.
   * @param todoId - ID of the todo to check
   * @param userId - ID of the requesting user
   * @throws TodoValidationError if user doesn't own the todo
   */
  private async enforceUserOwnership(todoId: string, userId: string): Promise<void> {
    const todo = await this.todoRepository.findById(todoId);
    if (!todo) {
      throw new TodoValidationError('Todo not found');
    }
    if (todo.user_id !== userId) {
      throw new TodoValidationError('Access denied: Todo belongs to another user');
    }
  }

  /**
   * Validates ISO date format.
   * @param dateString - Date string to validate
   * @returns boolean indicating if date is valid ISO format
   */
  private isValidISODate(dateString: string): boolean {
    const date = new Date(dateString);
    return date instanceof Date && !isNaN(date.getTime()) && 
           dateString === date.toISOString();
  }
}