import { Injectable, computed, signal } from '@angular/core';
import { environment } from '../../../environments/environment';

interface SessionUser {
  id: string;
  name?: string | null;
  email?: string | null;
  image?: string | null;
}

const DEV_USER: SessionUser = {
  id: environment.devUserId || 'dev-user',
  name: 'Dev User',
  email: 'dev@gymdesk.local',
  image: null,
};

/**
 * Reads/refreshes the Auth.js session from /api/session.
 * Login/logout post forms with CSRF tokens because that's what Auth.js expects.
 *
 * When environment.devBypassAuth is true, skips the real session check
 * and injects a fake/real user — useful for local UI development without a backend.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly _user = signal<SessionUser | null>(null);

  readonly user = this._user.asReadonly();
  readonly isAuthenticated = computed(() => this._user() !== null);
  readonly userId = computed(() => this._user()?.id ?? null);

  /** Called once at app startup (provideAppInitializer). */
  async load(): Promise<void> {
    if (environment.devBypassAuth) {
      this._user.set(DEV_USER);
      return;
    }

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

  loginWithGoogle(): Promise<void> {
    return this.csrfPostForm('/api/auth/signin/google');
  }

  logout(): Promise<void> {
    if (environment.devBypassAuth) {
      this._user.set(null);
      return Promise.resolve();
    }
    return this.csrfPostForm('/api/auth/signout', { includeCallback: false });
  }

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
