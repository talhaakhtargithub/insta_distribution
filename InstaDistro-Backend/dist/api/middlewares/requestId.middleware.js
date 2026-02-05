"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.requestIdMiddleware = void 0;
const crypto_1 = __importDefault(require("crypto"));
const requestIdMiddleware = (req, res, next) => {
    // Check if request already has an ID (from load balancer or API gateway)
    const existingId = req.headers['x-request-id'];
    // Generate or use existing request ID
    const requestId = existingId || crypto_1.default.randomUUID();
    // Attach to request object for use in controllers
    req.requestId = requestId;
    // Add to response headers for client-side tracing
    res.setHeader('X-Request-ID', requestId);
    next();
};
exports.requestIdMiddleware = requestIdMiddleware;
