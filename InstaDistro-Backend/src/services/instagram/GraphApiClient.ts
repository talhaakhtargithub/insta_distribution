import axios from 'axios';
import FormData from 'form-data';
import { createReadStream } from 'fs';
import { logger } from '../../config/logger';

/**
 * Instagram Graph API Client
 * For Business Instagram accounts
 *
 * Features:
 * - Upload photos and videos
 * - Get media insights
 * - Manage business account
 *
 * Note: Requires Facebook Page connected to Instagram Business account
 * Docs: https://developers.facebook.com/docs/instagram-api
 */
export class GraphApiClient {
  private accessToken: string;
  private instagramAccountId: string;
  private baseUrl = 'https://graph.facebook.com/v18.0';

  constructor(accessToken: string, instagramAccountId: string) {
    this.accessToken = accessToken;
    this.instagramAccountId = instagramAccountId;
  }

  /**
   * Upload a photo to Instagram
   */
  async uploadPhoto(
    imageUrl: string,
    caption: string
  ): Promise<{ success: boolean; mediaId?: string; error?: string }> {
    try {
      logger.info(`Uploading photo via Graph API for account ${this.instagramAccountId}`);

      // Step 1: Create media container
      const containerResponse = await axios.post(
        `${this.baseUrl}/${this.instagramAccountId}/media`,
        {
          image_url: imageUrl,
          caption,
          access_token: this.accessToken,
        }
      );

      const containerId = containerResponse.data.id;

      // Step 2: Publish the container
      const publishResponse = await axios.post(
        `${this.baseUrl}/${this.instagramAccountId}/media_publish`,
        {
          creation_id: containerId,
          access_token: this.accessToken,
        }
      );

      const mediaId = publishResponse.data.id;

      logger.info(`Photo uploaded successfully via Graph API, media ID: ${mediaId}`);

      return {
        success: true,
        mediaId,
      };
    } catch (error: any) {
      logger.error('Graph API photo upload failed:', error.response?.data || error.message);

      return {
        success: false,
        error: error.response?.data?.error?.message || error.message,
      };
    }
  }

  /**
   * Upload a video to Instagram
   */
  async uploadVideo(
    videoUrl: string,
    caption: string,
    coverUrl?: string
  ): Promise<{ success: boolean; mediaId?: string; error?: string }> {
    try {
      logger.info(`Uploading video via Graph API for account ${this.instagramAccountId}`);

      // Step 1: Create video container
      const containerData: any = {
        media_type: 'VIDEO',
        video_url: videoUrl,
        caption,
        access_token: this.accessToken,
      };

      if (coverUrl) {
        containerData.thumb_offset = 0; // Use first frame as thumbnail
      }

      const containerResponse = await axios.post(
        `${this.baseUrl}/${this.instagramAccountId}/media`,
        containerData
      );

      const containerId = containerResponse.data.id;

      // Step 2: Wait for video processing
      let status = 'IN_PROGRESS';
      let attempts = 0;
      const maxAttempts = 60; // 5 minutes max

      while (status === 'IN_PROGRESS' && attempts < maxAttempts) {
        await this.delay(5000); // Wait 5 seconds

        const statusResponse = await axios.get(
          `${this.baseUrl}/${containerId}`,
          {
            params: {
              fields: 'status_code',
              access_token: this.accessToken,
            },
          }
        );

        status = statusResponse.data.status_code;
        attempts++;

        logger.info(`Video processing status: ${status} (attempt ${attempts}/${maxAttempts})`);
      }

      if (status !== 'FINISHED') {
        return {
          success: false,
          error: `Video processing timed out or failed with status: ${status}`,
        };
      }

      // Step 3: Publish the container
      const publishResponse = await axios.post(
        `${this.baseUrl}/${this.instagramAccountId}/media_publish`,
        {
          creation_id: containerId,
          access_token: this.accessToken,
        }
      );

      const mediaId = publishResponse.data.id;

      logger.info(`Video uploaded successfully via Graph API, media ID: ${mediaId}`);

      return {
        success: true,
        mediaId,
      };
    } catch (error: any) {
      logger.error('Graph API video upload failed:', error.response?.data || error.message);

      return {
        success: false,
        error: error.response?.data?.error?.message || error.message,
      };
    }
  }

  /**
   * Get media insights (analytics)
   */
  async getMediaInsights(
    mediaId: string
  ): Promise<{ success: boolean; insights?: any; error?: string }> {
    try {
      const response = await axios.get(`${this.baseUrl}/${mediaId}/insights`, {
        params: {
          metric: 'engagement,impressions,reach,saved',
          access_token: this.accessToken,
        },
      });

      return {
        success: true,
        insights: response.data.data,
      };
    } catch (error: any) {
      logger.error('Failed to get media insights:', error.response?.data || error.message);

      return {
        success: false,
        error: error.response?.data?.error?.message || error.message,
      };
    }
  }

  /**
   * Get account info
   */
  async getAccountInfo(): Promise<any> {
    try {
      const response = await axios.get(`${this.baseUrl}/${this.instagramAccountId}`, {
        params: {
          fields: 'id,username,account_type,media_count,followers_count,follows_count',
          access_token: this.accessToken,
        },
      });

      return response.data;
    } catch (error: any) {
      logger.error('Failed to get account info:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Get recent media
   */
  async getRecentMedia(limit: number = 10): Promise<any[]> {
    try {
      const response = await axios.get(`${this.baseUrl}/${this.instagramAccountId}/media`, {
        params: {
          fields: 'id,caption,media_type,media_url,permalink,timestamp',
          limit,
          access_token: this.accessToken,
        },
      });

      return response.data.data;
    } catch (error: any) {
      logger.error('Failed to get recent media:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Validate access token
   */
  async validateToken(): Promise<{ valid: boolean; error?: string }> {
    try {
      await this.getAccountInfo();
      return { valid: true };
    } catch (error: any) {
      return {
        valid: false,
        error: error.response?.data?.error?.message || 'Invalid access token',
      };
    }
  }

  /**
   * Helper: Delay function
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Get long-lived access token from short-lived token
   * Note: This requires your Facebook App ID and Secret
   */
  static async exchangeToken(
    shortLivedToken: string,
    appId: string,
    appSecret: string
  ): Promise<{ accessToken?: string; expiresIn?: number; error?: string }> {
    try {
      const response = await axios.get('https://graph.facebook.com/v18.0/oauth/access_token', {
        params: {
          grant_type: 'fb_exchange_token',
          client_id: appId,
          client_secret: appSecret,
          fb_exchange_token: shortLivedToken,
        },
      });

      return {
        accessToken: response.data.access_token,
        expiresIn: response.data.expires_in,
      };
    } catch (error: any) {
      logger.error('Token exchange failed:', error.response?.data || error.message);

      return {
        error: error.response?.data?.error?.message || 'Token exchange failed',
      };
    }
  }
}
