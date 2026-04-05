/**
 * Interface representing a complete Todo object
 */
export interface Todo {
  id: string;
  title: string;
  description?: string;
  due_date?: Date;
  status: string;
  userId: string;
  created_at: Date;
  updated_at: Date;
}

/**
 * Interface for creating a new todo
 */
export interface CreateTodoRequest {
  title: string;
  description?: string;
  due_date?: Date;
}

/**
 * Interface for updating an existing todo
 */
export interface UpdateTodoRequest {
  title?: string;
  description?: string;
  due_date?: Date;
  status?: string;
}

/**
 * Interface for todo data to be persisted (includes userId)
 */
export interface CreateTodoData extends CreateTodoRequest {
  userId: string;
  status: string;
}