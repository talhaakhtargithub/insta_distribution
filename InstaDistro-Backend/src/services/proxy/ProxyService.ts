import { pool } from '../../config/database';
import axios from 'axios';

// ============================================
// TYPES
// ============================================

export type ProxyType = 'residential' | 'datacenter' | 'mobile';
export type ProxyHealthStatus = 'healthy' | 'slow' | 'failing' | 'dead';

export interface ProxyConfig {
  id: string;
  userId: string;
  type: ProxyType;

  // Connection details
  host: string;
  port: number;
  username?: string;
  password?: string;

  // Location
  country?: string;
  city?: string;

  // Status
  isActive: boolean;
  assignedAccountIds: string[];

  // Health metrics
  lastHealthCheck?: Date;
  healthStatus: ProxyHealthStatus;
  requestCount: number;
  errorCount: number;
  avgResponseTime?: number;

  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

export interface ProxyStats {
  total: number;
  healthy: number;
  slow: number;
  failing: number;
  dead: number;
  byType: Record<ProxyType, number>;
  totalRequests: number;
  totalErrors: number;
  avgResponseTime: number;
}

export interface ProxyTestResult {
  success: boolean;
  responseTime: number;
  error?: string;
  ip?: string;
  location?: string;
}

// ============================================
// PROXY SERVICE
// ============================================

export class ProxyService {

  /**
   * Create a new proxy configuration
   */
  async createProxy(
    userId: string,
    type: ProxyType,
    host: string,
    port: number,
    username?: string,
    password?: string,
    country?: string,
    city?: string
  ): Promise<ProxyConfig> {
    const client = await pool.connect();

    try {
      // Encrypt password if provided
      let encryptedPassword = null;
      if (password) {
        const crypto = require('crypto');
        const algorithm = 'aes-256-cbc';
        const key = Buffer.from(process.env.ENCRYPTION_KEY || 'defaultkey12345678901234567890', 'utf8').slice(0, 32);
        const iv = crypto.randomBytes(16);
        const cipher = crypto.createCipheriv(algorithm, key, iv);
        let encrypted = cipher.update(password, 'utf8', 'hex');
        encrypted += cipher.final('hex');
        encryptedPassword = iv.toString('hex') + ':' + encrypted;
      }

      const result = await client.query(
        `INSERT INTO proxy_configs
         (user_id, type, host, port, username, encrypted_password, country, city)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING *`,
        [userId, type, host, port, username, encryptedPassword, country, city]
      );

      return this.mapRowToProxy(result.rows[0]);

    } finally {
      client.release();
    }
  }

  /**
   * Get proxy by ID
   */
  async getProxyById(proxyId: string): Promise<ProxyConfig | null> {
    const client = await pool.connect();

    try {
      const result = await client.query(
        'SELECT * FROM proxy_configs WHERE id = $1',
        [proxyId]
      );

      if (result.rows.length === 0) {
        return null;
      }

      return this.mapRowToProxy(result.rows[0]);

    } finally {
      client.release();
    }
  }

  /**
   * Get all proxies for a user
   */
  async getProxiesByUser(userId: string, activeOnly: boolean = false): Promise<ProxyConfig[]> {
    const client = await pool.connect();

    try {
      let query = 'SELECT * FROM proxy_configs WHERE user_id = $1';

      if (activeOnly) {
        query += ' AND is_active = true';
      }

      query += ' ORDER BY created_at DESC';

      const result = await client.query(query, [userId]);

      return result.rows.map(row => this.mapRowToProxy(row));

    } finally {
      client.release();
    }
  }

  /**
   * Update proxy configuration
   */
  async updateProxy(
    proxyId: string,
    updates: {
      host?: string;
      port?: number;
      username?: string;
      password?: string;
      country?: string;
      city?: string;
      isActive?: boolean;
      type?: ProxyType;
    }
  ): Promise<ProxyConfig> {
    const client = await pool.connect();

    try {
      const fields: string[] = [];
      const values: any[] = [];
      let paramCounter = 1;

      if (updates.host !== undefined) {
        fields.push(`host = $${paramCounter++}`);
        values.push(updates.host);
      }

      if (updates.port !== undefined) {
        fields.push(`port = $${paramCounter++}`);
        values.push(updates.port);
      }

      if (updates.username !== undefined) {
        fields.push(`username = $${paramCounter++}`);
        values.push(updates.username);
      }

      if (updates.password !== undefined) {
        // Encrypt password
        let encryptedPassword = null;
        if (updates.password) {
          const crypto = require('crypto');
          const algorithm = 'aes-256-cbc';
          const key = Buffer.from(process.env.ENCRYPTION_KEY || 'defaultkey12345678901234567890', 'utf8').slice(0, 32);
          const iv = crypto.randomBytes(16);
          const cipher = crypto.createCipheriv(algorithm, key, iv);
          let encrypted = cipher.update(updates.password, 'utf8', 'hex');
          encrypted += cipher.final('hex');
          encryptedPassword = iv.toString('hex') + ':' + encrypted;
        }
        fields.push(`encrypted_password = $${paramCounter++}`);
        values.push(encryptedPassword);
      }

      if (updates.country !== undefined) {
        fields.push(`country = $${paramCounter++}`);
        values.push(updates.country);
      }

      if (updates.city !== undefined) {
        fields.push(`city = $${paramCounter++}`);
        values.push(updates.city);
      }

      if (updates.isActive !== undefined) {
        fields.push(`is_active = $${paramCounter++}`);
        values.push(updates.isActive);
      }

      if (updates.type !== undefined) {
        fields.push(`type = $${paramCounter++}`);
        values.push(updates.type);
      }

      if (fields.length === 0) {
        throw new Error('No fields to update');
      }

      values.push(proxyId);
      const query = `UPDATE proxy_configs SET ${fields.join(', ')} WHERE id = $${paramCounter} RETURNING *`;

      const result = await client.query(query, values);

      if (result.rows.length === 0) {
        throw new Error('Proxy not found');
      }

      return this.mapRowToProxy(result.rows[0]);

    } finally {
      client.release();
    }
  }

