import { Request, Response } from 'express';
import { postingService } from '../../services/instagram/PostingService';
import { logger } from '../../config/logger';

export class PostController {
  /**
   * POST /api/posts/immediate
   * Post immediately to Instagram (no scheduling)
   */
  async postImmediate(req: Request, res: Response) {
    try {
      const {
        accountId,
        mediaPath,
        mediaType,
        caption,
        hashtags,
        coverImagePath,
      } = req.body;

      // Validation
      if (!accountId || !mediaPath || !mediaType) {
        return res.status(400).json({
          error: 'Validation Error',
          message: 'accountId, mediaPath, and mediaType are required',
        });
      }

      if (!['photo', 'video'].includes(mediaType)) {
        return res.status(400).json({
          error: 'Validation Error',
          message: 'mediaType must be "photo" or "video"',
        });
      }

      logger.info(`Posting to Instagram for account ${accountId}`);

      // Post to Instagram
      const result = await postingService.post({
        accountId,
        mediaPath,
        mediaType,
        caption,
        hashtags,
        coverImagePath,
      });

      if (!result.success) {
        return res.status(400).json({
          error: 'Post Failed',
          message: result.error || 'Failed to post to Instagram',
        });
      }

      logger.info(`Successfully posted to Instagram: ${result.mediaId}`);

      res.json({
        success: true,
        message: 'Posted to Instagram successfully',
        mediaId: result.mediaId,
        postedAt: result.postedAt,
      });
    } catch (error: any) {
      logger.error('Post immediate error:', error);
      res.status(500).json({
        error: 'Server Error',
        message: error.message || 'Failed to post',
      });
    }
  }

  /**
   * POST /api/posts/verify-account
   * Verify Instagram account credentials and login
   */
  async verifyAccount(req: Request, res: Response) {
    try {
      const { accountId } = req.body;

      if (!accountId) {
        return res.status(400).json({
          error: 'Validation Error',
          message: 'accountId is required',
        });
      }

      logger.info(`Verifying account ${accountId}`);

      const result = await postingService.verifyAccount(accountId);

      if (!result.success) {
        return res.status(400).json({
          error: 'Verification Failed',
          message: result.error || 'Failed to verify account',
        });
      }

      res.json({
        success: true,
        message: 'Account verified successfully',
        accountInfo: result.accountInfo,
      });
    } catch (error: any) {
      logger.error('Verify account error:', error);
      res.status(500).json({
        error: 'Server Error',
        message: error.message || 'Verification failed',
      });
    }
  }

  /**
   * GET /api/posts/history
   * Get posting history for a user
   */
  async getHistory(req: Request, res: Response) {
    try {
      const userId = req.headers['x-user-id'] as string || 'user_1';

      // TODO: Query post_results table
      res.json({
        message: 'Posting history endpoint - Coming soon',
        userId,
      });
    } catch (error: any) {
      logger.error('Get history error:', error);
      res.status(500).json({
        error: 'Server Error',
        message: error.message || 'Failed to get history',
      });
    }
  }
}

export const postController = new PostController();
