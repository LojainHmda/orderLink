import type { Request } from 'express';
import { ApiError } from '../errors/ApiError.js';

/**
 * Read a required route parameter. Routing guarantees it exists, but this keeps
 * us honest under `noUncheckedIndexedAccess` and fails loudly if a route is
 * ever wired up without the expected param.
 */
export function param(req: Request, name: string): string {
  const value = req.params[name];
  if (typeof value !== 'string' || value.length === 0) {
    throw ApiError.badRequest(`Missing route parameter: ${name}`);
  }
  return value;
}
