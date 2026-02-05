import rateLimit from 'express-rate-limit';
import { Request, Response } from 'express';
import { createErrorResponse, ErrorCode } from '../../types/responses';

/**
 * Rate limiting middleware to prevent abuse
 * Phase 6: Enhanced with tiered limits and standard error responses
 */

// Create standard rate limit handler
const createRateLimitHandler = (message: string) => {
  return (req: Request, res: Response) => {
    const rateLimit = (req as any).rateLimit;
    const resetTime = rateLimit?.resetTime ? new Date(rateLimit.resetTime) : undefined;

    const errorResponse = createErrorResponse(
      ErrorCode.RATE_LIMIT_EXCEEDED,
      message,
      (req as any).requestId || 'unknown',
      {
        limit: rateLimit?.limit,
        remaining: 0,
        resetTime: resetTime?.toISOString(),
        retryAfter: rateLimit?.resetTime ? Math.ceil((rateLimit.resetTime - Date.now()) / 1000) : undefined,
      }
    );

    // Add rate limit headers
    res.setHeader('X-RateLimit-Limit', rateLimit?.limit || 0);
    res.setHeader('X-RateLimit-Remaining', 0);
    if (resetTime) {
      res.setHeader('X-RateLimit-Reset', Math.floor(resetTime.getTime() / 1000));
    }

    res.status(429).json(errorResponse);
  };
};

// Tiered rate limiter: Different limits for authenticated vs anonymous users
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: (req: Request) => {
    // Check if user is authenticated (has valid JWT token)
    const isAuthenticated = (req as any).user !== undefined;
    // Authenticated users get higher limits
    return isAuthenticated ? 300 : 100;
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: true, // Also include X-RateLimit-* headers for backwards compatibility
  handler: createRateLimitHandler('You have exceeded the API rate limit. Please try again later.'),
  skip: (req: Request) => {
    // Skip rate limiting for health checks
    return req.path === '/health';
  },
});

// Strict rate limiter for authentication endpoints
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Limit each IP to 10 auth attempts per 15 minutes
  skipSuccessfulRequests: true, // Don't count successful requests
  standardHeaders: true,
  legacyHeaders: true,
  handler: createRateLimitHandler('Too many authentication attempts. Please try again later.'),
});

// Account creation rate limiter
export const createAccountLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // Limit each IP to 10 account creations per hour
  standardHeaders: true,
  legacyHeaders: true,
  handler: createRateLimitHandler('Too many accounts created from this IP. Please try again later.'),
});

// Bulk import rate limiter
export const bulkImportLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // Limit each IP to 3 bulk imports per hour
  standardHeaders: true,
  legacyHeaders: true,
  handler: createRateLimitHandler('Too many bulk import requests. Please try again later.'),
});

// Upload rate limiter (for media uploads)
export const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: (req: Request) => {
    const isAuthenticated = (req as any).user !== undefined;
    return isAuthenticated ? 100 : 20; // Authenticated users can upload more
  },
  standardHeaders: true,
  legacyHeaders: true,
  handler: createRateLimitHandler('Too many upload requests. Please try again later.'),
});
