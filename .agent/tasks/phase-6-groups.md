# Task: Phase 6 - Account Groups

**Priority:** MEDIUM
**Estimated Time:** 3 days
**Status:** PENDING

---

## Overview

Implement account grouping functionality to organize 100+ accounts into logical groups for easier management, targeting, and distribution.

---

## Group Use Cases

1. **Niche-based Groups:**
   - Fitness accounts
   - Fashion accounts
   - Tech accounts
   - Food accounts

2. **Status-based Groups:**
   - Premium accounts (high followers)
   - Standard accounts
   - New accounts (warmup)

3. **Geographic Groups:**
   - US-based
   - EU-based
   - Asia-based

4. **Custom Groups:**
   - Client A accounts
   - Client B accounts
   - Testing accounts

---

## Files to Create

### New Files:
1. `src/services/groups/GroupService.ts` - Group management
2. `src/api/controllers/GroupController.ts` - API endpoints
3. `src/api/routes/groups.routes.ts` - Routes

---

## Task Breakdown

### Task 6.1: Create Group Service
**File:** `src/services/groups/GroupService.ts`

```typescript
class GroupService {
  // CRUD operations
  async createGroup(userId, data): Promise<Group>
  async getGroup(groupId): Promise<Group>
  async updateGroup(groupId, data): Promise<Group>
  async deleteGroup(groupId): Promise<void>
  async listGroups(userId): Promise<Group[]>
  
  // Account management
  async addAccountToGroup(groupId, accountId): Promise<void>
  async removeAccountFromGroup(groupId, accountId): Promise<void>
  async getGroupAccounts(groupId): Promise<Account[]>
  async moveAccount(accountId, fromGroup, toGroup): Promise<void>
  
  // Bulk operations
  async addMultipleAccounts(groupId, accountIds): Promise<void>
  async removeMultipleAccounts(groupId, accountIds): Promise<void>
  
  // Statistics
  async getGroupStats(groupId): Promise<GroupStats>
  async getGroupHealthScore(groupId): Promise<number>
}
```

---

### Task 6.2: API Endpoints

**Endpoints:**
- `POST /api/groups` - Create group
- `GET /api/groups` - List all groups
- `GET /api/groups/:id` - Get group details
- `PUT /api/groups/:id` - Update group
- `DELETE /api/groups/:id` - Delete group
- `POST /api/groups/:id/accounts` - Add accounts to group
- `DELETE /api/groups/:id/accounts` - Remove accounts from group
- `GET /api/groups/:id/accounts` - List group accounts
- `GET /api/groups/:id/stats` - Get group statistics

---

### Task 6.3: Update Distribution to Support Groups

Modify DistributionEngine to:
- Accept groupId instead of individual accounts
- Distribute to all accounts in group
- Support multiple groups in single distribution

---

## Database (Already exists)

```sql
-- account_groups table already exists
-- May need to add columns for metadata
ALTER TABLE account_groups ADD COLUMN IF NOT EXISTS
  description TEXT,
  color VARCHAR(7),
  icon VARCHAR(50),
  settings JSONB;
```

---

## Completion Checklist

- [ ] GroupService.ts created
- [ ] GroupController.ts created
- [ ] groups.routes.ts created
- [ ] DistributionEngine updated
- [ ] Database migration if needed
- [ ] TypeScript compiles without errors
- [ ] All endpoints tested
- [ ] Group-based distribution tested
- [ ] Documentation updated
