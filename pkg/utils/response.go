package utils

import (
	"encoding/json"
	"errors"
	"io"
	"log"
	"net/http"
)

/**
 * JSONResponse sends a JSON response with the specified status code.
 */
func JSONResponse(w http.ResponseWriter, statusCode int, data interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(statusCode)

	if err := json.NewEncoder(w).Encode(data); err != nil {
		log.Printf("Error encoding JSON response: %v", err)
		http.Error(w, "Internal server error", http.StatusInternalServerError)
	}
}

/**
 * ErrorResponse sends a JSON error response with the specified status code and message.
 */
func ErrorResponse(w http.ResponseWriter, statusCode int, message string) {
	errorData := map[string]string{"error": message}
	JSONResponse(w, statusCode, errorData)
}

/**
 * ParseJSONRequest parses a JSON request body into the provided interface.
 * Returns an error if the request body is nil or parsing fails.
 */
func ParseJSONRequest(r *http.Request, v interface{}) error {
	if r.Body == nil {
		return errors.New("request body is nil")
	}

	body, err := io.ReadAll(r.Body)
	if err != nil {
		return err
	}
	defer r.Body.Close()

	if len(body) == 0 {
		return errors.New("request body is empty")
	}

	return json.Unmarshal(body, v)
}
