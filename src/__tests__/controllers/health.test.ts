import { Request, Response } from 'express';
import { HealthController } from '../../controllers/health.js';
import { HTTP_STATUS } from '../../constants/server.js';

// Mock Express Request and Response
const mockRequest = {} as Request;
const mockResponse = {
  status: jest.fn().mockReturnThis(),
  json: jest.fn().mockReturnThis(),
} as unknown as Response;

describe('HealthController', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('checkHealth', () => {
    it('should return ok status with health information', async () => {
      await HealthController.checkHealth(mockRequest, mockResponse);

      expect(mockResponse.status).toHaveBeenCalledWith(HTTP_STATUS.OK);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'ok',
          timestamp: expect.any(String),
          uptime: expect.any(Number),
          environment: expect.any(String),
          version: expect.any(String),
        })
      );
    });

    it('should return valid ISO timestamp', async () => {
      await HealthController.checkHealth(mockRequest, mockResponse);

      const callArgs = (mockResponse.json as jest.Mock).mock.calls[0][0];
      const timestamp = new Date(callArgs.timestamp);
      expect(timestamp.toISOString()).toBe(callArgs.timestamp);
    });

    it('should return positive uptime', async () => {
      await HealthController.checkHealth(mockRequest, mockResponse);

      const callArgs = (mockResponse.json as jest.Mock).mock.calls[0][0];
      expect(callArgs.uptime).toBeGreaterThan(0);
    });

    it('should handle errors gracefully', async () => {
      // Mock process.uptime to throw an error
      const originalUptime = process.uptime;
      process.uptime = jest.fn().mockImplementation(() => {
        throw new Error('Test error');
      });

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      await HealthController.checkHealth(mockRequest, mockResponse);

      expect(mockResponse.status).toHaveBeenCalledWith(HTTP_STATUS.INTERNAL_SERVER_ERROR);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'error',
        })
      );
      expect(consoleSpy).toHaveBeenCalled();

      // Restore original function
      process.uptime = originalUptime;
      consoleSpy.mockRestore();
    });
  });
});