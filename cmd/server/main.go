package main

import (
	"log"
	"net/http"
	"os"

	"github.com/gorilla/mux"
)

const (
	DEFAULT_PORT = "8080"
	SERVER_ADDR_FORMAT = ":%s"
)

/**
 * Main entry point for the To-Do API server.
 * Initializes the HTTP server with routing configuration.
 */
func main() {
	port := getPort()
	router := setupRoutes()

	log.Printf("Starting server on port %s", port)
	if err := http.ListenAndServe(formatServerAddr(port), router); err != nil {
		log.Fatalf("Server failed to start: %v", err)
	}
}

/**
 * Gets the server port from environment variable or returns default.
 * @return string The port number to use
 */
func getPort() string {
	if port := os.Getenv("PORT"); port != "" {
		return port
	}
	return DEFAULT_PORT
}

/**
 * Formats the server address with the given port.
 * @param port The port number
 * @return string The formatted server address
 */
func formatServerAddr(port string) string {
	return fmt.Sprintf(SERVER_ADDR_FORMAT, port)
}

/**
 * Sets up HTTP routes for the API.
 * @return *mux.Router The configured router
 */
func setupRoutes() *mux.Router {
	r := mux.NewRouter()
	
	api := r.PathPrefix("/api").Subrouter()
	api.HandleFunc("/health", healthHandler).Methods("GET")
	
	return r
}

/**
 * Health check endpoint handler.
 * @param w HTTP response writer
 * @param r HTTP request
 */
func healthHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	w.Write([]byte(`{"status":"ok"}`))
}