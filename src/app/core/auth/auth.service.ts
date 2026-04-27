import { Injectable, computed, signal } from '@angular/core';
import { environment } from '../../../environments/environment';

interface SessionUser {
  id: string;
  name?: string | null;
  email?: string | null;
  image?: string | null;
}

/**
 * Reads/refreshes the Auth.js session from /api/session.
 * Login/logout post forms with CSRF tokens because that's what Auth.js expects.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly _user = signal<SessionUser | null>(null);

  readonly user = this._user.asReadonly();
  readonly isAuthenticated = computed(() => this._user() !== null);
  readonly userId = computed(() => this._user()?.id ?? null);

  /** Called once at app startup (provideAppInitializer). */
  async load(): Promise<void> {
    try {
      const res = await fetch(`${environment.apiUrl}/api/session`, {
        credentials: 'include',
      });
      if (!res.ok) return;
      const data = await res.json();
      if (data?.user?.id) this._user.set(data.user as SessionUser);
    } catch {
      // Session unreachable — user stays unauthenticated.
    }
  }

  loginWithGitHub(): Promise<void> {
    return this.csrfPostForm('/api/auth/signin/github');
  }

  loginWithGoogle(): Promise<void> {
    return this.csrfPostForm('/api/auth/signin/google');
  }

  logout(): Promise<void> {
    return this.csrfPostForm('/api/auth/signout', { includeCallback: false });
  }

  /**
   * Auth.js sign-in/out endpoints require a POST with a CSRF token from /api/auth/csrf.
   * We synthesise a hidden form, append it to the body, and submit — the browser
   * follows the OAuth redirect chain and eventually lands back on `callbackUrl`.
   */
  private async csrfPostForm(
    action: string,
    options: { includeCallback?: boolean } = {},
  ): Promise<void> {
    const { includeCallback = true } = options;
    const base = environment.apiUrl;

    const csrfRes = await fetch(`${base}/api/auth/csrf`, { credentials: 'include' });
    const { csrfToken } = (await csrfRes.json()) as { csrfToken: string };

    const form = document.createElement('form');
    form.method = 'POST';
    form.action = `${base}${action}`;

    const fields: [string, string][] = [['csrfToken', csrfToken]];
    if (includeCallback) fields.push(['callbackUrl', window.location.origin]);

    for (const [name, value] of fields) {
      const input = document.createElement('input');
      input.type = 'hidden';
      input.name = name;
      input.value = value;
      form.appendChild(input);
    }

    document.body.appendChild(form);
    form.submit();
  }
}
