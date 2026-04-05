import { Pool, PoolClient } from 'pg';
import { Todo, TodoCreateData, TodoUpdateData } from '../types/todo';

/**
 * Repository for todo data access operations with user isolation
 * Implements CRUD operations with parameterized queries for security
 */
export class TodoRepository {
  private pool: Pool;

  constructor(pool: Pool) {
    this.pool = pool;
  }

  /**
   * Creates a new todo item associated with a specific user
   * @param todoData - The todo creation data
   * @param userId - The ID of the user creating the todo
   * @returns Promise resolving to the created todo
   */
  async create(todoData: TodoCreateData, userId: string): Promise<Todo> {
    const client = await this.pool.connect();
    try {
      const query = `
        INSERT INTO todos (title, description, status, user_id, created_at, updated_at)
        VALUES ($1, $2, $3, $4, NOW(), NOW())
        RETURNING id, title, description, status, user_id, created_at, updated_at
      `;
      const values = [todoData.title, todoData.description, todoData.status, userId];
      const result = await client.query(query, values);
      return result.rows[0];
    } finally {
      client.release();
    }
  }

  /**
   * Finds all todos belonging to a specific user
   * @param userId - The ID of the user whose todos to retrieve
   * @returns Promise resolving to array of todos
   */
  async findByUserId(userId: string): Promise<Todo[]> {
    const client = await this.pool.connect();
    try {
      const query = `
        SELECT id, title, description, status, user_id, created_at, updated_at
        FROM todos
        WHERE user_id = $1
        ORDER BY created_at DESC
      `;
      const result = await client.query(query, [userId]);
      return result.rows;
    } finally {
      client.release();
    }
  }

  /**
   * Updates a todo item with ownership validation
   * @param todoId - The ID of the todo to update
   * @param updateData - The data to update
   * @param userId - The ID of the user attempting the update
   * @returns Promise resolving to the updated todo or null if not found/unauthorized
   */
  async update(todoId: string, updateData: TodoUpdateData, userId: string): Promise<Todo | null> {
    const client = await this.pool.connect();
    try {
      const query = `
        UPDATE todos
        SET title = COALESCE($1, title),
            description = COALESCE($2, description),
            status = COALESCE($3, status),
            updated_at = NOW()
        WHERE id = $4 AND user_id = $5
        RETURNING id, title, description, status, user_id, created_at, updated_at
      `;
      const values = [updateData.title, updateData.description, updateData.status, todoId, userId];
      const result = await client.query(query, values);
      return result.rows[0] || null;
    } finally {
      client.release();
    }
  }

  /**
   * Deletes a todo item with ownership validation
   * @param todoId - The ID of the todo to delete
   * @param userId - The ID of the user attempting the deletion
   * @returns Promise resolving to true if deleted, false if not found/unauthorized
   */
  async delete(todoId: string, userId: string): Promise<boolean> {
    const client = await this.pool.connect();
    try {
      const query = `
        DELETE FROM todos
        WHERE id = $1 AND user_id = $2
      `;
      const result = await client.query(query, [todoId, userId]);
      return result.rowCount > 0;
    } finally {
      client.release();
    }
  }

  /**
   * Finds a specific todo by ID with ownership validation
   * @param todoId - The ID of the todo to find
   * @param userId - The ID of the user who should own the todo
   * @returns Promise resolving to the todo or null if not found/unauthorized
   */
  async findByIdAndUserId(todoId: string, userId: string): Promise<Todo | null> {
    const client = await this.pool.connect();
    try {
      const query = `
        SELECT id, title, description, status, user_id, created_at, updated_at
        FROM todos
        WHERE id = $1 AND user_id = $2
      `;
      const result = await client.query(query, [todoId, userId]);
      return result.rows[0] || null;
    } finally {
      client.release();
    }
  }
}