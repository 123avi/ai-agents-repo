package config

import (
	"os"
	"strconv"
)

const (
	// Database configuration defaults
	DEFAULT_DB_HOST = "localhost"
	DEFAULT_DB_PORT = "5432"
	DEFAULT_DB_NAME = "todoapi"
	DEFAULT_DB_USER = "postgres"
	
	// Server configuration defaults
	DEFAULT_SERVER_PORT = 8080
	DEFAULT_JWT_EXPIRY_HOURS = 24
)

// Config holds all configuration values for the application
type Config struct {
	Database DatabaseConfig
	Server   ServerConfig
	Auth     AuthConfig
}

// DatabaseConfig contains database connection parameters
type DatabaseConfig struct {
	Host     string
	Port     string
	Name     string
	User     string
	Password string
	SSLMode  string
}

// ServerConfig contains HTTP server parameters
type ServerConfig struct {
	Port int
	Host string
}

// AuthConfig contains authentication parameters
type AuthConfig struct {
	JWTSecret    string
	JWTExpiryHours int
}

/**
 * Load reads configuration from environment variables.
 * @return Populated Config struct with environment values or defaults
 */
func Load() *Config {
	return &Config{
		Database: DatabaseConfig{
			Host:     getEnvOrDefault("DB_HOST", DEFAULT_DB_HOST),
			Port:     getEnvOrDefault("DB_PORT", DEFAULT_DB_PORT),
			Name:     getEnvOrDefault("DB_NAME", DEFAULT_DB_NAME),
			User:     getEnvOrDefault("DB_USER", DEFAULT_DB_USER),
			Password: os.Getenv("DB_PASSWORD"),
			SSLMode:  getEnvOrDefault("DB_SSLMODE", "disable"),
		},
		Server: ServerConfig{
			Port: getEnvIntOrDefault("SERVER_PORT", DEFAULT_SERVER_PORT),
			Host: getEnvOrDefault("SERVER_HOST", "localhost"),
		},
		Auth: AuthConfig{
			JWTSecret:      os.Getenv("JWT_SECRET"),
			JWTExpiryHours: getEnvIntOrDefault("JWT_EXPIRY_HOURS", DEFAULT_JWT_EXPIRY_HOURS),
		},
	}
}

func getEnvOrDefault(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}

func getEnvIntOrDefault(key string, defaultValue int) int {
	if value := os.Getenv(key); value != "" {
		if intValue, err := strconv.Atoi(value); err == nil {
			return intValue
		}
	}
	return defaultValue
}