  /**
   * Delete proxy
   */
  async deleteProxy(proxyId: string): Promise<void> {
    const client = await pool.connect();

    try {
      // Unassign from all accounts first
      await client.query(
        'UPDATE accounts SET proxy_id = NULL, proxy_connected = false WHERE proxy_id = $1',
        [proxyId]
      );

      // Delete proxy
      const result = await client.query(
        'DELETE FROM proxy_configs WHERE id = $1',
        [proxyId]
      );

      if (result.rowCount === 0) {
        throw new Error('Proxy not found');
      }

    } finally {
      client.release();
    }
  }

  /**
   * Assign proxy to account
   */
  async assignProxyToAccount(proxyId: string, accountId: string): Promise<void> {
    const client = await pool.connect();

    try {
      // Update account
      await client.query(
        'UPDATE accounts SET proxy_id = $1, proxy_connected = false WHERE id = $2',
        [proxyId, accountId]
      );

      // Update proxy's assigned accounts list
      await client.query(
        `UPDATE proxy_configs
         SET assigned_account_ids = array_append(
           CASE WHEN $2 = ANY(assigned_account_ids) THEN assigned_account_ids
           ELSE assigned_account_ids END, $2
         )
         WHERE id = $1`,
        [proxyId, accountId]
      );

    } finally {
      client.release();
    }
  }

  /**
   * Unassign proxy from account
   */
  async unassignProxyFromAccount(accountId: string): Promise<void> {
    const client = await pool.connect();

    try {
      // Get current proxy ID
      const accountQuery = await client.query(
        'SELECT proxy_id FROM accounts WHERE id = $1',
        [accountId]
      );

      if (accountQuery.rows.length > 0 && accountQuery.rows[0].proxy_id) {
        const proxyId = accountQuery.rows[0].proxy_id;

        // Remove from proxy's assigned accounts
        await client.query(
          'UPDATE proxy_configs SET assigned_account_ids = array_remove(assigned_account_ids, $1) WHERE id = $2',
          [accountId, proxyId]
        );
      }

      // Update account
      await client.query(
        'UPDATE accounts SET proxy_id = NULL, proxy_connected = false WHERE id = $1',
        [accountId]
      );

    } finally {
      client.release();
    }
  }

  /**
   * Test proxy connection
   */
  async testProxy(proxyConfig: ProxyConfig): Promise<ProxyTestResult> {
    const startTime = Date.now();

    try {
      // Construct proxy URL
      let proxyUrl = `http://`;
      if (proxyConfig.username && proxyConfig.password) {
        const password = await this.decryptPassword(proxyConfig.password);
        proxyUrl += `${proxyConfig.username}:${password}@`;
      }
      proxyUrl += `${proxyConfig.host}:${proxyConfig.port}`;

      // Test with ipinfo.io
      const response = await axios.get('https://ipinfo.io/json', {
        proxy: {
          protocol: 'http',
          host: proxyConfig.host,
          port: proxyConfig.port,
          auth: proxyConfig.username && proxyConfig.password ? {
            username: proxyConfig.username,
            password: await this.decryptPassword(proxyConfig.password!)
          } : undefined
        },
        timeout: 10000
      });

      const responseTime = Date.now() - startTime;

      return {
        success: true,
        responseTime,
        ip: response.data.ip,
        location: `${response.data.city}, ${response.data.country}`
      };

    } catch (error: any) {
      const responseTime = Date.now() - startTime;

      return {
        success: false,
        responseTime,
        error: error.message
      };
    }
  }

