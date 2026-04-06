# To-Do API

A secure REST API for personal task management built with Node.js, TypeScript, and PostgreSQL.

## Prerequisites

- Node.js 18.x or 20.x LTS
- npm 8.x or higher
- PostgreSQL 14+

## Getting Started

### 1. Clone and Install Dependencies

```bash
npm install
```

### 2. Environment Setup

```bash
cp .env.example .env
```

Update the `.env` file with your configuration:

- Database connection details
- JWT secret key
- Server port (default: 3000)

### 3. Development Scripts

```bash
# Start development server with hot reload
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Lint code
npm run lint

# Fix linting issues
npm run lint:fix

# Format code
npm run format

# Check formatting
npm run format:check
```

## Project Structure

```
src/
├── index.ts          # Application entry point
├── controllers/      # Route handlers
├── services/         # Business logic
├── repositories/     # Data access layer
├── middleware/       # Express middleware
├── models/           # TypeScript interfaces
├── utils/            # Helper functions
└── config/           # Configuration files
```

## Technology Stack

- **Runtime:** Node.js LTS
- **Language:** TypeScript 5.x (strict mode)
- **Framework:** Express.js
- **Database:** PostgreSQL
- **Authentication:** JWT
- **Validation:** Joi
- **Security:** bcrypt, helmet, cors

## Development Tools

- **Hot Reload:** nodemon + ts-node
- **Linting:** ESLint with TypeScript rules
- **Formatting:** Prettier
- **Type Checking:** TypeScript strict mode

## Environment Variables

See `.env.example` for all required environment variables.

## License

ISC