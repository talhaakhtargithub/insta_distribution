"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.envConfig = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
// Load environment variables
dotenv_1.default.config();
/**
 * Environment Configuration with Validation
 */
class EnvConfig {
    // Server
    PORT;
    NODE_ENV;
    // Database
    DB_HOST;
    DB_PORT;
    DB_USER;
    DB_PASSWORD;
    DB_NAME;
    // Redis
    REDIS_HOST;
    REDIS_PORT;
    REDIS_PASSWORD;
    REDIS_DB;
    REDIS_URL;
    // JWT
    JWT_SECRET;
    JWT_EXPIRY;
    // Encryption
    ENCRYPTION_KEY;
    // Optional: Instagram API (for future use)
    INSTAGRAM_CLIENT_ID;
    INSTAGRAM_CLIENT_SECRET;
    constructor() {
        // Server
        this.PORT = parseInt(process.env.PORT || '3000');
        this.NODE_ENV = process.env.NODE_ENV || 'development';
        // Database
        this.DB_HOST = this.getEnv('DB_HOST', 'localhost');
        this.DB_PORT = parseInt(this.getEnv('DB_PORT', '5432'));
        this.DB_USER = this.getEnv('DB_USER', 'swarm_user');
        this.DB_PASSWORD = this.getEnv('DB_PASSWORD', 'swarm_pass_dev');
        this.DB_NAME = this.getEnv('DB_NAME', 'insta_swarm');
        // Redis
        this.REDIS_HOST = this.getEnv('REDIS_HOST', 'localhost');
        this.REDIS_PORT = parseInt(this.getEnv('REDIS_PORT', '6379'));
        this.REDIS_PASSWORD = process.env.REDIS_PASSWORD;
        this.REDIS_DB = parseInt(this.getEnv('REDIS_DB', '0'));
        this.REDIS_URL = process.env.REDIS_URL;
        // JWT
        this.JWT_SECRET = this.getEnv('JWT_SECRET', this.generateDevSecret());
        this.JWT_EXPIRY = this.getEnv('JWT_EXPIRY', '24h');
        // Encryption
        this.ENCRYPTION_KEY = this.getEnv('ENCRYPTION_KEY', this.generateEncryptionKey());
        // Instagram API (optional)
        this.INSTAGRAM_CLIENT_ID = process.env.INSTAGRAM_CLIENT_ID;
        this.INSTAGRAM_CLIENT_SECRET = process.env.INSTAGRAM_CLIENT_SECRET;
        // Validate critical production settings
        if (this.NODE_ENV === 'production') {
            this.validateProductionConfig();
        }
    }
    getEnv(key, defaultValue) {
        return process.env[key] || defaultValue;
    }
    generateDevSecret() {
        if (this.NODE_ENV === 'production') {
            throw new Error('JWT_SECRET must be set in production!');
        }
        console.warn('⚠️  WARNING: Using generated JWT secret for development');
        return 'dev_jwt_secret_change_in_production';
    }
    generateEncryptionKey() {
        if (this.NODE_ENV === 'production') {
            throw new Error('ENCRYPTION_KEY must be set in production!');
        }
        const crypto = require('crypto');
        const key = crypto.randomBytes(32).toString('hex');
        console.warn('⚠️  WARNING: Using generated encryption key for development');
        console.warn(`Generated ENCRYPTION_KEY: ${key}`);
        return key;
    }
    validateProductionConfig() {
        const required = [
            'DB_HOST',
            'DB_PASSWORD',
            'JWT_SECRET',
            'ENCRYPTION_KEY',
        ];
        const missing = required.filter(key => !process.env[key]);
        if (missing.length > 0) {
            throw new Error(`Missing required environment variables for production: ${missing.join(', ')}`);
        }
        // Validate encryption key length
        if (this.ENCRYPTION_KEY.length !== 64) {
            throw new Error('ENCRYPTION_KEY must be 64 hex characters (32 bytes) for AES-256');
        }
        console.log('✓ Production environment configuration validated');
    }
    isDevelopment() {
        return this.NODE_ENV === 'development';
    }
    isProduction() {
        return this.NODE_ENV === 'production';
    }
    getDatabaseUrl() {
        return `postgresql://${this.DB_USER}:${this.DB_PASSWORD}@${this.DB_HOST}:${this.DB_PORT}/${this.DB_NAME}`;
    }
    getRedisUrl() {
        const auth = this.REDIS_PASSWORD ? `:${this.REDIS_PASSWORD}@` : '';
        return `redis://${auth}${this.REDIS_HOST}:${this.REDIS_PORT}`;
    }
}
exports.envConfig = new EnvConfig();
