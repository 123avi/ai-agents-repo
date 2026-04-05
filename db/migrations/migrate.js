/**
 * Database migration runner
 * Executes SQL migration files in order
 */
const fs = require('fs').promises;
const path = require('path');
const { Pool } = require('pg');

// Database configuration constants
const DB_CONFIG = {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT) || 5432,
    database: process.env.DB_NAME || 'todoapi',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD,
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false
};

const MIGRATIONS_TABLE = 'schema_migrations';

/**
 * Creates the migrations tracking table if it doesn't exist
 * @param {Pool} pool - Database connection pool
 */
async function createMigrationsTable(pool) {
    const createTableQuery = `
        CREATE TABLE IF NOT EXISTS ${MIGRATIONS_TABLE} (
            id SERIAL PRIMARY KEY,
            filename VARCHAR(255) NOT NULL UNIQUE,
            executed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
    `;
    
    try {
        await pool.query(createTableQuery);
        console.log('Migrations table ready');
    } catch (error) {
        console.error('Failed to create migrations table:', error.message);
        throw error;
    }
}

/**
 * Gets list of already executed migrations
 * @param {Pool} pool - Database connection pool
 * @returns {Promise<string[]>} Array of executed migration filenames
 */
async function getExecutedMigrations(pool) {
    try {
        const result = await pool.query(`SELECT filename FROM ${MIGRATIONS_TABLE} ORDER BY id`);
        return result.rows.map(row => row.filename);
    } catch (error) {
        console.error('Failed to get executed migrations:', error.message);
        throw error;
    }
}

/**
 * Records a migration as executed
 * @param {Pool} pool - Database connection pool
 * @param {string} filename - Migration filename
 */
async function recordMigration(pool, filename) {
    try {
        await pool.query(
            `INSERT INTO ${MIGRATIONS_TABLE} (filename) VALUES ($1)`,
            [filename]
        );
        console.log(`Recorded migration: ${filename}`);
    } catch (error) {
        console.error(`Failed to record migration ${filename}:`, error.message);
        throw error;
    }
}

/**
 * Runs database migrations
 */
async function runMigrations() {
    if (!DB_CONFIG.password) {
        console.error('DB_PASSWORD environment variable is required');
        process.exit(1);
    }

    const pool = new Pool(DB_CONFIG);
    
    try {
        await createMigrationsTable(pool);
        
        const executedMigrations = await getExecutedMigrations(pool);
        const migrationFiles = (await fs.readdir(__dirname))
            .filter(file => file.endsWith('.sql'))
            .sort();
        
        const pendingMigrations = migrationFiles.filter(
            file => !executedMigrations.includes(file)
        );
        
        if (pendingMigrations.length === 0) {
            console.log('No pending migrations');
            return;
        }
        
        console.log(`Running ${pendingMigrations.length} migration(s)...`);
        
        for (const filename of pendingMigrations) {
            const migrationPath = path.join(__dirname, filename);
            const migrationSql = await fs.readFile(migrationPath, 'utf8');
            
            console.log(`Executing migration: ${filename}`);
            
            await pool.query('BEGIN');
            try {
                await pool.query(migrationSql);
                await recordMigration(pool, filename);
                await pool.query('COMMIT');
                console.log(`✓ ${filename} completed`);
            } catch (error) {
                await pool.query('ROLLBACK');
                console.error(`✗ ${filename} failed:`, error.message);
                throw error;
            }
        }
        
        console.log('All migrations completed successfully');
        
    } catch (error) {
        console.error('Migration failed:', error.message);
        process.exit(1);
    } finally {
        await pool.end();
    }
}

// Run migrations if this file is executed directly
if (require.main === module) {
    runMigrations();
}

module.exports = { runMigrations };