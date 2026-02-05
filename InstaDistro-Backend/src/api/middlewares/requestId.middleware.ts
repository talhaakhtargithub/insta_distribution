import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';

/**
 * Request ID Middleware
 * Adds a unique correlation ID to each request for tracing
 */

declare global {
  namespace Express {
    interface Request {
      requestId: string;
    }
  }
}

export const requestIdMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  // Check if request already has an ID (from load balancer or API gateway)
  const existingId = req.headers['x-request-id'] as string;

  // Generate or use existing request ID
  const requestId = existingId || crypto.randomUUID();

  // Attach to request object for use in controllers
  req.requestId = requestId;

  // Add to response headers for client-side tracing
  res.setHeader('X-Request-ID', requestId);

  next();
};
