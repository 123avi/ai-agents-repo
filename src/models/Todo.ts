/**
 * Todo model interface defining the structure of a todo item
 */
export interface Todo {
  /** Unique identifier for the todo */
  id: number;
  
  /** Title of the todo item */
  title: string;
  
  /** Optional description providing more details */
  description?: string;
  
  /** Current status of the todo (pending, completed, etc.) */
  status: string;
  
  /** ID of the user who owns this todo */
  userId: number;
  
  /** Timestamp when the todo was created */
  createdAt: Date;
  
  /** Timestamp when the todo was last updated */
  updatedAt: Date;
}