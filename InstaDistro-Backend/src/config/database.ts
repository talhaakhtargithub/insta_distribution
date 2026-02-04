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
  max: 20, // Maximum connections in pool
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
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
