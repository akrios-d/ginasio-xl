import { Component, HostListener, inject, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { I18nService, AppLanguage } from './core/i18n/i18n.service';
import { Flag } from './shared/components/flag/flag';
import { ThemeToggle } from './shared/components/theme-toggle/theme-toggle';
import { Toast } from './shared/components/toast/toast';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, Flag, ThemeToggle, Toast],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  protected readonly i18n = inject(I18nService);
  protected readonly langMenuOpen = signal(false);

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
