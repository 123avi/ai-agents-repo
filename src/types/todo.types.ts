/**
 * Todo status enumeration
 */
export type TodoStatus = 'open' | 'done';

/**
 * Complete todo item entity
 */
export interface Todo {
  id: string;
  user_id: string;
  title: string;
  description?: string | null;
  due_date?: Date | null;
  status: TodoStatus;
  created_at: Date;
  updated_at: Date;
}

/**
 * Input data for creating a new todo item
 */
export interface TodoCreateInput {
  title: string;
  description?: string;
  due_date?: Date;
  status?: TodoStatus;
}

/**
 * Input data for updating an existing todo item
 */
export interface TodoUpdateInput {
  title?: string;
  description?: string;
  due_date?: Date;
  status?: TodoStatus;
}