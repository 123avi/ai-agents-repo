import { createServer } from '../server';
import http from 'http';

describe('Server Factory', () => {
  describe('createServer', () => {
    it('should create HTTP server instance', () => {
      const server = createServer();
      expect(server).toBeInstanceOf(http.Server);
    });

    it('should create server with Express app', () => {
      const server = createServer();
      expect(server).toBeDefined();
      expect(typeof server.listen).toBe('function');
      expect(typeof server.close).toBe('function');
    });
  });
});