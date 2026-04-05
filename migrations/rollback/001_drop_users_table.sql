-- Rollback: Drop users table
-- Down migration for 001_create_users_table.sql

-- Drop trigger first
DROP TRIGGER IF EXISTS update_users_updated_at ON users;

-- Drop index
DROP INDEX IF EXISTS idx_users_email;

-- Drop table
DROP TABLE IF EXISTS users CASCADE;