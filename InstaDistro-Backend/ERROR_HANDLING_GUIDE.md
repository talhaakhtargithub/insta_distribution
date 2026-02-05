# Error Handling Guide

This guide explains how to use the standardized error handling system in the InstaDistro Backend API.

## Overview

All API responses now follow a consistent format with:
- Standard error codes for client-side handling
- Request correlation IDs for debugging
- Consistent response structure
- Proper HTTP status codes

## Standard Response Formats

### Success Response

```typescript
{
  "success": true,
  "data": { ... },
  "meta": {  // Optional pagination metadata
    "page": 1,
    "limit": 50,
    "total": 150,
    "hasMore": true
  },
  "requestId": "550e8400-e29b-41d4-a716-446655440000",
  "timestamp": "2024-02-05T12:00:00.000Z"
}
```

### Error Response

```typescript
{
  "success": false,
  "error": {
    "code": "ACCOUNT_NOT_FOUND",
    "message": "Account with ID abc123 not found",
    "details": { ... },  // Optional additional context
    "requestId": "550e8400-e29b-41d4-a716-446655440000",
    "timestamp": "2024-02-05T12:00:00.000Z"
  }
}
```

## Using ApiError in Controllers

### Basic Usage

```typescript
import { ApiError, ErrorCode } from '../middlewares/errorHandler.middleware';

export class AccountController {
  async getAccount(req: Request, res: Response) {
    const { id } = req.params;

    const account = await db.query('SELECT * FROM accounts WHERE id = $1', [id]);

    if (!account.rows[0]) {
      throw new ApiError(
        ErrorCode.ACCOUNT_NOT_FOUND,
        `Account with ID ${id} not found`
      );
    }

    res.json({
      success: true,
      data: account.rows[0]
    });
  }
}
```

### With Additional Details

```typescript
async createAccount(req: Request, res: Response) {
  const { username, password } = req.body;

  if (!username || !password) {
    throw new ApiError(
      ErrorCode.VALIDATION_ERROR,
      'Missing required fields',
      {
        missingFields: [
          !username && 'username',
          !password && 'password'
        ].filter(Boolean)
      }
    );
  }

  // ... create account logic
}
```

### Handling Instagram API Errors

```typescript
async postToInstagram(req: Request, res: Response) {
  try {
    await instagramClient.post(mediaData);
  } catch (error) {
    if (error.message.includes('rate limit')) {
      throw new ApiError(
        ErrorCode.INSTAGRAM_RATE_LIMIT,
        'Instagram rate limit exceeded. Please try again later.',
        {
          retryAfter: error.retryAfter,
          accountId: req.params.accountId
        }
      );
    }

    if (error.message.includes('checkpoint')) {
      throw new ApiError(
        ErrorCode.INSTAGRAM_CHECKPOINT,
        'Instagram requires additional verification',
        {
          accountId: req.params.accountId,
          checkpointUrl: error.checkpointUrl
        }
      );
    }

    // Generic Instagram error
    throw new ApiError(
      ErrorCode.INSTAGRAM_API_ERROR,
      'Instagram API error: ' + error.message,
      { originalError: error.message }
    );
  }
}
```

## Available Error Codes

### Authentication & Authorization (1000-1999)
- `UNAUTHORIZED` - User not authenticated
- `INVALID_TOKEN` - JWT token invalid or malformed
- `TOKEN_EXPIRED` - JWT token has expired
- `FORBIDDEN` - User doesn't have permission
- `INVALID_CREDENTIALS` - Wrong username/password

