package models

import (
	"time"

	"github.com/google/uuid"
)

/**
 * User represents a user account in the system.
 */
type User struct {
	ID           uuid.UUID `json:"id" db:"id"`
	Email        string    `json:"email" db:"email"`
	PasswordHash string    `json:"-" db:"password_hash"`
	CreatedAt    time.Time `json:"created_at" db:"created_at"`
	UpdatedAt    time.Time `json:"updated_at" db:"updated_at"`
}

/**
 * TodoItem represents a todo item in the system.
 */
type TodoItem struct {
	ID          uuid.UUID  `json:"id" db:"id"`
	UserID      uuid.UUID  `json:"user_id" db:"user_id"`
	Title       string     `json:"title" db:"title"`
	Description *string    `json:"description" db:"description"`
	DueDate     *time.Time `json:"due_date" db:"due_date"`
	Status      string     `json:"status" db:"status"`
	CreatedAt   time.Time  `json:"created_at" db:"created_at"`
	UpdatedAt   time.Time  `json:"updated_at" db:"updated_at"`
}

/**
 * RegisterRequest represents the request body for user registration.
 */
type RegisterRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

/**
 * LoginRequest represents the request body for user login.
 */
type LoginRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

/**
 * CreateTodoRequest represents the request body for creating a todo item.
 */
type CreateTodoRequest struct {
	Title       string     `json:"title"`
	Description *string    `json:"description"`
	DueDate     *time.Time `json:"due_date"`
}

/**
 * UpdateTodoRequest represents the request body for updating a todo item.
 */
type UpdateTodoRequest struct {
	Title       *string    `json:"title"`
	Description *string    `json:"description"`
	DueDate     *time.Time `json:"due_date"`
	Status      *string    `json:"status"`
}

/**
 * AuthResponse represents the response body for authentication endpoints.
 */
type AuthResponse struct {
	Token string `json:"token"`
	User  User   `json:"user"`
}
