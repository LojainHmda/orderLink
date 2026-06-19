import type { ErrorRequestHandler } from 'express';
import { Prisma } from '@prisma/client';
import { ZodError } from 'zod';
import type { ApiErrorBody } from '@orderlink/shared';
import { ApiError } from '../errors/ApiError.js';
import { isProd } from '../config/env.js';
import { logger } from '../lib/logger.js';

/**
 * Central error translator. Maps known error types to a consistent
 * `{ error: { message, code, details? } }` envelope; everything unexpected
 * becomes a 500 (with the real message hidden in production).
 */
export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  let status = 500;
  let body: ApiErrorBody['error'] = { message: 'Internal server error', code: 'INTERNAL' };

  if (err instanceof ApiError) {
    status = err.statusCode;
    body = { message: err.message, code: err.code, details: err.details };
  } else if (err instanceof ZodError) {
    status = 422;
    body = { message: 'Validation failed', code: 'VALIDATION', details: err.flatten() };
  } else if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2025') {
      status = 404;
      body = { message: 'Resource not found', code: 'NOT_FOUND' };
    } else if (err.code === 'P2002') {
      status = 409;
      body = { message: 'A record with these values already exists', code: 'CONFLICT' };
    } else {
      status = 400;
      body = { message: 'Database request error', code: 'DB_ERROR' };
    }
  }

  if (status >= 500) {
    logger.error({ err }, 'Unhandled error');
    if (!isProd && err instanceof Error) body.details = err.message;
  }

  const response: ApiErrorBody = { error: body };
  res.status(status).json(response);
};
