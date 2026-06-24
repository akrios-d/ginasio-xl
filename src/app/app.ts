import { Component, HostListener, inject, signal } from '@angular/core';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { filter, map } from 'rxjs';
import { I18nService, type AppLanguage } from './core/i18n/i18n.service';
import { AuthService } from './core/auth/auth.service';
import { Flag } from './shared/components/flag/flag';
import { ThemeToggle } from './shared/components/theme-toggle/theme-toggle';
import { Toast } from './shared/components/toast/toast';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, Flag, ThemeToggle, Toast],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  protected readonly i18n = inject(I18nService);
  protected readonly auth = inject(AuthService);
  protected readonly langMenuOpen = signal(false);

  /**
   * Login page renders its own brand + language picker, so we hide the global
   * app shell while the user is on /login (avoids a duplicate header).
   */
  protected readonly isLoginPage = toSignal(
    inject(Router).events.pipe(
      filter((e): e is NavigationEnd => e instanceof NavigationEnd),
      map((e) => e.urlAfterRedirects.startsWith('/login')),
    ),
    { initialValue: false },
  );

  toggleLangMenu(): void {
    this.langMenuOpen.update((v) => !v);
  }

  pickLanguage(code: AppLanguage): void {
    this.i18n.setLanguage(code);
    this.langMenuOpen.set(false);
  }

  @HostListener('document:keydown.escape')
  closeLangMenu(): void {
    this.langMenuOpen.set(false);
  }
}
