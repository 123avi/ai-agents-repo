-- Create users table with email unique constraint
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Create index on users.email for authentication queries
CREATE INDEX idx_users_email ON users(email);