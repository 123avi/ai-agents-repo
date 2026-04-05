import { todoRepository } from '../repositories/todoRepository';
import { Todo } from '../models/Todo';
import { logger } from '../utils/logger';

/**
 * Service layer for todo business logic
 */
class TodoService {
  /**
   * Retrieves all todos for a specific user
   * @param userId - The ID of the user whose todos to retrieve
   * @returns Promise<Todo[]> - Array of todos belonging to the user
   */
  async getTodosByUserId(userId: number): Promise<Todo[]> {
    try {
      const todos = await todoRepository.findByUserId(userId);
      return todos || [];
    } catch (error) {
      logger.error(`Error retrieving todos for user ${userId}:`, error);
      throw error;
    }
  }
}

export const todoService = new TodoService();