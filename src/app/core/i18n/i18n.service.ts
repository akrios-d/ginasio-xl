import { Injectable, computed, signal } from '@angular/core';

export type AppLanguage = 'zh' | 'en' | 'pt' | 'pt-BR' | 'fr';

const STORAGE_KEY = 'ginasio-xl-language';
const TRANSLATION_LANGS: AppLanguage[] = ['en', 'zh', 'pt', 'pt-BR', 'fr'];

const LOADED_TRANSLATIONS: Record<AppLanguage, Record<string, string>> = {
  en: {},
  zh: {},
  pt: {},
  'pt-BR': {},
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
  // Apply lang attribute immediately so date inputs use the right format from the start.
  private readonly _langInit = this.applyHtmlLang(this.language());

  /**
   * `label` is the language's *autonym* — what speakers call it themselves.
   * Used as the visible text inside the language picker (and for aria-labels).
   */
  readonly languageOptions: readonly { code: AppLanguage; label: string }[] = [
    { code: 'pt-BR', label: 'Português (BR)' },
    { code: 'pt', label: 'Português (PT)' },
    { code: 'en', label: 'English' },
    { code: 'zh', label: '中文' },
    { code: 'fr', label: 'Français' },
  ];

  readonly appTitle = computed(() => this.t('app.title'));

  /** Called by provideAppInitializer — blocks bootstrap until every locale is fetched. */
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

  /** t() with pt-BR falling back to pt, then en. */

  /** BCP-47 locale used for date/number formatting (drives <input type="date"> display format). */
  private static readonly LOCALE_MAP: Record<AppLanguage, string> = {
    'pt-BR': 'pt-BR',
    pt: 'pt-PT',
    en: 'en-GB',
    fr: 'fr-FR',
    zh: 'zh-TW',
  };

  setLanguage(language: AppLanguage): void {
    this.language.set(language);
    this.applyHtmlLang(language);

    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, language);
    }
  }

  /** Returns the BCP-47 locale for the current language (e.g. 'pt-BR'). */
  get locale(): string {
    return I18nService.LOCALE_MAP[this.language()];
  }

  private applyHtmlLang(language: AppLanguage): void {
    if (typeof document !== 'undefined') {
      document.documentElement.lang = I18nService.LOCALE_MAP[language];
    }
  }

  t(key: string): string {
    const lang = this.language();
    const dict = LOADED_TRANSLATIONS[lang] || {};
    // pt-BR falls back to pt before en
    const ptFallback = lang === 'pt-BR' ? LOADED_TRANSLATIONS['pt'] || {} : {};
    const enFallback = LOADED_TRANSLATIONS['en'] || {};

    return dict[key] ?? ptFallback[key] ?? enFallback[key] ?? key;
  }

  private detectInitialLanguage(): AppLanguage {
    if (typeof localStorage !== 'undefined') {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (this.isSupportedLanguage(stored)) return stored;
    }

    if (typeof navigator !== 'undefined') {
      const lang = navigator.language.toLowerCase();
      if (lang === 'pt-br' || lang.startsWith('pt-b')) return 'pt-BR';
      if (lang.startsWith('pt')) return 'pt';
      if (lang.startsWith('zh')) return 'zh';
      if (lang.startsWith('fr')) return 'fr';
      if (lang.startsWith('en')) return 'en';
    }

    return 'pt-BR';
  }

  private isSupportedLanguage(value: string | null): value is AppLanguage {
    return (
      value === 'zh' || value === 'en' || value === 'pt' || value === 'pt-BR' || value === 'fr'
    );
  }
}
