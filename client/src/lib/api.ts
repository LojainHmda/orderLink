import axios from 'axios';
import type { ApiErrorBody } from '@orderlink/shared';
import { API_BASE_URL } from '../config';

/** Normalized error thrown by every API call (mirrors the server's envelope). */
export class ApiRequestError extends Error {
  readonly code: string;
  readonly status?: number;
  readonly details?: unknown;

  constructor(message: string, code: string, status?: number, details?: unknown) {
    super(message);
    this.name = 'ApiRequestError';
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

function normalize(err: unknown): ApiRequestError {
  if (axios.isAxiosError(err)) {
    const body = err.response?.data as ApiErrorBody | undefined;
    if (body?.error) {
      return new ApiRequestError(
        body.error.message,
        body.error.code,
        err.response?.status,
        body.error.details,
      );
    }
    return new ApiRequestError(err.message, 'NETWORK', err.response?.status);
  }
  return new ApiRequestError('Unexpected error', 'UNKNOWN');
}

export const api = axios.create({ baseURL: API_BASE_URL });

// Surface a consistent error type to every caller / React Query hook.
api.interceptors.response.use(
  (res) => res,
  (err) => Promise.reject(normalize(err)),
);
