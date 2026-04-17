import cors from 'cors';
import { config } from '../config/environment.js';

/**
 * CORS configuration options
 */
const CORS_OPTIONS: cors.CorsOptions = {
  origin: config.corsOrigin,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: [
    'Origin',
    'X-Requested-With', 
    'Content-Type',
    'Accept',
    'Authorization'
  ],
  credentials: true,
  maxAge: 86400 // 24 hours
};

/**
 * Configured CORS middleware
 */
export const corsMiddleware = cors(CORS_OPTIONS);