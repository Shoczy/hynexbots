// The base path the dashboard is mounted under. MUST match `basePath` in
// next.config.mjs. Both read the same env var so they can never drift.
// Single-origin setup: the public site proxies `/dashboard/*` to this app, so
// every page and API route lives under `/dashboard`.
export const BASE = process.env.NEXT_PUBLIC_BASE_PATH ?? '/dashboard';

/** Prefix an internal path (a page route or `/api/...`) with the base path. */
export const withBase = (p: string) => `${BASE}${p === '/' ? '' : p}` || '/';
