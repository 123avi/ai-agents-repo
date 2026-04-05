-- Rollback: Drop todos table and its indexes
DROP INDEX IF EXISTS idx_todos_due_date;
DROP INDEX IF EXISTS idx_todos_status;
DROP INDEX IF EXISTS idx_todos_user_id;
DROP TABLE IF EXISTS todos;