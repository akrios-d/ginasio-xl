/**
 * Build-time environment values.
 *
 * Everything here ships to the browser — never put secrets in this file.
 * Server-side secrets (Mongo URIs, API keys) belong in .env.local and Vercel env settings,
 * and are read by `api/*` handlers through `process.env`.
 */
export const environment = {
  production: false,
  /** Base URL for /api/* calls. Empty string = same origin (recommended for Vercel). */
  apiUrl: '',
  /**
   * Skip the real Auth.js session check and inject a fake/real user.
   * Set to true when running `ng serve` without a local backend.
   * NEVER set in environment.vercel.ts or production builds.
   */
  devBypassAuth: true,
  /**
   * Fill in locally to impersonate a real MongoDB user.
   * Must match a userId in your Atlas `users` collection.
   * Leave empty to use the generic "Dev User" placeholder.
   * DO NOT commit with a real value — treat as a secret.
   */
  devUserId: '',
  /**
   * Must match DEV_BYPASS_TOKEN set in Vercel env vars.
   * Only needed when pointing ng serve at the real Vercel backend.
   * DO NOT commit with a real value.
   */
  devBypassToken: '',
};
