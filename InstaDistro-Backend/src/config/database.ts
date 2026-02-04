import { Pool, PoolConfig } from 'pg';
import dotenv from 'dotenv';
import { logger } from './logger';

dotenv.config();

const poolConfig: PoolConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  user: process.env.DB_USER || 'swarm_user',
  password: process.env.DB_PASSWORD || 'swarm_pass_dev',
  database: process.env.DB_NAME || 'insta_swarm',

  // Connection Pool Optimization (Phase 4)
  max: 20, // Maximum connections in pool (increased for concurrent requests)
  min: 2,  // Minimum idle connections (keep warm connections)
  idleTimeoutMillis: 30000, // Close idle connections after 30s
  connectionTimeoutMillis: 5000, // Wait up to 5s for connection (increased from 2s)

  // Query Performance
  statement_timeout: 30000, // Kill queries running longer than 30s
  query_timeout: 30000,     // Same as statement_timeout

  // Connection Health
  allowExitOnIdle: false, // Don't exit if all connections are idle
  application_name: 'insta-swarm-api', // Identify connections in pg_stat_activity
};

export const pool = new Pool(poolConfig);

// Test connection on startup
pool.on('connect', () => {
  logger.info('✓ Database connected successfully');
});

pool.on('error', (err) => {
  logger.error('✗ Unexpected database error:', err);
  process.exit(-1);
});

// Helper function to execute queries
export async function query(text: string, params?: any[]) {
  const start = Date.now();
  try {
    const result = await pool.query(text, params);
    const duration = Date.now() - start;
    logger.info(`Executed query in ${duration}ms:`, text.substring(0, 50));
    return result;
  } catch (error) {
    logger.error('Database query error:', error);
    throw error;
  }
}

// Close pool connections gracefully
export async function closePool() {
  await pool.end();
  logger.info('Database pool closed');
}
