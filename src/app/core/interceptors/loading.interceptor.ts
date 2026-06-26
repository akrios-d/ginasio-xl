import { inject } from '@angular/core';
import { type HttpInterceptorFn } from '@angular/common/http';
import { finalize } from 'rxjs';
import { LoadingService } from '../loading/loading.service';

export const loadingInterceptor: HttpInterceptorFn = (req, next) => {
  // Skip requests that don't need a spinner (e.g. i18n JSON files)
  if (req.url.includes('/i18n/')) return next(req);

  const svc = inject(LoadingService);
  svc.increment();
  return next(req).pipe(finalize(() => svc.decrement()));
};
