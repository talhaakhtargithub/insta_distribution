import { pool } from '../../config/database';
import { encryptionService } from '../auth/EncryptionService';
import { logger } from '../../config/logger';

export interface Account {
  id: string;
  user_id: string;
  username: string;
  encrypted_password?: string;
  account_type: 'personal' | 'business';
  access_token?: string;
  session_token?: string;
  is_authenticated: boolean;
  last_auth_check?: string;
  instagram_user_id?: string;
  profile_pic_url?: string;
  bio?: string;
  account_status: 'active' | 'rate_limited' | 'error' | 'suspended';
  account_state: 'NEW_ACCOUNT' | 'WARMING_UP' | 'ACTIVE' | 'PAUSED' | 'SUSPENDED' | 'BANNED';
  last_error?: string;
  follower_count?: number;
  is_source: boolean;
  proxy_id?: string;
  warmup_day?: number;
  created_at: string;
  updated_at: string;
}

export interface CreateAccountInput {
  user_id: string;
  username: string;
  password?: string;
  account_type: 'personal' | 'business';
  proxy_id?: string;
  // OAuth fields (for business accounts)
  access_token?: string;
  instagram_user_id?: string;
  is_authenticated?: boolean;
}

export interface UpdateAccountInput {
  username?: string;
  password?: string;
  account_type?: 'personal' | 'business';
  account_status?: 'active' | 'rate_limited' | 'error' | 'suspended';
  account_state?: 'NEW_ACCOUNT' | 'WARMING_UP' | 'ACTIVE' | 'PAUSED' | 'SUSPENDED' | 'BANNED';
  proxy_id?: string;
  follower_count?: number;
  is_source?: boolean;
  // OAuth and session fields
  access_token?: string;
  session_token?: string;
  is_authenticated?: boolean;
  last_auth_check?: string;
  profile_pic_url?: string;
  instagram_user_id?: string;
}

export interface BulkImportInput {
  username: string;
  password: string;
  email?: string;
  phone?: string;
  account_type: 'personal' | 'business';
  proxy?: string;
}

class AccountService {
  /**
   * Create a new Instagram account record
   */
  async createAccount(input: CreateAccountInput): Promise<Account> {
    try {
      // Encrypt password before storing (if provided)
      const encryptedPassword = input.password ? encryptionService.encrypt(input.password) : null;

      const query = `
        INSERT INTO accounts (
          user_id, username, encrypted_password, account_type,
          proxy_id, account_state, is_authenticated, is_source,
          access_token, instagram_user_id
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING *
      `;

      const values = [
        input.user_id,
        input.username,
        encryptedPassword,
        input.account_type,
        input.proxy_id || null,
        'NEW_ACCOUNT', // Default state
        input.is_authenticated || false, // Authenticated for OAuth accounts
        false, // Not a source account
        input.access_token || null,
        input.instagram_user_id || null,
      ];

      const result = await pool.query(query, values);
      return result.rows[0];
    } catch (error: any) {
      if (error.code === '23505') {
        // Unique constraint violation
        throw new Error(`Account with username "${input.username}" already exists`);
      }
      logger.error('Error creating account', { error: error.message, username: input.username });
      throw new Error('Failed to create account');
    }
  }

  /**
   * Get all accounts for a user
   */
  async getAccountsByUserId(userId: string): Promise<Account[]> {
    try {
      const query = `
        SELECT * FROM accounts
        WHERE user_id = $1
        ORDER BY created_at DESC
      `;
      const result = await pool.query(query, [userId]);
      return result.rows;
    } catch (error) {
      logger.error('Error fetching accounts', { error, userId });
      throw new Error('Failed to fetch accounts');
    }
  }

  /**
   * Get a single account by ID
   */
  async getAccountById(accountId: string): Promise<Account | null> {
    try {
      const query = 'SELECT * FROM accounts WHERE id = $1';
      const result = await pool.query(query, [accountId]);
      return result.rows[0] || null;
    } catch (error) {
      logger.error('Error fetching account', { error, accountId });
      throw new Error('Failed to fetch account');
    }
  }

  /**
   * Get decrypted password for an account
   */
  async getAccountPassword(accountId: string): Promise<string> {
    try {
      const account = await this.getAccountById(accountId);
      if (!account || !account.encrypted_password) {
        throw new Error('Account not found or password not set');
      }
      return encryptionService.decrypt(account.encrypted_password);
    } catch (error) {
      logger.error('Error decrypting password', { error, accountId });
      throw new Error('Failed to retrieve password');
    }
  }

  /**
   * Update an existing account
   */
  async updateAccount(accountId: string, updates: UpdateAccountInput): Promise<Account> {
    try {
      const updateFields: string[] = [];
      const values: any[] = [];
      let paramIndex = 1;

      // Build dynamic update query
      if (updates.username !== undefined) {
        updateFields.push(`username = $${paramIndex++}`);
        values.push(updates.username);
      }

      if (updates.password !== undefined) {
        const encryptedPassword = encryptionService.encrypt(updates.password);
        updateFields.push(`encrypted_password = $${paramIndex++}`);
        values.push(encryptedPassword);
      }

      if (updates.account_type !== undefined) {
        updateFields.push(`account_type = $${paramIndex++}`);
        values.push(updates.account_type);
      }

      if (updates.account_status !== undefined) {
        updateFields.push(`account_status = $${paramIndex++}`);
        values.push(updates.account_status);
      }

      if (updates.account_state !== undefined) {
        updateFields.push(`account_state = $${paramIndex++}`);
        values.push(updates.account_state);
      }

      if (updates.proxy_id !== undefined) {
        updateFields.push(`proxy_id = $${paramIndex++}`);
        values.push(updates.proxy_id);
      }

      if (updates.follower_count !== undefined) {
        updateFields.push(`follower_count = $${paramIndex++}`);
        values.push(updates.follower_count);
      }

      if (updates.is_source !== undefined) {
        updateFields.push(`is_source = $${paramIndex++}`);
        values.push(updates.is_source);
      }

      if (updateFields.length === 0) {
        throw new Error('No fields to update');
      }

      // Add updated_at
      updateFields.push(`updated_at = NOW()`);

      // Add account ID as last parameter
      values.push(accountId);

      const query = `
        UPDATE accounts
        SET ${updateFields.join(', ')}
        WHERE id = $${paramIndex}
        RETURNING *
      `;

      const result = await pool.query(query, values);

      if (result.rows.length === 0) {
        throw new Error('Account not found');
      }

      return result.rows[0];
    } catch (error: any) {
      logger.error('Error updating account', { error: error.message, accountId });
      throw new Error(error.message || 'Failed to update account');
    }
  }

