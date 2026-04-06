# Todo API - Docker Development Environment

This project provides a containerized development environment for the Todo API application with PostgreSQL database.

## Prerequisites

- Docker 20.10+
- Docker Compose 2.0+
- Node.js 18+ (for local development outside Docker)

## Quick Start

### 1. Environment Setup

Copy the example environment file and customize as needed:

```bash
cp .env.example .env
```

Update the following environment variables in `.env`:
- `JWT_SECRET`: Use a secure random string for production
- Database credentials (if different from defaults)

### 2. Start Development Environment

```bash
# Build and start all services
docker-compose up --build

# Or run in background
docker-compose up --build -d
```

The application will be available at:
- **API**: http://localhost:3000
- **Database**: localhost:5432
- **Health Check**: http://localhost:3000/health

### 3. Development Workflow

- **Hot Reload**: Code changes in `src/` directory are automatically reflected
- **Database Access**: Use any PostgreSQL client with connection details from docker-compose.yml
- **Logs**: View with `docker-compose logs -f app` or `docker-compose logs -f postgres`

## Docker Architecture

### Multi-Stage Dockerfile

- **Development Stage**: Includes dev dependencies, supports hot reload
- **Production Stage**: Minimal image with only production dependencies
- **Security**: Runs as non-root `nodejs` user

### Volume Strategy

- **Source Code**: Read-only mount of `src/` for hot reload
- **Configuration**: Read-only mount of package.json and tsconfig.json
- **Database**: Named volume `postgres_data` for persistence
- **Excluded**: node_modules, sensitive files via .dockerignore

### Database Security

- **Principle of Least Privilege**: Application user has only necessary permissions
- **Connection Pooling**: Configured for optimal performance
- **Health Checks**: Database connectivity monitoring

## Available Commands

```bash
# Start services
docker-compose up

# Stop services
docker-compose down

# View logs
docker-compose logs -f [service_name]

# Execute commands in running container
docker-compose exec app npm run [command]

# Database shell access
docker-compose exec postgres psql -U todo_user -d todo_api

# Rebuild after dependency changes
docker-compose up --build
```

## Troubleshooting

### Common Issues

1. **Port Conflicts**: Ensure ports 3000 and 5432 are not in use
2. **Volume Issues**: Run `docker-compose down -v` to reset volumes
3. **Build Cache**: Use `docker-compose build --no-cache` for clean build
4. **Permission Issues**: Ensure Docker has access to project directory

### Health Check Failures

- Check application logs: `docker-compose logs app`
- Verify database connectivity: `docker-compose exec app curl http://localhost:3000/health`
- Restart services: `docker-compose restart`

### Database Connection Issues

- Verify environment variables in docker-compose.yml
- Check database logs: `docker-compose logs postgres`
- Ensure database initialization completed successfully

## Production Deployment

For production deployment:

1. Use production Docker stage: `--target production`
2. Set secure environment variables
3. Configure external database with restricted user
4. Implement proper secrets management
5. Set up monitoring and logging

## File Structure

```
.
├── Dockerfile              # Multi-stage container definition
├── docker-compose.yml      # Development environment orchestration
├── .dockerignore           # Docker build exclusions
├── db/
│   └── init.sql           # Database initialization script
├── src/
│   └── routes/
│       └── health.ts      # Health check endpoint
└── README.md              # This file
```