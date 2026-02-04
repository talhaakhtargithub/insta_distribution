import crypto from 'crypto';
import { logger } from '../../config/logger';

/**
 * Encryption Service for securely storing sensitive data like passwords
 * Uses AES-256-CBC encryption
 */
class EncryptionService {
  private algorithm = 'aes-256-cbc';
  private key: Buffer;
  private ivLength = 16; // AES block size

  constructor() {
    // Use environment variable or generate a key (for production, always use env var)
    const encryptionKey = process.env.ENCRYPTION_KEY || this.generateKey();
    this.key = Buffer.from(encryptionKey, 'hex');
  }

  /**
   * Generate a random encryption key (32 bytes for AES-256)
   * Only use this for development - production should use ENCRYPTION_KEY env var
   */
  private generateKey(): string {
    const key = crypto.randomBytes(32).toString('hex');
    logger.warn('⚠️  WARNING: Using generated encryption key. Set ENCRYPTION_KEY in .env for production!');
    logger.warn(`Generated key: ${key}`);
    return key;
  }

  /**
   * Encrypt a string value
   * Returns encrypted string in format: iv:encryptedData
   */
  encrypt(text: string): string {
    try {
      // Generate random initialization vector
      const iv = crypto.randomBytes(this.ivLength);

      // Create cipher
      const cipher = crypto.createCipheriv(this.algorithm, this.key, iv);

      // Encrypt the text
      let encrypted = cipher.update(text, 'utf8', 'hex');
      encrypted += cipher.final('hex');

      // Return iv and encrypted data (separated by :)
      return `${iv.toString('hex')}:${encrypted}`;
    } catch (error) {
      logger.error('Encryption error:', error);
      throw new Error('Failed to encrypt data');
    }
  }

  /**
   * Decrypt an encrypted string
   * Expects format: iv:encryptedData
   */
  decrypt(encryptedText: string): string {
    try {
      // Split iv and encrypted data
      const parts = encryptedText.split(':');
      if (parts.length !== 2) {
        throw new Error('Invalid encrypted text format');
      }

      const iv = Buffer.from(parts[0], 'hex');
      const encrypted = parts[1];

      // Create decipher
      const decipher = crypto.createDecipheriv(this.algorithm, this.key, iv);

      // Decrypt the text
      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');

      return decrypted;
    } catch (error) {
      logger.error('Decryption error:', error);
      throw new Error('Failed to decrypt data');
    }
  }

  /**
   * Hash a password using bcrypt (for user authentication)
   * Note: This is different from encryption - hashing is one-way
   */
  async hashPassword(password: string): Promise<string> {
    const bcrypt = require('bcrypt');
    const saltRounds = 10;
    return await bcrypt.hash(password, saltRounds);
  }

  /**
   * Compare a password with its hash
   */
  async comparePassword(password: string, hash: string): Promise<boolean> {
    const bcrypt = require('bcrypt');
    return await bcrypt.compare(password, hash);
  }
}

// Export singleton instance
export const encryptionService = new EncryptionService();
