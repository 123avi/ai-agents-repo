package config

import (
	"os"
)

// Configuration constants
const (
	DEFAULT_PORT = "8080"
	DEFAULT_HOST = "localhost"
	DEFAULT_DATABASE_URL = "postgres://user:password@localhost/todoapi?sslmode=disable"
	DEFAULT_JWT_SECRET = "your-secret-key"
)

/**
 * Config holds all application configuration values.
 */
type Config struct {
	ServerAddress string
	DatabaseURL   string
	JWTSecret     string
}

/**
 * Load reads configuration from environment variables with fallback to defaults.
 * Returns a Config struct with all necessary application settings.
 */
func Load() *Config {
	return &Config{
		ServerAddress: getEnv("SERVER_ADDRESS", DEFAULT_HOST+":"+DEFAULT_PORT),
		DatabaseURL:   getEnv("DATABASE_URL", DEFAULT_DATABASE_URL),
		JWTSecret:     getEnv("JWT_SECRET", DEFAULT_JWT_SECRET),
	}
}

/**
 * getEnv retrieves an environment variable or returns a default value if not set.
 */
func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}
