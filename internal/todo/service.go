package todo

import (
	"database/sql"
	"time"

	"github.com/google/uuid"
)

/**
 * TodoService handles CRUD operations for todo items.
 */
type TodoService struct {
	db *sql.DB
}

/**
 * TodoItem represents a todo item in the system.
 */
type TodoItem struct {
	ID          uuid.UUID  `json:"id"`
	UserID      uuid.UUID  `json:"user_id"`
	Title       string     `json:"title"`
	Description *string    `json:"description"`
	DueDate     *time.Time `json:"due_date"`
	Status      string     `json:"status"`
	CreatedAt   time.Time  `json:"created_at"`
	UpdatedAt   time.Time  `json:"updated_at"`
}

/**
 * Creates a new TodoService instance.
 * @param db Database connection
 * @return *TodoService The todo service
 */
func NewTodoService(db *sql.DB) *TodoService {
	return &TodoService{db: db}
}

/**
 * Creates a new todo item for the specified user.
 * @param userID User's unique identifier
 * @param item Todo item to create
 * @return *TodoItem Created todo item with generated ID
 * @return error Creation error
 */
func (s *TodoService) CreateTodo(userID uuid.UUID, item *TodoItem) (*TodoItem, error) {
	item.ID = uuid.New()
	item.UserID = userID
	item.Status = "open"
	now := time.Now()
	item.CreatedAt = now
	item.UpdatedAt = now
	
	query := `INSERT INTO todo_items (id, user_id, title, description, due_date, status, created_at, updated_at)
			  VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`
	
	_, err := s.db.Exec(query, item.ID, item.UserID, item.Title, 
		item.Description, item.DueDate, item.Status, item.CreatedAt, item.UpdatedAt)
	if err != nil {
		return nil, err
	}
	
	return item, nil
}

/**
 * Retrieves all todo items for the specified user.
 * @param userID User's unique identifier
 * @return []TodoItem List of user's todo items
 * @return error Retrieval error
 */
func (s *TodoService) GetTodos(userID uuid.UUID) ([]TodoItem, error) {
	query := `SELECT id, user_id, title, description, due_date, status, created_at, updated_at
			  FROM todo_items WHERE user_id = $1 ORDER BY created_at DESC`
	
	rows, err := s.db.Query(query, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	
	var todos []TodoItem
	for rows.Next() {
		var todo TodoItem
		err := rows.Scan(&todo.ID, &todo.UserID, &todo.Title, &todo.Description,
			&todo.DueDate, &todo.Status, &todo.CreatedAt, &todo.UpdatedAt)
		if err != nil {
			return nil, err
		}
		todos = append(todos, todo)
	}
	
	return todos, nil
}

/**
 * Retrieves a specific todo item by ID for the specified user.
 * @param userID User's unique identifier
 * @param todoID Todo item's unique identifier
 * @return *TodoItem The requested todo item
 * @return error Retrieval error
 */
func (s *TodoService) GetTodoByID(userID, todoID uuid.UUID) (*TodoItem, error) {
	var todo TodoItem
	query := `SELECT id, user_id, title, description, due_date, status, created_at, updated_at
			  FROM todo_items WHERE id = $1 AND user_id = $2`
	
	err := s.db.QueryRow(query, todoID, userID).Scan(
		&todo.ID, &todo.UserID, &todo.Title, &todo.Description,
		&todo.DueDate, &todo.Status, &todo.CreatedAt, &todo.UpdatedAt)
	if err != nil {
		return nil, err
	}
	
	return &todo, nil
}

/**
 * Updates an existing todo item.
 * @param userID User's unique identifier
 * @param todoID Todo item's unique identifier
 * @param updates Todo item with updated fields
 * @return *TodoItem Updated todo item
 * @return error Update error
 */
func (s *TodoService) UpdateTodo(userID, todoID uuid.UUID, updates *TodoItem) (*TodoItem, error) {
	updates.UpdatedAt = time.Now()
	query := `UPDATE todo_items SET title = $1, description = $2, due_date = $3, 
			  status = $4, updated_at = $5 WHERE id = $6 AND user_id = $7`
	
	_, err := s.db.Exec(query, updates.Title, updates.Description, updates.DueDate,
		updates.Status, updates.UpdatedAt, todoID, userID)
	if err != nil {
		return nil, err
	}
	
	return s.GetTodoByID(userID, todoID)
}

/**
 * Deletes a todo item by ID for the specified user.
 * @param userID User's unique identifier
 * @param todoID Todo item's unique identifier
 * @return error Deletion error
 */
func (s *TodoService) DeleteTodo(userID, todoID uuid.UUID) error {
	query := `DELETE FROM todo_items WHERE id = $1 AND user_id = $2`
	_, err := s.db.Exec(query, todoID, userID)
	return err
}