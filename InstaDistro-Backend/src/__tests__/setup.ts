/**
 * Jest Test Setup
 * Runs before all tests
 */

import { jest, afterAll } from '@jest/globals';

// Declare global test utilities type
declare global {
  var testUtils: {
    generateMockUserId: () => string;
    generateMockAccountId: () => string;
    sleep: (ms: number) => Promise<void>;
  };
}

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.DB_HOST = 'localhost';
process.env.DB_PORT = '5432';
process.env.DB_USER = 'swarm_user';
process.env.DB_PASSWORD = 'swarm_pass_dev';
process.env.DB_NAME = 'insta_swarm_test'; // Separate test database

process.env.REDIS_HOST = 'localhost';
process.env.REDIS_PORT = '6379';
process.env.REDIS_DB = '1'; // Use separate Redis DB for tests

process.env.JWT_SECRET = 'test-jwt-secret-key';
process.env.JWT_REFRESH_SECRET = 'test-jwt-refresh-secret-key';
process.env.ENCRYPTION_KEY = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';

// Increase timeout for integration tests
jest.setTimeout(10000);

// Mock logger to reduce noise in tests
jest.mock('../config/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
  sanitizeSensitiveData: jest.fn((data: any) => data),
}));

// Global test utilities
global.testUtils = {
  generateMockUserId: () => `test_user_${Date.now()}`,
  generateMockAccountId: () => `test_account_${Date.now()}`,
  sleep: (ms: number) => new Promise((resolve) => setTimeout(resolve, ms)),
};

// Cleanup function for tests
afterAll(async () => {
  // Close database connections
  // Close Redis connections
  // Clean up test data
});
