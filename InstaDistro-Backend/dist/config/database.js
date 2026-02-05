"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.pool = void 0;
exports.query = query;
exports.closePool = closePool;
const pg_1 = require("pg");
const dotenv_1 = __importDefault(require("dotenv"));
const logger_1 = require("./logger");
dotenv_1.default.config();
const poolConfig = {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    user: process.env.DB_USER || 'swarm_user',
    password: process.env.DB_PASSWORD || 'swarm_pass_dev',
    database: process.env.DB_NAME || 'insta_swarm',
    // Connection Pool Optimization (Phase 4)
    max: 20, // Maximum connections in pool (increased for concurrent requests)
    min: 2, // Minimum idle connections (keep warm connections)
    idleTimeoutMillis: 30000, // Close idle connections after 30s
    connectionTimeoutMillis: 5000, // Wait up to 5s for connection (increased from 2s)
    // Query Performance
    statement_timeout: 30000, // Kill queries running longer than 30s
    query_timeout: 30000, // Same as statement_timeout
    // Connection Health
    allowExitOnIdle: false, // Don't exit if all connections are idle
    application_name: 'insta-swarm-api', // Identify connections in pg_stat_activity
};
exports.pool = new pg_1.Pool(poolConfig);
// Test connection on startup
exports.pool.on('connect', () => {
    logger_1.logger.info('✓ Database connected successfully');
});
exports.pool.on('error', (err) => {
    logger_1.logger.error('✗ Unexpected database error:', err);
    process.exit(-1);
});
// Helper function to execute queries
async function query(text, params) {
    const start = Date.now();
    try {
        const result = await exports.pool.query(text, params);
        const duration = Date.now() - start;
        logger_1.logger.info(`Executed query in ${duration}ms:`, text.substring(0, 50));
        return result;
    }
    catch (error) {
        logger_1.logger.error('Database query error:', error);
        throw error;
    }
}
// Close pool connections gracefully
async function closePool() {
    await exports.pool.end();
    logger_1.logger.info('Database pool closed');
}
