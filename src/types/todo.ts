/**
 * Represents a todo item in the system
 */
export interface Todo {
  id: string;
  title: string;
  description?: string;
  status: TodoStatus;
  user_id: string;
  created_at: Date;
  updated_at: Date;
}

/**
 * Valid status values for todo items
 */
export enum TodoStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed'
}

/**
 * Data required to create a new todo item
 */
export interface TodoCreateData {
  title: string;
  description?: string;
  status: TodoStatus;
}

/**
 * Data that can be updated for a todo item
 */
export interface TodoUpdateData {
  title?: string;
  description?: string;
  status?: TodoStatus;
}