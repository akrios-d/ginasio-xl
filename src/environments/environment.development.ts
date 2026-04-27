/**
 * Dev environment.
 *
 * If the API runs on a different origin in dev (e.g. `vercel dev` on :3000 while
 * `ng serve` is on :4200), set apiUrl to the API origin so the credentials
 * interceptor sends cookies to the right host.
 */
export const environment = {
  production: false,
  apiUrl: '',
};
