package main

import (
	"context"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"todo-api/internal/config"
	"todo-api/internal/handlers"
	"todo-api/internal/middleware"
	"todo-api/internal/repository"
	"todo-api/internal/services"

	"github.com/gorilla/mux"
)

/**
 * Main entry point for the todo API server.
 * Initializes the database, sets up routes, and starts the HTTP server.
 */
func main() {
	cfg := config.Load()

	db, err := repository.NewDatabase(cfg.DatabaseURL)
	if err != nil {
		log.Fatal("Failed to connect to database:", err)
	}
	defer db.Close()

	userRepo := repository.NewUserRepository(db)
	todoRepo := repository.NewTodoRepository(db)

	AuthService := services.NewAuthService(userRepo, cfg.JWTSecret)
	todoService := services.NewTodoService(todoRepo)

	handler := handlers.NewHandler(authService, todoService)

	router := mux.NewRouter()
	setupRoutes(router, handler)

	server := &http.Server{
		Addr:         cfg.ServerAddress,
		Handler:      router,
		ReadTimeout:  15 * time.Second,
		WriteTimeout: 15 * time.Second,
		IdleTimeout:  60 * time.Second,
	}

	go func() {
		log.Printf("Server starting on %s", cfg.ServerAddress)
		if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatal("Server failed to start:", err)
		}
	}()

	waitForShutdown(server)
}

/**
 * Sets up all API routes with appropriate middleware.
 */
func setupRoutes(router *mux.Router, handler *handlers.Handler) {
	api := router.PathPrefix("/api").Subrouter()
	api.Use(middleware.JSONMiddleware)
	api.Use(middleware.CORSMiddleware)
	api.Use(middleware.LoggingMiddleware)

	api.HandleFunc("/register", handler.Register).Methods("POST")
	api.HandleFunc("/login", handler.Login).Methods("POST")

	protected := api.PathPrefix("").Subrouter()
	protected.Use(middleware.AuthMiddleware)

	protected.HandleFunc("/todos", handler.GetTodos).Methods("GET")
	protected.HandleFunc("/todos", handler.CreateTodo).Methods("POST")
	protected.HandleFunc("/todos/{id}", handler.GetTodo).Methods("GET")
	protected.HandleFunc("/todos/{id}", handler.UpdateTodo).Methods("PUT")
	protected.HandleFunc("/todos/{id}", handler.DeleteTodo).Methods("DELETE")
}

/**
 * Handles graceful server shutdown on interrupt signals.
 */
func waitForShutdown(server *http.Server) {
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	log.Println("Shutting down server...")

	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	if err := server.Shutdown(ctx); err != nil {
		log.Fatal("Server forced to shutdown:", err)
	}

	log.Println("Server exited")
}
