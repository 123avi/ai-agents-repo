/**
 * Database configuration settings
 * Uses environment variables for connection parameters
 */
export const config = {
  connectionString: process.env.DATABASE_URL || 'postgresql://localhost:5432/todo_app',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'todo_app',
  username: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '',
  ssl: process.env.DB_SSL === 'true',
};

/**
 * Migration configuration
 */
export const migrationConfig = {
  migrationsTable: 'schema_migrations',
  migrationsPath: './src/database/migrations',
};