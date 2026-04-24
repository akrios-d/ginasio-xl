import {
  ApplicationConfig,
  inject,
  isDevMode,
  provideAppInitializer,
  provideBrowserGlobalErrorListeners,
} from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideServiceWorker } from '@angular/service-worker';

import { routes } from './app.routes';
import { I18nService } from './core/i18n/i18n.service';
import { ThemeService } from './core/theme/theme.service';
import { UpdateService } from './core/update/update.service';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    provideHttpClient(),
    provideServiceWorker('ngsw-worker.js', {
      enabled: !isDevMode(),
      registrationStrategy: 'registerWhenStable:30000',
    }),
    // Load all locales before first render so translations never flash untranslated keys.
    provideAppInitializer(() => inject(I18nService).loadAll()),
    // Sync <html data-theme> with the user's stored preference before paint.
    provideAppInitializer(() => inject(ThemeService).init()),
    provideAppInitializer(() => inject(UpdateService).init()),
  ],
};
