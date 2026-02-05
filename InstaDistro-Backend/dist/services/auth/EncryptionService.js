"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.encryptionService = void 0;
const crypto_1 = __importDefault(require("crypto"));
const logger_1 = require("../../config/logger");
/**
 * Encryption Service for securely storing sensitive data like passwords
 * Uses AES-256-CBC encryption
 */
class EncryptionService {
    algorithm = 'aes-256-cbc';
    key;
    ivLength = 16; // AES block size
    constructor() {
        // Use environment variable or generate a key (for production, always use env var)
        const encryptionKey = process.env.ENCRYPTION_KEY || this.generateKey();
        this.key = Buffer.from(encryptionKey, 'hex');
    }
    /**
     * Generate a random encryption key (32 bytes for AES-256)
     * Only use this for development - production should use ENCRYPTION_KEY env var
     */
    generateKey() {
        const key = crypto_1.default.randomBytes(32).toString('hex');
        logger_1.logger.warn('⚠️  WARNING: Using generated encryption key. Set ENCRYPTION_KEY in .env for production!');
        logger_1.logger.warn(`Generated key: ${key}`);
        return key;
    }
    /**
     * Encrypt a string value
     * Returns encrypted string in format: iv:encryptedData
     */
    encrypt(text) {
        try {
            // Generate random initialization vector
            const iv = crypto_1.default.randomBytes(this.ivLength);
            // Create cipher
            const cipher = crypto_1.default.createCipheriv(this.algorithm, this.key, iv);
            // Encrypt the text
            let encrypted = cipher.update(text, 'utf8', 'hex');
            encrypted += cipher.final('hex');
            // Return iv and encrypted data (separated by :)
            return `${iv.toString('hex')}:${encrypted}`;
        }
        catch (error) {
            logger_1.logger.error('Encryption error:', error);
            throw new Error('Failed to encrypt data');
        }
    }
    /**
     * Decrypt an encrypted string
     * Expects format: iv:encryptedData
     */
    decrypt(encryptedText) {
        try {
            // Split iv and encrypted data
            const parts = encryptedText.split(':');
            if (parts.length !== 2) {
                throw new Error('Invalid encrypted text format');
            }
            const iv = Buffer.from(parts[0], 'hex');
            const encrypted = parts[1];
            // Create decipher
            const decipher = crypto_1.default.createDecipheriv(this.algorithm, this.key, iv);
            // Decrypt the text
            let decrypted = decipher.update(encrypted, 'hex', 'utf8');
            decrypted += decipher.final('utf8');
            return decrypted;
        }
        catch (error) {
            logger_1.logger.error('Decryption error:', error);
            throw new Error('Failed to decrypt data');
        }
    }
    /**
     * Hash a password using bcrypt (for user authentication)
     * Note: This is different from encryption - hashing is one-way
     */
    async hashPassword(password) {
        const bcrypt = require('bcrypt');
        const saltRounds = 10;
        return await bcrypt.hash(password, saltRounds);
    }
    /**
     * Compare a password with its hash
     */
    async comparePassword(password, hash) {
        const bcrypt = require('bcrypt');
        return await bcrypt.compare(password, hash);
    }
}
// Export singleton instance
exports.encryptionService = new EncryptionService();
