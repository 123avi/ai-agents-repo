/**
 * Todo entity type definition.
 */
export interface Todo {
  id: number;
  title: string;
  description?: string;
  status: 'open' | 'completed';
  user_id: number;
  created_at: Date;
  updated_at: Date;
}

/**
 * Request payload for creating a new todo.
 */
export interface CreateTodoRequest {
  title: string;
  description?: string;
  status?: 'open' | 'completed';
}

/**
 * Request payload for updating an existing todo.
 */
export interface UpdateTodoRequest {
  title?: string;
  description?: string;
  status?: 'open' | 'completed';
}

/**
 * Todo data for repository operations including user_id.
 */
export interface CreateTodoData extends CreateTodoRequest {
  user_id: number;
  status: 'open' | 'completed';
}