import { createServer } from '../server';
import { config } from '../config/environment';

describe('Server', () => {
  let server: any;
  
  beforeEach(() => {
    server = createServer();
  });
  
  afterEach(async () => {
    if (server) {
      await server.stop();
    }
  });
  
  describe('createServer', () => {
    it('should create server with app instance', () => {
      expect(server).toHaveProperty('app');
      expect(server).toHaveProperty('start');
      expect(server).toHaveProperty('stop');
      expect(typeof server.start).toBe('function');
      expect(typeof server.stop).toBe('function');
    });
    
    it('should have Express app configured', () => {
      expect(server.app).toBeDefined();
      expect(typeof server.app.listen).toBe('function');
    });
  });
  
  describe('server lifecycle', () => {
    it('should start and stop server', async () => {
      // Mock console.log to avoid test output
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      // Start server
      await server.start();
      
      // Verify server started
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining(`Server running on port ${config.port}`)
      );
      
      // Stop server
      await server.stop();
      
      consoleSpy.mockRestore();
    }, 10000);
    
    it('should handle multiple stop calls gracefully', async () => {
      await server.stop();
      await server.stop(); // Should not throw
    });
  });
});