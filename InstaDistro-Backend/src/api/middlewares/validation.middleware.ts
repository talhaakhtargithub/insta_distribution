import { Request, Response, NextFunction } from 'express';
import { ValidationError } from './errorHandler.middleware';

// ============================================
// VALIDATION MIDDLEWARE
// ============================================

export function validateUserId(req: Request, _res: Response, next: NextFunction) {
  const userId = req.body.userId || req.query.userId || (req as any).user?.id;

  if (!userId) {
    throw new ValidationError('User ID is required');
  }

  next();
}

export function validateAccountId(req: Request, _res: Response, next: NextFunction) {
  const accountId = req.params.id || req.params.accountId;

  if (!accountId) {
    throw new ValidationError('Account ID is required');
  }

  // Validate UUID format
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(accountId)) {
    throw new ValidationError('Invalid Account ID format');
  }

  next();
}

export function validatePagination(req: Request, _res: Response, next: NextFunction) {
  const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined;
  const offset = req.query.offset ? parseInt(req.query.offset as string) : undefined;

  if (limit && (limit < 1 || limit > 100)) {
    throw new ValidationError('Limit must be between 1 and 100');
  }

  if (offset && offset < 0) {
    throw new ValidationError('Offset must be >= 0');
  }

  next();
}

export function validateDateRange(req: Request, _res: Response, next: NextFunction) {
  const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
  const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;

  if (startDate && isNaN(startDate.getTime())) {
    throw new ValidationError('Invalid startDate format');
  }

  if (endDate && isNaN(endDate.getTime())) {
    throw new ValidationError('Invalid endDate format');
  }

  if (startDate && endDate && startDate > endDate) {
    throw new ValidationError('startDate must be before endDate');
  }

  next();
}

export function validateProxyType(req: Request, _res: Response, next: NextFunction) {
  const type = req.body.type;

  if (type && !['residential', 'datacenter', 'mobile'].includes(type)) {
    throw new ValidationError('Invalid proxy type. Must be: residential, datacenter, or mobile');
  }

  next();
}

export function validateScheduleType(req: Request, _res: Response, next: NextFunction) {
  const scheduleType = req.body.scheduleType;

  if (scheduleType && !['one-time', 'recurring', 'queue', 'bulk'].includes(scheduleType)) {
    throw new ValidationError('Invalid schedule type. Must be: one-time, recurring, queue, or bulk');
  }

  next();
}
