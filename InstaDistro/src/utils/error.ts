/**
 * Error handling utilities
 */

export class AppError extends Error {
  constructor(
    message: string,
    public code?: string,
    public statusCode?: number
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export function getErrorMessage(error: unknown): string {
  if (error instanceof AppError) {
    return error.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === 'string') {
    return error;
  }

  return 'An unexpected error occurred';
}

export function isNetworkError(error: unknown): boolean {
  if (error instanceof Error) {
    return (
      error.message.includes('Network') ||
      error.message.includes('timeout') ||
      error.message.includes('connection')
    );
  }
  return false;
}

export function handleAPIError(error: unknown): AppError {
  if (error instanceof AppError) {
    return error;
  }

  if (error instanceof Error) {
    if (error.message.includes('401') || error.message.includes('403')) {
      return new AppError('Authentication failed', 'AUTH_ERROR', 401);
    }

    if (error.message.includes('404')) {
      return new AppError('Resource not found', 'NOT_FOUND', 404);
    }

    if (error.message.includes('500')) {
      return new AppError('Server error. Please try again later', 'SERVER_ERROR', 500);
    }

    if (isNetworkError(error)) {
      return new AppError(
        'Network error. Check your connection',
        'NETWORK_ERROR'
      );
    }

    return new AppError(error.message, 'UNKNOWN_ERROR');
  }

  return new AppError('An unexpected error occurred', 'UNKNOWN_ERROR');
}

export async function retryAsync<T>(
  fn: () => Promise<T>,
  retries = 3,
  delay = 1000
): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    if (retries === 0) {
      throw error;
    }

    await new Promise(resolve => setTimeout(resolve, delay));
    return retryAsync(fn, retries - 1, delay * 2);
  }
}

export function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number
): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new AppError('Operation timed out', 'TIMEOUT')), timeoutMs)
    ),
  ]);
}
