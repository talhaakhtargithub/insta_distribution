"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PrivateApiClient = void 0;
const instagram_private_api_1 = require("instagram-private-api");
const promises_1 = require("fs/promises");
const logger_1 = require("../../config/logger");
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
class PrivateApiClient {
    ig;
    username;
    sessionData;
    constructor(username) {
        this.ig = new instagram_private_api_1.IgApiClient();
        this.username = username;
        // Set up device and user agent
        this.ig.state.generateDevice(username);
    }
    /**
     * Login to Instagram with credentials
     */
    async login(password) {
        try {
            logger_1.logger.info(`Attempting Instagram login for ${this.username}`);
            // Simulate pre-login flow (important for avoiding detection)
            await this.ig.simulate.preLoginFlow();
            // Perform login
            const auth = await this.ig.account.login(this.username, password);
            // Simulate post-login flow
            await this.ig.simulate.postLoginFlow();
            // Save session data
            this.sessionData = await this.ig.state.serialize();
            delete this.sessionData.constants;
            logger_1.logger.info(`Successfully logged in as ${this.username}`);
            return {
                success: true,
                sessionToken: JSON.stringify(this.sessionData),
            };
        }
        catch (error) {
            logger_1.logger.error(`Login failed for ${this.username}:`, error.message);
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
    async restoreSession(sessionToken) {
        try {
            const sessionData = JSON.parse(sessionToken);
            await this.ig.state.deserialize(sessionData);
            logger_1.logger.info(`Session restored for ${this.username}`);
            return true;
        }
        catch (error) {
            logger_1.logger.error(`Failed to restore session for ${this.username}:`, error);
            return false;
        }
    }
    /**
     * Upload a photo to Instagram
     */
    async uploadPhoto(imagePath, caption) {
        try {
            logger_1.logger.info(`Uploading photo for ${this.username}`);
            const imageBuffer = await (0, promises_1.readFile)(imagePath);
            const publishResult = await this.ig.publish.photo({
                file: imageBuffer,
                caption,
            });
            logger_1.logger.info(`Photo uploaded successfully for ${this.username}, media ID: ${publishResult.media.id}`);
            return {
                success: true,
                mediaId: publishResult.media.id,
            };
        }
        catch (error) {
            logger_1.logger.error(`Photo upload failed for ${this.username}:`, error.message);
            return {
                success: false,
                error: error.message || 'Upload failed',
            };
        }
    }
    /**
     * Upload a video to Instagram
     */
    async uploadVideo(videoPath, caption, coverImagePath) {
        try {
            logger_1.logger.info(`Uploading video for ${this.username}`);
            const videoBuffer = await (0, promises_1.readFile)(videoPath);
            let coverBuffer;
            if (coverImagePath) {
                coverBuffer = await (0, promises_1.readFile)(coverImagePath);
            }
            const publishOptions = {
                video: videoBuffer,
                caption,
            };
            if (coverBuffer) {
                publishOptions.coverImage = coverBuffer;
            }
            const publishResult = await this.ig.publish.video(publishOptions);
            logger_1.logger.info(`Video uploaded successfully for ${this.username}, media ID: ${publishResult.media.id}`);
            return {
                success: true,
                mediaId: publishResult.media.id,
            };
        }
        catch (error) {
            logger_1.logger.error(`Video upload failed for ${this.username}:`, error.message);
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
    async likePost(mediaId) {
        try {
            await this.ig.media.like({
                mediaId,
                moduleInfo: {
                    module_name: 'feed_timeline',
                    user_id: await this.ig.user.getIdByUsername(this.username),
                    username: this.username,
                },
                d: 0,
            });
            logger_1.logger.info(`Post ${mediaId} liked by ${this.username}`);
            return { success: true };
        }
        catch (error) {
            logger_1.logger.error(`Like failed for ${this.username}:`, error.message);
            return { success: false, error: error.message };
        }
    }
    /**
     * Comment on a post
     */
    async commentOnPost(mediaId, text) {
        try {
            await this.ig.media.comment({
                mediaId,
                text,
            });
            logger_1.logger.info(`Comment posted by ${this.username} on ${mediaId}`);
            return { success: true };
        }
        catch (error) {
            logger_1.logger.error(`Comment failed for ${this.username}:`, error.message);
            return { success: false, error: error.message };
        }
    }
    /**
     * Follow a user
     */
    async followUser(userId) {
        try {
            await this.ig.friendship.create(userId);
            logger_1.logger.info(`${this.username} followed user ${userId}`);
            return { success: true };
        }
        catch (error) {
            logger_1.logger.error(`Follow failed for ${this.username}:`, error.message);
            return { success: false, error: error.message };
        }
    }
    /**
     * Get user info
     */
    async getUserInfo() {
        try {
            const user = await this.ig.user.info(await this.ig.user.getIdByUsername(this.username));
            return user;
        }
        catch (error) {
            logger_1.logger.error(`Failed to get user info for ${this.username}:`, error.message);
            throw error;
        }
    }
    /**
     * Get timeline feed
     */
    async getTimelineFeed(maxItems = 10) {
        try {
            const feed = this.ig.feed.timeline();
            const items = await feed.items();
            return items.slice(0, maxItems);
        }
        catch (error) {
            logger_1.logger.error(`Failed to get timeline for ${this.username}:`, error.message);
            throw error;
        }
    }
    /**
     * Search for users
     */
    async searchUsers(query) {
        try {
            const results = await this.ig.search.users(query);
            return results;
        }
        catch (error) {
            logger_1.logger.error(`User search failed for ${this.username}:`, error.message);
            throw error;
        }
    }
    /**
     * Check if session is valid
     */
    async isSessionValid() {
        try {
            await this.ig.account.currentUser();
            return true;
        }
        catch (error) {
            return false;
        }
    }
    /**
     * Get current session data
     */
    getSessionData() {
        return JSON.stringify(this.sessionData);
    }
}
exports.PrivateApiClient = PrivateApiClient;