  /**
   * Get proxy statistics
   */
  async getProxyStats(userId: string): Promise<ProxyStats> {
    const client = await pool.connect();

    try {
      const result = await client.query(
        `SELECT
           COUNT(*) as total,
           COUNT(*) FILTER (WHERE health_status = 'healthy') as healthy,
           COUNT(*) FILTER (WHERE health_status = 'slow') as slow,
           COUNT(*) FILTER (WHERE health_status = 'failing') as failing,
           COUNT(*) FILTER (WHERE health_status = 'dead') as dead,
           type,
           SUM(request_count) as total_requests,
           SUM(error_count) as total_errors,
           AVG(CASE WHEN last_health_check IS NOT NULL
               THEN EXTRACT(EPOCH FROM (NOW() - last_health_check)) * 1000
               ELSE NULL END) as avg_response_time
         FROM proxy_configs
         WHERE user_id = $1
         GROUP BY type`,
        [userId]
      );

      const byType: Record<ProxyType, number> = {
        residential: 0,
        datacenter: 0,
        mobile: 0
      };

      let total = 0;
      let healthy = 0;
      let slow = 0;
      let failing = 0;
      let dead = 0;
      let totalRequests = 0;
      let totalErrors = 0;
      let avgResponseTime = 0;

      for (const row of result.rows) {
        total += parseInt(row.total);
        healthy += parseInt(row.healthy);
        slow += parseInt(row.slow);
        failing += parseInt(row.failing);
        dead += parseInt(row.dead);
        byType[row.type as ProxyType] = parseInt(row.total);
        totalRequests += parseInt(row.total_requests) || 0;
        totalErrors += parseInt(row.total_errors) || 0;
        avgResponseTime += parseFloat(row.avg_response_time) || 0;
      }

      return {
        total,
        healthy,
        slow,
        failing,
        dead,
        byType,
        totalRequests,
        totalErrors,
        avgResponseTime: result.rows.length > 0 ? avgResponseTime / result.rows.length : 0
      };

    } finally {
      client.release();
    }
  }

  /**
   * Update proxy health metrics
   */
  async updateProxyHealth(
    proxyId: string,
    healthStatus: ProxyHealthStatus,
    responseTime?: number,
    success?: boolean
  ): Promise<void> {
    const client = await pool.connect();

    try {
      const fields: string[] = [
        'last_health_check = NOW()',
        `health_status = '${healthStatus}'`
      ];

      if (success !== undefined) {
        fields.push('request_count = request_count + 1');
        if (!success) {
          fields.push('error_count = error_count + 1');
        }
      }

      const query = `UPDATE proxy_configs SET ${fields.join(', ')} WHERE id = $1`;
      await client.query(query, [proxyId]);

    } finally {
      client.release();
    }
  }

  /**
   * Get least loaded proxy for account assignment
   */
  async getLeastLoadedProxy(userId: string, type?: ProxyType): Promise<ProxyConfig | null> {
    const client = await pool.connect();

    try {
      let query = `
        SELECT * FROM proxy_configs
        WHERE user_id = $1
          AND is_active = true
          AND health_status IN ('healthy', 'slow')
      `;
      const params: any[] = [userId];

      if (type) {
        query += ` AND type = $2`;
        params.push(type);
      }

      query += `
        ORDER BY
          array_length(assigned_account_ids, 1) ASC NULLS FIRST,
          error_count ASC,
          request_count ASC
        LIMIT 1
      `;

      const result = await client.query(query, params);

      if (result.rows.length === 0) {
        return null;
      }

      return this.mapRowToProxy(result.rows[0]);

    } finally {
      client.release();
    }
  }

  /**
   * Decrypt proxy password
   */
  private async decryptPassword(encryptedPassword: string): Promise<string> {
    const crypto = require('crypto');
    const algorithm = 'aes-256-cbc';
    const key = Buffer.from(process.env.ENCRYPTION_KEY || 'defaultkey12345678901234567890', 'utf8').slice(0, 32);

    const parts = encryptedPassword.split(':');
    const iv = Buffer.from(parts[0], 'hex');
    const encrypted = parts[1];

    const decipher = crypto.createDecipheriv(algorithm, key, iv);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  }

  /**
   * Map database row to ProxyConfig
   */
  private mapRowToProxy(row: any): ProxyConfig {
    return {
      id: row.id,
      userId: row.user_id,
      type: row.type as ProxyType,
      host: row.host,
      port: row.port,
      username: row.username,
      password: row.encrypted_password,
      country: row.country,
      city: row.city,
      isActive: row.is_active,
      assignedAccountIds: row.assigned_account_ids || [],
      lastHealthCheck: row.last_health_check ? new Date(row.last_health_check) : undefined,
      healthStatus: row.health_status as ProxyHealthStatus,
      requestCount: row.request_count || 0,
      errorCount: row.error_count || 0,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at)
    };
  }
}

export default new ProxyService();
