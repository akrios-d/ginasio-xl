/**
 * Local dev environment (ng serve without a real backend).
 * Replaced at build time via angular.json fileReplacements for the "development" configuration.
 *
 * devBypassAuth skips the real Auth.js session check and injects a local user.
 * Fill devUserId + devBypassToken locally — DO NOT commit real values.
 */
export const environment = {
  production: false,
  apiUrl: '',
  devBypassAuth: true,
  /** Real MongoDB userId from your Atlas users collection. Leave empty for the generic placeholder. */
  devUserId: '',
  /** Must match DEV_BYPASS_TOKEN in .env.local. Only needed when proxying to the real backend. */
  devBypassToken: '',
};
