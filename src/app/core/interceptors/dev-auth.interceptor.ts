import { type HttpInterceptorFn } from '@angular/common/http';
import { environment } from '../../../environments/environment';

/**
 * Attaches X-Dev-Token and X-Dev-User-Id headers to every API request
 * when devBypassAuth is enabled and a bypass token is configured.
 *
 * The server's requireSession() checks these headers to skip the DB session
 * lookup — useful for local development pointing at the real Vercel backend.
 */
export const devAuthInterceptor: HttpInterceptorFn = (req, next) => {
  if (!environment.devBypassAuth || !environment.devBypassToken || !environment.devUserId) {
    return next(req);
  }

  const cloned = req.clone({
    setHeaders: {
      'X-Dev-Token': environment.devBypassToken,
      'X-Dev-User-Id': environment.devUserId,
    },
  });

  return next(cloned);
};
