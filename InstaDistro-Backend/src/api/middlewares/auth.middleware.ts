import { Request, Response, NextFunction } from 'express';
import { logger } from '../../config/logger';

/**
 * Authentication Middleware
 *
 * For now, this is a placeholder that passes through all requests.
 * In production, this should:
 * 1. Extract JWT token from Authorization header
 * 2. Verify JWT token
 * 3. Attach user info to req.user
 * 4. Reject invalid/expired tokens
 *
 * TODO: Implement full JWT authentication
 */

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
  };
}

export const authMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  try {
    // TODO: Implement JWT token verification
    // const token = req.headers.authorization?.split(' ')[1];
    // if (!token) {
    //   res.status(401).json({ error: 'Unauthorized', message: 'No token provided' });
    //   return;
    // }
    // const decoded = jwt.verify(token, JWT_SECRET);
    // (req as AuthenticatedRequest).user = decoded;

    // For now, just pass through
    // In development, we use x-user-id header
    next();
  } catch (error) {
    logger.error('Auth middleware error:', error);
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
    // TODO: Same as above, but don't reject if token missing
    next();
  } catch (error) {
    // Just continue without user
    next();
  }
};
