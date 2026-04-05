-- Create todos table with foreign key to users table
CREATE TABLE todos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    status VARCHAR(10) NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'done')),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create index on user_id for faster queries filtering by user
CREATE INDEX idx_todos_user_id ON todos(user_id);

-- Create index on status column for efficient status-based filtering
CREATE INDEX idx_todos_status ON todos(status);

-- Create composite index for user_id + status for common query patterns
CREATE INDEX idx_todos_user_id_status ON todos(user_id, status);

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_todos_updated_at
    BEFORE UPDATE ON todos
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();