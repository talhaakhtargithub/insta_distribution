/**
 * Standard API Response Types
 * Ensures consistent response formats across all endpoints
 */

/**
 * Standard Success Response
 */
export interface SuccessResponse<T = any> {
  success: true;
  data: T;
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
    hasMore?: boolean;
  };
  requestId?: string;
  timestamp?: string;
}

/**
 * Standard Error Response
 */
export interface ErrorResponse {
  success: false;
  error: {
    code: ErrorCode;
    message: string;
    details?: any;
    requestId: string;
    timestamp: string;
  };
}

/**
 * Error Codes for Client-Side Handling
 */
export enum ErrorCode {
  // Authentication & Authorization (1000-1999)
  UNAUTHORIZED = 'UNAUTHORIZED',
  INVALID_TOKEN = 'INVALID_TOKEN',
  TOKEN_EXPIRED = 'TOKEN_EXPIRED',
  FORBIDDEN = 'FORBIDDEN',
  INVALID_CREDENTIALS = 'INVALID_CREDENTIALS',

  // Account Errors (2000-2999)
  ACCOUNT_NOT_FOUND = 'ACCOUNT_NOT_FOUND',
  ACCOUNT_ALREADY_EXISTS = 'ACCOUNT_ALREADY_EXISTS',
  ACCOUNT_SUSPENDED = 'ACCOUNT_SUSPENDED',
  ACCOUNT_BANNED = 'ACCOUNT_BANNED',
  ACCOUNT_NOT_AUTHENTICATED = 'ACCOUNT_NOT_AUTHENTICATED',
  ACCOUNT_WARMING_UP = 'ACCOUNT_WARMING_UP',

  // User Errors (3000-3999)
  USER_NOT_FOUND = 'USER_NOT_FOUND',
  USER_ALREADY_EXISTS = 'USER_ALREADY_EXISTS',

  // Post Errors (4000-4999)
  POST_NOT_FOUND = 'POST_NOT_FOUND',
  POST_ALREADY_SCHEDULED = 'POST_ALREADY_SCHEDULED',
  POST_SCHEDULING_FAILED = 'POST_SCHEDULING_FAILED',
  INVALID_MEDIA_FORMAT = 'INVALID_MEDIA_FORMAT',
  MEDIA_TOO_LARGE = 'MEDIA_TOO_LARGE',
  CAPTION_TOO_LONG = 'CAPTION_TOO_LONG',

  // Schedule Errors (5000-5999)
  SCHEDULE_NOT_FOUND = 'SCHEDULE_NOT_FOUND',
  SCHEDULE_CONFLICT = 'SCHEDULE_CONFLICT',
  INVALID_TIME_SLOT = 'INVALID_TIME_SLOT',

  // Proxy Errors (6000-6999)
  PROXY_NOT_FOUND = 'PROXY_NOT_FOUND',
  PROXY_CONNECTION_FAILED = 'PROXY_CONNECTION_FAILED',
  PROXY_AUTHENTICATION_FAILED = 'PROXY_AUTHENTICATION_FAILED',

  // Warmup Errors (7000-7999)
  WARMUP_NOT_FOUND = 'WARMUP_NOT_FOUND',
  WARMUP_ALREADY_ACTIVE = 'WARMUP_ALREADY_ACTIVE',
  WARMUP_NOT_STARTED = 'WARMUP_NOT_STARTED',

  // Group Errors (8000-8999)
  GROUP_NOT_FOUND = 'GROUP_NOT_FOUND',
  GROUP_ALREADY_EXISTS = 'GROUP_ALREADY_EXISTS',

  // Validation Errors (9000-9999)
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  INVALID_INPUT = 'INVALID_INPUT',
  MISSING_REQUIRED_FIELD = 'MISSING_REQUIRED_FIELD',
  INVALID_FORMAT = 'INVALID_FORMAT',

  // Rate Limiting (10000-10999)
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  TOO_MANY_REQUESTS = 'TOO_MANY_REQUESTS',

  // Instagram API Errors (11000-11999)
  INSTAGRAM_API_ERROR = 'INSTAGRAM_API_ERROR',
  INSTAGRAM_RATE_LIMIT = 'INSTAGRAM_RATE_LIMIT',
  INSTAGRAM_LOGIN_REQUIRED = 'INSTAGRAM_LOGIN_REQUIRED',
  INSTAGRAM_CHECKPOINT = 'INSTAGRAM_CHECKPOINT',
  INSTAGRAM_SHADOWBAN = 'INSTAGRAM_SHADOWBAN',

  // Database Errors (12000-12999)
  DATABASE_ERROR = 'DATABASE_ERROR',
  DATABASE_CONNECTION_FAILED = 'DATABASE_CONNECTION_FAILED',
  DUPLICATE_ENTRY = 'DUPLICATE_ENTRY',

  // Server Errors (13000-13999)
  INTERNAL_SERVER_ERROR = 'INTERNAL_SERVER_ERROR',
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE',
  TIMEOUT = 'TIMEOUT',

  // Unknown
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
}

/**
 * HTTP Status Code Mapping for Error Codes
 */
