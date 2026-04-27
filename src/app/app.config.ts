import {
  type ApplicationConfig,
  inject,
  isDevMode,
  provideAppInitializer,
  provideBrowserGlobalErrorListeners,
} from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideServiceWorker } from '@angular/service-worker';

import { routes } from './app.routes';
import { I18nService } from './core/i18n/i18n.service';
import { ThemeService } from './core/theme/theme.service';
import { UpdateService } from './core/update/update.service';
import { AuthService } from './core/auth/auth.service';
import { credentialsInterceptor } from './core/interceptors/credentials.interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    provideHttpClient(withInterceptors([credentialsInterceptor])),
    provideServiceWorker('ngsw-worker.js', {
      enabled: !isDevMode(),
      registrationStrategy: 'registerWhenStable:30000',
    }),
    // Auth must load before guards run, so route activation has session state.
    provideAppInitializer(() => inject(AuthService).load()),
    // Load all locales before first render so translations never flash untranslated keys.
    provideAppInitializer(() => inject(I18nService).loadAll()),
    // Sync <html data-theme> with the user's stored preference before paint.
    provideAppInitializer(() => inject(ThemeService).init()),
    provideAppInitializer(() => inject(UpdateService).init()),
  ],
};
