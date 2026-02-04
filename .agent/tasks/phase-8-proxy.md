# Task: Phase 8 - Proxy Management

**Priority:** MEDIUM
**Estimated Time:** 3-4 days
**Status:** PENDING

---

## Overview

Implement proxy management system to route each account through unique IP addresses, preventing detection and bans.

---

## Proxy Types Supported

1. **HTTP/HTTPS Proxies**
2. **SOCKS4/SOCKS5 Proxies**
3. **Residential Proxies** (recommended)
4. **Mobile Proxies** (premium)
5. **Datacenter Proxies** (budget)

---

## Files to Create

### New Files:
1. `src/services/proxy/ProxyManager.ts` - Main proxy management
2. `src/services/proxy/ProxyValidator.ts` - Validate proxies
3. `src/services/proxy/ProxyRotator.ts` - Rotation logic
4. `src/api/controllers/ProxyController.ts` - API endpoints
5. `src/api/routes/proxies.routes.ts` - Routes

---

## Task Breakdown

### Task 8.1: Create Proxy Manager
**File:** `src/services/proxy/ProxyManager.ts`

```typescript
class ProxyManager {
  // CRUD operations
  async addProxy(proxyConfig): Promise<Proxy>
  async getProxy(proxyId): Promise<Proxy>
  async updateProxy(proxyId, data): Promise<Proxy>
  async deleteProxy(proxyId): Promise<void>
  async listProxies(userId): Promise<Proxy[]>
  
  // Assignment
  async assignToAccount(proxyId, accountId): Promise<void>
  async unassignFromAccount(accountId): Promise<void>
  async autoAssign(accountId): Promise<Proxy>
  
  // Bulk operations
  async bulkImport(proxies: ProxyConfig[]): Promise<ImportResult>
  async bulkValidate(): Promise<ValidationResult[]>
}
```

---

### Task 8.2: Create Proxy Validator
**File:** `src/services/proxy/ProxyValidator.ts`

```typescript
class ProxyValidator {
  // Validate single proxy
  async validate(proxy): Promise<ValidationResult>
  
  // Validate against Instagram
  async validateForInstagram(proxy): Promise<boolean>
  
  // Check speed
  async measureLatency(proxy): Promise<number>
  
  // Check anonymity
  async checkAnonymity(proxy): Promise<'transparent' | 'anonymous' | 'elite'>
  
  // Health check
  async healthCheck(proxy): Promise<ProxyHealth>
}
```

---

### Task 8.3: Create Proxy Rotator
**File:** `src/services/proxy/ProxyRotator.ts`

```typescript
class ProxyRotator {
  // Rotation strategies
  roundRobin(accountId): Proxy
  random(accountId): Proxy
  leastUsed(accountId): Proxy
  geographic(accountId, region): Proxy
  
  // Auto-rotation on issues
  rotateOnFailure(accountId, reason): Promise<Proxy>
  
  // Cool-down periods
  markAsCoolingDown(proxyId, duration): void
  isInCooldown(proxyId): boolean
}
```

---

### Task 8.4: API Endpoints

**Endpoints:**
- `POST /api/proxies` - Add proxy
- `GET /api/proxies` - List all proxies
- `GET /api/proxies/:id` - Get proxy details
- `PUT /api/proxies/:id` - Update proxy
- `DELETE /api/proxies/:id` - Delete proxy
- `POST /api/proxies/bulk-import` - Bulk import proxies
- `POST /api/proxies/:id/validate` - Validate proxy
- `POST /api/proxies/validate-all` - Validate all proxies
- `POST /api/proxies/:id/assign/:accountId` - Assign to account
- `GET /api/proxies/stats` - Get proxy statistics

---

### Task 8.5: Integration with Instagram Clients

Update PrivateApiClient and GraphApiClient to:
- Accept proxy configuration
- Route requests through proxy
- Handle proxy failures gracefully
- Auto-rotate on proxy errors

---

## Database (Already exists)

```sql
-- proxy_configs table exists, may need updates
ALTER TABLE proxy_configs ADD COLUMN IF NOT EXISTS
  last_validated TIMESTAMP,
  validation_status VARCHAR(20),
  latency_ms INTEGER,
  anonymity_level VARCHAR(20),
  failure_count INTEGER DEFAULT 0,
  cooling_until TIMESTAMP;
```

---

## Proxy Format Support

```typescript
// Supported formats for import
const proxyFormats = [
  'host:port',
  'host:port:username:password',
  'username:password@host:port',
  'protocol://host:port',
  'protocol://username:password@host:port'
];
```

---

## Completion Checklist

- [ ] ProxyManager.ts created
- [ ] ProxyValidator.ts created
- [ ] ProxyRotator.ts created
- [ ] ProxyController.ts created
- [ ] proxies.routes.ts created
- [ ] PrivateApiClient updated for proxy support
- [ ] GraphApiClient updated for proxy support
- [ ] Database migration if needed
- [ ] TypeScript compiles without errors
- [ ] All endpoints tested
- [ ] Proxy rotation tested
- [ ] Documentation updated