export const ErrorStatusMap: Record<ErrorCode, number> = {
  // Authentication & Authorization - 401/403
  [ErrorCode.UNAUTHORIZED]: 401,
  [ErrorCode.INVALID_TOKEN]: 401,
  [ErrorCode.TOKEN_EXPIRED]: 401,
  [ErrorCode.FORBIDDEN]: 403,
  [ErrorCode.INVALID_CREDENTIALS]: 401,

  // Account Errors - 404/409/403
  [ErrorCode.ACCOUNT_NOT_FOUND]: 404,
  [ErrorCode.ACCOUNT_ALREADY_EXISTS]: 409,
  [ErrorCode.ACCOUNT_SUSPENDED]: 403,
  [ErrorCode.ACCOUNT_BANNED]: 403,
  [ErrorCode.ACCOUNT_NOT_AUTHENTICATED]: 401,
  [ErrorCode.ACCOUNT_WARMING_UP]: 403,

  // User Errors - 404/409
  [ErrorCode.USER_NOT_FOUND]: 404,
  [ErrorCode.USER_ALREADY_EXISTS]: 409,

  // Post Errors - 404/400/409
  [ErrorCode.POST_NOT_FOUND]: 404,
  [ErrorCode.POST_ALREADY_SCHEDULED]: 409,
  [ErrorCode.POST_SCHEDULING_FAILED]: 400,
  [ErrorCode.INVALID_MEDIA_FORMAT]: 400,
  [ErrorCode.MEDIA_TOO_LARGE]: 413,
  [ErrorCode.CAPTION_TOO_LONG]: 400,

  // Schedule Errors - 404/409/400
  [ErrorCode.SCHEDULE_NOT_FOUND]: 404,
  [ErrorCode.SCHEDULE_CONFLICT]: 409,
  [ErrorCode.INVALID_TIME_SLOT]: 400,

  // Proxy Errors - 404/502/401
  [ErrorCode.PROXY_NOT_FOUND]: 404,
  [ErrorCode.PROXY_CONNECTION_FAILED]: 502,
  [ErrorCode.PROXY_AUTHENTICATION_FAILED]: 401,

  // Warmup Errors - 404/409/400
  [ErrorCode.WARMUP_NOT_FOUND]: 404,
  [ErrorCode.WARMUP_ALREADY_ACTIVE]: 409,
  [ErrorCode.WARMUP_NOT_STARTED]: 400,

  // Group Errors - 404/409
  [ErrorCode.GROUP_NOT_FOUND]: 404,
  [ErrorCode.GROUP_ALREADY_EXISTS]: 409,

  // Validation Errors - 400
  [ErrorCode.VALIDATION_ERROR]: 400,
  [ErrorCode.INVALID_INPUT]: 400,
  [ErrorCode.MISSING_REQUIRED_FIELD]: 400,
  [ErrorCode.INVALID_FORMAT]: 400,

  // Rate Limiting - 429
  [ErrorCode.RATE_LIMIT_EXCEEDED]: 429,
  [ErrorCode.TOO_MANY_REQUESTS]: 429,

  // Instagram API Errors - 502/429/401
  [ErrorCode.INSTAGRAM_API_ERROR]: 502,
  [ErrorCode.INSTAGRAM_RATE_LIMIT]: 429,
  [ErrorCode.INSTAGRAM_LOGIN_REQUIRED]: 401,
  [ErrorCode.INSTAGRAM_CHECKPOINT]: 403,
  [ErrorCode.INSTAGRAM_SHADOWBAN]: 403,

  // Database Errors - 500/503/409
  [ErrorCode.DATABASE_ERROR]: 500,
  [ErrorCode.DATABASE_CONNECTION_FAILED]: 503,
  [ErrorCode.DUPLICATE_ENTRY]: 409,

  // Server Errors - 500/503/504
  [ErrorCode.INTERNAL_SERVER_ERROR]: 500,
  [ErrorCode.SERVICE_UNAVAILABLE]: 503,
  [ErrorCode.TIMEOUT]: 504,

  // Unknown - 500
  [ErrorCode.UNKNOWN_ERROR]: 500,
};

/**
 * Helper to create standard success response
 */
export function createSuccessResponse<T>(
  data: T,
  meta?: SuccessResponse['meta'],
  requestId?: string
): SuccessResponse<T> {
  return {
    success: true,
    data,
    ...(meta && { meta }),
    ...(requestId && { requestId }),
    timestamp: new Date().toISOString(),
  };
}

/**
 * Helper to create standard error response
 */
export function createErrorResponse(
  code: ErrorCode,
  message: string,
  requestId: string,
  details?: any
): ErrorResponse {
  return {
    success: false,
    error: {
      code,
      message,
      requestId,
      timestamp: new Date().toISOString(),
      ...(details && { details }),
    },
  };
}

/**
 * Custom API Error Class
 */
export class ApiError extends Error {
  public readonly code: ErrorCode;
  public readonly statusCode: number;
  public readonly details?: any;

  constructor(code: ErrorCode, message: string, details?: any) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.statusCode = ErrorStatusMap[code] || 500;
    this.details = details;

    // Maintains proper stack trace for where our error was thrown
    Error.captureStackTrace(this, this.constructor);
  }
}
