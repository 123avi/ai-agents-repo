package main

import (
	"log"
	"os"

	"github.com/joho/godotenv"
)

const (
	// Default server configuration
	DEFAULT_PORT = "8080"
	DEFAULT_HOST = "localhost"
)

/**
 * Main entry point for the Todo API server.
 * Loads environment configuration and starts the HTTP server.
 */
func main() {
	if err := godotenv.Load(); err != nil {
		log.Printf("Warning: .env file not found: %v", err)
	}

	port := getEnvOrDefault("PORT", DEFAULT_PORT)
	host := getEnvOrDefault("HOST", DEFAULT_HOST)

	log.Printf("Starting Todo API server on %s:%s", host, port)

	// TODO: Initialize database connection
	// TODO: Setup routes with gorilla/mux
	// TODO: Start HTTP server

	log.Println("Server setup complete - ready for implementation")
}

/**
 * getEnvOrDefault retrieves an environment variable value or returns a default.
 * @param key - The environment variable name
 * @param defaultValue - The default value if env var is not set
 * @return The environment variable value or default
 */
func getEnvOrDefault(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}
