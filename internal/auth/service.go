package auth

import (
	"database/sql"
	"errors"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
	"golang.org/x/crypto"
)

const (
	JWT_EXPIRATION_HOURS = 24
	BCRYPT_COST = 12
)

var (
	ErrInvalidCredentials = errors.New("invalid credentials")
	ErrUserExists = errors.New("user already exists")
	ErrInvalidToken = errors.New("invalid token")
)

/**
 * AuthService handles user authentication and JWT token management.
 */
type AuthService struct {
	db *sql.DB
	jwtSecret []byte
}

/**
 * Creates a new AuthService instance.
 * @param db Database connection
 * @param jwtSecret Secret key for JWT signing
 * @return *AuthService The authentication service
 */
func NewAuthService(db *sql.DB, jwtSecret []byte) *AuthService {
	return &AuthService{
		db: db,
		jwtSecret: jwtSecret,
	}
}

/**
 * Registers a new user with email and password.
 * @param email User's email address
 * @param password User's plain text password
 * @return error Any registration error
 */
func (s *AuthService) RegisterUser(email, password string) error {
	hash, err := bcrypt.GenerateFromPassword([]byte(password), BCRYPT_COST)
	if err != nil {
		return err
	}

	userID := uuid.New()
	query := `INSERT INTO users (id, email, password_hash, created_at, updated_at) 
			  VALUES ($1, $2, $3, $4, $5)`
	
	now := time.Now()
	_, err = s.db.Exec(query, userID, email, string(hash), now, now)
	if err != nil {
		return ErrUserExists
	}
	
	return nil
}

/**
 * Authenticates user and returns JWT token.
 * @param email User's email address
 * @param password User's plain text password
 * @return string JWT token if authentication successful
 * @return error Authentication error
 */
func (s *AuthService) LoginUser(email, password string) (string, error) {
	var userID uuid.UUID
	var passwordHash string
	
	query := `SELECT id, password_hash FROM users WHERE email = $1`
	err := s.db.QueryRow(query, email).Scan(&userID, &passwordHash)
	if err != nil {
		return "", ErrInvalidCredentials
	}
	
	err = bcrypt.CompareHashAndPassword([]byte(passwordHash), []byte(password))
	if err != nil {
		return "", ErrInvalidCredentials
	}
	
	return s.generateJWT(userID)
}

/**
 * Generates JWT token for authenticated user.
 * @param userID User's unique identifier
 * @return string JWT token
 * @return error Token generation error
 */
func (s *AuthService) generateJWT(userID uuid.UUID) (string, error) {
	claims := jwt.MapClaims{
		"user_id": userID.String(),
		"exp": time.Now().Add(time.Hour * JWT_EXPIRATION_HOURS).Unix(),
	}
	
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString(s.jwtSecret)
}