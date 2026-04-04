# AI Agent Pipeline

This repository is managed by the AI Agent Pipeline.
## How to run it locally
### Step 1 — Clone your repository
```
git clone [https://github.com/[your-username]/[your-repo]](https://github.com/123avi/ai-agents-repo).git
cd ai-agents-repo
```
### Step 2 — Install dependencies
```
bash
npm install
```
### Step 3 — Set up PostgreSQL
You need a running PostgreSQL database. The easiest way on Windows is Docker:
```
bash
docker run --name todo-db \
  -e POSTGRES_PASSWORD=password \
  -e POSTGRES_DB=todo_db \
  -p 5432:5432 \
  -d postgres:15
```
### Step 4 — Create a .env file
The generated code expects these environment variables:
```
PORT=3000
NODE_ENV=development
DATABASE_URL=postgresql://postgres:password@localhost:5432/todo_db
JWT_SECRET=my-super-secret-key-change-in-production
CORS_ORIGIN=http://localhost:3000
```
### Step 5 — Run migrations (if they exist)
```
bash
npm run migrate
```
 or
```
npm run db:migrate
```
### Step 6 — Start the server
```bash
npm run dev
```
 or
```npm start```
### Step 7 — Test the API
Use any API client. Here are the endpoints that should exist:
```bash
# Health check
curl http://localhost:3000/health

# Register a user
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com", "password": "password123"}'

# Login
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com", "password": "password123"}'

# Create a todo (use token from login)
curl -X POST http://localhost:3000/api/todos \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"title": "My first todo", "status": "open"}'

# Get all todos
curl http://localhost:3000/api/todos \
  -H "Authorization: Bearer YOUR_TOKEN"
```
