-- Rollback: Drop todos table
-- Down migration for 002_create_todos_table.sql

-- Drop trigger first
DROP TRIGGER IF EXISTS update_todos_updated_at ON todos;

-- Drop indexes
DROP INDEX IF EXISTS idx_todos_user_status;
DROP INDEX IF EXISTS idx_todos_user_id;

-- Drop table
DROP TABLE IF EXISTS todos CASCADE;