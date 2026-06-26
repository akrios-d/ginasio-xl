import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { beforeEach, describe, expect, it } from 'vitest';
import { App } from './app';
import { I18nService } from './core/i18n/i18n.service';

const mockI18n = {
  language: () => 'pt',
  appTitle: () => 'Ginásio XL',
  t: (key: string) => {
    const dict: Record<string, string> = {
      'app.title': 'Ginásio XL',
      'app.kicker': 'Esqueleto base',
      'app.languageLabel': 'Idioma',
      'app.themeLabel': 'Tema',
    };
    return dict[key] ?? key;
  },
  languageOptions: [{ code: 'pt' }, { code: 'en' }, { code: 'zh' }, { code: 'fr' }],
  setLanguage: (_lang: string) => void _lang,
  loadAll: () => Promise.resolve(),
};

describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [provideRouter([]), { provide: I18nService, useValue: mockI18n }],
    }).compileComponents();
  });

  it('creates the app', () => {
    const fixture = TestBed.createComponent(App);
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('renders the app shell header', async () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.app-shell')).toBeTruthy();
  });

  it('renders the brand logo', async () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    await fixture.whenStable();
    expect((fixture.nativeElement as HTMLElement).querySelector('.brand-logo')).toBeTruthy();
  });
});
