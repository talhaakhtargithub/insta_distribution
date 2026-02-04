"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.postingService = exports.PostingService = void 0;
const PrivateApiClient_1 = require("./PrivateApiClient");
const GraphApiClient_1 = require("./GraphApiClient");
const AccountService_1 = require("../swarm/AccountService");
const logger_1 = require("../../config/logger");
/**
 * Unified Posting Service
 * Automatically chooses the correct API (Private or Graph) based on account type
 */
class PostingService {
    /**
     * Post photo or video to Instagram
     */
    async post(options) {
        try {
            logger_1.logger.info(`Starting post for account ${options.accountId}`);
            // Get account from database
            const account = await AccountService_1.accountService.getAccountById(options.accountId);
            if (!account) {
                return {
                    success: false,
                    error: 'Account not found',
                };
            }
            // Build caption with hashtags
            const fullCaption = this.buildCaption(options.caption, options.hashtags);
            // Choose API based on account type
            if (account.account_type === 'business') {
                return await this.postWithGraphApi(account, options, fullCaption);
            }
            else {
                return await this.postWithPrivateApi(account, options, fullCaption);
            }
        }
        catch (error) {
            logger_1.logger.error('Post failed:', error);
            return {
                success: false,
                error: error.message || 'Post failed',
            };
        }
    }
    /**
     * Post using Private API (for personal accounts)
     */
    async postWithPrivateApi(account, options, caption) {
        try {
            logger_1.logger.info(`Using Private API for ${account.username}`);
            const client = new PrivateApiClient_1.PrivateApiClient(account.username);
            // Restore session if available
            if (account.session_token) {
                const restored = await client.restoreSession(account.session_token);
                if (!restored) {
                    return {
                        success: false,
                        error: 'Session expired - Please re-authenticate',
                    };
                }
            }
            else {
                // Need to login first
                const password = await AccountService_1.accountService.getAccountPassword(account.id);
                const loginResult = await client.login(password);
                if (!loginResult.success) {
                    return {
                        success: false,
                        error: loginResult.error || 'Login failed',
                    };
                }
                // Save session token
                await AccountService_1.accountService.updateAccount(account.id, {
                    session_token: loginResult.sessionToken,
                });
            }
            // Upload media
            let result;
            if (options.mediaType === 'photo') {
                result = await client.uploadPhoto(options.mediaPath, caption);
            }
            else {
                result = await client.uploadVideo(options.mediaPath, caption, options.coverImagePath);
            }
            if (!result.success) {
                return {
                    success: false,
                    error: result.error,
                };
            }
            logger_1.logger.info(`Successfully posted to Instagram via Private API: ${result.mediaId}`);
            return {
                success: true,
                mediaId: result.mediaId,
                postedAt: new Date().toISOString(),
            };
        }
        catch (error) {
            logger_1.logger.error('Private API post failed:', error);
            return {
                success: false,
                error: error.message || 'Post failed',
            };
        }
    }
    /**
     * Post using Graph API (for business accounts)
     */
    async postWithGraphApi(account, options, caption) {
        try {
            logger_1.logger.info(`Using Graph API for ${account.username}`);
            if (!account.access_token || !account.instagram_user_id) {
                return {
                    success: false,
                    error: 'Business account not connected - Please connect Facebook Page',
                };
            }
            const client = new GraphApiClient_1.GraphApiClient(account.access_token, account.instagram_user_id);
            // Validate token first
            const validation = await client.validateToken();
            if (!validation.valid) {
                return {
                    success: false,
                    error: validation.error || 'Invalid access token',
                };
            }
            // Note: Graph API requires publicly accessible URLs
            // You'll need to upload the media to a CDN or public URL first
            // For now, we'll assume the mediaPath is a URL
            let result;
            if (options.mediaType === 'photo') {
                result = await client.uploadPhoto(options.mediaPath, caption);
            }
            else {
                result = await client.uploadVideo(options.mediaPath, caption, options.coverImagePath);
            }
            if (!result.success) {
                return {
                    success: false,
                    error: result.error,
                };
            }
            logger_1.logger.info(`Successfully posted to Instagram via Graph API: ${result.mediaId}`);
            return {
                success: true,
                mediaId: result.mediaId,
                postedAt: new Date().toISOString(),
            };
        }
        catch (error) {
            logger_1.logger.error('Graph API post failed:', error);
            return {
                success: false,
                error: error.message || 'Post failed',
            };
        }
    }
    /**
     * Verify account credentials and save session
     */
    async verifyAccount(accountId) {
        try {
            const account = await AccountService_1.accountService.getAccountById(accountId);
            if (!account) {
                return {
                    success: false,
                    error: 'Account not found',
                };
            }
            if (account.account_type === 'business') {
                // Verify Graph API token
                if (!account.access_token || !account.instagram_user_id) {
                    return {
                        success: false,
                        error: 'Business account not connected',
                    };
                }
                const client = new GraphApiClient_1.GraphApiClient(account.access_token, account.instagram_user_id);
                const validation = await client.validateToken();
                if (!validation.valid) {
                    return {
                        success: false,
                        error: validation.error,
                    };
                }
                const accountInfo = await client.getAccountInfo();
                // Update account info
                await AccountService_1.accountService.updateAccount(accountId, {
                    is_authenticated: true,
                    follower_count: accountInfo.followers_count,
                    last_auth_check: new Date().toISOString(),
                });
                return {
                    success: true,
                    accountInfo,
                };
            }
            else {
                // Verify Private API login
                const password = await AccountService_1.accountService.getAccountPassword(accountId);
                const client = new PrivateApiClient_1.PrivateApiClient(account.username);
                const loginResult = await client.login(password);
                if (!loginResult.success) {
                    return {
                        success: false,
                        error: loginResult.error,
                    };
                }
                // Get user info
                const userInfo = await client.getUserInfo();
                // Update account info and save session
                await AccountService_1.accountService.updateAccount(accountId, {
                    is_authenticated: true,
                    session_token: loginResult.sessionToken,
                    follower_count: userInfo.follower_count,
                    profile_pic_url: userInfo.profile_pic_url,
                    instagram_user_id: userInfo.pk.toString(),
                    last_auth_check: new Date().toISOString(),
                });
                return {
                    success: true,
                    accountInfo: userInfo,
                };
            }
        }
        catch (error) {
            logger_1.logger.error('Account verification failed:', error);
            return {
                success: false,
                error: error.message || 'Verification failed',
            };
        }
    }
    /**
     * Build caption with hashtags
     */
    buildCaption(caption, hashtags) {
        let fullCaption = caption || '';
        if (hashtags && hashtags.length > 0) {
            const hashtagString = hashtags.map((tag) => (tag.startsWith('#') ? tag : `#${tag}`)).join(' ');
            if (fullCaption) {
                fullCaption += `\n\n${hashtagString}`;
            }
            else {
                fullCaption = hashtagString;
            }
        }
        return fullCaption;
    }
}
exports.PostingService = PostingService;
exports.postingService = new PostingService();
