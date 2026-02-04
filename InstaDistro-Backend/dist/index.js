"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const compression_1 = __importDefault(require("compression"));
const database_1 = require("./config/database");
const env_1 = require("./config/env");
const logger_1 = require("./config/logger");
const rateLimit_middleware_1 = require("./api/middlewares/rateLimit.middleware");
const security_middleware_1 = require("./api/middlewares/security.middleware");
const accounts_routes_1 = __importDefault(require("./api/routes/accounts.routes"));
const posts_routes_1 = __importDefault(require("./api/routes/posts.routes"));
const oauth_routes_1 = __importDefault(require("./api/routes/oauth.routes"));
const app = (0, express_1.default)();
const PORT = env_1.envConfig.PORT;
// Trust proxy (for rate limiting behind reverse proxy)
app.set('trust proxy', 1);
// Security middleware
app.use(security_middleware_1.securityHeaders);
app.use((0, cors_1.default)(security_middleware_1.corsOptions));
// Body parsing middleware
app.use(express_1.default.json({ limit: '50mb' }));
app.use(express_1.default.urlencoded({ extended: true, limit: '50mb' }));
// Compression middleware
app.use((0, compression_1.default)());
// Request sanitization
app.use(security_middleware_1.sanitizeInput);
// Request logging
app.use(logger_1.requestLogger);
// Health check endpoint (no rate limiting)
app.get('/health', async (_req, res) => {
    try {
        // Test database connection
        const dbResult = await database_1.pool.query('SELECT NOW()');
        const dbConnected = dbResult.rows.length > 0;
        res.json({
            status: 'ok',
            timestamp: new Date().toISOString(),
            database: dbConnected ? 'connected' : 'disconnected',
            uptime: process.uptime(),
            environment: env_1.envConfig.NODE_ENV,
            version: '1.0.0',
        });
    }
    catch (error) {
        logger_1.logger.error('Health check failed', { error });
        res.status(500).json({
            status: 'error',
            database: 'disconnected',
            error: error instanceof Error ? error.message : 'Unknown error',
        });
    }
});
// Root endpoint (API documentation)
app.get('/', (_req, res) => {
    res.json({
        name: 'Instagram Swarm Distribution API',
        version: '1.0.0',
        status: 'running',
        documentation: {
            health: 'GET /health - Check API health status',
            accounts: {
                list: 'GET /api/accounts - List all accounts',
                create: 'POST /api/accounts - Create new account',
                get: 'GET /api/accounts/:id - Get account by ID',
                update: 'PUT /api/accounts/:id - Update account',
                delete: 'DELETE /api/accounts/:id - Delete account',
                verify: 'POST /api/accounts/:id/verify - Verify Instagram credentials',
                bulkImport: 'POST /api/accounts/bulk-import - Bulk import accounts',
                stats: 'GET /api/accounts/stats/swarm - Get swarm statistics',
            },
            rateLimits: {
                general: '100 requests per 15 minutes',
                accountCreation: '10 requests per hour',
                bulkImport: '3 requests per hour',
            },
        },
        links: {
            github: 'https://github.com/talhaakhtargithub/insta_distribution',
            docs: '/api/docs',
        },
    });
});
// Apply rate limiting to API routes
app.use('/api', rateLimit_middleware_1.apiLimiter);
// API Routes with specific rate limiters
app.use('/api/accounts', accounts_routes_1.default);
// Apply stricter rate limiting to account creation
app.post('/api/accounts', rateLimit_middleware_1.createAccountLimiter);
app.post('/api/accounts/bulk-import', rateLimit_middleware_1.bulkImportLimiter);
// Posts routes
app.use('/api/posts', posts_routes_1.default);
// OAuth routes (Instagram, Google, etc.)
app.use('/api/auth', oauth_routes_1.default);
// Future routes (commented for now)
// app.use('/api/schedules', schedulesRouter);
// app.use('/api/swarm', swarmRouter);
// app.use('/api/warmup', warmupRouter);
// app.use('/api/proxies', proxiesRouter);
// 404 handler
app.use((_req, res) => {
    res.status(404).json({
        error: 'Not Found',
        message: 'The requested endpoint does not exist',
        availableEndpoints: [
            'GET /',
            'GET /health',
            'GET /api/accounts',
            'POST /api/accounts',
        ],
    });
});
// Global error handler
app.use((err, req, res, _next) => {
    logger_1.logger.error('Unhandled error', {
        error: err.message,
        stack: err.stack,
        path: req.path,
        method: req.method,
    });
    // Don't expose error details in production
    const message = env_1.envConfig.isDevelopment()
        ? err.message
        : 'An unexpected error occurred';
    res.status(500).json({
        error: 'Internal Server Error',
        message,
        ...(env_1.envConfig.isDevelopment() && { stack: err.stack }),
    });
});
// Start server
const server = app.listen(PORT, () => {
    logger_1.logger.info('🚀 Instagram Swarm Distribution API');
    logger_1.logger.info(`📍 Server running on http://localhost:${PORT}`);
    logger_1.logger.info(`🌍 Environment: ${env_1.envConfig.NODE_ENV}`);
    logger_1.logger.info(`🗄️  Database: ${env_1.envConfig.DB_NAME}@${env_1.envConfig.DB_HOST}:${env_1.envConfig.DB_PORT}`);
    logger_1.logger.info(`✓ Ready to accept requests`);
});
// Graceful shutdown
const gracefulShutdown = async (signal) => {
    logger_1.logger.info(`${signal} signal received: closing HTTP server`);
    server.close(async () => {
        logger_1.logger.info('✓ HTTP server closed');
        try {
            await (0, database_1.closePool)();
            logger_1.logger.info('✓ Database connections closed');
            process.exit(0);
        }
        catch (error) {
            logger_1.logger.error('Error during shutdown', { error });
            process.exit(1);
        }
    });
    // Force shutdown after 10 seconds
    setTimeout(() => {
        logger_1.logger.error('Could not close connections in time, forcefully shutting down');
        process.exit(1);
    }, 10000);
};
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
// Handle unhandled promise rejections
process.on('unhandledRejection', (reason) => {
    logger_1.logger.error('Unhandled Rejection', { reason });
});
// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
    logger_1.logger.error('Uncaught Exception', { error: error.message, stack: error.stack });
    process.exit(1);
});
exports.default = app;
