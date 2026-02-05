"use strict";
/**
 * Pagination Utilities
 * Phase 7: Performance Optimization
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.PAGINATION_LIMITS = void 0;
exports.parsePaginationParams = parsePaginationParams;
exports.parseCursorPaginationParams = parseCursorPaginationParams;
exports.createPaginatedResponse = createPaginatedResponse;
exports.createCursorPaginatedResponse = createCursorPaginatedResponse;
exports.encodeCursor = encodeCursor;
exports.decodeCursor = decodeCursor;
exports.buildCursorQuery = buildCursorQuery;
exports.getCacheKey = getCacheKey;
exports.sanitizeLimit = sanitizeLimit;
exports.sanitizePage = sanitizePage;
/**
 * Parse and validate pagination parameters
 */
function parsePaginationParams(query) {
    const limit = Math.min(Math.max(1, parseInt(query.limit || '50', 10)), 100);
    const page = Math.max(1, parseInt(query.page || '1', 10));
    const offset = (page - 1) * limit;
    return { limit, offset, page };
}
/**
 * Parse cursor pagination parameters
 */
function parseCursorPaginationParams(query) {
    const limit = Math.min(Math.max(1, parseInt(query.limit || '50', 10)), 100);
    const cursor = query.cursor;
    return { limit, cursor };
}
/**
 * Create paginated response
 */
function createPaginatedResponse(data, total, page, limit) {
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
function createCursorPaginatedResponse(data, limit, requestedLimit = limit) {
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
function encodeCursor(id) {
    return Buffer.from(id).toString('base64');
}
/**
 * Decode cursor (base64 decode to get the ID)
 */
function decodeCursor(cursor) {
    try {
        return Buffer.from(cursor, 'base64').toString('utf-8');
    }
    catch (error) {
        throw new Error('Invalid cursor');
    }
}
/**
 * SQL query helper for cursor-based pagination
 */
function buildCursorQuery(baseQuery, cursor, limit = 50, orderBy = 'created_at', direction = 'DESC') {
    const params = [];
    let query = baseQuery;
    // Add cursor condition if provided
    if (cursor) {
        try {
            const decodedCursor = decodeCursor(cursor);
            const operator = direction === 'DESC' ? '<' : '>';
            query += ` AND id ${operator} $${params.length + 1}`;
            params.push(decodedCursor);
        }
        catch (error) {
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
function getCacheKey(prefix, options) {
    if ('cursor' in options && options.cursor) {
        return `${prefix}:cursor:${options.cursor}:${options.limit || 50}`;
    }
    const page = 'page' in options ? options.page : 1;
    return `${prefix}:page:${page || 1}:${options.limit || 50}`;
}
/**
 * Helper to ensure consistent limit ranges
 */
exports.PAGINATION_LIMITS = {
    MIN: 1,
    DEFAULT: 50,
    MAX: 100,
};
/**
 * Validate and sanitize limit parameter
 */
function sanitizeLimit(limit) {
    const parsed = typeof limit === 'string' ? parseInt(limit, 10) : limit;
    if (!parsed || isNaN(parsed))
        return exports.PAGINATION_LIMITS.DEFAULT;
    return Math.min(Math.max(exports.PAGINATION_LIMITS.MIN, parsed), exports.PAGINATION_LIMITS.MAX);
}
/**
 * Validate and sanitize page parameter
 */
function sanitizePage(page) {
    const parsed = typeof page === 'string' ? parseInt(page, 10) : page;
    if (!parsed || isNaN(parsed) || parsed < 1)
        return 1;
    return parsed;
}
