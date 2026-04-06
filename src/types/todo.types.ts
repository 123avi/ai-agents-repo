/**
 * Data transfer object for creating a new todo.
 */
export interface CreateTodoDTO {
  title: string;
  description?: string;
  status?: string;
  dueDate?: Date;
}

/**
 * Data transfer object for updating an existing todo.
 */
export interface UpdateTodoDTO {
  title?: string;
  description?: string;
  status?: string;
  dueDate?: Date;
  completedAt?: Date;
}