import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { I18nService } from './i18n.service';

describe('I18nService', () => {
  let service: I18nService;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({ providers: [I18nService] });
    service = TestBed.inject(I18nService);
  });

  it('defaults to a supported language', () => {
    expect(['zh', 'en', 'pt', 'fr']).toContain(service.language());
  });

  it('exposes 4 language options', () => {
    expect(service.languageOptions).toHaveLength(4);
  });

  it('setLanguage updates the signal', () => {
    service.setLanguage('fr');
    expect(service.language()).toBe('fr');
  });

  it('t() returns the key when translation is missing', () => {
    service.setLanguage('fr');
    expect(service.t('nonexistent.key')).toBe('nonexistent.key');
  });

  it('loadAll() resolves even when fetch fails', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network error')));
    await expect(service.loadAll()).resolves.toBeUndefined();
    vi.unstubAllGlobals();
  });
});