  /**
   * Delete an account
   */
  async deleteAccount(accountId: string): Promise<void> {
    try {
      const query = 'DELETE FROM accounts WHERE id = $1';
      const result = await pool.query(query, [accountId]);

      if (result.rowCount === 0) {
        throw new Error('Account not found');
      }
    } catch (error: any) {
      logger.error('Error deleting account', { error: error.message, accountId });
      throw new Error(error.message || 'Failed to delete account');
    }
  }

  /**
   * Bulk import accounts from CSV data
   */
  async bulkImport(userId: string, accounts: BulkImportInput[]): Promise<{
    success: Account[];
    failed: { username: string; error: string }[];
  }> {
    const success: Account[] = [];
    const failed: { username: string; error: string }[] = [];

    for (const accountData of accounts) {
      try {
        const account = await this.createAccount({
          user_id: userId,
          username: accountData.username,
          password: accountData.password,
          account_type: accountData.account_type,
          proxy_id: undefined, // Will be assigned later if proxy provided
        });
        success.push(account);
      } catch (error: any) {
        failed.push({
          username: accountData.username,
          error: error.message || 'Unknown error',
        });
      }
    }

    return { success, failed };
  }

  /**
   * Update account authentication status
   */
  async updateAuthStatus(
    accountId: string,
    isAuthenticated: boolean,
    sessionToken?: string,
    instagramUserId?: string
  ): Promise<void> {
    try {
      const query = `
        UPDATE accounts
        SET
          is_authenticated = $1,
          session_token = $2,
          instagram_user_id = $3,
          last_auth_check = NOW(),
          updated_at = NOW()
        WHERE id = $4
      `;

      await pool.query(query, [
        isAuthenticated,
        sessionToken || null,
        instagramUserId || null,
        accountId,
      ]);
    } catch (error) {
      logger.error('Error updating auth status', { error, accountId });
      throw new Error('Failed to update authentication status');
    }
  }

  /**
   * Get accounts by state (NEW_ACCOUNT, WARMING_UP, ACTIVE, etc.)
   */
  async getAccountsByState(userId: string, state: string): Promise<Account[]> {
    try {
      const query = `
        SELECT * FROM accounts
        WHERE user_id = $1 AND account_state = $2
        ORDER BY created_at DESC
      `;
      const result = await pool.query(query, [userId, state]);
      return result.rows;
    } catch (error) {
      logger.error('Error fetching accounts by state', { error, userId, state });
      throw new Error('Failed to fetch accounts');
    }
  }

  /**
   * Get swarm dashboard statistics
   */
  async getSwarmStats(userId: string): Promise<{
    total: number;
    byState: { [key: string]: number };
    byStatus: { [key: string]: number };
    authenticated: number;
    withProxy: number;
  }> {
    try {
      const query = `
        SELECT
          COUNT(*) as total,
          COUNT(*) FILTER (WHERE account_state = 'NEW_ACCOUNT') as new_accounts,
          COUNT(*) FILTER (WHERE account_state = 'WARMING_UP') as warming_up,
          COUNT(*) FILTER (WHERE account_state = 'ACTIVE') as active,
          COUNT(*) FILTER (WHERE account_state = 'PAUSED') as paused,
          COUNT(*) FILTER (WHERE account_state = 'SUSPENDED') as suspended,
          COUNT(*) FILTER (WHERE account_state = 'BANNED') as banned,
          COUNT(*) FILTER (WHERE account_status = 'active') as status_active,
          COUNT(*) FILTER (WHERE account_status = 'rate_limited') as rate_limited,
          COUNT(*) FILTER (WHERE account_status = 'error') as status_error,
          COUNT(*) FILTER (WHERE is_authenticated = true) as authenticated,
          COUNT(*) FILTER (WHERE proxy_id IS NOT NULL) as with_proxy
        FROM accounts
        WHERE user_id = $1
      `;

      const result = await pool.query(query, [userId]);
      const row = result.rows[0];

      return {
        total: parseInt(row.total || '0'),
        byState: {
          NEW_ACCOUNT: parseInt(row.new_accounts || '0'),
          WARMING_UP: parseInt(row.warming_up || '0'),
          ACTIVE: parseInt(row.active || '0'),
          PAUSED: parseInt(row.paused || '0'),
          SUSPENDED: parseInt(row.suspended || '0'),
          BANNED: parseInt(row.banned || '0'),
        },
        byStatus: {
          active: parseInt(row.status_active || '0'),
          rate_limited: parseInt(row.rate_limited || '0'),
          error: parseInt(row.status_error || '0'),
        },
        authenticated: parseInt(row.authenticated || '0'),
        withProxy: parseInt(row.with_proxy || '0'),
      };
    } catch (error) {
      logger.error('Error fetching swarm stats', { error, userId });
      throw new Error('Failed to fetch statistics');
    }
  }
}

export const accountService = new AccountService();
