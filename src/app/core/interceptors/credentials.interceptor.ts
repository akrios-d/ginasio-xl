import { type HttpInterceptorFn } from '@angular/common/http';
import { environment } from '../../../environments/environment';

/**
 * Sends cookies with every API request — required for Auth.js session cookies
 * (especially in dev where the API and the app run on different origins).
 */
export const credentialsInterceptor: HttpInterceptorFn = (req, next) => {
  const apiUrl = environment.apiUrl;
  const isApiCall = apiUrl ? req.url.startsWith(apiUrl) : req.url.startsWith('/api');

  if (isApiCall) {
    return next(req.clone({ withCredentials: true }));
  }

  return next(req);
};
