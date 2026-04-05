import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller';
import { AuthService } from '../services/auth.service';
import { AuthRepository } from '../repositories/auth.repository';
import { Pool } from 'pg';

/**
 * Create authentication routes with dependency injection
 * 
 * @param db - PostgreSQL connection pool
 * @returns Express router with auth endpoints configured
 */
export function createAuthRoutes(db: Pool): Router {
  const router = Router();
  
  // Dependency injection
  const authRepository = new AuthRepository(db);
  const authService = new AuthService(authRepository);
  const authController = new AuthController(authService);
  
  // Route definitions
  router.post('/register', authController.register);
  router.post('/login', authController.login);
  
  return router;
}