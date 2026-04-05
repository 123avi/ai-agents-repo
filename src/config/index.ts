/**
 * Application configuration and startup validation
 */

const REQUIRED_ENV_VARS = ['JWT_SECRET', 'DATABASE_URL'] as const;

/**
 * Validates that all required environment variables are present
 * @throws {Error} If any required environment variable is missing
 */
function validateEnvironmentVariables(): void {
  const missingVars = REQUIRED_ENV_VARS.filter(
    (varName) => !process.env[varName]
  );

  if (missingVars.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missingVars.join(', ')}`
    );
  }
}

/**
 * Application configuration object
 */
export const config = {
  jwt: {
    secret: process.env.JWT_SECRET!,
    expiresIn: '24h'
  },
  database: {
    url: process.env.DATABASE_URL!
  }
};

/**
 * Initialize application configuration and validate environment
 * Call this at application startup
 */
export function initializeConfig(): void {
  validateEnvironmentVariables();
}

export default config;