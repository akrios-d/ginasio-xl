import { Injectable, signal } from '@angular/core';

export type ThemeMode = 'light' | 'dark' | 'auto';

const STORAGE_KEY = 'ginasio-xl-theme';

/**
 * Drives the design system's light/dark tokens by setting `data-theme` on <html>.
 *
 * Three modes:
 *   - 'auto'  — no attribute set; CSS reads prefers-color-scheme (default)
 *   - 'light' — force light palette
 *   - 'dark'  — force dark palette
 *
 * The service is side-effectful in the browser: it touches the DOM and localStorage.
 * During SSR / tests these guards no-op.
 */
@Injectable({ providedIn: 'root' })
export class ThemeService {
  readonly mode = signal<ThemeMode>(this.readStoredMode());

  /** Called by app initializer — syncs the DOM with the stored preference on boot. */
  init(): void {
    this.applyMode(this.mode());
  }

  setMode(mode: ThemeMode): void {
    this.mode.set(mode);
    this.applyMode(mode);

    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, mode);
    }
  }

  /** Cycles light → dark → auto → light. Convenient for a single-button toggle. */
  cycle(): void {
    const current = this.mode();
    let next: ThemeMode;
    if (current === 'light') {
      next = 'dark';
    } else if (current === 'dark') {
      next = 'auto';
    } else {
      next = 'light';
    }
    this.setMode(next);
  }

  private applyMode(mode: ThemeMode): void {
    if (typeof document === 'undefined') return;
    const root = document.documentElement;
    if (mode === 'auto') {
      delete root.dataset['theme'];
    } else {
      root.dataset['theme'] = mode;
    }
  }

  private readStoredMode(): ThemeMode {
    if (typeof localStorage === 'undefined') return 'auto';
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored === 'light' || stored === 'dark' || stored === 'auto' ? stored : 'auto';
  }
}
