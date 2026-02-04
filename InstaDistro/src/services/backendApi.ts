/**
 * Backend API Service
 * Handles all communication with the Node.js backend
 */

// Backend URL - update this based on environment
const getBackendUrl = () => {
  // For development on physical device, use your computer's IP
  // For iOS simulator: localhost
  // For Android emulator: 10.0.2.2
  // For web: localhost

  if (typeof window !== 'undefined') {
    // Running on web
    return 'http://localhost:3000';
  }

  // For mobile - replace with your computer's IP address
  // Example: return 'http://192.168.1.100:3000';
  return 'http://localhost:3000';
};

const BACKEND_URL = getBackendUrl();
const API_BASE = `${BACKEND_URL}/api`;

// User ID for development (will be replaced with JWT auth later)
const USER_ID = 'user_1';

export interface Account {
  id: string;
  user_id: string;
  username: string;
  account_type: 'personal' | 'business';
  is_authenticated: boolean;
  account_status: 'active' | 'rate_limited' | 'error' | 'suspended';
  account_state: 'NEW_ACCOUNT' | 'WARMING_UP' | 'ACTIVE' | 'PAUSED' | 'SUSPENDED' | 'BANNED';
  follower_count?: number;
  is_source: boolean;
  proxy_id?: string;
  profile_pic_url?: string;
  bio?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateAccountInput {
  username: string;
  password: string;
  accountType: 'personal' | 'business';
  proxyId?: string;
}

export interface BulkImportInput {
  accounts: Array<{
    username: string;
    password: string;
    account_type: 'personal' | 'business';
    email?: string;
    phone?: string;
  }>;
}

export interface SwarmStats {
  total: number;
  byState: {
    NEW_ACCOUNT: number;
    WARMING_UP: number;
    ACTIVE: number;
    PAUSED: number;
    SUSPENDED: number;
    BANNED: number;
  };
  byStatus: {
    active: number;
    rate_limited: number;
    error: number;
  };
  authenticated: number;
  withProxy: number;
}

class BackendApiService {
  private baseUrl: string;
  private userId: string;

  constructor() {
    this.baseUrl = API_BASE;
    this.userId = USER_ID;
  }

  /**
   * Generic request handler with error handling
   */
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;

    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      'x-user-id': this.userId,
      ...options.headers,
    };

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({
          message: `HTTP ${response.status}: ${response.statusText}`,
        }));
        throw new Error(error.message || 'API request failed');
      }

      return response.json();
    } catch (error) {
      if (error instanceof Error) {
        console.error('API request failed:', error.message);
        throw error;
      }
      throw new Error('Unknown error occurred');
    }
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<{ status: string; database: string }> {
    const response = await fetch(`${BACKEND_URL}/health`);
    return response.json();
  }

  /**
   * Create a new account
   */
  async createAccount(input: CreateAccountInput): Promise<{ account: Account }> {
    return this.request('/accounts', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  }

  /**
   * Get all accounts
   */
  async getAccounts(state?: string): Promise<{ accounts: Account[]; count: number }> {
    const query = state ? `?state=${state}` : '';
    return this.request(`/accounts${query}`, {
      method: 'GET',
    });
  }

  /**
   * Get single account by ID
   */
  async getAccountById(id: string): Promise<{ account: Account }> {
    return this.request(`/accounts/${id}`, {
      method: 'GET',
    });
  }

  /**
   * Update account
   */
  async updateAccount(
    id: string,
    updates: Partial<Account>
  ): Promise<{ account: Account }> {
    return this.request(`/accounts/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  }

  /**
   * Delete account
   */
  async deleteAccount(id: string): Promise<{ message: string }> {
    return this.request(`/accounts/${id}`, {
      method: 'DELETE',
    });
  }

  /**
   * Bulk import accounts
   */
  async bulkImportAccounts(input: BulkImportInput): Promise<{
    imported: number;
    failed: number;
    success: Account[];
    failures: Array<{ username: string; error: string }>;
  }> {
    return this.request('/accounts/bulk-import', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  }

  /**
   * Verify Instagram credentials
   */
  async verifyAccount(id: string): Promise<{
    verified: boolean;
    message: string;
  }> {
    return this.request(`/accounts/${id}/verify`, {
      method: 'POST',
    });
  }

  /**
   * Get swarm statistics
   */
  async getSwarmStats(): Promise<{ stats: SwarmStats }> {
    return this.request('/accounts/stats/swarm', {
      method: 'GET',
    });
  }

  /**
   * Set user ID for API calls
   */
  setUserId(userId: string) {
    this.userId = userId;
  }

  /**
   * Get current backend URL
   */
  getBackendUrl(): string {
    return BACKEND_URL;
  }
}

// Export singleton instance
export const backendApi = new BackendApiService();
