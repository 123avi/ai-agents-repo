# Personal To-Do List Management System API

A RESTful API service for managing personal to-do items with user authentication and secure data persistence.

## Features

- User registration and authentication
- JWT-based security
- CRUD operations for to-do items
- PostgreSQL data persistence
- Rate limiting and security middleware
- TypeScript implementation

## Getting Started

### Prerequisites

- Node.js >= 18.0.0
- PostgreSQL database
- npm or yarn package manager

### Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables:
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

4. Build the project:
   ```bash
   npm run build
   ```

5. Start the server:
   ```bash
   npm start
   ```

### Development

For development with hot reload:
```bash
npm run dev
```

### Scripts

- `npm run build` - Compile TypeScript to JavaScript
- `npm start` - Start the production server
- `npm run dev` - Start development server with hot reload
- `npm run clean` - Remove build directory
- `npm run typecheck` - Run TypeScript type checking

## Project Structure

```
src/
├── config/          # Configuration management
├── controllers/     # Request handlers
├── middleware/      # Express middleware
├── repositories/    # Data access layer
├── services/        # Business logic layer
├── types/          # TypeScript type definitions
├── utils/          # Utility functions
├── validation/     # Request validation schemas
└── index.ts        # Application entry point
```

## Environment Variables

See `.env.example` for required environment variables.

## Health Check

The API provides a health check endpoint:
- `GET /health` - Returns server status

## Security Features

- Helmet.js for security headers
- CORS configuration
- Rate limiting
- JWT authentication
- Password hashing with bcrypt
- Input validation