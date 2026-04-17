/**
 * Todo entity interface
 */
export interface Todo {
  id: number;
  title: string;
  description?: string;
  completed: boolean;
  userId: number;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Request payload for creating a new todo
 */
export interface CreateTodoRequest {
  title: string;
  description?: string;
}

/**
 * Request payload for updating an existing todo
 */
export interface UpdateTodoRequest {
  title?: string;
  description?: string;
  completed?: boolean;
}