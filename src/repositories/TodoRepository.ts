import { PrismaClient, Todo, Prisma } from '@prisma/client';
import { CreateTodoDTO, UpdateTodoDTO } from '../types/todo.types';

/**
 * Repository class for Todo data operations.
 * Provides CRUD operations with user scoping for data isolation.
 */
export class TodoRepository {
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  /**
   * Creates a new todo item for the specified user.
   * @param userId - ID of the user creating the todo
   * @param todoData - Todo data to create
   * @returns Promise resolving to the created todo
   */
  async createTodo(userId: string, todoData: CreateTodoDTO): Promise<Todo> {
    try {
      return await this.prisma.todo.create({
        data: {
          ...todoData,
          userId,
        },
      });
    } catch (error) {
      console.error('Error creating todo:', error);
      throw error;
    }
  }

  /**
   * Retrieves all todos for a specific user with optional status filtering.
   * @param userId - ID of the user
   * @param status - Optional status filter
   * @returns Promise resolving to array of user's todos
   */
  async findTodosByUserId(userId: string, status?: string): Promise<Todo[]> {
    try {
      const whereClause: Prisma.TodoWhereInput = { userId };
      
      if (status) {
        whereClause.status = status;
      }

      return await this.prisma.todo.findMany({
        where: whereClause,
        orderBy: { createdAt: 'desc' },
      });
    } catch (error) {
      console.error('Error finding todos by user ID:', error);
      throw error;
    }
  }

  /**
   * Retrieves a single todo by ID with user ownership validation.
   * @param todoId - ID of the todo to retrieve
   * @param userId - ID of the user (for ownership validation)
   * @returns Promise resolving to the todo or null if not found/not owned
   */
  async findTodoById(todoId: string, userId: string): Promise<Todo | null> {
    try {
      return await this.prisma.todo.findFirst({
        where: {
          id: todoId,
          userId,
        },
      });
    } catch (error) {
      console.error('Error finding todo by ID:', error);
      throw error;
    }
  }

  /**
   * Updates a todo with user ownership validation.
   * Uses a single database operation to prevent race conditions.
   * @param todoId - ID of the todo to update
   * @param userId - ID of the user (for ownership validation)
   * @param updateData - Data to update
   * @returns Promise resolving to the updated todo
   * @throws Error if todo not found or not owned by user
   */
  async updateTodo(todoId: string, userId: string, updateData: UpdateTodoDTO): Promise<Todo> {
    try {
      return await this.prisma.todo.update({
        where: {
          id: todoId,
          userId,
        },
        data: updateData,
      });
    } catch (error) {
      console.error('Error updating todo:', error);
      throw error;
    }
  }

  /**
   * Deletes a todo with user ownership validation.
   * @param todoId - ID of the todo to delete
   * @param userId - ID of the user (for ownership validation)
   * @returns Promise resolving to the deleted todo
   * @throws Error if todo not found or not owned by user
   */
  async deleteTodo(todoId: string, userId: string): Promise<Todo> {
    try {
      return await this.prisma.todo.delete({
        where: {
          id: todoId,
          userId,
        },
      });
    } catch (error) {
      console.error('Error deleting todo:', error);
      throw error;
    }
  }
}