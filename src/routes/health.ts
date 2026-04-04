import { Router } from 'express';
import { HealthController } from '../controllers/health.js';

/**
 * Health check routes
 * Provides endpoints for application health monitoring
 */
const router = Router();

// Health check endpoint
router.get('/', HealthController.checkHealth);

export { router as healthRoutes };