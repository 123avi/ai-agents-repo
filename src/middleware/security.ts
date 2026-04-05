import helmet from 'helmet';
import cors from 'cors';
import { Express } from 'express';

/** CORS configuration constants */
const CORS_MAX_AGE_SECONDS = 86400; // 24 hours
const ALLOWED_METHODS = ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'];
const ALLOWED_HEADERS = ['Content-Type', 'Authorization', 'X-Requested-With'];

/**
 * Configures CORS settings based on environment
 * @returns CORS configuration object
 */
function getCorsConfig() {
  const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'];
  
  return {
    origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
      // Allow requests with no origin (mobile apps, postman, etc.)
      if (!origin) {
        callback(null, true);
        return;
      }
      
      if (allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS policy'));
      }
    },
    methods: ALLOWED_METHODS,
    allowedHeaders: ALLOWED_HEADERS,
    credentials: true,
    maxAge: CORS_MAX_AGE_SECONDS,
    optionsSuccessStatus: 200
  };
}

/**
 * Configures Helmet.js security headers
 * @returns Helmet configuration object
 */
function getHelmetConfig() {
  return {
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", 'data:', 'https:'],
        connectSrc: ["'self'"],
        fontSrc: ["'self'"],
        objectSrc: ["'none'"],
        mediaSrc: ["'self'"],
        frameSrc: ["'none'"]
      }
    },
    crossOriginEmbedderPolicy: false, // Allows API to be embedded
    hsts: {
      maxAge: 31536000, // 1 year
      includeSubDomains: true,
      preload: true
    },
    noSniff: true,
    frameguard: { action: 'deny' },
    xssFilter: true,
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' }
  };
}

/**
 * Applies comprehensive security middleware to Express app
 * @param app Express application instance
 */
export function configureSecurityMiddleware(app: Express): void {
  try {
    // Apply Helmet security headers
    app.use(helmet(getHelmetConfig()));
    
    // Configure CORS
    app.use(cors(getCorsConfig()));
    
    // Additional security headers
    app.use((req, res, next) => {
      // Prevent caching of sensitive data
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      
      // Custom security headers
      res.setHeader('X-API-Version', process.env.API_VERSION || '1.0');
      res.setHeader('X-Content-Type-Options', 'nosniff');
      
      next();
    });
    
    console.log('Security middleware configured successfully');
  } catch (error) {
    console.error('Failed to configure security middleware:', error);
    throw error;
  }
}

/**
 * Validates security configuration on startup
 */
export function validateSecurityConfig(): void {
  const requiredEnvVars = ['JWT_SECRET'];
  const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
  
  if (missingVars.length > 0) {
    throw new Error(`Missing required security environment variables: ${missingVars.join(', ')}`);
  }
  
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
    throw new Error('JWT_SECRET must be at least 32 characters long');
  }
  
  console.log('Security configuration validated');
}