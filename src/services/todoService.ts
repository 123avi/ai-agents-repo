import { todoRepository } from '../repositories/todoRepository';
import { Todo, CreateTodoData } from '../types/todo';
import { logger } from '../utils/logger';

const DEFAULT_TODO_STATUS = 'open';

/**
 * Service layer for todo operations
 * Handles business logic and data validation
 */
class TodoService {
  /**
   * Creates a new todo item for a user
   * @param todoData - Todo creation data including userId, title, optional description and due_date
   * @returns Promise resolving to created todo with generated ID
   */
  async createTodo(todoData: CreateTodoData): Promise<Todo> {
    try {
      const todoToCreate = {
        ...todoData,
        status: DEFAULT_TODO_STATUS,
        created_at: new Date(),
        updated_at: new Date()
      };

      logger.info('Creating todo in service layer', { userId: todoData.userId, title: todoData.title });

      const createdTodo = await todoRepository.create(todoToCreate);
      return createdTodo;
    } catch (error) {
      logger.error('Error in todo service createTodo', { error: error.message, userId: todoData.userId });
      throw new Error(`Failed to create todo: ${error.message}`);
    }
  }
}

export const todoService = new TodoService();