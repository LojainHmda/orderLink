import type { Request, Response } from 'express';
import type { ApiErrorBody } from '@orderlink/shared';

export function notFound(req: Request, res: Response<ApiErrorBody>): void {
  res.status(404).json({
    error: { message: `Route not found: ${req.method} ${req.originalUrl}`, code: 'NOT_FOUND' },
  });
}
