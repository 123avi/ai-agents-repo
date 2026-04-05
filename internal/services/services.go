package services

/**
 * AuthService handles authentication-related business logic.
 */
type AuthService struct {
	userRepo  interface{}
	jwtSecret string
}

/**
 * NewAuthService creates a new AuthService instance.
 */
func NewAuthService(userRepo interface{}, jwtSecret string) *AuthService {
	return &AuthService{
		userRepo:  userRepo,
		jwtSecret: jwtSecret,
	}
}

/**
 * TodoService handles todo-related business logic.
 */
type TodoService struct {
	todoRepo interface{}
}

/**
 * NewTodoService creates a new TodoService instance.
 */
func NewTodoService(todoRepo interface{}) *TodoService {
	return &TodoService{todoRepo: todoRepo}
}
