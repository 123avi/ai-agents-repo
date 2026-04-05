package config

import (
	"os"
	"strconv"
)

const (
	DEFAULT_DB_HOST = "localhost"
	DEFAULT_DB_PORT = 5432
	DEFAULT_DB_NAME = "todoapi"
	DEFAULT_DB_USER = "todouser"
	DEFAULT_JWT_SECRET = "your-secret-key"
)

/**
 * Config holds application configuration values.
 */
type Config struct {
	DatabaseURL string
	JWTSecret   string
	Port        string
}

/**
 * Loads configuration from environment variables with defaults.
 * @return *Config Application configuration
 */
func Load() *Config {
	return &Config{
		DatabaseURL: getDatabaseURL(),
		JWTSecret:   getEnvOrDefault("JWT_SECRET", DEFAULT_JWT_SECRET),
		Port:        getEnvOrDefault("PORT", "8080"),
	}
}

/**
 * Gets database URL from environment or constructs from individual variables.
 * @return string Database connection URL
 */
func getDatabaseURL() string {
	if dbURL := os.Getenv("DATABASE_URL"); dbURL != "" {
		return dbURL
	}
	
	host := getEnvOrDefault("DB_HOST", DEFAULT_DB_HOST)
	port := getEnvOrDefaultInt("DB_PORT", DEFAULT_DB_PORT)
	name := getEnvOrDefault("DB_NAME", DEFAULT_DB_NAME)
	user := getEnvOrDefault("DB_USER", DEFAULT_DB_USER)
	pass := getEnvOrDefault("DB_PASSWORD", "")
	
	return buildPostgresURL(host, port, name, user, pass)
}

/**
 * Gets environment variable or returns default string value.
 * @param key Environment variable key
 * @param defaultVal Default value if not found
 * @return string Environment value or default
 */
func getEnvOrDefault(key, defaultVal string) string {
	if val := os.Getenv(key); val != "" {
		return val
	}
	return defaultVal
}

/**
 * Gets environment variable as integer or returns default.
 * @param key Environment variable key
 * @param defaultVal Default integer value
 * @return int Environment value or default
 */
func getEnvOrDefaultInt(key string, defaultVal int) int {
	if val := os.Getenv(key); val != "" {
		if intVal, err := strconv.Atoi(val); err == nil {
			return intVal
		}
	}
	return defaultVal
}

/**
 * Builds PostgreSQL connection URL from components.
 * @param host Database host
 * @param port Database port
 * @param name Database name
 * @param user Database user
 * @param pass Database password
 * @return string PostgreSQL connection URL
 */
func buildPostgresURL(host string, port int, name, user, pass string) string {
	url := fmt.Sprintf("postgres://%s", user)
	if pass != "" {
		url += ":" + pass
	}
	url += fmt.Sprintf("@%s:%d/%s?sslmode=disable", host, port, name)
	return url
}