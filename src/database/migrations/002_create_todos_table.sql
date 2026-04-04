-- Create todos table with foreign key to users
CREATE TABLE todos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    due_date DATE,
    status VARCHAR(20) NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'done')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index on user_id for filtering todos by user
CREATE INDEX idx_todos_user_id ON todos(user_id);

-- Create composite index on user_id and status for efficient queries
CREATE INDEX idx_todos_user_id_status ON todos(user_id, status);

-- Create index on due_date for sorting and filtering
CREATE INDEX idx_todos_due_date ON todos(due_date) WHERE due_date IS NOT NULL;