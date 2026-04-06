/**
 * Data Transfer Object for creating a new todo item
 */
export interface CreateTodoDto {
  title: string;
  description?: string;
  status?: 'pending' | 'completed';
  priority?: 'low' | 'medium' | 'high';
  dueDate?: Date;
}

/**
 * Data Transfer Object for updating an existing todo item
 */
export interface UpdateTodoDto {
  title?: string;
  description?: string;
  status?: 'pending' | 'completed';
  priority?: 'low' | 'medium' | 'high';
  dueDate?: Date;
}

/**
 * Response DTO for todo items
 */
export interface TodoResponseDto {
  id: number;
  title: string;
  description?: string;
  status: 'pending' | 'completed';
  priority: 'low' | 'medium' | 'high';
  dueDate?: Date;
  userId: number;
  createdAt: Date;
  updatedAt: Date;
}