import { Component, HostListener, inject, signal } from '@angular/core';
import { AuthService } from '../../core/auth/auth.service';
import { I18nService } from '../../core/i18n/i18n.service';
import { Flag } from '../../shared/components/flag/flag';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [Flag],
  templateUrl: './login.html',
  styleUrl: './login.css',
})
export class LoginPage {
  readonly auth = inject(AuthService);
  readonly i18n = inject(I18nService);
  readonly langMenuOpen = signal(false);

  pickLanguage(code: string): void {
    this.i18n.setLanguage(code as Parameters<typeof this.i18n.setLanguage>[0]);
    this.langMenuOpen.set(false);
  }

  @HostListener('document:keydown.escape')
  closeLangMenu(): void {
    this.langMenuOpen.set(false);
  }
}
