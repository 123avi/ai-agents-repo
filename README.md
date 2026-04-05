# Todo API

A RESTful API for managing todo items with JWT authentication and multi-user support.

## Quick Start

### Prerequisites
- Go 1.21 or higher
- PostgreSQL 12 or higher

### Installation

1. Clone the repository
2. Copy environment configuration:
   ```bash
   cp .env.example .env
   ```
3. Update `.env` with your database credentials and JWT secret
4. Install dependencies:
   ```bash
   go mod tidy
   ```
5. Run the application:
   ```bash
   go run cmd/server/main.go
   ```

## Project Structure

```
├── cmd/server/          # Application entry points
├── internal/            # Private application code
│   ├── config/         # Configuration management
│   └── models/         # Data models and structures
└── pkg/                # Public library code
    └── utils/          # Utility functions
```

## Environment Variables

See `.env.example` for all available configuration options.

## Dependencies

- **gorilla/mux**: HTTP router and URL matcher
- **golang-jwt/jwt/v5**: JWT token handling
- **golang.org/x/crypto**: Password hashing with bcrypt
- **lib/pq**: PostgreSQL database driver
- **godotenv**: Environment variable loading

## Development

This is the initial project structure. Implementation of handlers, database layer, and middleware will be added in subsequent tasks.
