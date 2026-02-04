import { Request, Response, NextFunction } from 'express';
import { jwtService } from '../../services/auth/JwtService';
import { logger } from '../../config/logger';

/**
 * Authentication Middleware
 *
 * Verifies JWT tokens and attaches user info to request
 */

export interface AuthenticatedRequest extends Request {
  user?: {
    userId: string;
    email: string;
    name?: string;
    picture?: string;
    provider: 'google' | 'email';
  };
}

export const authMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  try {
    // Extract token from Authorization header (Bearer token)
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      // Fall back to x-user-id header for development/backward compatibility
      const userId = req.headers['x-user-id'] as string;
      if (userId) {
        (req as AuthenticatedRequest).user = {
          userId,
          email: 'dev@example.com',
          provider: 'email',
        };
        return next();
      }

      res.status(401).json({
        error: 'Unauthorized',
        message: 'No authentication token provided',
      });
      return;
    }

    // Check if it's a Bearer token
    if (!authHeader.startsWith('Bearer ')) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'Invalid token format. Use "Bearer <token>"',
      });
      return;
    }

    // Extract token
    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    // Verify token
    const payload = jwtService.verifyAccessToken(token);

    // Attach user info to request
    (req as AuthenticatedRequest).user = {
      userId: payload.userId,
      email: payload.email,
      name: payload.name,
      picture: payload.picture,
      provider: payload.provider,
    };

    next();
  } catch (error: any) {
    logger.error('Auth middleware error:', error.message);

    if (error.message === 'Token expired') {
      res.status(401).json({
        error: 'Token Expired',
        message: 'Access token has expired. Please refresh your token.',
      });
      return;
    }

    res.status(401).json({
      error: 'Unauthorized',
      message: 'Invalid or expired token',
    });
  }
};

/**
 * Optional authentication middleware
 * Attaches user if token exists, but doesn't require it
 */
export const optionalAuthMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  try {
    // Extract token from Authorization header
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      // No token provided - continue without authentication
      return next();
    }

    // Check if it's a Bearer token
    if (!authHeader.startsWith('Bearer ')) {
      // Invalid format - continue without authentication
      return next();
    }

    // Extract token
    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    try {
      // Verify token
      const payload = jwtService.verifyAccessToken(token);

      // Attach user info to request
      (req as AuthenticatedRequest).user = {
        userId: payload.userId,
        email: payload.email,
        name: payload.name,
        picture: payload.picture,
        provider: payload.provider,
      };
    } catch (error) {
      // Token invalid/expired - continue without authentication
      logger.debug('Optional auth: Invalid token provided', { error });
    }

    next();
  } catch (error) {
    // Just continue without user on any error
    next();
  }
};
