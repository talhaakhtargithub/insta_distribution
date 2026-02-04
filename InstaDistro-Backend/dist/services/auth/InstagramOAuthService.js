"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.instagramOAuthService = exports.InstagramOAuthService = void 0;
const axios_1 = __importDefault(require("axios"));
const logger_1 = require("../../config/logger");
class InstagramOAuthService {
    config;
    authUrl = 'https://api.instagram.com/oauth/authorize';
    tokenUrl = 'https://api.instagram.com/oauth/access_token';
    graphApiUrl = 'https://graph.instagram.com';
    constructor(config) {
        // Use environment variables or passed config
        this.config = config || {
            clientId: process.env.INSTAGRAM_CLIENT_ID || '',
            clientSecret: process.env.INSTAGRAM_CLIENT_SECRET || '',
            redirectUri: process.env.INSTAGRAM_REDIRECT_URI || 'http://localhost:3000/api/auth/instagram/callback',
        };
        if (!this.config.clientId || !this.config.clientSecret) {
            logger_1.logger.warn('Instagram OAuth not configured. Set INSTAGRAM_CLIENT_ID and INSTAGRAM_CLIENT_SECRET in .env');
        }
    }
    /**
     * Get Instagram OAuth authorization URL
     * User should be redirected to this URL to start OAuth flow
     */
    getAuthorizationUrl(state) {
        if (!this.config.clientId) {
            throw new Error('Instagram OAuth not configured');
        }
        const params = new URLSearchParams({
            client_id: this.config.clientId,
            redirect_uri: this.config.redirectUri,
            scope: 'user_profile,user_media',
            response_type: 'code',
            ...(state && { state }), // Optional state parameter for CSRF protection
        });
        return `${this.authUrl}?${params.toString()}`;
    }
    /**
     * Exchange authorization code for access token
     * Called after user authorizes and Instagram redirects back with code
     */
    async exchangeCodeForToken(code) {
        try {
            logger_1.logger.info('Exchanging Instagram OAuth code for access token');
            const response = await axios_1.default.post(this.tokenUrl, {
                client_id: this.config.clientId,
                client_secret: this.config.clientSecret,
                grant_type: 'authorization_code',
                redirect_uri: this.config.redirectUri,
                code,
            }, {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
            });
            const { access_token, user_id } = response.data;
            logger_1.logger.info(`Instagram OAuth token obtained for user ${user_id}`);
            // Get user info
            const userInfo = await this.getUserInfo(access_token, user_id);
            return {
                success: true,
                accessToken: access_token,
                userId: user_id.toString(),
                username: userInfo.username,
                accountType: userInfo.account_type,
            };
        }
        catch (error) {
            logger_1.logger.error('Instagram OAuth token exchange failed:', error.response?.data || error.message);
            return {
                success: false,
                error: error.response?.data?.error_message || error.message || 'Token exchange failed',
            };
        }
    }
    /**
     * Get Instagram user info using access token
     */
    async getUserInfo(accessToken, userId) {
        try {
            const response = await axios_1.default.get(`${this.graphApiUrl}/${userId}`, {
                params: {
                    fields: 'id,username,account_type,media_count',
                    access_token: accessToken,
                },
            });
            return response.data;
        }
        catch (error) {
            logger_1.logger.error('Failed to get Instagram user info:', error.response?.data || error.message);
            throw error;
        }
    }
    /**
     * Exchange short-lived token for long-lived token (60 days)
     * Recommended to call this immediately after getting short-lived token
     */
    async getLongLivedToken(shortLivedToken) {
        try {
            const response = await axios_1.default.get(`${this.graphApiUrl}/access_token`, {
                params: {
                    grant_type: 'ig_exchange_token',
                    client_secret: this.config.clientSecret,
                    access_token: shortLivedToken,
                },
            });
            return {
                accessToken: response.data.access_token,
                expiresIn: response.data.expires_in, // Seconds (60 days = 5184000)
            };
        }
        catch (error) {
            logger_1.logger.error('Failed to get long-lived token:', error.response?.data || error.message);
            throw error;
        }
    }
    /**
     * Refresh long-lived token (extends expiration)
     * Should be called before token expires
     */
    async refreshToken(accessToken) {
        try {
            const response = await axios_1.default.get(`${this.graphApiUrl}/refresh_access_token`, {
                params: {
                    grant_type: 'ig_refresh_token',
                    access_token: accessToken,
                },
            });
            return {
                accessToken: response.data.access_token,
                expiresIn: response.data.expires_in,
            };
        }
        catch (error) {
            logger_1.logger.error('Failed to refresh token:', error.response?.data || error.message);
            throw error;
        }
    }
    /**
     * Validate if access token is still valid
     */
    async validateToken(accessToken, userId) {
        try {
            await this.getUserInfo(accessToken, userId);
            return true;
        }
        catch (error) {
            return false;
        }
    }
    /**
     * Check if Instagram OAuth is configured
     */
    isConfigured() {
        return !!(this.config.clientId && this.config.clientSecret);
    }
}
exports.InstagramOAuthService = InstagramOAuthService;
exports.instagramOAuthService = new InstagramOAuthService();
