import { PrismaClient, Todo } from '@prisma/client';

/**
 * Custom error for database operation failures
 */
export class DatabaseError extends Error {
  constructor(message: string, public readonly originalError: Error) {
    super(message);
    this.name = 'DatabaseError';
  }
}

/**
 * Custom error for business logic violations
 */
export class TodoNotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TodoNotFoundError';
  }
}

/**
 * Todo repository for managing todo items with user scoping
 */
export class TodoRepository {
  constructor(private prisma: PrismaClient) {}

  /**
   * Creates a new todo item for a specific user
   * @param title - The todo title
   * @param description - The todo description (optional)
   * @param userId - The user ID who owns this todo
   * @returns Promise resolving to the created todo
   * @throws DatabaseError when database operation fails
   */
  async createTodo(
    title: string,
    description: string | null,
    userId: string
  ): Promise<Todo> {
    try {
      return await this.prisma.todo.create({
        data: {
          title,
          description,
          userId,
          completed: false
        }
      });
    } catch (error) {
      throw new DatabaseError(
        'Failed to create todo item',
        error as Error
      );
    }
  }

  /**
   * Retrieves all todo items for a specific user with optional status filtering
   * @param userId - The user ID to filter todos for
   * @param completed - Optional filter by completion status
   * @returns Promise resolving to array of user's todos
   * @throws DatabaseError when database operation fails
   */
  async findTodosByUserId(
    userId: string,
    completed?: boolean
  ): Promise<Todo[]> {
    try {
      const where: any = { userId };
      if (completed !== undefined) {
        where.completed = completed;
      }

      return await this.prisma.todo.findMany({
        where,
        orderBy: { createdAt: 'desc' }
      });
    } catch (error) {
      throw new DatabaseError(
        'Failed to retrieve todos for user',
        error as Error
      );
    }
  }

  /**
   * Retrieves a single todo item by ID with user ownership validation
   * @param todoId - The todo ID to retrieve
   * @param userId - The user ID for ownership validation
   * @returns Promise resolving to the todo item
   * @throws TodoNotFoundError when todo not found or not owned by user
   * @throws DatabaseError when database operation fails
   */
  async findTodoById(todoId: string, userId: string): Promise<Todo> {
    try {
      const todo = await this.prisma.todo.findFirst({
        where: {
          id: todoId,
          userId
        }
      });

      if (!todo) {
        throw new TodoNotFoundError(
          `Todo with ID ${todoId} not found or not accessible by user`
        );
      }

      return todo;
    } catch (error) {
      if (error instanceof TodoNotFoundError) {
        throw error;
      }
      throw new DatabaseError(
        'Failed to retrieve todo item',
        error as Error
      );
    }
  }

  /**
   * Updates a todo item with user ownership validation in a single operation
   * @param todoId - The todo ID to update
   * @param userId - The user ID for ownership validation
   * @param updates - The fields to update
   * @returns Promise resolving to the updated todo
   * @throws TodoNotFoundError when todo not found or not owned by user
   * @throws DatabaseError when database operation fails
   */
  async updateTodo(
    todoId: string,
    userId: string,
    updates: Partial<Pick<Todo, 'title' | 'description' | 'completed'>>
  ): Promise<Todo> {
    try {
      const updatedTodo = await this.prisma.todo.updateMany({
        where: {
          id: todoId,
          userId
        },
        data: updates
      });

      if (updatedTodo.count === 0) {
        throw new TodoNotFoundError(
          `Todo with ID ${todoId} not found or not accessible by user`
        );
      }

      // Retrieve and return the updated todo
      const todo = await this.prisma.todo.findUnique({
        where: { id: todoId }
      });

      return todo!;
    } catch (error) {
      if (error instanceof TodoNotFoundError) {
        throw error;
      }
      throw new DatabaseError(
        'Failed to update todo item',
        error as Error
      );
    }
  }

  /**
   * Deletes a todo item with user ownership validation
   * @param todoId - The todo ID to delete
   * @param userId - The user ID for ownership validation
   * @returns Promise resolving when deletion is complete
   * @throws TodoNotFoundError when todo not found or not owned by user
   * @throws DatabaseError when database operation fails
   */
  async deleteTodo(todoId: string, userId: string): Promise<void> {
    try {
      const deletedTodo = await this.prisma.todo.deleteMany({
        where: {
          id: todoId,
          userId
        }
      });

      if (deletedTodo.count === 0) {
        throw new TodoNotFoundError(
          `Todo with ID ${todoId} not found or not accessible by user`
        );
      }
    } catch (error) {
      if (error instanceof TodoNotFoundError) {
        throw error;
      }
      throw new DatabaseError(
        'Failed to delete todo item',
        error as Error
      );
    }
  }
}