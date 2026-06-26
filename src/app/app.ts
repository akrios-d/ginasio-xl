import { Component, computed, effect, inject } from '@angular/core';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { filter, map } from 'rxjs';
import { I18nService } from './core/i18n/i18n.service';
import { AuthService } from './core/auth/auth.service';
import { PerfilService } from './core/services/perfil.service';
import { Toast } from './shared/components/toast/toast';
import { Icon } from './shared/components/icon/icon';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, Toast, Icon],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  protected readonly i18n = inject(I18nService);
  protected readonly auth = inject(AuthService);
  private readonly perfilSvc = inject(PerfilService);

  constructor() {
    // Trigger profile auto-creation as soon as the user is authenticated
    effect(() => {
      if (this.auth.isAuthenticated()) {
        this.perfilSvc.get().subscribe({ error: () => undefined });
      }
    });
  }

  protected readonly isLoginPage = toSignal(
    inject(Router).events.pipe(
      filter((e): e is NavigationEnd => e instanceof NavigationEnd),
      map((e) => e.urlAfterRedirects.startsWith('/login')),
    ),
    { initialValue: false },
  );

  protected readonly greeting = computed(() => {
    const firstName = this.auth.user()?.name?.split(' ')[0];
    return firstName
      ? this.i18n.t('home.greetingName').replace('{name}', firstName)
      : this.i18n.t('home.greeting');
  });
}
