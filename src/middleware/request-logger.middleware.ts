import { Request, Response, NextFunction } from 'express';

/**
 * Request logging middleware that logs HTTP requests in development mode
 * @param req Express request object
 * @param res Express response object
 * @param next Express next function
 */
export function requestLogger(req: Request, res: Response, next: NextFunction): void {
  const startTime = Date.now();
  const { method, url, ip } = req;
  const userAgent = req.get('User-Agent') || 'Unknown';
  
  console.log(`[${new Date().toISOString()}] ${method} ${url} - ${ip} - ${userAgent}`);
  
  // Log response when finished
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    const { statusCode } = res;
    console.log(`[${new Date().toISOString()}] ${method} ${url} - ${statusCode} - ${duration}ms`);
  });
  
  next();
}