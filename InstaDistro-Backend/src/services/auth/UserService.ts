import { pool } from '../../config/database';
import { logger } from '../../config/logger';
import { GoogleUserInfo } from './GoogleOAuthService';

export interface User {
  id: string;
  email: string;
  google_id?: string;
  auth_provider: 'google' | 'email';
  name?: string;
  given_name?: string;
  family_name?: string;
  picture?: string;
  locale?: string;
  email_verified: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  last_login?: string;
}

export interface CreateUserInput {
  email: string;
  google_id?: string;
  auth_provider: 'google' | 'email';
  name?: string;
  given_name?: string;
  family_name?: string;
  picture?: string;
  locale?: string;
  email_verified?: boolean;
}

export class UserService {
  /**
   * Find user by email
   */
  async findByEmail(email: string): Promise<User | null> {
    try {
      const result = await pool.query(
        'SELECT * FROM users WHERE email = $1',
        [email]
      );

      return result.rows[0] || null;
    } catch (error) {
      logger.error(`Failed to find user by email ${email}:`, error);
      throw error;
    }
  }

  /**
   * Find user by Google ID
   */
  async findByGoogleId(googleId: string): Promise<User | null> {
    try {
      const result = await pool.query(
        'SELECT * FROM users WHERE google_id = $1',
        [googleId]
      );

      return result.rows[0] || null;
    } catch (error) {
      logger.error(`Failed to find user by Google ID ${googleId}:`, error);
      throw error;
    }
  }

  /**
   * Find user by ID
   */
  async findById(id: string): Promise<User | null> {
    try {
      const result = await pool.query(
        'SELECT * FROM users WHERE id = $1',
        [id]
      );

      return result.rows[0] || null;
    } catch (error) {
      logger.error(`Failed to find user by ID ${id}:`, error);
      throw error;
    }
  }

  /**
   * Create new user
   */
  async create(input: CreateUserInput): Promise<User> {
    try {
      const result = await pool.query(
        `INSERT INTO users (
          email, google_id, auth_provider, name, given_name, family_name,
          picture, locale, email_verified, last_login
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
        RETURNING *`,
        [
          input.email,
          input.google_id || null,
          input.auth_provider,
          input.name || null,
          input.given_name || null,
          input.family_name || null,
          input.picture || null,
          input.locale || null,
          input.email_verified || false,
        ]
      );

      logger.info(`User created: ${input.email}`);

      return result.rows[0];
    } catch (error) {
      logger.error('Failed to create user:', error);
      throw error;
    }
  }

  /**
   * Update user profile
   */
  async update(id: string, updates: Partial<CreateUserInput>): Promise<User> {
    try {
      const fields: string[] = [];
      const values: any[] = [];
      let paramCount = 1;

      if (updates.name !== undefined) {
        fields.push(`name = $${paramCount++}`);
        values.push(updates.name);
      }
      if (updates.given_name !== undefined) {
        fields.push(`given_name = $${paramCount++}`);
        values.push(updates.given_name);
      }
      if (updates.family_name !== undefined) {
        fields.push(`family_name = $${paramCount++}`);
        values.push(updates.family_name);
      }
      if (updates.picture !== undefined) {
        fields.push(`picture = $${paramCount++}`);
        values.push(updates.picture);
      }
      if (updates.locale !== undefined) {
        fields.push(`locale = $${paramCount++}`);
        values.push(updates.locale);
      }
      if (updates.email_verified !== undefined) {
        fields.push(`email_verified = $${paramCount++}`);
        values.push(updates.email_verified);
      }

      fields.push(`updated_at = NOW()`);
      values.push(id);

      const result = await pool.query(
        `UPDATE users SET ${fields.join(', ')} WHERE id = $${paramCount} RETURNING *`,
        values
      );

      if (result.rows.length === 0) {
        throw new Error('User not found');
      }

      logger.info(`User updated: ${id}`);

      return result.rows[0];
    } catch (error) {
      logger.error('Failed to update user:', error);
      throw error;
    }
  }

  /**
   * Update last login timestamp
   */
  async updateLastLogin(id: string): Promise<void> {
    try {
      await pool.query(
        'UPDATE users SET last_login = NOW() WHERE id = $1',
        [id]
      );
    } catch (error) {
      logger.error(`Failed to update last login for user ${id}:`, error);
    }
  }

  /**
   * Find or create user from Google OAuth
   */
  async findOrCreateFromGoogle(googleUserInfo: GoogleUserInfo): Promise<User> {
    try {
      // Try to find existing user by Google ID
      let user = await this.findByGoogleId(googleUserInfo.sub);

      if (user) {
        // User exists, update profile and last login
        user = await this.update(user.id, {
          name: googleUserInfo.name,
          given_name: googleUserInfo.given_name,
          family_name: googleUserInfo.family_name,
          picture: googleUserInfo.picture,
          locale: googleUserInfo.locale,
          email_verified: googleUserInfo.email_verified,
        });

        await this.updateLastLogin(user.id);

        logger.info(`Existing Google user logged in: ${user.email}`);

        return user;
      }

      // Check if user exists with same email (different provider)
      user = await this.findByEmail(googleUserInfo.email);

      if (user) {
        // User exists with email, link Google account
        user = await this.update(user.id, {
          google_id: googleUserInfo.sub,
          name: googleUserInfo.name,
          given_name: googleUserInfo.given_name,
          family_name: googleUserInfo.family_name,
          picture: googleUserInfo.picture,
          locale: googleUserInfo.locale,
          email_verified: googleUserInfo.email_verified,
        });

        await this.updateLastLogin(user.id);

        logger.info(`Google account linked to existing user: ${user.email}`);

        return user;
      }

      // Create new user
      user = await this.create({
        email: googleUserInfo.email,
        google_id: googleUserInfo.sub,
        auth_provider: 'google',
        name: googleUserInfo.name,
        given_name: googleUserInfo.given_name,
        family_name: googleUserInfo.family_name,
        picture: googleUserInfo.picture,
        locale: googleUserInfo.locale,
        email_verified: googleUserInfo.email_verified,
      });

      logger.info(`New Google user created: ${user.email}`);

      return user;
    } catch (error) {
      logger.error('Failed to find or create user from Google:', error);
      throw error;
    }
  }

  /**
   * Delete user
   */
  async delete(id: string): Promise<void> {
    try {
      await pool.query('DELETE FROM users WHERE id = $1', [id]);
      logger.info(`User deleted: ${id}`);
    } catch (error) {
      logger.error(`Failed to delete user ${id}:`, error);
      throw error;
    }
  }
}

export const userService = new UserService();
