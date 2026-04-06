/**
 * Valid status values for todo items
 */
export type TodoStatus = 'open' | 'in_progress' | 'completed';

/**
 * Complete todo item interface
 */
export interface Todo {
  id: string;
  title: string;
  description: string | null;
  status: TodoStatus;
  due_date: string | null;
  user_id: string;
  created_at: string;
  updated_at: string;
}

/**
 * Request interface for creating new todos
 */
export interface CreateTodoRequest {
  title: string;
  description?: string;
  status?: TodoStatus;
  due_date?: string;
}

/**
 * Request interface for updating existing todos
 */
export interface UpdateTodoRequest {
  title?: string;
  description?: string;
  status?: TodoStatus;
  due_date?: string;
}

/**
 * Custom error class for todo validation failures
 */
export class TodoValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TodoValidationError';
  }
}