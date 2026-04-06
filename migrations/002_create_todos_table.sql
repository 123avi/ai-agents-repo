-- Create todos table with foreign key to users and cascade delete
CREATE TABLE todos (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    due_date TIMESTAMP,
    status VARCHAR(10) DEFAULT 'open' NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    CONSTRAINT chk_status CHECK (status IN ('open', 'done'))
);

-- Create index on todos.user_id for user isolation
CREATE INDEX idx_todos_user_id ON todos(user_id);