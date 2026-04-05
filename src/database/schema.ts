/**
 * Database schema constants and type definitions
 */

export const TABLES = {
  USERS: 'users',
  TODOS: 'todos'
} as const;

export const TODO_STATUS = {
  OPEN: 'open',
  DONE: 'done'
} as const;

export const CONSTRAINTS = {
  EMAIL_MAX_LENGTH: 255,
  TITLE_MAX_LENGTH: 255,
  PASSWORD_HASH_MAX_LENGTH: 255,
  STATUS_MAX_LENGTH: 20
} as const;

/**
 * User table structure interface
 */
export interface User {
  id: number;
  email: string;
  password_hash: string;
  created_at: Date;
  updated_at: Date;
}

/**
 * Todo table structure interface
 */
export interface Todo {
  id: number;
  user_id: number;
  title: string;
  description?: string;
  due_date?: Date;
  status: typeof TODO_STATUS[keyof typeof TODO_STATUS];
  created_at: Date;
  updated_at: Date;
}