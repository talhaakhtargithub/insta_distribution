import {
  InstagramError,
  ErrorCategory,
  RateLimitError,
  AuthenticationError,
  ForbiddenError,
  CheckpointError,
  ShadowbanError,
  MediaError,
  NetworkError,
  ErrorContext,
} from '../../types/errors';
import { logger } from '../../config/logger';
import { pool } from '../../config/database';

/**
 * Centralized Instagram error handler.
 * Parses raw errors from Private API and Graph API into structured
 * InstagramError instances, determines retry eligibility, and
 * auto-pauses accounts when critical errors are detected.
 */
export class ErrorHandler {
  /**
   * Parse a raw error into a categorized InstagramError
   */
  static handleInstagramError(error: any, context?: ErrorContext): InstagramError {
    const msg = (error.message || '').toLowerCase();
    const responseMsg = (error.response?.data?.error?.message || '').toLowerCase();
    const errorName = (error.name || '').toLowerCase();
    const combined = `${msg} ${responseMsg} ${errorName}`;

    // --- Rate Limit ---
    if (
      error.response?.status === 429 ||
      combined.includes('rate limit') ||
      combined.includes('too many') ||
      combined.includes('please wait') ||
      combined.includes('slow down') ||
      combined.includes('action_limited')
    ) {
      const retryAfter = parseInt(error.response?.headers?.['retry-after'], 10) || 60;
      return new RateLimitError('Instagram rate limit hit — backing off', retryAfter);
    }

    // --- Checkpoint / 2FA ---
    if (
      errorName.includes('checkpoint') ||
      errorName.includes('twofactor') ||
      combined.includes('checkpoint') ||
      combined.includes('challenge_required') ||
      combined.includes('verification required') ||
      combined.includes('two-factor') ||
      combined.includes('2fa')
    ) {
      return new CheckpointError();
    }

    // --- Authentication ---
    if (
      error.response?.status === 401 ||
      errorName.includes('loginrequired') ||
      combined.includes('invalid credentials') ||
      combined.includes('session expired') ||
      combined.includes('login required') ||
      combined.includes('not logged in')
    ) {
      return new AuthenticationError(error.message || 'Session expired — re-authentication needed');
    }

    // --- Shadowban / Spam ---
    if (
      combined.includes('shadowban') ||
      combined.includes('spam') ||
      combined.includes('suppressed') ||
      combined.includes('flagged')
    ) {
      return new ShadowbanError();
    }

    // --- Forbidden / Banned / Blocked ---
    if (
      error.response?.status === 403 ||
      combined.includes('forbidden') ||
      combined.includes('banned') ||
      combined.includes('blocked') ||
      combined.includes('action_blocked') ||
      combined.includes('account_banned') ||
      combined.includes('not allowed')
    ) {
      return new ForbiddenError(error.message || 'Action blocked by Instagram');
    }

    // --- Media Errors ---
    if (
      combined.includes('invalid media') ||
      combined.includes('media too large') ||
      combined.includes('unsupported media') ||
      combined.includes('transcode') ||
      combined.includes('video too long') ||
      combined.includes('invalid image') ||
      combined.includes('bad image') ||
      combined.includes('invalid video')
    ) {
      return new MediaError(error.message || 'Media file is invalid or unsupported');
    }

    // --- Network / Connection ---
    if (
      error.code === 'ECONNRESET' ||
      error.code === 'ETIMEDOUT' ||
      error.code === 'ECONNREFUSED' ||
      error.code === 'ENETUNREACH' ||
      combined.includes('network error') ||
      combined.includes('connection reset') ||
      combined.includes('request timeout') ||
      combined.includes('getaddrinfo')
    ) {
      return new NetworkError(error.message || 'Network connection failed', error);
    }

    // --- Fallback ---
    return new InstagramError(
      error.message || 'An unexpected Instagram error occurred',
      ErrorCategory.UNKNOWN,
      true
    );
  }

  /**
   * Should this error be retried?
   */
  static shouldRetry(error: InstagramError): boolean {
    return error.retryable;
  }

  /**
   * Calculate delay before next retry attempt.
   * RateLimitErrors use the server-provided retry-after.
   * Everything else uses exponential backoff capped at 3 minutes.
   */
  static getRetryDelay(error: InstagramError, attempt: number): number {
    if (error instanceof RateLimitError) {
      return error.retryAfter * 1000;
    }
    // Exponential: 5s → 30s → 180s
    return Math.min(5000 * Math.pow(6, attempt - 1), 180000);
  }

  /**
   * Structured error logging
   */
  static logError(error: InstagramError, context: ErrorContext): void {
    const level = error.category === ErrorCategory.NETWORK ? 'warn' : 'error';
    logger[level](`[${error.category}] ${error.message}`, {
      category: error.category,
      retryable: error.retryable,
      statusCode: error.statusCode,
      ...context,
    });
  }

  /**
   * Auto-pause account on critical errors (forbidden, checkpoint, shadowban).
   * Writes pause duration and reason to the accounts table.
   */
  static async pauseAccountIfNeeded(accountId: string, error: InstagramError): Promise<void> {
    const pauseDurations: Partial<Record<ErrorCategory, number>> = {
      [ErrorCategory.SHADOWBAN]: 86400,    // 24 hours
      [ErrorCategory.FORBIDDEN]: 3600,     // 1 hour
      [ErrorCategory.CHECKPOINT]: 1800,    // 30 minutes
    };

    const duration = pauseDurations[error.category];
    if (duration === undefined) return;

    try {
      const pauseUntil = new Date(Date.now() + duration * 1000);

      await pool.query(
        `UPDATE accounts SET
          account_status = 'paused',
          auto_paused_until = $1,
          pause_reason = $2,
          updated_at = NOW()
        WHERE id = $3`,
        [pauseUntil.toISOString(), `${error.category}: ${error.message}`, accountId]
      );

      logger.warn(`Account ${accountId} auto-paused until ${pauseUntil.toISOString()}`, {
        category: error.category,
        reason: error.message,
        durationSeconds: duration,
      });
    } catch (dbError) {
      logger.error('Failed to auto-pause account in database:', { accountId, dbError });
    }
  }
}
