package config

import (
	"fmt"
	"os"
)

const (
	// DEFAULT_PORT is the default port for the HTTP server
	DEFAULT_PORT = "8080"
)

/**
 * Config holds all configuration values for the application.
 */
type Config struct {
	Port        string
	JWTSecret   string
	DatabaseURL string
}

/**
 * Load reads configuration from environment variables.
 * Returns error if required environment variables are missing.
 */
func Load() (*Config, error) {
	jwtSecret := getEnv("JWT_SECRET", "")
	if jwtSecret == "" {
		return nil, fmt.Errorf("JWT_SECRET environment variable is required")
	}

	databaseURL := getEnv("DATABASE_URL", "")
	if databaseURL == "" {
		return nil, fmt.Errorf("DATABASE_URL environment variable is required")
	}

	return &Config{
		Port:        getEnv("PORT", DEFAULT_PORT),
		JWTSecret:   jwtSecret,
		DatabaseURL: databaseURL,
	}, nil
}

/**
 * getEnv retrieves environment variable value with optional default.
 */
func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}
