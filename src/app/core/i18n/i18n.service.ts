import { Injectable, computed, signal } from '@angular/core';

export type AppLanguage = 'zh' | 'en' | 'pt' | 'fr';

const STORAGE_KEY = 'ginasio-xl-language';
const TRANSLATION_LANGS: AppLanguage[] = ['en', 'zh', 'pt', 'fr'];

const LOADED_TRANSLATIONS: Record<AppLanguage, Record<string, string>> = {
  en: {},
  zh: {},
  pt: {},
  fr: {},
};

/**
 * Tiny JSON-backed i18n service.
 *
 * - `loadAll()` runs as an app initializer and fetches every locale in parallel.
 * - Translations live at /i18n/<lang>.json (under public/).
 * - `t(key)` is the template entry point: falls back to English, then key.
 * - `language` is a signal so template bindings react to language changes.
 */
@Injectable({ providedIn: 'root' })
export class I18nService {
  readonly language = signal<AppLanguage>(this.detectInitialLanguage());

  readonly languageOptions: readonly { code: AppLanguage }[] = [
    { code: 'pt' },
    { code: 'en' },
    { code: 'zh' },
    { code: 'fr' },
  ];

  readonly appTitle = computed(() => this.t('app.title'));

  /** Called by provideAppInitializer - blocks bootstrap until every locale is fetched. */
  loadAll(): Promise<void> {
    const requests = TRANSLATION_LANGS.map((lang) =>
      fetch(`/i18n/${lang}.json`)
        .then((r) => r.json())
        .then((data) => {
          LOADED_TRANSLATIONS[lang] = data;
        })
        .catch(() => {
          // Silent fallback - keys render as-is if a locale fails.
        }),
    );

    return Promise.all(requests).then(() => void 0);
  }

  setLanguage(language: AppLanguage): void {
    this.language.set(language);

    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, language);
    }
  }

  t(key: string): string {
    const lang = this.language();
    const dict = LOADED_TRANSLATIONS[lang] || {};
    const fallback = LOADED_TRANSLATIONS['en'] || {};

    return dict[key] ?? fallback[key] ?? key;
  }

  private detectInitialLanguage(): AppLanguage {
    if (typeof localStorage !== 'undefined') {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (this.isSupportedLanguage(stored)) return stored;
    }

    if (typeof navigator !== 'undefined') {
      const lang = navigator.language.toLowerCase();
      if (lang.startsWith('pt')) return 'pt';
      if (lang.startsWith('zh')) return 'zh';
      if (lang.startsWith('fr')) return 'fr';
      if (lang.startsWith('en')) return 'en';
    }

    return 'pt';
  }

  private isSupportedLanguage(value: string | null): value is AppLanguage {
    return value === 'zh' || value === 'en' || value === 'pt' || value === 'fr';
  }
}
