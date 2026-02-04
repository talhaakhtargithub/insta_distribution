import jwt from 'jsonwebtoken';
import { envConfig } from '../../config/env';
import { logger } from '../../config/logger';

/**
 * JWT Service
 *
 * Handles JWT token generation and verification for app user authentication
 */

export interface JwtPayload {
  userId: string;
  email: string;
  name?: string;
  picture?: string;
  provider: 'google' | 'email'; // Authentication provider
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export class JwtService {
  private jwtSecret: string;
  private jwtExpiry: string;

  constructor() {
    this.jwtSecret = envConfig.JWT_SECRET || 'dev-secret-change-in-production';
    this.jwtExpiry = envConfig.JWT_EXPIRY || '1h';

    if (this.jwtSecret === 'dev-secret-change-in-production' && envConfig.NODE_ENV === 'production') {
      logger.error('CRITICAL: JWT_SECRET is using default value in production!');
      throw new Error('JWT_SECRET must be set in production environment');
    }
  }

  /**
   * Generate access token
   */
  generateAccessToken(payload: JwtPayload): string {
    try {
      return jwt.sign(payload, this.jwtSecret, {
        expiresIn: this.jwtExpiry,
      } as any);
    } catch (error: any) {
      logger.error('Failed to generate access token:', error);
      throw error;
    }
  }

  /**
   * Generate refresh token (longer expiry)
   */
  generateRefreshToken(payload: JwtPayload): string {
    try {
      return jwt.sign(payload, this.jwtSecret, {
        expiresIn: '7d',
      } as any);
    } catch (error: any) {
      logger.error('Failed to generate refresh token:', error);
      throw error;
    }
  }

  /**
   * Generate both access and refresh tokens
   */
  generateTokenPair(payload: JwtPayload): TokenPair {
    const accessToken = this.generateAccessToken(payload);
    const refreshToken = this.generateRefreshToken(payload);

    // Calculate expiry time in seconds
    const expiresIn = this.parseExpiry(this.jwtExpiry);

    return {
      accessToken,
      refreshToken,
      expiresIn,
    };
  }

  /**
   * Verify and decode access token
   */
  verifyAccessToken(token: string): JwtPayload {
    try {
      const decoded = jwt.verify(token, this.jwtSecret) as JwtPayload;

      return decoded;
    } catch (error: any) {
      if (error.name === 'TokenExpiredError') {
        throw new Error('Token expired');
      }
      if (error.name === 'JsonWebTokenError') {
        throw new Error('Invalid token');
      }
      logger.error('Token verification failed:', error);
      throw error;
    }
  }

  /**
   * Verify refresh token
   */
  verifyRefreshToken(token: string): JwtPayload {
    try {
      const decoded = jwt.verify(token, this.jwtSecret) as JwtPayload;

      return decoded;
    } catch (error: any) {
      logger.error('Refresh token verification failed:', error);
      throw new Error('Invalid refresh token');
    }
  }

  /**
   * Decode token without verification (for debugging)
   */
  decodeToken(token: string): any {
    try {
      return jwt.decode(token);
    } catch (error: any) {
      logger.error('Token decoding failed:', error);
      return null;
    }
  }

  /**
   * Parse expiry string to seconds
   */
  private parseExpiry(expiry: string): number {
    const unit = expiry.slice(-1);
    const value = parseInt(expiry.slice(0, -1));

    switch (unit) {
      case 's':
        return value;
      case 'm':
        return value * 60;
      case 'h':
        return value * 60 * 60;
      case 'd':
        return value * 24 * 60 * 60;
      default:
        return 3600; // Default 1 hour
    }
  }

  /**
   * Check if token is expired
   */
  isTokenExpired(token: string): boolean {
    try {
      const decoded: any = jwt.decode(token);
      if (!decoded || !decoded.exp) {
        return true;
      }

      const now = Math.floor(Date.now() / 1000);
      return decoded.exp < now;
    } catch (error) {
      return true;
    }
  }
}

export const jwtService = new JwtService();
