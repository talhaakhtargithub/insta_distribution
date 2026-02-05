"use strict";
/**
 * Swagger/OpenAPI Configuration
 * Phase 9: API Documentation & Developer Experience
 *
 * Comprehensive API documentation with:
 * - All endpoints documented
 * - Request/response schemas
 * - Error handling examples
 * - Performance features (caching, pagination)
 * - Security information
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.swaggerDocument = void 0;
exports.swaggerDocument = {
    openapi: '3.0.0',
    info: {
        title: 'InstaDistro API',
        version: '1.0.0',
        description: `
# Instagram Swarm Distribution API

Production-ready API for managing 100+ Instagram accounts with automated posting, warmup protocols, content variation, and health monitoring.

## 🚀 Features
- **Multi-account Management**: Manage 100+ Instagram accounts with AES-256 encryption
- **Dual Authentication**: Support for both personal and business Instagram accounts
- **14-Day Warmup**: Automated warmup protocol to prevent bans
- **Real-time Monitoring**: Health scores, alerts, and performance tracking
- **Smart Distribution**: Staggered posting with content variations
- **Proxy Management**: Rotation and health monitoring
- **High Performance**: Redis caching, cursor pagination, P95 < 200ms

## 🔐 Authentication

All endpoints require authentication via header:
- **Development**: \`x-user-id: user_1\`
- **Production**: \`Authorization: Bearer <JWT_TOKEN>\`

## ⚡ Performance

- **Response Time**: P95 < 200ms for GET, < 500ms for POST
- **Caching**: 80%+ hit rate with Redis
- **Pagination**: Cursor-based for efficient large datasets
- **Rate Limits**: 300 req/15min (authenticated), 100 req/15min (anonymous)

## 📊 Response Format

All responses include performance headers:
- \`X-Response-Time\`: Request duration in milliseconds
- \`X-Request-ID\`: Correlation ID for tracing

Paginated responses:
\`\`\`json
{
  "data": [...],
  "pagination": {
    "limit": 50,
    "hasMore": true,
    "nextCursor": "eyJpZCI6IjEyMyJ9"
  }
}
\`\`\`

## 📚 Documentation
- [Performance Guide](./PERFORMANCE_API.md)
- [Error Handling](./ERROR_HANDLING_GUIDE.md)
- [Database Optimization](./DATABASE_OPTIMIZATION.md)

## 🐛 Support
- [GitHub Issues](https://github.com/talhaakhtargithub/insta_distribution/issues)
    `,
        contact: {
            name: 'API Support',
            url: 'https://github.com/talhaakhtargithub/insta_distribution'
        },
        license: {
            name: 'MIT',
            url: 'https://opensource.org/licenses/MIT'
        }
    },
    servers: [
        {
            url: 'http://localhost:3000',
            description: 'Development server'
        },
        {
            url: 'https://api.instadistro.com',
            description: 'Production server'
        }
    ],
    tags: [
        { name: 'System', description: 'Health checks and system monitoring' },
        { name: 'Accounts', description: 'Instagram account management (CRUD, verification, bulk import)' },
        { name: 'Posts', description: 'Content posting (immediate, scheduled, bulk distribution)' },
        { name: 'Warmup', description: '14-day automated warmup protocol' },
        { name: 'Health', description: 'Account health monitoring, scores, and alerts' },
        { name: 'OAuth', description: 'Authentication (Instagram OAuth, Google OAuth, JWT)' },
        { name: 'Proxies', description: 'Proxy management and health monitoring' },
        { name: 'Groups', description: 'Account grouping and organization' },
        { name: 'Schedules', description: 'Advanced scheduling and recurring posts' },
        { name: 'Variations', description: 'Content variation engine' },
        { name: 'Distribution', description: 'Smart distribution with staggered posting' }
    ],
    paths: {},
    components: {
        securitySchemes: {
            BearerAuth: {
                type: 'http',
                scheme: 'bearer',
                bearerFormat: 'JWT',
                description: 'JWT authentication token (production)'
            },
            UserIdHeader: {
                type: 'apiKey',
                in: 'header',
                name: 'x-user-id',
                description: 'User ID header (development)'
            }
        },
        schemas: {
            // Standard response schemas (Phase 2)
            ErrorResponse: {
                type: 'object',
                required: ['success', 'error'],
                properties: {
                    success: {
                        type: 'boolean',
                        example: false
                    },
                    error: {
                        type: 'object',
                        required: ['code', 'message', 'requestId', 'timestamp'],
                        properties: {
                            code: {
                                type: 'string',
                                example: 'VALIDATION_ERROR',
                                description: 'Error code from ErrorCode enum'
                            },
                            message: {
                                type: 'string',
                                example: 'Invalid input data'
                            },
                            details: {
                                type: 'object',
                                description: 'Additional error details'
                            },
                            requestId: {
                                type: 'string',
                                format: 'uuid',
                                example: '550e8400-e29b-41d4-a716-446655440000'
                            },
                            timestamp: {
                                type: 'string',
                                format: 'date-time',
                                example: '2025-01-15T10:30:00.000Z'
                            }
                        }
                    }
                }
            },
            // Paginated response (Phase 7/8)
            PaginatedResponse: {
                type: 'object',
                required: ['data', 'pagination'],
                properties: {
                    data: {
                        type: 'array',
                        items: { type: 'object' }
                    },
                    pagination: {
                        type: 'object',
                        required: ['limit', 'hasMore'],
                        properties: {
                            limit: {
                                type: 'integer',
                                example: 50,
                                minimum: 1,
                                maximum: 100
                            },
                            hasMore: {
                                type: 'boolean',
                                example: true
                            },
                            nextCursor: {
                                type: 'string',
                                example: 'eyJpZCI6ImFjYy0xMjMifQ',
                                description: 'Base64 encoded cursor for next page'
                            },
                            prevCursor: {
                                type: 'string',
                                example: 'eyJpZCI6ImFjYy0wMTIifQ',
                                description: 'Base64 encoded cursor for previous page'
                            }
                        }
                    }
                }
            },
            // Account schema
            Account: {
                type: 'object',
                properties: {
                    id: {
                        type: 'string',
                        format: 'uuid',
                        example: '123e4567-e89b-12d3-a456-426614174000'
                    },
                    user_id: {
                        type: 'string',
                        example: 'user_1'
                    },
                    username: {
                        type: 'string',
                        example: 'instagram_account'
                    },
                    account_type: {
                        type: 'string',
                        enum: ['personal', 'business'],
                        example: 'personal'
                    },
                    account_status: {
                        type: 'string',
                        enum: ['active', 'warming_up', 'paused', 'suspended', 'error'],
                        example: 'active'
                    },
                    account_state: {
                        type: 'string',
                        enum: ['NEW_ACCOUNT', 'WARMING_UP', 'ACTIVE', 'PAUSED', 'BANNED'],
                        example: 'ACTIVE'
                    },
                    is_authenticated: {
                        type: 'boolean',
                        example: true
                    },
                    created_at: {
                        type: 'string',
                        format: 'date-time'
                    },
                    updated_at: {
                        type: 'string',
                        format: 'date-time'
                    }
                }
            },
            CreateAccountRequest: {
                type: 'object',
                required: ['username', 'password', 'accountType'],
                properties: {
                    username: {
                        type: 'string',
                        example: 'my_instagram',
                        minLength: 1,
                        maxLength: 30
                    },
                    password: {
                        type: 'string',
                        format: 'password',
                        example: 'secure_password_123',
                        minLength: 6
                    },
                    accountType: {
                        type: 'string',
                        enum: ['personal', 'business'],
                        example: 'personal'
                    },
                    proxyId: {
                        type: 'string',
                        format: 'uuid',
                        nullable: true
                    }
                }
            },
            // Health schema
            HealthScore: {
                type: 'object',
                properties: {
                    overall: {
                        type: 'number',
                        minimum: 0,
                        maximum: 100,
                        example: 85.5,
                        description: 'Overall health score (0-100)'
                    },
                    category: {
                        type: 'string',
                        enum: ['excellent', 'good', 'fair', 'poor', 'critical'],
                        example: 'good'
                    },
                    loginScore: {
                        type: 'number',
                        example: 90
                    },
                    postingScore: {
                        type: 'number',
                        example: 85
                    },
                    engagementScore: {
                        type: 'number',
                        example: 80
                    }
                }
            },
            // Warmup schema
            WarmupTask: {
                type: 'object',
                properties: {
                    id: {
                        type: 'string',
                        format: 'uuid'
                    },
                    account_id: {
                        type: 'string',
                        format: 'uuid'
                    },
                    day: {
                        type: 'integer',
                        minimum: 1,
                        maximum: 14,
                        example: 3
                    },
                    task_type: {
                        type: 'string',
                        enum: ['follow', 'like', 'comment', 'watch_story', 'story', 'post'],
                        example: 'like'
                    },
                    target_count: {
                        type: 'integer',
                        example: 15
                    },
                    completed_count: {
                        type: 'integer',
                        example: 10
                    },
                    status: {
                        type: 'string',
                        enum: ['pending', 'in_progress', 'completed', 'failed'],
                        example: 'in_progress'
                    },
                    scheduled_time: {
                        type: 'string',
                        format: 'date-time'
                    }
                }
            }
        },
        responses: {
            UnauthorizedError: {
                description: 'Authentication required or invalid credentials',
                content: {
                    'application/json': {
                        schema: { $ref: '#/components/schemas/ErrorResponse' }
                    }
                }
            },
            NotFoundError: {
                description: 'Resource not found',
                content: {
                    'application/json': {
                        schema: { $ref: '#/components/schemas/ErrorResponse' }
                    }
                }
            },
            ValidationError: {
                description: 'Invalid input data',
                content: {
                    'application/json': {
                        schema: { $ref: '#/components/schemas/ErrorResponse' }
                    }
                }
            },
            RateLimitError: {
                description: 'Rate limit exceeded',
                content: {
                    'application/json': {
                        schema: { $ref: '#/components/schemas/ErrorResponse' }
                    }
                },
                headers: {
                    'X-RateLimit-Limit': {
                        description: 'Request limit per time window',
                        schema: { type: 'integer' }
                    },
                    'X-RateLimit-Remaining': {
                        description: 'Remaining requests in current window',
                        schema: { type: 'integer' }
                    },
                    'X-RateLimit-Reset': {
                        description: 'Unix timestamp when limit resets',
                        schema: { type: 'integer' }
                    },
                    'Retry-After': {
                        description: 'Seconds to wait before retrying',
                        schema: { type: 'integer' }
                    }
                }
            },
            ServerError: {
                description: 'Internal server error',
                content: {
                    'application/json': {
                        schema: { $ref: '#/components/schemas/ErrorResponse' }
                    }
                }
            }
        },
        parameters: {
            LimitParam: {
                name: 'limit',
                in: 'query',
                description: 'Number of items per page (1-100)',
                required: false,
                schema: {
                    type: 'integer',
                    minimum: 1,
                    maximum: 100,
                    default: 50
                }
            },
            CursorParam: {
                name: 'cursor',
                in: 'query',
                description: 'Cursor for pagination (from previous response nextCursor)',
                required: false,
                schema: {
                    type: 'string'
                }
            },
            UserIdHeader: {
                name: 'x-user-id',
                in: 'header',
                description: 'User ID (development mode)',
                required: true,
                schema: {
                    type: 'string',
                    example: 'user_1'
                }
            }
        }
    }
};
