-- Migration: Create todos table with constraints and relationships
-- Version: 002
-- Description: Creates todos table with user_id foreign key and status constraints

CREATE TABLE IF NOT EXISTS todos (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    title VARCHAR(500) NOT NULL,
    description TEXT,
    status VARCHAR(10) NOT NULL DEFAULT 'open',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Foreign key constraint with CASCADE delete
    CONSTRAINT fk_todos_user_id 
        FOREIGN KEY (user_id) 
        REFERENCES users(id) 
        ON DELETE CASCADE,
    
    -- Status constraint to only allow 'open' or 'done'
    CONSTRAINT chk_todos_status 
        CHECK (status IN ('open', 'done'))
);

-- Create index on user_id for performance (AC-004)
CREATE INDEX IF NOT EXISTS idx_todos_user_id ON todos(user_id);

-- Create composite index for user_id + status for filtered queries
CREATE INDEX IF NOT EXISTS idx_todos_user_id_status ON todos(user_id, status);

-- Create trigger to automatically update updated_at timestamp
CREATE TRIGGER update_todos_updated_at
    BEFORE UPDATE ON todos
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();