# CLAUDE.md — gymdesk Coding Guidelines

Angular 22 PWA + Vercel serverless API for a gym management platform.

## Stack

| Layer | Technology |
|---|---|
| Frontend | Angular 22, TypeScript, standalone components |
| State | Angular Signals (`signal`, `computed`, `effect`) |
| Styling | Vanilla CSS, CSS custom properties (`var(--...)`) |
| i18n | Custom `I18nService` — JSON files at `/public/i18n/<lang>.json` |
| API routes | Vercel serverless functions (`/api/*.ts`) |
| Server lib | `/server/lib/` — db, auth, session, cors, audit |
| Database | MongoDB (default) or DynamoDB — swapped via `DB_PROVIDER` env var |
| Auth | Auth.js (`@auth/core`) — Google OAuth, database sessions |
| Validation | Zod — schemas in `/server/schemas/`, shared types in `/src/app/core/models/` |
| Testing | Vitest (unit), `ng test` (Angular) |
| Linting | ESLint + angular-eslint, Prettier (printWidth 100, singleQuote) |
| Deploy | Vercel |

---

## 1. Code Language: English Only

**All code must be written in English.** No exceptions.

- Variable names, function names, class names, interface names → English
- Comments → English
- File names → English (kebab-case for Angular files, camelCase for server files)
- Template text is **not** code — it goes through `i18n.t()` (see §6)

```ts
// ✗ Wrong
const fichaAvaliacao = await col.findOne({ userId });
function buscarAlunos() { ... }

// ✓ Correct
const assessmentSheet = await col.findOne({ userId });
function fetchStudents() { ... }
```

---

## 2. Think Before Coding

- State assumptions explicitly before writing code that depends on unclear behaviour.
- If there are multiple valid approaches, present them — don't pick silently.
- If a simpler approach exists, say so. Push back when warranted.
- Flag technical debt without silently fixing unrelated code.

---

## 3. Simplicity First

Minimum code that solves the problem today.

- No features beyond what was asked.
- No abstractions for single-use code.
- No generic wrappers or base classes for logic used in one place.
- No speculative "we might need this later" code.

---

## 4. Surgical Changes

- Touch only what you must.
- Don't refactor code that isn't broken when making a targeted fix.
- Don't improve formatting, naming, or structure of code you weren't asked to change.
- Match existing patterns in the codebase, even if you'd do it differently.

---

## 5. Project Structure

```
src/app/
  app.config.ts          — providers, interceptors, app initializers
  app.routes.ts          — route definitions (lazy-loaded)
  core/
    auth/                — AuthService, guards
    guards/              — requireAuth, skipIfAuth
    i18n/                — I18nService
    interceptors/        — credentials, dev-auth, loading
    models/              — shared Zod schemas + TypeScript types
    services/            — one service per domain (assessment, training, profile, checkin)
    theme/               — ThemeService
  features/
    assessment/          — assessment.page.ts + .html + .css
    auth/                — login page
    home/
    profile/
    training/
  shared/                — shared UI components

api/                     — Vercel serverless route handlers
server/
  lib/                   — db, mongo, dynamo-provider, auth.config, cors, session, audit
  schemas/               — Zod schemas for API request validation
public/
  i18n/                  — en.json, pt.json, pt-BR.json, fr.json, zh.json
```

---

## 6. Architecture: Contracted MVVM (Socket Pattern)

The frontend follows **MVVM with explicit interface contracts** — nicknamed "Socket Pattern" because each screen defines a socket (interface) that the implementation must fit into, like a USB port.

### Layers

| Layer | What it is | Where it lives |
|---|---|---|
| **Model** | Domain types and Zod schemas | `core/models/` |
| **Contracts** | `IXxxView` + `IXxxController` interfaces per screen | `features/**/*.contracts.ts` |
| **ViewModel** | Page component — implements both contracts, injects services | `features/**/*.page.ts` |
| **View** | Declarative template — no logic, only bindings | `features/**/*.html` |

### File structure per feature

```
features/assessment/
  assessment.contracts.ts   — IAssessmentView + IAssessmentController
  assessment.page.ts        — AssessmentPage implements both
  assessment.html           — binds only to what the interfaces expose
  assessment.css
```

### Contracts file

```ts
// assessment.contracts.ts
import type { Signal } from '@angular/core';
import type { AssessmentSheet, CreateAssessment } from '../../core/models';

export interface IAssessmentView {
  readonly sheets: Signal<AssessmentSheet[]>;
  readonly loading: Signal<boolean>;
  readonly saving: Signal<boolean>;
  readonly showList: Signal<boolean>;   // computed — still Signal<boolean>
}

export interface IAssessmentController {
  load(): void;
  create(data: CreateAssessment): void;
  remove(id: string): void;
}
```

### Page (ViewModel) implements the contracts

```ts
// assessment.page.ts
@Component({ selector: 'app-assessment', standalone: true, ... })
export class AssessmentPage implements IAssessmentView, IAssessmentController {
  private readonly service = inject(AssessmentService); // Model injected

  // ── IAssessmentView ──────────────────────────────────────
  readonly sheets  = signal<AssessmentSheet[]>([]);
  readonly loading = signal(false);
  readonly saving  = signal(false);
  readonly showList = computed(() => this.sheets().length > 0 && !this.loading());

  // ── IAssessmentController ────────────────────────────────
  load(): void { ... }
  create(data: CreateAssessment): void { ... }
  remove(id: string): void { ... }
}
```

