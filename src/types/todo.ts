/**
 * Todo entity interface representing a todo item in the system
 */
export interface Todo {
  id: string;
  user_id: string;
  title: string;
  description?: string;
  due_date?: string;
  status: 'open' | 'completed';
  created_at: Date;
  updated_at: Date;
}

/**
 * Data required to create a new todo item
 * Excludes system-generated fields like id, timestamps
 */
export interface CreateTodoData {
  userId: string;
  title: string;
  description?: string;
  due_date?: string;
}

/**
 * Todo status enumeration for type safety
 */
export const TODO_STATUS = {
  OPEN: 'open' as const,
  COMPLETED: 'completed' as const
} as const;

export type TodoStatus = typeof TODO_STATUS[keyof typeof TODO_STATUS];