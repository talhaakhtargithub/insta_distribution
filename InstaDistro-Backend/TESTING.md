# Testing Guide

This document provides comprehensive testing guidelines for the InstaDistro Backend API.

## Table of Contents

1. [Overview](#overview)
2. [Testing Stack](#testing-stack)
3. [Running Tests](#running-tests)
4. [Test Structure](#test-structure)
5. [Writing Tests](#writing-tests)
6. [Test Coverage](#test-coverage)
7. [Best Practices](#best-practices)
8. [Continuous Integration](#continuous-integration)

## Overview

The InstaDistro Backend uses a comprehensive testing strategy that includes:

- **Unit Tests**: Test individual functions, classes, and modules in isolation
- **Integration Tests**: Test API endpoints and service interactions
- **Coverage Requirements**: Minimum 70% coverage across all metrics (branches, functions, lines, statements)

## Testing Stack

### Core Dependencies

- **Jest**: Testing framework with built-in assertion library
- **ts-jest**: TypeScript preprocessor for Jest
- **supertest**: HTTP assertion library for integration tests
- **@types/jest**: TypeScript type definitions for Jest

### Configuration

- **jest.config.js**: Main Jest configuration
- **src/__tests__/setup.ts**: Global test setup and environment variables
- **tsconfig.json**: Includes Jest types for TypeScript

## Running Tests

### Available Commands

```bash
# Run all tests with coverage
npm test

# Run tests in watch mode (useful during development)
npm run test:watch

# Run only unit tests
npm run test:unit

# Run only integration tests
npm run test:integration

# Run tests in CI mode (optimized for CI/CD pipelines)
npm run test:ci
```

### Test Output

Tests output includes:
- Pass/fail status for each test
- Execution time per test suite
- Coverage reports (lines, branches, functions, statements)
- Detailed error messages for failures

## Test Structure

### Directory Organization

```
src/
└── __tests__/
    ├── setup.ts                    # Global test configuration
    ├── unit/                       # Unit tests
    │   └── services/
    │       ├── EncryptionService.test.ts
    │       ├── HealthScorer.test.ts
    │       ├── OAuthStateService.test.ts
    │       └── RateLimiter.test.ts
    └── integration/                # Integration tests
        └── api/
            └── HealthController.test.ts
```

### Naming Conventions

- Test files: `*.test.ts`
- Unit tests: `src/__tests__/unit/**/*.test.ts`
- Integration tests: `src/__tests__/integration/**/*.test.ts`
- Test suites: Named after the module they test

## Writing Tests

### Unit Test Example

```typescript
import { EncryptionService } from '../../../services/auth/EncryptionService';

describe('EncryptionService', () => {
  let service: EncryptionService;

  beforeEach(() => {
    service = new EncryptionService();
  });

  describe('encrypt', () => {
    it('should encrypt a plain text password', () => {
      const plaintext = 'mySecurePassword123';
      const encrypted = service.encrypt(plaintext);

      expect(encrypted).toBeDefined();
      expect(encrypted).not.toBe(plaintext);
      expect(encrypted.length).toBeGreaterThan(0);
    });

    it('should produce different ciphertext for same input (random IV)', () => {
      const plaintext = 'samePassword';
      const encrypted1 = service.encrypt(plaintext);
      const encrypted2 = service.encrypt(plaintext);

      expect(encrypted1).not.toBe(encrypted2);
    });
  });

  describe('decrypt', () => {
    it('should decrypt encrypted text back to original', () => {
      const plaintext = 'mySecurePassword123';
      const encrypted = service.encrypt(plaintext);
      const decrypted = service.decrypt(encrypted);

      expect(decrypted).toBe(plaintext);
    });
  });
});
```

### Integration Test Example

```typescript
import request from 'supertest';
import express, { Express } from 'express';
import { HealthController } from '../../../api/controllers/HealthController';
import HealthMonitor from '../../../services/health/HealthMonitor';

// Mock dependencies
jest.mock('../../../services/health/HealthMonitor');

describe('HealthController Integration Tests', () => {
  let app: Express;

  beforeAll(() => {
    app = express();
    app.use(express.json());

    const controller = new HealthController();
    app.get('/api/health/account/:id', (req, res) =>
      controller.getAccountHealth(req, res)
    );
  });

  it('should return account health report', async () => {
    const mockReport = {
      accountId: 'acc123',
      healthScore: 85,
      category: 'good',
    };

    (HealthMonitor.monitorAccount as jest.Mock).mockResolvedValue(mockReport);

    const response = await request(app)
      .get('/api/health/account/acc123')
      .expect('Content-Type', /json/)
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.data).toEqual(mockReport);
  });
});
```

### Mocking Dependencies

#### Mocking Redis

```typescript
jest.mock('../../../config/redis', () => ({
  redisClient: {
    setex: jest.fn(),
    get: jest.fn(),
    del: jest.fn(),
  },
}));
```

#### Mocking Services

```typescript
jest.mock('../../../services/health/HealthMonitor');

// In test
(HealthMonitor.monitorAccount as jest.Mock).mockResolvedValue(mockData);
```

## Test Coverage

### Coverage Thresholds

The project enforces minimum coverage thresholds:

```javascript
coverageThresholds: {
  global: {
    branches: 70,
    functions: 70,
    lines: 70,
    statements: 70,
  },
}
```

### Viewing Coverage Reports

After running tests with coverage:

```bash
npm test
```

Coverage reports are generated in:
- **Text**: Console output
- **HTML**: `coverage/index.html` (open in browser)
- **LCOV**: `coverage/lcov.info` (for CI/CD tools)

### Improving Coverage

To improve coverage:

1. Identify uncovered lines in HTML report
2. Write tests for uncovered code paths
3. Focus on edge cases and error handling
4. Test both success and failure scenarios

## Best Practices

### 1. Test Isolation

- Each test should be independent
- Use `beforeEach` to reset state
- Clean up resources in `afterEach`
- Don't share mutable state between tests

### 2. Descriptive Test Names

```typescript
// Good
it('should return 400 if userId is missing', () => { ... });

// Bad
it('test userId', () => { ... });
```

### 3. Arrange-Act-Assert Pattern

```typescript
it('should calculate health score correctly', () => {
  // Arrange: Set up test data
  const metrics = { postSuccessRate: 95, errorRate24h: 2 };

  // Act: Execute the function
  const score = scorer.calculateHealthScore(metrics);

  // Assert: Verify the result
  expect(score).toBeGreaterThan(80);
});
```

### 4. Test Edge Cases

```typescript
describe('edge cases', () => {
  it('should handle empty strings', () => { ... });
  it('should handle null values', () => { ... });
  it('should handle negative numbers', () => { ... });
  it('should handle very large inputs', () => { ... });
});
```

### 5. Mock External Dependencies

- Always mock external services (Redis, PostgreSQL, HTTP clients)
- Mock at the module boundary, not internal implementations
- Use realistic mock data
- Verify mocks are called with correct arguments

### 6. Test Error Handling

```typescript
it('should throw error for invalid input', () => {
  expect(() => {
    service.processData(null);
  }).toThrow('Invalid input');
});

it('should handle async errors gracefully', async () => {
  mockService.getData.mockRejectedValue(new Error('Network error'));

  await expect(service.fetchData()).rejects.toThrow('Network error');
});
```

## Continuous Integration

### CI Configuration

For CI/CD pipelines, use the optimized test command:

```bash
npm run test:ci
```

This command:
- Runs tests in CI mode
- Generates coverage reports
- Limits worker threads to 2
- Exits with appropriate status code

### GitHub Actions Example

```yaml
name: Test

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v2

      - name: Setup Node.js
        uses: actions/setup-node@v2
        with:
          node-version: '20'

      - name: Install dependencies
        run: npm ci

      - name: Run tests
        run: npm run test:ci

      - name: Upload coverage
        uses: codecov/codecov-action@v2
        with:
          files: ./coverage/lcov.info
```

## Test Environment

### Environment Variables

Test environment is configured in `src/__tests__/setup.ts`:

```typescript
process.env.NODE_ENV = 'test';
process.env.DB_NAME = 'insta_swarm_test';  // Separate test database
process.env.REDIS_DB = '1';                 // Separate Redis DB for tests
process.env.ENCRYPTION_KEY = 'test-key...'; // Fixed test key
```

### Database Setup

For integration tests that require a database:

1. Create a separate test database:
   ```bash
   createdb insta_swarm_test
   ```

2. Run migrations on test database:
   ```bash
   DB_NAME=insta_swarm_test npm run migrate
   ```

3. Clean up test data after each test run

## Troubleshooting

### Common Issues

#### 1. Tests timeout

Increase Jest timeout in setup.ts:
```typescript
jest.setTimeout(20000); // 20 seconds
```

#### 2. Module not found errors

Ensure all imports use correct paths relative to test file location.

#### 3. Mock not working

Verify mock is defined before the module being tested is imported:
```typescript
// Mock MUST come first
jest.mock('../../../services/SomeService');

// Then import
import { MyClass } from '../../../classes/MyClass';
```

#### 4. Coverage not collected

Check `collectCoverageFrom` in `jest.config.js` includes your files.

## Resources

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [ts-jest Documentation](https://kulshekhar.github.io/ts-jest/)
- [Supertest Documentation](https://github.com/visionmedia/supertest)
- [Testing Best Practices](https://github.com/goldbergyoni/javascript-testing-best-practices)

## Current Test Coverage

As of Phase 5 completion:

- **Test Suites**: 4 passing
- **Total Tests**: 67 passing
- **Coverage**: Comprehensive unit tests for core services
  - EncryptionService: Full encryption/decryption roundtrip testing
  - HealthScorer: Health calculation and categorization
  - OAuthStateService: OAuth CSRF protection
  - RateLimiter: Rate limiting logic with Redis mocking

## Next Steps

To expand test coverage:

1. Add integration tests for remaining API controllers
2. Add tests for Instagram API client services
3. Add tests for job queue processors
4. Add end-to-end tests for critical user flows
5. Set up automated testing in CI/CD pipeline
