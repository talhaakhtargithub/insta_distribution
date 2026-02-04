import { IgApiClient } from 'instagram-private-api';
import { readFile } from 'fs/promises';
import { logger } from '../../config/logger';

/**
 * Instagram Private API Client
 * For Personal Instagram accounts
 *
 * Features:
 * - Login with username/password
 * - Upload photos and videos
 * - Like, comment, follow
 * - Get feed and stories
 * - Session management
 */
export class PrivateApiClient {
  private ig: IgApiClient;
  private username: string;
  private sessionData: any;

  constructor(username: string) {
    this.ig = new IgApiClient();
    this.username = username;

    // Set up device and user agent
    this.ig.state.generateDevice(username);
  }

  /**
   * Login to Instagram with credentials
   */
  async login(password: string): Promise<{ success: boolean; sessionToken?: string; error?: string }> {
    try {
      logger.info(`Attempting Instagram login for ${this.username}`);

      // Simulate pre-login flow (important for avoiding detection)
      await this.ig.simulate.preLoginFlow();

      // Perform login
      const auth = await this.ig.account.login(this.username, password);

      // Simulate post-login flow
      await this.ig.simulate.postLoginFlow();

      // Save session data
      this.sessionData = await this.ig.state.serialize();
      delete this.sessionData.constants;

      logger.info(`Successfully logged in as ${this.username}`);

      return {
        success: true,
        sessionToken: JSON.stringify(this.sessionData),
      };
    } catch (error: any) {
      logger.error(`Login failed for ${this.username}:`, error.message);

      // Handle specific errors
      if (error.name === 'IgCheckpointError') {
        return {
          success: false,
          error: 'Checkpoint required - Please verify your account in the Instagram app',
        };
      }

      if (error.name === 'IgLoginTwoFactorRequiredError') {
        return {
          success: false,
          error: '2FA required - Two-factor authentication is enabled',
        };
      }

      if (error.message.includes('challenge_required')) {
        return {
          success: false,
          error: 'Challenge required - Instagram wants to verify this login',
        };
      }

      return {
        success: false,
        error: error.message || 'Login failed',
      };
    }
  }

  /**
   * Restore session from token
   */
  async restoreSession(sessionToken: string): Promise<boolean> {
    try {
      const sessionData = JSON.parse(sessionToken);
      await this.ig.state.deserialize(sessionData);

      logger.info(`Session restored for ${this.username}`);
      return true;
    } catch (error) {
      logger.error(`Failed to restore session for ${this.username}:`, error);
      return false;
    }
  }

  /**
   * Upload a photo to Instagram
   */
  async uploadPhoto(
    imagePath: string,
    caption: string
  ): Promise<{ success: boolean; mediaId?: string; error?: string }> {
    try {
      logger.info(`Uploading photo for ${this.username}`);

      const imageBuffer = await readFile(imagePath);

      const publishResult = await this.ig.publish.photo({
        file: imageBuffer,
        caption,
      });

      logger.info(`Photo uploaded successfully for ${this.username}, media ID: ${publishResult.media.id}`);

      return {
        success: true,
        mediaId: publishResult.media.id,
      };
    } catch (error: any) {
      logger.error(`Photo upload failed for ${this.username}:`, error.message);

      return {
        success: false,
        error: error.message || 'Upload failed',
      };
    }
  }

  /**
   * Upload a video to Instagram
   */
  async uploadVideo(
    videoPath: string,
    caption: string,
    coverImagePath?: string
  ): Promise<{ success: boolean; mediaId?: string; error?: string }> {
    try {
      logger.info(`Uploading video for ${this.username}`);

      const videoBuffer = await readFile(videoPath);
      let coverBuffer: Buffer | undefined;

      if (coverImagePath) {
        coverBuffer = await readFile(coverImagePath);
      }

      const publishOptions: any = {
        video: videoBuffer,
        caption,
      };

      if (coverBuffer) {
        publishOptions.coverImage = coverBuffer;
      }

      const publishResult = await this.ig.publish.video(publishOptions);

      logger.info(`Video uploaded successfully for ${this.username}, media ID: ${publishResult.media.id}`);

      return {
        success: true,
        mediaId: publishResult.media.id,
      };
    } catch (error: any) {
      logger.error(`Video upload failed for ${this.username}:`, error.message);

      // Check for specific errors
      if (error.message.includes('transcode_timeout')) {
        return {
          success: false,
          error: 'Video processing timeout - try a smaller video',
        };
      }

      if (error.message.includes('VideoTooLongException')) {
        return {
          success: false,
          error: 'Video is too long - maximum 60 seconds',
        };
      }

      return {
        success: false,
        error: error.message || 'Upload failed',
      };
    }
  }

  /**
   * Like a post
   */
  async likePost(mediaId: string): Promise<{ success: boolean; error?: string }> {
    try {
      await this.ig.media.like({
        mediaId,
        moduleInfo: {
          module_name: 'feed_timeline',
          user_id: await this.ig.user.getIdByUsername(this.username),
          username: this.username,
        } as any,
        d: 0,
      });

      logger.info(`Post ${mediaId} liked by ${this.username}`);
      return { success: true };
    } catch (error: any) {
      logger.error(`Like failed for ${this.username}:`, error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Comment on a post
   */
  async commentOnPost(
    mediaId: string,
    text: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      await this.ig.media.comment({
        mediaId,
        text,
      });

      logger.info(`Comment posted by ${this.username} on ${mediaId}`);
      return { success: true };
    } catch (error: any) {
      logger.error(`Comment failed for ${this.username}:`, error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Follow a user
   */
  async followUser(userId: string): Promise<{ success: boolean; error?: string }> {
    try {
      await this.ig.friendship.create(userId);

      logger.info(`${this.username} followed user ${userId}`);
      return { success: true };
    } catch (error: any) {
      logger.error(`Follow failed for ${this.username}:`, error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get user info
   */
  async getUserInfo(): Promise<any> {
    try {
      const user = await this.ig.user.info(await this.ig.user.getIdByUsername(this.username));
      return user;
    } catch (error: any) {
      logger.error(`Failed to get user info for ${this.username}:`, error.message);
      throw error;
    }
  }

  /**
   * Get timeline feed
   */
  async getTimelineFeed(maxItems: number = 10): Promise<any[]> {
    try {
      const feed = this.ig.feed.timeline();
      const items = await feed.items();
      return items.slice(0, maxItems);
    } catch (error: any) {
      logger.error(`Failed to get timeline for ${this.username}:`, error.message);
      throw error;
    }
  }

  /**
   * Search for users
   */
  async searchUsers(query: string): Promise<any[]> {
    try {
      const results = await this.ig.search.users(query);
      return results;
    } catch (error: any) {
      logger.error(`User search failed for ${this.username}:`, error.message);
      throw error;
    }
  }

  /**
   * Check if session is valid
   */
  async isSessionValid(): Promise<boolean> {
    try {
      await this.ig.account.currentUser();
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get current session data
   */
  getSessionData(): string {
    return JSON.stringify(this.sessionData);
  }
}