### Account Errors (2000-2999)
- `ACCOUNT_NOT_FOUND` - Account doesn't exist
- `ACCOUNT_ALREADY_EXISTS` - Account already registered
- `ACCOUNT_SUSPENDED` - Account is suspended
- `ACCOUNT_BANNED` - Account is banned
- `ACCOUNT_NOT_AUTHENTICATED` - Instagram credentials not verified
- `ACCOUNT_WARMING_UP` - Account in warmup phase (can't post yet)

### User Errors (3000-3999)
- `USER_NOT_FOUND` - User doesn't exist
- `USER_ALREADY_EXISTS` - User email already registered

### Post Errors (4000-4999)
- `POST_NOT_FOUND` - Post doesn't exist
- `POST_ALREADY_SCHEDULED` - Post already in queue
- `POST_SCHEDULING_FAILED` - Failed to schedule post
- `INVALID_MEDIA_FORMAT` - Unsupported media format
- `MEDIA_TOO_LARGE` - Media file exceeds size limit
- `CAPTION_TOO_LONG` - Caption exceeds character limit

### Schedule Errors (5000-5999)
- `SCHEDULE_NOT_FOUND` - Schedule doesn't exist
- `SCHEDULE_CONFLICT` - Time slot already taken
- `INVALID_TIME_SLOT` - Invalid scheduling time

### Proxy Errors (6000-6999)
- `PROXY_NOT_FOUND` - Proxy doesn't exist
- `PROXY_CONNECTION_FAILED` - Can't connect to proxy
- `PROXY_AUTHENTICATION_FAILED` - Proxy auth failed

### Warmup Errors (7000-7999)
- `WARMUP_NOT_FOUND` - Warmup not found
- `WARMUP_ALREADY_ACTIVE` - Warmup already running
- `WARMUP_NOT_STARTED` - Warmup hasn't been initiated

### Group Errors (8000-8999)
- `GROUP_NOT_FOUND` - Group doesn't exist
- `GROUP_ALREADY_EXISTS` - Group name already used

### Validation Errors (9000-9999)
- `VALIDATION_ERROR` - Generic validation error
- `INVALID_INPUT` - Invalid input format
- `MISSING_REQUIRED_FIELD` - Required field missing
- `INVALID_FORMAT` - Data format incorrect

### Rate Limiting (10000-10999)
- `RATE_LIMIT_EXCEEDED` - API rate limit exceeded
- `TOO_MANY_REQUESTS` - Too many requests

### Instagram API Errors (11000-11999)
- `INSTAGRAM_API_ERROR` - Generic Instagram error
- `INSTAGRAM_RATE_LIMIT` - Instagram rate limit hit
- `INSTAGRAM_LOGIN_REQUIRED` - Need to re-authenticate
- `INSTAGRAM_CHECKPOINT` - Instagram security checkpoint
- `INSTAGRAM_SHADOWBAN` - Account shadowbanned

### Database Errors (12000-12999)
- `DATABASE_ERROR` - Generic database error
- `DATABASE_CONNECTION_FAILED` - Can't connect to database
- `DUPLICATE_ENTRY` - Duplicate key violation

### Server Errors (13000-13999)
- `INTERNAL_SERVER_ERROR` - Generic server error
- `SERVICE_UNAVAILABLE` - Service temporarily unavailable
- `TIMEOUT` - Request timeout

## Helper Functions

### Creating Success Responses

```typescript
import { createSuccessResponse } from '../../types/responses';

// Simple success
res.json(createSuccessResponse(accountData));

// With pagination metadata
res.json(createSuccessResponse(
  accounts,
  {
    page: 1,
    limit: 50,
    total: 150,
    hasMore: true
  },
  req.requestId
));
```

### Creating Error Responses (Usually Not Needed)

The error handler middleware automatically converts `ApiError` instances to the standard format, so you typically just throw the error:

```typescript
throw new ApiError(ErrorCode.ACCOUNT_NOT_FOUND, 'Account not found');
```

But if you need to manually create an error response:

```typescript
import { createErrorResponse, ErrorCode } from '../../types/responses';

res.status(404).json(
  createErrorResponse(
    ErrorCode.ACCOUNT_NOT_FOUND,
    'Account not found',
    req.requestId,
    { accountId: req.params.id }
  )
);
```

## Request Correlation IDs

Every request automatically gets a unique `requestId` (UUID v4) added by the `requestIdMiddleware`. This ID:

1. **Is attached to the request object**: Access via `req.requestId`
2. **Is included in response headers**: `X-Request-ID` header
3. **Is included in all log entries**: For request tracing
4. **Is included in error responses**: For debugging

### Using Request IDs for Debugging

When a user reports an error:

1. Get the `requestId` from their error response
2. Search logs for that `requestId`:
   ```bash
   grep "550e8400-e29b-41d4-a716-446655440000" logs/app.log
   ```
3. See the full request context and error details

## Backwards Compatibility

The system maintains backwards compatibility with legacy error classes:

```typescript
// Old style (still works)
throw new ValidationError('Invalid input');
throw new NotFoundError('Resource not found');
throw new UnauthorizedError();
throw new ForbiddenError();

// New style (recommended)
throw new ApiError(ErrorCode.VALIDATION_ERROR, 'Invalid input');
throw new ApiError(ErrorCode.ACCOUNT_NOT_FOUND, 'Account not found');
throw new ApiError(ErrorCode.UNAUTHORIZED, 'Unauthorized');
throw new ApiError(ErrorCode.FORBIDDEN, 'Forbidden');
```

Legacy errors are automatically converted to the new format by the error handler.

## Client-Side Error Handling

Clients can handle errors consistently using the error codes:

```typescript
// TypeScript/JavaScript client example
try {
  const response = await fetch('/api/accounts/123');
  const data = await response.json();

  if (!data.success) {
    // Handle specific error codes
    switch (data.error.code) {
      case 'ACCOUNT_NOT_FOUND':
        showNotFoundMessage();
        break;
      case 'UNAUTHORIZED':
        redirectToLogin();
        break;
      case 'RATE_LIMIT_EXCEEDED':
        showRateLimitMessage(data.error.details.retryAfter);
        break;
      default:
        showGenericError(data.error.message);
    }
  }
} catch (error) {
  // Network error
  showNetworkError();
}
```

## Best Practices

1. **Use specific error codes**: Choose the most specific error code for the situation
2. **Provide helpful messages**: Error messages should help users understand what went wrong
3. **Include relevant details**: Add context that helps debugging (but don't leak sensitive data)
4. **Log errors properly**: The error handler logs automatically, but log additional context if needed
5. **Don't catch and ignore**: Let errors bubble up to the error handler
6. **Use async/await with try/catch**: Or use the `asyncHandler` wrapper for route handlers

## Example: Complete Controller

```typescript
import { Request, Response } from 'express';
import { ApiError, ErrorCode, asyncHandler } from '../middlewares/errorHandler.middleware';
import { createSuccessResponse } from '../../types/responses';
import { logger } from '../../config/logger';

export class AccountController {

  // Using asyncHandler wrapper (recommended)
  getAccount = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;

    logger.info('Fetching account', { accountId: id, requestId: req.requestId });

    const result = await db.query('SELECT * FROM accounts WHERE id = $1', [id]);

    if (!result.rows[0]) {
      throw new ApiError(
        ErrorCode.ACCOUNT_NOT_FOUND,
        `Account with ID ${id} not found`,
        { accountId: id }
      );
    }

    res.json(createSuccessResponse(result.rows[0], undefined, req.requestId));
  });

  // Using manual try/catch
  async createAccount(req: Request, res: Response) {
    try {
      const { username, password, accountType } = req.body;

      // Validation
      if (!username || !password) {
        throw new ApiError(
          ErrorCode.MISSING_REQUIRED_FIELD,
          'Username and password are required',
          {
            missingFields: [
              !username && 'username',
              !password && 'password'
            ].filter(Boolean)
          }
        );
      }

      // Check for duplicate
      const existing = await db.query(
        'SELECT id FROM accounts WHERE username = $1',
        [username]
      );

      if (existing.rows[0]) {
        throw new ApiError(
          ErrorCode.ACCOUNT_ALREADY_EXISTS,
          `Account with username ${username} already exists`,
          { username }
        );
      }

      // Create account
      const result = await db.query(
        'INSERT INTO accounts (username, password, account_type) VALUES ($1, $2, $3) RETURNING *',
        [username, password, accountType || 'personal']
      );

      logger.info('Account created', {
        accountId: result.rows[0].id,
        username,
        requestId: req.requestId
      });

      res.status(201).json(createSuccessResponse(result.rows[0], undefined, req.requestId));

    } catch (error) {
      // If it's already an ApiError, it will be handled by error middleware
      if (error instanceof ApiError) {
        throw error;
      }

      // Convert unexpected errors
      logger.error('Unexpected error creating account', { error, requestId: req.requestId });
      throw new ApiError(
        ErrorCode.INTERNAL_SERVER_ERROR,
        'Failed to create account',
        { originalError: error instanceof Error ? error.message : 'Unknown error' }
      );
    }
  }
}
```

## Migration Guide

To migrate existing controllers to the new error handling system:

1. **Import the new types**:
   ```typescript
   import { ApiError, ErrorCode } from '../middlewares/errorHandler.middleware';
   ```

2. **Replace old error throws**:
   ```typescript
   // Old
   return res.status(404).json({ success: false, error: 'Not found' });

   // New
   throw new ApiError(ErrorCode.ACCOUNT_NOT_FOUND, 'Account not found');
   ```

3. **Update success responses** (optional but recommended):
   ```typescript
   // Old
   res.json({ success: true, data: account });

   // New
   res.json(createSuccessResponse(account, undefined, req.requestId));
   ```

4. **Use asyncHandler wrapper**:
   ```typescript
   // Wrap async route handlers
   router.get('/accounts/:id', asyncHandler(controller.getAccount));
   ```

## Testing Error Responses

```bash
# Test not found error
curl -X GET http://localhost:3000/api/accounts/invalid-id

# Response:
{
  "success": false,
  "error": {
    "code": "ACCOUNT_NOT_FOUND",
    "message": "Account with ID invalid-id not found",
    "requestId": "550e8400-e29b-41d4-a716-446655440000",
    "timestamp": "2024-02-05T12:00:00.000Z"
  }
}

# Check response headers
curl -I http://localhost:3000/api/accounts/123
# Should include: X-Request-ID: 550e8400-e29b-41d4-a716-446655440000
```
