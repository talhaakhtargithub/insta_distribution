import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

/**
 * Environment Configuration with Validation
 */
class EnvConfig {
  // Server
  public readonly PORT: number;
  public readonly NODE_ENV: string;

  // Database
  public readonly DB_HOST: string;
  public readonly DB_PORT: number;
  public readonly DB_USER: string;
  public readonly DB_PASSWORD: string;
  public readonly DB_NAME: string;

  // Redis
  public readonly REDIS_HOST: string;
  public readonly REDIS_PORT: number;
  public readonly REDIS_PASSWORD?: string;
  public readonly REDIS_DB: number;
  public readonly REDIS_URL?: string;

  // JWT
  public readonly JWT_SECRET: string;
  public readonly JWT_EXPIRY: string;

  // Encryption
  public readonly ENCRYPTION_KEY: string;

  // Optional: Instagram API (for future use)
  public readonly INSTAGRAM_CLIENT_ID?: string;
  public readonly INSTAGRAM_CLIENT_SECRET?: string;

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

  private getEnv(key: string, defaultValue: string): string {
    return process.env[key] || defaultValue;
  }

  private generateDevSecret(): string {
    if (this.NODE_ENV === 'production') {
      throw new Error('JWT_SECRET must be set in production!');
    }
    console.warn('⚠️  WARNING: Using generated JWT secret for development');
    return 'dev_jwt_secret_change_in_production';
  }

  private generateEncryptionKey(): string {
    if (this.NODE_ENV === 'production') {
      throw new Error('ENCRYPTION_KEY must be set in production!');
    }
    const crypto = require('crypto');
    const key = crypto.randomBytes(32).toString('hex');
    console.warn('⚠️  WARNING: Using generated encryption key for development');
    console.warn(`Generated ENCRYPTION_KEY: ${key}`);
    return key;
  }

  private validateProductionConfig(): void {
    const required = [
      'DB_HOST',
      'DB_PASSWORD',
      'JWT_SECRET',
      'ENCRYPTION_KEY',
    ];

    const missing = required.filter(key => !process.env[key]);

    if (missing.length > 0) {
      throw new Error(
        `Missing required environment variables for production: ${missing.join(', ')}`
      );
    }

    // Validate encryption key length
    if (this.ENCRYPTION_KEY.length !== 64) {
      throw new Error(
        'ENCRYPTION_KEY must be 64 hex characters (32 bytes) for AES-256'
      );
    }

    console.log('✓ Production environment configuration validated');
  }

  public isDevelopment(): boolean {
    return this.NODE_ENV === 'development';
  }

  public isProduction(): boolean {
    return this.NODE_ENV === 'production';
  }

  public getDatabaseUrl(): string {
    return `postgresql://${this.DB_USER}:${this.DB_PASSWORD}@${this.DB_HOST}:${this.DB_PORT}/${this.DB_NAME}`;
  }

  public getRedisUrl(): string {
    const auth = this.REDIS_PASSWORD ? `:${this.REDIS_PASSWORD}@` : '';
    return `redis://${auth}${this.REDIS_HOST}:${this.REDIS_PORT}`;
  }
}

export const envConfig = new EnvConfig();
