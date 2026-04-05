/**
 * Type definitions for todo-related requests and responses
 */

/**
 * Request payload for creating a new todo
 */
export interface CreateTodoRequest {
  title: string;
  description?: string;
  due_date?: Date;
  status?: 'open' | 'done';
}

/**
 * Request payload for updating an existing todo
 */
export interface UpdateTodoRequest {
  title?: string;
  description?: string;
  due_date?: Date;
  status?: 'open' | 'done';
}

/**
 * Todo item response structure
 */
export interface TodoResponse {
  id: number;
  title: string;
  description: string | null;
  due_date: Date | null;
  status: 'open' | 'done';
  user_id: number;
  created_at: Date;
  updated_at: Date;
}

/**
 * API response wrapper for todo operations
 */
export interface TodoApiResponse {
  success: boolean;
  data?: TodoResponse | TodoResponse[];
  error?: string;
}