import { Request, Response, NextFunction } from 'express';
import { logger, sanitizeSensitiveData } from '../../config/logger';
import {
  ApiError,
  ErrorCode,
  createErrorResponse,
} from '../../types/responses';

// ============================================
// LEGACY ERROR CLASSES (Backwards Compatibility)
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

// Re-export new error class for convenience
export { ApiError, ErrorCode } from '../../types/responses';

// ============================================
// ERROR HANDLER MIDDLEWARE
// ============================================

export function errorHandler(
  err: Error | AppError | ApiError,
  req: Request,
  res: Response,
  _next: NextFunction
) {
  const isDevelopment = process.env.NODE_ENV === 'development';

  // Get request ID from request
  const requestId = (req as any).requestId || 'unknown';

  // Default error values
  let statusCode = 500;
  let errorCode: ErrorCode = ErrorCode.INTERNAL_SERVER_ERROR;
  let message = 'Internal Server Error';
  let details: any = undefined;

  // Handle new ApiError instances (preferred)
  if (err instanceof ApiError) {
    statusCode = err.statusCode;
    errorCode = err.code;
    message = err.message;
    details = err.details;
  }
  // Handle legacy AppError instances (backwards compatibility)
  else if (err instanceof AppError) {
    statusCode = err.statusCode;
    message = err.message;

    // Map status codes to error codes
    if (err instanceof ValidationError) {
      errorCode = ErrorCode.VALIDATION_ERROR;
    } else if (err instanceof NotFoundError) {
      errorCode = ErrorCode.UNKNOWN_ERROR; // Generic not found
    } else if (err instanceof UnauthorizedError) {
      errorCode = ErrorCode.UNAUTHORIZED;
    } else if (err instanceof ForbiddenError) {
      errorCode = ErrorCode.FORBIDDEN;
    }
  }
  // Handle unknown errors
  else {
    // Check for specific error patterns
    if (err.message?.includes('not found')) {
      statusCode = 404;
      errorCode = ErrorCode.UNKNOWN_ERROR;
    } else if (err.message?.includes('validation')) {
      statusCode = 400;
      errorCode = ErrorCode.VALIDATION_ERROR;
    } else if (err.message?.includes('unauthorized') || err.message?.includes('authentication')) {
      statusCode = 401;
      errorCode = ErrorCode.UNAUTHORIZED;
    }
    message = err.message || 'An unexpected error occurred';
  }

  // Log error (with sanitized request data)
  logger.error('Request error', {
    requestId,
    error: {
      code: errorCode,
      message: err.message,
      stack: err.stack,
      statusCode,
    },
    request: {
      method: req.method,
      path: req.path,
      query: sanitizeSensitiveData(req.query),
      body: sanitizeSensitiveData(req.body),
      ip: req.ip,
      userAgent: req.get('user-agent'),
    },
  });

  // Create standard error response
  const errorResponse = createErrorResponse(
    errorCode,
    message,
    requestId,
    isDevelopment ? { stack: err.stack, ...details } : details
  );

  // Send error response
  res.status(statusCode).json(errorResponse);
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
  const requestId = (req as any).requestId || 'unknown';

  logger.warn('Route not found', {
    requestId,
    method: req.method,
    path: req.path,
    ip: req.ip,
  });

  const errorResponse = createErrorResponse(
    ErrorCode.UNKNOWN_ERROR,
    `Route ${req.method} ${req.path} not found`,
    requestId,
    {
      availableEndpoints: [
        'GET /',
        'GET /health',
        'GET /api/accounts',
        'GET /api/health/swarm',
        'GET /api/proxies',
        'GET /api/schedules',
      ],
    }
  );

  res.status(404).json(errorResponse);
}
