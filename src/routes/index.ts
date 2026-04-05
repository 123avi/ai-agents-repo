import { Router } from 'express';
import authRoutes from './auth.routes';

/**
 * Main router configuration
 * Mounts all route modules
 */
const router = Router();

// Mount authentication routes
router.use('/auth', authRoutes);

export default router;