import { Component, computed, effect, inject } from '@angular/core';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { filter, map } from 'rxjs';
import { I18nService } from './core/i18n/i18n.service';
import { AuthService } from './core/auth/auth.service';
import { PerfilService } from './core/services/perfil.service';
import { Toast } from './shared/components/toast/toast';
import { Icon } from './shared/components/icon/icon';
import { LoadingBar } from './shared/components/loading-bar/loading-bar';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, Toast, Icon, LoadingBar],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  protected readonly i18n = inject(I18nService);
  protected readonly auth = inject(AuthService);
  private readonly perfilSvc = inject(PerfilService);

  constructor() {
    effect(() => {
      if (this.auth.isAuthenticated()) {
        this.perfilSvc.get().subscribe({ error: () => undefined });
      }
    });
  }

  protected readonly isLoginPage = toSignal(
    inject(Router).events.pipe(
      filter((e): e is NavigationEnd => e instanceof NavigationEnd),
      map((e) => e.url === '/login'),
    ),
    { initialValue: false },
  );

  protected readonly greeting = computed(() => {
    const hour = new Date().getHours();
    if (hour < 12) return this.i18n.t('app.goodMorning');
    if (hour < 18) return this.i18n.t('app.goodAfternoon');
    return this.i18n.t('app.goodEvening');
  });
}
