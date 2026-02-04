/**
 * Instagram Error Types
 * Centralized error categorization for all Instagram API interactions.
 * Used by ErrorHandler to parse raw errors into structured types with
 * retry metadata and account impact assessment.
 */

export enum ErrorCategory {
  RATE_LIMIT = 'RATE_LIMIT',
  AUTHENTICATION = 'AUTHENTICATION',
  FORBIDDEN = 'FORBIDDEN',
  CHECKPOINT = 'CHECKPOINT',
  SHADOWBAN = 'SHADOWBAN',
  MEDIA = 'MEDIA',
  NETWORK = 'NETWORK',
  UNKNOWN = 'UNKNOWN',
}

export enum AccountAction {
  POST = 'post',
  LIKE = 'like',
  COMMENT = 'comment',
  FOLLOW = 'follow',
  DM = 'dm',
}

export interface ErrorContext {
  accountId?: string;
  username?: string;
  action?: string;
  mediaType?: string;
  attempt?: number;
  timestamp?: string;
}

/**
 * Base Instagram error with categorization and retry metadata
 */
export class InstagramError extends Error {
  category: ErrorCategory;
  retryable: boolean;
  statusCode: number;
  originalError?: any;

  constructor(
    message: string,
    category: ErrorCategory,
    retryable: boolean,
    statusCode: number = 500,
    originalError?: any
  ) {
    super(message);
    this.name = 'InstagramError';
    this.category = category;
    this.retryable = retryable;
    this.statusCode = statusCode;
    this.originalError = originalError;
    Object.setPrototypeOf(this, InstagramError.prototype);
  }

  toJSON() {
    return {
      name: this.name,
      message: this.message,
      category: this.category,
      retryable: this.retryable,
      statusCode: this.statusCode,
    };
  }
}

export class RateLimitError extends InstagramError {
  retryAfter: number;

  constructor(message: string = 'Instagram rate limit exceeded', retryAfter: number = 60) {
    super(message, ErrorCategory.RATE_LIMIT, true, 429);
    this.name = 'RateLimitError';
    this.retryAfter = retryAfter;
  }
}

export class AuthenticationError extends InstagramError {
  constructor(message: string = 'Authentication required or session expired') {
    super(message, ErrorCategory.AUTHENTICATION, false, 401);
    this.name = 'AuthenticationError';
  }
}

export class ForbiddenError extends InstagramError {
  constructor(message: string = 'Action blocked by Instagram') {
    super(message, ErrorCategory.FORBIDDEN, false, 403);
    this.name = 'ForbiddenError';
  }
}

export class CheckpointError extends InstagramError {
  constructor(message: string = 'Instagram requires identity verification') {
    super(message, ErrorCategory.CHECKPOINT, false, 403);
    this.name = 'CheckpointError';
  }
}

export class ShadowbanError extends InstagramError {
  constructor(message: string = 'Account activity detected as spam') {
    super(message, ErrorCategory.SHADOWBAN, false, 403);
    this.name = 'ShadowbanError';
  }
}

export class MediaError extends InstagramError {
  constructor(message: string = 'Invalid or unsupported media') {
    super(message, ErrorCategory.MEDIA, false, 400);
    this.name = 'MediaError';
  }
}

export class NetworkError extends InstagramError {
  constructor(message: string = 'Network connection failed', originalError?: any) {
    super(message, ErrorCategory.NETWORK, true, 503, originalError);
    this.name = 'NetworkError';
  }
}
