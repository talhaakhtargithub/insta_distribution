import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import compression from 'compression';
import { pool, closePool } from './config/database';
import { envConfig } from './config/env';
import { logger, requestLogger } from './config/logger';
import { apiLimiter, createAccountLimiter, bulkImportLimiter } from './api/middlewares/rateLimit.middleware';
import { securityHeaders, corsOptions, sanitizeInput, validateInput } from './api/middlewares/security.middleware';
import { requestIdMiddleware } from './api/middlewares/requestId.middleware';
import accountsRouter from './api/routes/accounts.routes';
import postsRouter from './api/routes/posts.routes';
import oauthRouter from './api/routes/oauth.routes';
import warmupRouter from './api/routes/warmup.routes';
import variationsRouter from './api/routes/variations.routes';
import distributionRouter from './api/routes/distribution.routes';
import groupsRouter from './api/routes/groups.routes';
import healthRouter from './api/routes/health.routes';
import proxyRouter from './api/routes/proxy.routes';
import schedulesRouter from './api/routes/schedules.routes';
import { startWarmupScheduler } from './jobs/WarmupJob';
import { scheduleAutoMonitoring } from './jobs/HealthMonitorJob';
import { scheduleProxyHealthChecks } from './jobs/ProxyJob';
import { startScheduleProcessor } from './jobs/ScheduleJob';
import { performanceMiddleware } from './utils/performance';
import swaggerUi from 'swagger-ui-express';
import { swaggerDocument } from './config/swagger';

const app = express();
const PORT = envConfig.PORT;

// Trust proxy (for rate limiting behind reverse proxy)
app.set('trust proxy', 1);

// Security middleware
app.use(securityHeaders);
app.use(cors(corsOptions));

// Request ID middleware (must be early so all logs include request ID)
app.use(requestIdMiddleware);

// Performance monitoring middleware
app.use(performanceMiddleware);

// Body parsing middleware
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Compression middleware
app.use(compression());

// Request sanitization
app.use(sanitizeInput);

// Input validation
app.use(validateInput);

// Request logging
app.use(requestLogger);

// Serve static files (security.txt, etc.)
app.use('/.well-known', express.static('public/.well-known'));

// API Documentation (Swagger UI) - Phase 9
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument, {
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'InstaDistro API Documentation',
  swaggerOptions: {
    persistAuthorization: true,
    displayRequestDuration: true,
    filter: true,
  },
}));

// Serve OpenAPI spec as JSON
app.get('/api/docs/openapi.json', (_req: Request, res: Response) => {
  res.json(swaggerDocument);
});

// Health check endpoint (no rate limiting) - Enhanced in Phase 9
app.get('/health', async (_req: Request, res: Response) => {
  try {
    // Test database connection
    const dbResult = await pool.query('SELECT NOW()');
    const dbConnected = dbResult.rows.length > 0;

    // Memory usage
    const memoryUsage = process.memoryUsage();
    const formatBytes = (bytes: number) => Math.round(bytes / 1024 / 1024 * 100) / 100;

    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      environment: envConfig.NODE_ENV,
      uptime: {
        seconds: Math.floor(process.uptime()),
        formatted: formatUptime(process.uptime()),
      },
      services: {
        database: dbConnected ? 'connected' : 'disconnected',
        api: 'running',
      },
      memory: {
        heapUsed: `${formatBytes(memoryUsage.heapUsed)} MB`,
        heapTotal: `${formatBytes(memoryUsage.heapTotal)} MB`,
        rss: `${formatBytes(memoryUsage.rss)} MB`,
        external: `${formatBytes(memoryUsage.external)} MB`,
      },
      documentation: '/api/docs',
    });
  } catch (error) {
    logger.error('Health check failed', { error });
    if (!res.headersSent) {
      res.status(500).json({
        status: 'error',
        timestamp: new Date().toISOString(),
        services: {
          database: 'disconnected',
          api: 'running',
        },
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
});

// Helper function to format uptime
function formatUptime(seconds: number): string {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  const parts = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  parts.push(`${secs}s`);

  return parts.join(' ');
}

// API Metrics endpoint - Phase 9
app.get('/api/metrics', async (_req: Request, res: Response) => {
  try {
    // Get database stats
    const dbStats = await pool.query(`
      SELECT
        (SELECT count(*) FROM accounts) as total_accounts,
        (SELECT count(*) FROM accounts WHERE account_state = 'ACTIVE') as active_accounts,
        (SELECT count(*) FROM accounts WHERE account_state = 'WARMING_UP') as warming_up_accounts,
        (SELECT count(*) FROM warmup_tasks WHERE status = 'pending') as pending_warmup_tasks,
        (SELECT count(*) FROM post_results WHERE created_at > NOW() - INTERVAL '24 hours') as posts_last_24h
    `);

    const stats = dbStats.rows[0] || {};
    const memoryUsage = process.memoryUsage();

    res.json({
      timestamp: new Date().toISOString(),
      system: {
        uptime: process.uptime(),
        nodeVersion: process.version,
        platform: process.platform,
        memoryUsage: {
          heapUsedMB: Math.round(memoryUsage.heapUsed / 1024 / 1024),
          heapTotalMB: Math.round(memoryUsage.heapTotal / 1024 / 1024),
          rssMB: Math.round(memoryUsage.rss / 1024 / 1024),
        },
      },
      accounts: {
        total: parseInt(stats.total_accounts) || 0,
        active: parseInt(stats.active_accounts) || 0,
        warmingUp: parseInt(stats.warming_up_accounts) || 0,
      },
      activity: {
        pendingWarmupTasks: parseInt(stats.pending_warmup_tasks) || 0,
        postsLast24h: parseInt(stats.posts_last_24h) || 0,
      },
      performance: {
        targetResponseTime: 'P95 < 200ms',
        cacheHitRateTarget: '> 80%',
      },
    });
  } catch (error) {
    logger.error('Metrics endpoint error', { error });
    res.status(500).json({
      error: 'Failed to fetch metrics',
      message: error instanceof Error ? error.message : 'Unknown error',
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

// Groups routes
app.use('/api/groups', groupsRouter);

// Health monitoring routes
app.use('/api/health', healthRouter);

// Proxy management routes
app.use('/api/proxies', proxyRouter);

// Schedule management routes
app.use('/api/schedules', schedulesRouter);

// Future routes (commented for now)
// app.use('/api/swarm', swarmRouter);

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

  if (res.headersSent) return;

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

  // Start health monitoring scheduler
  scheduleAutoMonitoring();
  logger.info('✓ Health monitoring scheduler started (checks every 6 hours)');

  // Start proxy health checks and rotation
  scheduleProxyHealthChecks();
  logger.info('✓ Proxy health checks scheduled (checks every 15 minutes)');

  // Start schedule processor
  startScheduleProcessor();
  logger.info('✓ Schedule processor started (checks every 5 minutes)');
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
