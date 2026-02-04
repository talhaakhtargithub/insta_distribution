"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.jwtService = exports.JwtService = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const env_1 = require("../../config/env");
const logger_1 = require("../../config/logger");
class JwtService {
    jwtSecret;
    jwtExpiry;
    constructor() {
        this.jwtSecret = env_1.envConfig.JWT_SECRET || 'dev-secret-change-in-production';
        this.jwtExpiry = env_1.envConfig.JWT_EXPIRY || '1h';
        if (this.jwtSecret === 'dev-secret-change-in-production' && env_1.envConfig.NODE_ENV === 'production') {
            logger_1.logger.error('CRITICAL: JWT_SECRET is using default value in production!');
            throw new Error('JWT_SECRET must be set in production environment');
        }
    }
    /**
     * Generate access token
     */
    generateAccessToken(payload) {
        try {
            return jsonwebtoken_1.default.sign(payload, this.jwtSecret, {
                expiresIn: this.jwtExpiry,
            });
        }
        catch (error) {
            logger_1.logger.error('Failed to generate access token:', error);
            throw error;
        }
    }
    /**
     * Generate refresh token (longer expiry)
     */
    generateRefreshToken(payload) {
        try {
            return jsonwebtoken_1.default.sign(payload, this.jwtSecret, {
                expiresIn: '7d',
            });
        }
        catch (error) {
            logger_1.logger.error('Failed to generate refresh token:', error);
            throw error;
        }
    }
    /**
     * Generate both access and refresh tokens
     */
    generateTokenPair(payload) {
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
    verifyAccessToken(token) {
        try {
            const decoded = jsonwebtoken_1.default.verify(token, this.jwtSecret);
            return decoded;
        }
        catch (error) {
            if (error.name === 'TokenExpiredError') {
                throw new Error('Token expired');
            }
            if (error.name === 'JsonWebTokenError') {
                throw new Error('Invalid token');
            }
            logger_1.logger.error('Token verification failed:', error);
            throw error;
        }
    }
    /**
     * Verify refresh token
     */
    verifyRefreshToken(token) {
        try {
            const decoded = jsonwebtoken_1.default.verify(token, this.jwtSecret);
            return decoded;
        }
        catch (error) {
            logger_1.logger.error('Refresh token verification failed:', error);
            throw new Error('Invalid refresh token');
        }
    }
    /**
     * Decode token without verification (for debugging)
     */
    decodeToken(token) {
        try {
            return jsonwebtoken_1.default.decode(token);
        }
        catch (error) {
            logger_1.logger.error('Token decoding failed:', error);
            return null;
        }
    }
    /**
     * Parse expiry string to seconds
     */
    parseExpiry(expiry) {
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
    isTokenExpired(token) {
        try {
            const decoded = jsonwebtoken_1.default.decode(token);
            if (!decoded || !decoded.exp) {
                return true;
            }
            const now = Math.floor(Date.now() / 1000);
            return decoded.exp < now;
        }
        catch (error) {
            return true;
        }
    }
}
exports.JwtService = JwtService;
exports.jwtService = new JwtService();
