import { Component, inject } from '@angular/core';
import { I18nService } from '../../../core/i18n/i18n.service';
import { ThemeService } from '../../../core/theme/theme.service';

@Component({
  selector: 'app-theme-toggle',
  standalone: true,
  template: `
    <button
      type="button"
      class="theme-toggle"
      (click)="theme.cycle()"
      [attr.aria-label]="i18n.t('app.themeLabel')"
      [title]="label()"
    >
      @switch (theme.mode()) {
        @case ('light') {
          <!-- Sun -->
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <circle cx="12" cy="12" r="4"/>
            <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/>
          </svg>
        }
        @case ('dark') {
          <!-- Moon -->
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
          </svg>
        }
        @default {
          <!-- Monitor / auto -->
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <rect x="2" y="4" width="20" height="14" rx="2"/>
            <path d="M8 20h8M12 18v2"/>
          </svg>
        }
      }
    </button>
  `,
  styles: [
    `
      :host {
        display: inline-flex;
      }
      .theme-toggle {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 36px;
        height: 36px;
        min-height: unset;
        padding: 0;
        border: 1.5px solid var(--c-border);
        border-radius: var(--r-pill);
        background: transparent;
        color: var(--c-ink-2);
        cursor: pointer;
        transition: border-color 150ms, background 150ms, color 150ms;
      }
      .theme-toggle:hover {
        border-color: var(--c-border-strong);
        background: var(--c-surface-alt);
        color: var(--c-ink);
        box-shadow: none;
      }
      .theme-toggle:focus-visible {
        outline: 2px solid var(--c-accent);
        outline-offset: 2px;
      }
    `,
  ],
})
export class ThemeToggle {
  protected readonly theme = inject(ThemeService);
  protected readonly i18n = inject(I18nService);

  protected label(): string {
    return this.i18n.t(`theme.${this.theme.mode()}`);
  }
}
