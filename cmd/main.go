package main

import (
	"log"
	"net/http"
	"todo-api/internal/auth"
	"todo-api/internal/config"
	"todo-api/internal/todo"

	"github.com/gorilla/mux"
)

/**
 * Main entry point for the Todo API server.
 * Initializes configuration, services, and starts HTTP server.
 */
func main() {
	// Load configuration
	cfg, err := config.Load()
	if err != nil {
		log.Fatal("Failed to load configuration:", err)
	}

	// Initialize services
	authService := auth.NewService(cfg.JWTSecret)
	todoService := todo.NewService(cfg.DatabaseURL)

	// Setup routes
	router := mux.NewRouter()
	api := router.PathPrefix("/api").Subrouter()

	// Auth routes
	api.HandleFunc("/register", authService.RegisterHandler).Methods("POST")
	api.HandleFunc("/login", authService.LoginHandler).Methods("POST")

	// Todo routes
	api.HandleFunc("/todos", todoService.ListHandler).Methods("GET")
	api.HandleFunc("/todos", todoService.CreateHandler).Methods("POST")
	api.HandleFunc("/todos/{id}", todoService.GetHandler).Methods("GET")
	api.HandleFunc("/todos/{id}", todoService.UpdateHandler).Methods("PUT")
	api.HandleFunc("/todos/{id}", todoService.DeleteHandler).Methods("DELETE")

	// Start server
	log.Printf("Server starting on port %s", cfg.Port)
	log.Fatal(http.ListenAndServe(":"+cfg.Port, router))
}
