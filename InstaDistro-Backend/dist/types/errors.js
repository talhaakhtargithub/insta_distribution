"use strict";
/**
 * Instagram Error Types
 * Centralized error categorization for all Instagram API interactions.
 * Used by ErrorHandler to parse raw errors into structured types with
 * retry metadata and account impact assessment.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.NetworkError = exports.MediaError = exports.ShadowbanError = exports.CheckpointError = exports.ForbiddenError = exports.AuthenticationError = exports.RateLimitError = exports.InstagramError = exports.AccountAction = exports.ErrorCategory = void 0;
var ErrorCategory;
(function (ErrorCategory) {
    ErrorCategory["RATE_LIMIT"] = "RATE_LIMIT";
    ErrorCategory["AUTHENTICATION"] = "AUTHENTICATION";
    ErrorCategory["FORBIDDEN"] = "FORBIDDEN";
    ErrorCategory["CHECKPOINT"] = "CHECKPOINT";
    ErrorCategory["SHADOWBAN"] = "SHADOWBAN";
    ErrorCategory["MEDIA"] = "MEDIA";
    ErrorCategory["NETWORK"] = "NETWORK";
    ErrorCategory["UNKNOWN"] = "UNKNOWN";
})(ErrorCategory || (exports.ErrorCategory = ErrorCategory = {}));
var AccountAction;
(function (AccountAction) {
    AccountAction["POST"] = "post";
    AccountAction["LIKE"] = "like";
    AccountAction["COMMENT"] = "comment";
    AccountAction["FOLLOW"] = "follow";
    AccountAction["DM"] = "dm";
})(AccountAction || (exports.AccountAction = AccountAction = {}));
/**
 * Base Instagram error with categorization and retry metadata
 */
class InstagramError extends Error {
    category;
    retryable;
    statusCode;
    originalError;
    constructor(message, category, retryable, statusCode = 500, originalError) {
        super(message);
        this.name = 'InstagramError';
        this.category = category;
        this.retryable = retryable;
        this.statusCode = statusCode;
        this.originalError = originalError;
        Object.setPrototypeOf(this, InstagramError.prototype);
    }
    toJSON() {
        return {
            name: this.name,
            message: this.message,
            category: this.category,
            retryable: this.retryable,
            statusCode: this.statusCode,
        };
    }
}
exports.InstagramError = InstagramError;
class RateLimitError extends InstagramError {
    retryAfter;
    constructor(message = 'Instagram rate limit exceeded', retryAfter = 60) {
        super(message, ErrorCategory.RATE_LIMIT, true, 429);
        this.name = 'RateLimitError';
        this.retryAfter = retryAfter;
    }
}
exports.RateLimitError = RateLimitError;
class AuthenticationError extends InstagramError {
    constructor(message = 'Authentication required or session expired') {
        super(message, ErrorCategory.AUTHENTICATION, false, 401);
        this.name = 'AuthenticationError';
    }
}
exports.AuthenticationError = AuthenticationError;
class ForbiddenError extends InstagramError {
    constructor(message = 'Action blocked by Instagram') {
        super(message, ErrorCategory.FORBIDDEN, false, 403);
        this.name = 'ForbiddenError';
    }
}
exports.ForbiddenError = ForbiddenError;
class CheckpointError extends InstagramError {
    constructor(message = 'Instagram requires identity verification') {
        super(message, ErrorCategory.CHECKPOINT, false, 403);
        this.name = 'CheckpointError';
    }
}
exports.CheckpointError = CheckpointError;
class ShadowbanError extends InstagramError {
    constructor(message = 'Account activity detected as spam') {
        super(message, ErrorCategory.SHADOWBAN, false, 403);
        this.name = 'ShadowbanError';
    }
}
exports.ShadowbanError = ShadowbanError;
class MediaError extends InstagramError {
    constructor(message = 'Invalid or unsupported media') {
        super(message, ErrorCategory.MEDIA, false, 400);
        this.name = 'MediaError';
    }
}
exports.MediaError = MediaError;
class NetworkError extends InstagramError {
    constructor(message = 'Network connection failed', originalError) {
        super(message, ErrorCategory.NETWORK, true, 503, originalError);
        this.name = 'NetworkError';
    }
}
exports.NetworkError = NetworkError;
