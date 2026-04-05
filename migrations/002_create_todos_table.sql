-- Migration: Create todos table
-- Up migration
CREATE TABLE IF NOT EXISTS todos (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    status VARCHAR(10) NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'done')),
    due_date TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index on user_id for fast user-specific queries
CREATE INDEX IF NOT EXISTS idx_todos_user_id ON todos(user_id);

-- Create composite index for user queries with status
CREATE INDEX IF NOT EXISTS idx_todos_user_status ON todos(user_id, status);

-- Create trigger to update updated_at timestamp
CREATE TRIGGER update_todos_updated_at BEFORE UPDATE ON todos
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();