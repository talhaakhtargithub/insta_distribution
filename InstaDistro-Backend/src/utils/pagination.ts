/**
 * Pagination Utilities
 * Phase 7: Performance Optimization
 */

/**
 * Pagination options for offset-based pagination
 */
export interface PaginationOptions {
  page?: number;
  limit?: number;
}

/**
 * Cursor-based pagination options (more efficient for large datasets)
 */
export interface CursorPaginationOptions {
  cursor?: string;
  limit?: number;
}

/**
 * Paginated response structure
 */
export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    total?: number;
    page?: number;
    limit: number;
    totalPages?: number;
    hasMore: boolean;
    nextCursor?: string;
    prevCursor?: string;
  };
}

/**
 * Parse and validate pagination parameters
 */
export function parsePaginationParams(query: any): {
  limit: number;
  offset: number;
  page: number;
} {
  const limit = Math.min(Math.max(1, parseInt(query.limit || '50', 10)), 100);
  const page = Math.max(1, parseInt(query.page || '1', 10));
  const offset = (page - 1) * limit;

  return { limit, offset, page };
}

/**
 * Parse cursor pagination parameters
 */
export function parseCursorPaginationParams(query: any): {
  limit: number;
  cursor?: string;
} {
  const limit = Math.min(Math.max(1, parseInt(query.limit || '50', 10)), 100);
  const cursor = query.cursor as string | undefined;

  return { limit, cursor };
}

/**
 * Create paginated response
 */
export function createPaginatedResponse<T>(
  data: T[],
  total: number,
  page: number,
  limit: number
): PaginatedResponse<T> {
  const totalPages = Math.ceil(total / limit);
  const hasMore = page < totalPages;

  return {
    data,
    pagination: {
      total,
      page,
      limit,
      totalPages,
      hasMore,
    },
  };
}

/**
 * Create cursor-based paginated response
 * More efficient for large datasets
 */
export function createCursorPaginatedResponse<T extends { id: string; created_at?: Date }>(
  data: T[],
  limit: number,
  requestedLimit: number = limit
): PaginatedResponse<T> {
  // Check if there are more results
  const hasMore = data.length > requestedLimit;

  // If we fetched limit+1 items, remove the extra one
  const items = hasMore ? data.slice(0, requestedLimit) : data;

  // Generate cursors from the first and last items
  const nextCursor = hasMore && items.length > 0 ? encodeCursor(items[items.length - 1].id) : undefined;
  const prevCursor = items.length > 0 ? encodeCursor(items[0].id) : undefined;

  return {
    data: items,
    pagination: {
      limit: requestedLimit,
      hasMore,
      nextCursor,
      prevCursor,
    },
  };
}

/**
 * Encode cursor (base64 encode the ID)
 */
export function encodeCursor(id: string): string {
  return Buffer.from(id).toString('base64');
}

/**
 * Decode cursor (base64 decode to get the ID)
 */
export function decodeCursor(cursor: string): string {
  try {
    return Buffer.from(cursor, 'base64').toString('utf-8');
  } catch (error) {
    throw new Error('Invalid cursor');
  }
}

/**
 * SQL query helper for cursor-based pagination
 */
export function buildCursorQuery(
  baseQuery: string,
  cursor?: string,
  limit: number = 50,
  orderBy: string = 'created_at',
  direction: 'ASC' | 'DESC' = 'DESC'
): { query: string; params: any[] } {
  const params: any[] = [];
  let query = baseQuery;

  // Add cursor condition if provided
  if (cursor) {
    try {
      const decodedCursor = decodeCursor(cursor);
      const operator = direction === 'DESC' ? '<' : '>';
      query += ` AND id ${operator} $${params.length + 1}`;
      params.push(decodedCursor);
    } catch (error) {
      // Invalid cursor, ignore it
    }
  }

  // Add ordering and limit
  query += ` ORDER BY ${orderBy} ${direction}, id ${direction} LIMIT $${params.length + 1}`;
  params.push(limit + 1); // Fetch one extra to check if there are more results

  return { query, params };
}

/**
 * Cache key generator for paginated data
 */
export function getCacheKey(prefix: string, options: PaginationOptions | CursorPaginationOptions): string {
  if ('cursor' in options && options.cursor) {
    return `${prefix}:cursor:${options.cursor}:${options.limit || 50}`;
  }
  const page = 'page' in options ? options.page : 1;
  return `${prefix}:page:${page || 1}:${options.limit || 50}`;
}

/**
 * Helper to ensure consistent limit ranges
 */
export const PAGINATION_LIMITS = {
  MIN: 1,
  DEFAULT: 50,
  MAX: 100,
} as const;

/**
 * Validate and sanitize limit parameter
 */
export function sanitizeLimit(limit?: number | string): number {
  const parsed = typeof limit === 'string' ? parseInt(limit, 10) : limit;
  if (!parsed || isNaN(parsed)) return PAGINATION_LIMITS.DEFAULT;
  return Math.min(Math.max(PAGINATION_LIMITS.MIN, parsed), PAGINATION_LIMITS.MAX);
}

/**
 * Validate and sanitize page parameter
 */
export function sanitizePage(page?: number | string): number {
  const parsed = typeof page === 'string' ? parseInt(page, 10) : page;
  if (!parsed || isNaN(parsed) || parsed < 1) return 1;
  return parsed;
}
