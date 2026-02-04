import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import compression from 'compression';
import { pool, closePool } from './config/database';
import { envConfig } from './config/env';
import { logger, requestLogger } from './config/logger';
import { apiLimiter, createAccountLimiter, bulkImportLimiter } from './api/middlewares/rateLimit.middleware';
import { securityHeaders, corsOptions, sanitizeInput } from './api/middlewares/security.middleware';
import accountsRouter from './api/routes/accounts.routes';
import postsRouter from './api/routes/posts.routes';
import oauthRouter from './api/routes/oauth.routes';
import warmupRouter from './api/routes/warmup.routes';
import variationsRouter from './api/routes/variations.routes';
import distributionRouter from './api/routes/distribution.routes';
import { startWarmupScheduler } from './jobs/WarmupJob';

const app = express();
const PORT = envConfig.PORT;

// Trust proxy (for rate limiting behind reverse proxy)
app.set('trust proxy', 1);

// Security middleware
app.use(securityHeaders);
app.use(cors(corsOptions));

// Body parsing middleware
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Compression middleware
app.use(compression());

// Request sanitization
app.use(sanitizeInput);

// Request logging
app.use(requestLogger);

// Health check endpoint (no rate limiting)
app.get('/health', async (_req: Request, res: Response) => {
  try {
    // Test database connection
    const dbResult = await pool.query('SELECT NOW()');
    const dbConnected = dbResult.rows.length > 0;

    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      database: dbConnected ? 'connected' : 'disconnected',
      uptime: process.uptime(),
      environment: envConfig.NODE_ENV,
      version: '1.0.0',
    });
  } catch (error) {
    logger.error('Health check failed', { error });
    res.status(500).json({
      status: 'error',
      database: 'disconnected',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// Root endpoint (API documentation)
app.get('/', (_req: Request, res: Response) => {
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
      warmup: {
        protocol: 'GET /api/warmup/protocol - Get 14-day warmup protocol',
        start: 'POST /api/warmup/start/:accountId - Start warmup for account',
        progress: 'GET /api/warmup/progress/:accountId - Get warmup progress',
        tasks: 'GET /api/warmup/tasks/:accountId/:day - Get tasks for specific day',
        pause: 'POST /api/warmup/pause/:accountId - Pause warmup',
        resume: 'POST /api/warmup/resume/:accountId - Resume warmup',
        skipToActive: 'POST /api/warmup/skip-to-active/:accountId - Skip warmup (risky)',
        accounts: 'GET /api/warmup/accounts - Get all accounts in warmup',
        stats: 'GET /api/warmup/stats - Get warmup statistics',
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
app.use('/api', apiLimiter);

// API Routes with specific rate limiters
app.use('/api/accounts', accountsRouter);
// Apply stricter rate limiting to account creation
app.post('/api/accounts', createAccountLimiter);
app.post('/api/accounts/bulk-import', bulkImportLimiter);

// Posts routes
app.use('/api/posts', postsRouter);

// OAuth routes (Instagram, Google, etc.)
app.use('/api/auth', oauthRouter);

// Warmup routes
app.use('/api/warmup', warmupRouter);

// Variation routes
app.use('/api/variations', variationsRouter);

// Distribution routes
app.use('/api/distribution', distributionRouter);

// Future routes (commented for now)
// app.use('/api/schedules', schedulesRouter);
// app.use('/api/swarm', swarmRouter);
// app.use('/api/proxies', proxiesRouter);

// 404 handler
app.use((_req: Request, res: Response) => {
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
app.use((err: Error, req: Request, res: Response, _next: NextFunction) => {
  logger.error('Unhandled error', {
    error: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
  });

  // Don't expose error details in production
  const message = envConfig.isDevelopment()
    ? err.message
    : 'An unexpected error occurred';

  res.status(500).json({
    error: 'Internal Server Error',
    message,
    ...(envConfig.isDevelopment() && { stack: err.stack }),
  });
});

// Start server
const server = app.listen(PORT, () => {
  logger.info('🚀 Instagram Swarm Distribution API');
  logger.info(`📍 Server running on http://localhost:${PORT}`);
  logger.info(`🌍 Environment: ${envConfig.NODE_ENV}`);
  logger.info(`🗄️  Database: ${envConfig.DB_NAME}@${envConfig.DB_HOST}:${envConfig.DB_PORT}`);
  logger.info(`✓ Ready to accept requests`);

  // Start background job schedulers
  logger.info('🔄 Starting background job schedulers...');
  startWarmupScheduler();
  logger.info('✓ Warmup scheduler started (checks every 5 minutes)');
});

// Graceful shutdown
const gracefulShutdown = async (signal: string) => {
  logger.info(`${signal} signal received: closing HTTP server`);

  server.close(async () => {
    logger.info('✓ HTTP server closed');

    try {
      await closePool();
      logger.info('✓ Database connections closed');
      process.exit(0);
    } catch (error) {
      logger.error('Error during shutdown', { error });
      process.exit(1);
    }
  });

  // Force shutdown after 10 seconds
  setTimeout(() => {
    logger.error('Could not close connections in time, forcefully shutting down');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason: any) => {
  logger.error('Unhandled Rejection', { reason });
});

// Handle uncaught exceptions
process.on('uncaughtException', (error: Error) => {
  logger.error('Uncaught Exception', { error: error.message, stack: error.stack });
  process.exit(1);
});

export default app;
