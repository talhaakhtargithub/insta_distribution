"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateUserId = validateUserId;
exports.validateAccountId = validateAccountId;
exports.validatePagination = validatePagination;
exports.validateDateRange = validateDateRange;
exports.validateProxyType = validateProxyType;
exports.validateScheduleType = validateScheduleType;
const errorHandler_middleware_1 = require("./errorHandler.middleware");
// ============================================
// VALIDATION MIDDLEWARE
// ============================================
function validateUserId(req, _res, next) {
    const userId = req.body.userId || req.query.userId || req.user?.id;
    if (!userId) {
        throw new errorHandler_middleware_1.ValidationError('User ID is required');
    }
    next();
}
function validateAccountId(req, _res, next) {
    const accountId = req.params.id || req.params.accountId;
    if (!accountId) {
        throw new errorHandler_middleware_1.ValidationError('Account ID is required');
    }
    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(accountId)) {
        throw new errorHandler_middleware_1.ValidationError('Invalid Account ID format');
    }
    next();
}
function validatePagination(req, _res, next) {
    const limit = req.query.limit ? parseInt(req.query.limit) : undefined;
    const offset = req.query.offset ? parseInt(req.query.offset) : undefined;
    if (limit && (limit < 1 || limit > 100)) {
        throw new errorHandler_middleware_1.ValidationError('Limit must be between 1 and 100');
    }
    if (offset && offset < 0) {
        throw new errorHandler_middleware_1.ValidationError('Offset must be >= 0');
    }
    next();
}
function validateDateRange(req, _res, next) {
    const startDate = req.query.startDate ? new Date(req.query.startDate) : undefined;
    const endDate = req.query.endDate ? new Date(req.query.endDate) : undefined;
    if (startDate && isNaN(startDate.getTime())) {
        throw new errorHandler_middleware_1.ValidationError('Invalid startDate format');
    }
    if (endDate && isNaN(endDate.getTime())) {
        throw new errorHandler_middleware_1.ValidationError('Invalid endDate format');
    }
    if (startDate && endDate && startDate > endDate) {
        throw new errorHandler_middleware_1.ValidationError('startDate must be before endDate');
    }
    next();
}
function validateProxyType(req, _res, next) {
    const type = req.body.type;
    if (type && !['residential', 'datacenter', 'mobile'].includes(type)) {
        throw new errorHandler_middleware_1.ValidationError('Invalid proxy type. Must be: residential, datacenter, or mobile');
    }
    next();
}
function validateScheduleType(req, _res, next) {
    const scheduleType = req.body.scheduleType;
    if (scheduleType && !['one-time', 'recurring', 'queue', 'bulk'].includes(scheduleType)) {
        throw new errorHandler_middleware_1.ValidationError('Invalid schedule type. Must be: one-time, recurring, queue, or bulk');
    }
    next();
}
