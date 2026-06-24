/**
 * Build-time environment values.
 *
 * Everything here ships to the browser — never put secrets in this file.
 * Server-side secrets (Mongo URIs, API keys) belong in .env.local and Vercel env settings,
 * and are read by `api/*` handlers through `process.env`.
 */
export const environment = {
  production: true,
  /** Base URL for /api/* calls. Empty string = same origin (Vercel). */
  apiUrl: '',
  /** Never true in production. Dev bypass is only enabled via environment.development.ts / environment.vercel.ts. */
  devBypassAuth: false,
  devUserId: '',
  devBypassToken: '',
};
