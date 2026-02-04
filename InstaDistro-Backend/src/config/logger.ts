import winston from 'winston';
import { envConfig } from './env';

/**
 * Winston Logger Configuration
 */

const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  winston.format.json()
);

const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    let msg = `${timestamp} [${level}]: ${message}`;
    if (Object.keys(meta).length > 0) {
      msg += ` ${JSON.stringify(meta)}`;
    }
    return msg;
  })
);

// Create logger instance
export const logger = winston.createLogger({
  level: envConfig.isDevelopment() ? 'debug' : 'info',
  format: logFormat,
  defaultMeta: { service: 'insta-swarm-api' },
  transports: [
    // Write all logs to console
    new winston.transports.Console({
      format: consoleFormat,
    }),
    // Write all logs with level 'error' to error.log
    new winston.transports.File({
      filename: 'logs/error.log',
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
    // Write all logs to combined.log
    new winston.transports.File({
      filename: 'logs/combined.log',
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
  ],
  exceptionHandlers: [
    new winston.transports.File({ filename: 'logs/exceptions.log' }),
  ],
  rejectionHandlers: [
    new winston.transports.File({ filename: 'logs/rejections.log' }),
  ],
});

// Create logs directory if it doesn't exist
import fs from 'fs';
if (!fs.existsSync('logs')) {
  fs.mkdirSync('logs');
}

/**
 * Request logging middleware
 */
export const requestLogger = (req: any, res: any, next: any) => {
  const startTime = Date.now();

  // Log request
  logger.info('Incoming request', {
    method: req.method,
    path: req.path,
    ip: req.ip,
    userAgent: req.get('user-agent'),
  });

  // Log response
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    const logLevel = res.statusCode >= 400 ? 'warn' : 'info';

    logger.log(logLevel, 'Request completed', {
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip,
    });
  });

  next();
};

/**
 * Error logging helper
 */
export const logError = (error: Error, context?: any) => {
  logger.error('Error occurred', {
    message: error.message,
    stack: error.stack,
    ...context,
  });
};

/**
 * Sanitize sensitive data from objects before logging
 * Redacts passwords, tokens, secrets, keys, and other sensitive fields
 */
export const sanitizeSensitiveData = (obj: any): any => {
  if (!obj || typeof obj !== 'object') {
    return obj;
  }

  // Sensitive field names to redact (case-insensitive)
  const sensitiveFields = [
    'password',
    'passwd',
    'pwd',
    'token',
    'accesstoken',
    'refreshtoken',
    'access_token',
    'refresh_token',
    'secret',
    'apikey',
    'api_key',
    'key',
    'authorization',
    'auth',
    'credential',
    'credentials',
    'cookie',
    'session',
    'csrf',
    'xsrf',
    'private',
    'privatekey',
    'private_key',
    'encryptionkey',
    'encryption_key',
  ];

  const sanitized = Array.isArray(obj) ? [...obj] : { ...obj };

  for (const key in sanitized) {
    const lowerKey = key.toLowerCase();

    // Check if field name matches sensitive patterns
    const isSensitive = sensitiveFields.some(field =>
      lowerKey.includes(field)
    );

    if (isSensitive) {
      // Redact the value
      sanitized[key] = '[REDACTED]';
    } else if (typeof sanitized[key] === 'object' && sanitized[key] !== null) {
      // Recursively sanitize nested objects
      sanitized[key] = sanitizeSensitiveData(sanitized[key]);
    }
  }

  return sanitized;
};

export default logger;
