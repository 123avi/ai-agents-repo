import http from 'http';
import { createApp } from './app';

/**
 * Creates an HTTP server instance with the configured Express app
 * @returns {http.Server} HTTP server instance
 */
export function createServer(): http.Server {
  const app = createApp();
  return http.createServer(app);
}