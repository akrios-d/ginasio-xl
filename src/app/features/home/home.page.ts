import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { I18nService } from '../../core/i18n/i18n.service';
import { AuthService } from '../../core/auth/auth.service';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './home.html',
  styleUrl: './home.css',
})
export class HomePage {
  protected readonly i18n = inject(I18nService);
  protected readonly auth = inject(AuthService);

  protected readonly greeting = computed(() => {
    const firstName = this.auth.user()?.name?.split(' ')[0];
    return firstName
      ? this.i18n.t('home.greetingName').replace('{name}', firstName)
      : this.i18n.t('home.greeting');
  });

  protected readonly sections = [
    { key: 'treino', route: '/training', icon: 'dumbbell' },
    { key: 'avaliacao', route: '/assessment', icon: 'chart' },
    { key: 'perfil', route: '/profile', icon: 'person' },
  ] as const;
}
