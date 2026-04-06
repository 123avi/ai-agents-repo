# Todo API

A secure REST API for personal to-do list management built with Node.js, TypeScript, and Express.js.

## Prerequisites

- Node.js 18+
- PostgreSQL 13+
- npm or yarn

## Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Configure environment variables:**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

3. **Build the project:**
   ```bash
   npm run build
   ```

4. **Start development server:**
   ```bash
   npm run dev
   ```

## Available Scripts

- `npm run build` - Compile TypeScript to JavaScript
- `npm run start` - Start production server
- `npm run dev` - Start development server with hot reload
- `npm run lint` - Run ESLint
- `npm run lint:fix` - Run ESLint with auto-fix
- `npm run format` - Format code with Prettier
- `npm run format:check` - Check code formatting

## API Endpoints

- `GET /` - API information
- `GET /health` - Health check

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | `3000` |
| `NODE_ENV` | Environment mode | `development` |
| `DATABASE_URL` | PostgreSQL connection string | Required |
| `JWT_SECRET` | JWT signing secret | Required |
| `JWT_EXPIRES_IN` | JWT expiration time | `24h` |
| `BCRYPT_SALT_ROUNDS` | Password hashing salt rounds | `12` |

## Technology Stack

- **Runtime:** Node.js 18+
- **Language:** TypeScript 5.0+
- **Framework:** Express.js 4.18+
- **Database:** PostgreSQL 13+
- **Authentication:** JWT + bcrypt
- **Code Quality:** ESLint + Prettier

## License

ISC