### Rules

- **Always define contracts before implementation.** Write `*.contracts.ts` first — it forces you to think about the screen's surface area before coding.
- **No logic in templates.** All conditionals and derivations live in the ViewModel as `computed()` signals.
- **No direct service calls from templates.** The ViewModel mediates everything.
- **Services are not ViewModels.** Services own HTTP and business logic; the page owns UI state.
- **`Signal<T>` in interfaces.** Both `signal()` (`WritableSignal<T>`) and `computed()` (`Signal<T>`) satisfy `Signal<T>` — declare interface properties as `Signal<T>` (read-only contract), keep the implementation detail internal.

```ts
// ✗ Wrong — logic in template
@if (sheets().length > 0 && !loading() && user()?.role === 'teacher') { ... }

// ✓ Correct — computed in ViewModel, exposed via IAssessmentView
readonly showList = computed(() => this.sheets().length > 0 && !this.loading() && this.isTeacher());
// template: @if (showList()) { ... }
```

---

## 7. Angular Patterns

### Components
- Always standalone (`standalone: true`).
- Use `inject()` — never constructor injection.
- State via signals: `signal()`, `computed()`, `effect()`.
- Templates: one `.html` + one `.css` per component.

```ts
@Component({
  selector: 'app-example',
  standalone: true,
  imports: [FormsModule, DatePipe],
  templateUrl: './example.html',
  styleUrl: './example.css',
})
export class ExamplePage {
  private readonly service = inject(ExampleService);
  readonly i18n = inject(I18nService);

  readonly items = signal<Item[]>([]);
  readonly loading = signal(false);
}
```

### Services
- `@Injectable({ providedIn: 'root' })`.
- Use `HttpClient` — inject via `inject(HttpClient)`.
- Always pass `withCredentials: true` on API calls.
- Return `Observable<T>` — do not subscribe inside services.

```ts
list(): Observable<Item[]> {
  return this.http.get<Item[]>(this.base, { withCredentials: true });
}
```

### Routing
- All feature pages are lazy-loaded via `loadComponent`.
- Route guards: `requireAuth` / `skipIfAuth`.

---

## 8. i18n Rules

**Every user-facing string in templates must go through `i18n.t()`.**

```html
<!-- ✗ Wrong -->
<button title="Edit">Save</button>
<p>No records found</p>

<!-- ✓ Correct -->
<button [title]="i18n.t('common.edit')">{{ i18n.t('common.save') }}</button>
<p>{{ i18n.t('assessment.noEntries') }}</p>
```

- Keys are dot-namespaced: `feature.action` or `feature.sub.action`.
- All keys must exist in **all five** locale files: `en`, `pt`, `pt-BR`, `fr`, `zh`.
- Key names are in English.
- When adding keys, add to all five files in the same commit.

---

## 9. API Routes (Vercel)

Pattern for every `/api/*.ts` handler:

```ts
export default async function handler(req: any, res: any): Promise<void> {
  setCors(res, req);
  if (handleOptions(req, res)) return;          // handle OPTIONS preflight

  const userId = await requireSession(req, res); // 401 if unauthenticated
  if (!userId) return;

  const col = await getCollection('collectionName');

  try {
    if (req.method === 'GET') { ... }
    if (req.method === 'POST') {
      const body = SomeSchema.parse(req.body);  // Zod validation — throws ZodError
      ...
    }
    res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    if (err instanceof ZodError) {
      res.status(400).json({ error: 'Invalid input', details: err.errors });
      return;
    }
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
}
```

Rules:
- Always call `requireSession` — no unauthenticated routes except health/auth callbacks.
- Validate request body with Zod — never trust raw `req.body`.
- Always respond with an appropriate status code — never let errors bubble as 200s.
- Use `mapDocumentId` when returning MongoDB documents to convert `_id` to a string `id`.
- Authorization checks (e.g. teacher–student association) go **inside** the route handler, not the db layer.

---

## 10. Schemas and Models

- Zod schemas live in `/server/schemas/` (for API validation) and `/src/app/core/models/` (shared types).
- Export both the schema and the inferred TypeScript type:

```ts
export const CreateItemSchema = z.object({ ... });
export type CreateItem = z.infer<typeof CreateItemSchema>;
```

- Do not duplicate schema definitions — import from `core/models` when the same shape is needed on the frontend.

---

## 11. Styling

- Vanilla CSS — no CSS frameworks or component libraries.
- Use CSS custom properties (`var(--c-primary)`, `var(--c-danger)`, etc.) for colours and spacing.
- One `.css` file per component — scoped to that component.
- No inline styles in templates, except for dynamic values (e.g. `[style.color]="ring.color"`).
- Dark mode via `[data-theme="dark"]` on `<html>` — always test both themes.

---

## 12. Configuration

- All environment-specific values go in `environment.ts` / `environment.development.ts` on the frontend, and environment variables on the backend.
- Never hardcode URLs, credentials, or feature flags in source code.
- Backend secrets (DB connection strings, OAuth keys) go in `.env.local` locally and Vercel project settings in production.

---

## 13. Testing

- Unit tests: Vitest (`vitest run`) for pure logic (services, utils, Zod schemas).
- Angular tests: `ng test` for components (when behaviour is complex enough to warrant it).
- Run `npm run lint` and `npm run format:check` before committing.
- `lint-staged` runs Prettier automatically on staged files via Husky.
