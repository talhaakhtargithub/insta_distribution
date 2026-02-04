import { Request, Response, NextFunction } from 'express';
import { logger } from '../../config/logger';

// ============================================
// ERROR CLASSES
// ============================================

export class AppError extends Error {
  statusCode: number;
  isOperational: boolean;

  constructor(message: string, statusCode: number = 500) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends AppError {
  constructor(message: string) {
    super(message, 400);
  }
}

export class NotFoundError extends AppError {
  constructor(message: string = 'Resource not found') {
    super(message, 404);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message: string = 'Unauthorized') {
    super(message, 401);
  }
}

export class ForbiddenError extends AppError {
  constructor(message: string = 'Forbidden') {
    super(message, 403);
  }
}

// ============================================
// ERROR HANDLER MIDDLEWARE
// ============================================

export function errorHandler(
  err: Error | AppError,
  req: Request,
  res: Response,
  _next: NextFunction
) {
  const isDevelopment = process.env.NODE_ENV === 'development';

  // Default error values
  let statusCode = 500;
  let message = 'Internal Server Error';
  let isOperational = false;

  // Handle known AppError instances
  if (err instanceof AppError) {
    statusCode = err.statusCode;
    message = err.message;
    isOperational = err.isOperational;
  }

  // Log error
  logger.error('Request error', {
    error: {
      message: err.message,
      stack: err.stack,
      statusCode,
      isOperational
    },
    request: {
      method: req.method,
      path: req.path,
      query: req.query,
      body: req.body,
      ip: req.ip,
      userAgent: req.get('user-agent')
    }
  });

  // Send error response
  res.status(statusCode).json({
    success: false,
    error: message,
    ...(isDevelopment && {
      stack: err.stack,
      details: err
    })
  });
}

// ============================================
// ASYNC HANDLER WRAPPER
// ============================================

export function asyncHandler(fn: Function) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

// ============================================
// NOT FOUND HANDLER
// ============================================

export function notFoundHandler(req: Request, res: Response, _next: NextFunction) {
  logger.warn('Route not found', {
    method: req.method,
    path: req.path,
    ip: req.ip
  });

  res.status(404).json({
    success: false,
    error: 'Not Found',
    message: `Route ${req.method} ${req.path} not found`,
    availableEndpoints: [
      'GET /',
      'GET /health',
      'GET /api/accounts',
      'GET /api/health/swarm',
      'GET /api/proxies',
      'GET /api/schedules'
    ]
  });
}
