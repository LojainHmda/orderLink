/**
 * Client runtime config. In dev, the Vite proxy forwards `/api` and `/socket.io`
 * to the backend, so the defaults below "just work" with `npm run dev`.
 * Override via VITE_API_URL / VITE_SOCKET_URL for other environments.
 */
export const API_BASE_URL = import.meta.env.VITE_API_URL ?? '/api';

/** Socket connects to the page origin by default (proxied to the API in dev). */
export const SOCKET_URL = import.meta.env.VITE_SOCKET_URL ?? undefined;

/** The restaurant this console manages. (Multi-tenant auth comes later.) */
export const DEFAULT_RESTAURANT_SLUG =
  import.meta.env.VITE_RESTAURANT_SLUG ?? 'green-olive-bistro';
