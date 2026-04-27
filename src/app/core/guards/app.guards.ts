import { inject } from '@angular/core';
import { Router, type CanActivateFn } from '@angular/router';
import { AuthService } from '../auth/auth.service';

/** Redirects to /login if the user has no active session. */
export const requireAuth: CanActivateFn = () => {
  if (!inject(AuthService).isAuthenticated()) {
    return inject(Router).createUrlTree(['/login']);
  }
  return true;
};

/** Redirects to / if the user IS authenticated (e.g. don't show /login twice). */
export const skipIfAuth: CanActivateFn = () => {
  if (inject(AuthService).isAuthenticated()) {
    return inject(Router).createUrlTree(['/']);
  }
  return true;
};
