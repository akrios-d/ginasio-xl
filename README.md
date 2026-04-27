# Ginásio XL — Angular + Vercel skeleton

Base project scaffold. Use it as the starting point for new apps.

## Stack

- Angular 21 (standalone components, signals)
- TypeScript strict, ESM
- Vercel Serverless Functions (`api/*.ts`)
- MongoDB (node driver + connection pooling via `@vercel/functions`)
- Auth.js (`@auth/core`) with GitHub + Google providers, MongoDB session storage
- Zod for request validation
- ESLint + Prettier + Vitest

## What's included

- **`src/app/core/i18n/`** — tiny JSON-backed i18n service. Four locales (`pt`, `en`, `zh`, `fr`) live in `public/i18n/`. Loading is blocking on bootstrap so no key ever flashes untranslated.
- **`src/app/core/theme/`** — light/dark/auto theme, driven by `data-theme` on `<html>`. Tokens are in `src/styles.css`.
- **`src/app/core/update/`** — service worker update listener; auto-reloads when a new version is ready.
- **`src/app/core/auth/`** — `AuthService` reading `/api/session`. `loginWithGitHub()`, `loginWithGoogle()`, `logout()`.
- **`src/app/core/guards/`** — `requireAuth` (redirects to `/login`) and `skipIfAuth` (redirects authenticated users away from `/login`).
- **`src/app/core/interceptors/`** — `credentialsInterceptor` adds `withCredentials` to every `/api/*` call so cookies flow.
- **`src/app/features/auth/login`** — sign-in page with GitHub + Google buttons and inline language picker.
- **`src/app/shared/components/`** — `Flag`, `ThemeToggle`, `Toast` reusable components.
- **`server/lib/`** — `cors.ts`, `mongo.ts`, `auth.config.ts`, `session.ts`. Shared between `api/*` handlers.
- **`server/schemas/`** — Zod schemas (`example.schema.ts` as a template).
- **`api/auth.ts`** — Auth.js catch-all for `/api/auth/*`.
- **`api/session.ts`** — returns the current user (or 401).
- **`api/health.ts`** — example handler. Pattern: CORS → method guard → validate → work → JSON.

## Getting started

```bash
# 1. Install
npm install

# 2. Configure env
cp .env.example .env.local
# fill in MONGODB_URI, AUTH_SECRET, OAuth client ids/secrets

# 3. Generate AUTH_SECRET (paste into .env.local)
openssl rand -hex 32

# 4. Dev server
npm start            # Angular only (no API)
vercel dev           # Angular + API together (recommended)
```

## Environment variables

Server-side lives in `.env.local` (gitignored) and Vercel project settings.

| Variable | Required | Description |
|---|---|---|
| `MONGODB_URI` | yes | Mongo connection string used by `/api/*` handlers and the Auth.js adapter |
| `MONGODB_DB_NAME` | no | Database name (defaults to `ginasio-xl`) |
| `AUTH_SECRET` | yes | Random 32+ byte secret. Generate: `openssl rand -hex 32` |
| `AUTH_GITHUB_ID` | yes (if using GitHub) | GitHub OAuth app client id |
| `AUTH_GITHUB_SECRET` | yes (if using GitHub) | GitHub OAuth app client secret |
| `AUTH_GOOGLE_ID` | yes (if using Google) | Google OAuth client id |
| `AUTH_GOOGLE_SECRET` | yes (if using Google) | Google OAuth client secret |

Browser-side config goes in `src/environments/environment.ts` — never secrets.

### OAuth callback URLs

When you create the OAuth apps, set the callback URLs to:

- **Dev:** `http://localhost:3000/api/auth/callback/<provider>`
- **Prod:** `https://your-domain/api/auth/callback/<provider>`

Replace `<provider>` with `github` or `google`. Only `vercel dev` exposes `/api/*` locally; plain `ng serve` doesn't.

## Project conventions

**Folder layout**

```
src/app/
├── core/        # app-wide services (one folder per concern)
├── features/    # route-level pages (one folder per feature)
└── shared/      # reusable components/utils

server/
├── lib/         # shared backend code (mongo, cors, auth, session)
└── schemas/     # Zod schemas

api/             # Vercel function entry points (one file per route)
```

**Handler pattern** — each `api/*.ts` follows:

1. `setCors(res)` + short-circuit `OPTIONS`
2. Method guard (`405` on wrong verb)
3. `await requireSession(req, res)` if the route needs auth
4. Zod validation (catch `ZodError` → `400`)
5. Do the work
6. Return JSON, `500` on unknown error

See `api/health.ts` and `api/session.ts` for examples.

## Deploy

Push to a Vercel-linked repo. Set every variable in the table above in **Vercel → Project → Settings → Environment Variables**. `vercel.json` routes:

- `/api/auth/*` → the Auth.js handler
- `/api/*` → matching `api/<name>.ts` files
- everything else → Angular SPA fallback

## Testing

```bash
npm test     # Vitest
npm run lint # ESLint
```
