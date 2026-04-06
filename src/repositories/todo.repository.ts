import { PrismaClient, Todo, TodoStatus } from '@prisma/client';

/**
 * Repository for Todo CRUD operations with user scoping
 */
export class TodoRepository {
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  /**
   * Creates a new todo item for a specific user
   * @param userId - The ID of the user creating the todo
   * @param title - The todo title
   * @param description - Optional todo description
   * @returns Promise resolving to the created todo
   */
  async createTodo(
    userId: string,
    title: string,
    description?: string
  ): Promise<Todo> {
    try {
      return await this.prisma.todo.create({
        data: {
          userId,
          title,
          description,
          status: TodoStatus.PENDING,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });
    } catch (error) {
      console.error('Error creating todo:', error);
      throw new Error('Failed to create todo');
    }
  }

  /**
   * Retrieves all todos for a specific user with optional status filtering
   * @param userId - The ID of the user
   * @param status - Optional status filter
   * @returns Promise resolving to array of user's todos
   */
  async findTodosByUserId(
    userId: string,
    status?: TodoStatus
  ): Promise<Todo[]> {
    try {
      const whereClause: any = { userId };
      if (status) {
        whereClause.status = status;
      }

      return await this.prisma.todo.findMany({
        where: whereClause,
        orderBy: { createdAt: 'desc' },
      });
    } catch (error) {
      console.error('Error finding todos by user ID:', error);
      throw new Error('Failed to retrieve todos');
    }
  }

  /**
   * Retrieves a single todo by ID with user ownership validation
   * @param todoId - The ID of the todo
   * @param userId - The ID of the user to validate ownership
   * @returns Promise resolving to the todo or null if not found/unauthorized
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
      throw new Error('Failed to retrieve todo');
    }
  }

  /**
   * Updates a todo with user ownership validation
   * @param todoId - The ID of the todo to update
   * @param userId - The ID of the user to validate ownership
   * @param updates - Partial todo data to update
   * @returns Promise resolving to the updated todo or null if not found/unauthorized
   */
  async updateTodo(
    todoId: string,
    userId: string,
    updates: Partial<Pick<Todo, 'title' | 'description' | 'status'>>
  ): Promise<Todo | null> {
    try {
      const existingTodo = await this.findTodoById(todoId, userId);
      if (!existingTodo) {
        return null;
      }

      return await this.prisma.todo.update({
        where: { id: todoId },
        data: {
          ...updates,
          updatedAt: new Date(),
        },
      });
    } catch (error) {
      console.error('Error updating todo:', error);
      throw new Error('Failed to update todo');
    }
  }

  /**
   * Deletes a todo with user ownership validation
   * @param todoId - The ID of the todo to delete
   * @param userId - The ID of the user to validate ownership
   * @returns Promise resolving to true if deleted, false if not found/unauthorized
   */
  async deleteTodo(todoId: string, userId: string): Promise<boolean> {
    try {
      const existingTodo = await this.findTodoById(todoId, userId);
      if (!existingTodo) {
        return false;
      }

      await this.prisma.todo.delete({
        where: { id: todoId },
      });
      
      return true;
    } catch (error) {
      console.error('Error deleting todo:', error);
      throw new Error('Failed to delete todo');
    }
  }
}