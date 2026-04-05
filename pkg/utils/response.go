package utils

import (
	"encoding/json"
	"log"
	"net/http"

	"todo-api/internal/models"
)

const (
	// HTTP Content-Type header value
	CONTENT_TYPE_JSON = "application/json"
	HEADER_CONTENT_TYPE = "Content-Type"
)

/**
 * WriteJSONResponse writes a JSON response with the specified status code.
 * @param w - HTTP response writer
 * @param statusCode - HTTP status code to return
 * @param data - Data to serialize as JSON
 */
func WriteJSONResponse(w http.ResponseWriter, statusCode int, data interface{}) {
	w.Header().Set(HEADER_CONTENT_TYPE, CONTENT_TYPE_JSON)
	w.WriteHeader(statusCode)

	if err := json.NewEncoder(w).Encode(data); err != nil {
		log.Printf("Error encoding JSON response: %v", err)
		http.Error(w, "Internal server error", http.StatusInternalServerError)
		return
	}
}

/**
 * WriteErrorResponse writes a standardized error response.
 * @param w - HTTP response writer
 * @param statusCode - HTTP status code to return
 * @param message - Error message to include in response
 */
func WriteErrorResponse(w http.ResponseWriter, statusCode int, message string) {
	errorResp := models.ErrorResponse{
		Error:   http.StatusText(statusCode),
		Message: message,
	}
	WriteJSONResponse(w, statusCode, errorResp)
}

/**
 * ParseJSONRequest parses JSON request body into the provided struct.
 * @param r - HTTP request
 * @param dst - Destination struct to unmarshal into
 * @return Error if parsing fails
 */
func ParseJSONRequest(r *http.Request, dst interface{}) error {
	if r.Body == nil {
		return json.NewDecoder(nil).Decode(dst)
	}
	defer r.Body.Close()
	return json.NewDecoder(r.Body).Decode(dst)
}
