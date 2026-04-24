# Ginásio XL — Angular + Vercel skeleton

Base project scaffold. Use it as the starting point for new apps.

## Stack

- Angular 21 (standalone components, signals)
- TypeScript strict
- Vercel Serverless Functions (`api/*.ts`)
- MongoDB (node driver + connection pooling via `@vercel/functions`)
- Zod for request validation
- ESLint + Prettier + Vitest

## What's included

- **`src/app/core/i18n/`** — tiny JSON-backed i18n service. Four locales (`pt`, `en`, `zh`, `fr`) live in `public/i18n/`. Load is blocking on bootstrap so no key ever flashes untranslated.
- **`src/app/core/theme/`** — light/dark/auto theme, driven by `data-theme` on `<html>`. Tokens are in `src/styles.css`.
- **`src/app/core/update/`** — service worker update listener; auto-reloads when a new version is ready.
- **`src/app/shared/components/`** — `Flag`, `ThemeToggle`, `Toast` reusable components.
- **`api/lib/`** — `cors.ts`, `mongo.ts` helpers for serverless handlers.
- **`api/schemas/`** — Zod schema location.
- **`api/health.ts`** — example endpoint. Pattern: CORS → validate → do work → JSON.

## Getting started

```bash
# 1. Install
npm install

# 2. Configure env
cp .env.example .env.local
# edit .env.local with your MongoDB URI

# 3. Dev server
npm start
```

## Environment variables

Everything server-side lives in `.env.local` (ignored by git) and Vercel project settings.

| Variable | Required | Description |
|---|---|---|
| `MONGODB_URI` | yes | Connection string used by `api/lib/mongo.ts` |
| `MONGODB_DB_NAME` | no | Database name (defaults to `ginasio-xl`) |

Browser-side config goes in `src/environments/environment.ts` — never secrets.

## Project conventions

**Folder layout**

```
src/app/
├── core/        # app-wide services (one folder per concern)
├── features/    # route-level pages (one folder per feature)
└── shared/      # reusable components/utils
```

**Handler pattern** — each `api/*.ts` follows:

1. `setCors(res)` + short-circuit `OPTIONS`
2. Method guard (`405` on wrong verb)
3. Zod validation (catch `ZodError` → `400`)
4. Do the work
5. Return JSON, `500` on unknown error

See `api/health.ts` for the minimal shape.

## Deploy

Push to a Vercel-linked repo. Set `MONGODB_URI` in Vercel project settings. `vercel.json` routes `/api/*` to the functions folder and everything else to the Angular build.

## Testing

```bash
npm test     # Vitest
npm run lint # ESLint
```
