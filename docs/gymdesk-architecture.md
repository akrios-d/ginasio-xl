# GymDesk — Architecture Overview

## What It Is

GymDesk is a web application for gym teachers and students. Teachers create and manage training programs and track student assessments (body metrics, strength records). Students log daily workouts — including loads per exercise — and view their progress over time.

---

## Deployment

The entire application runs on **Vercel**:

- The **Angular 22 SPA** is built at deploy time and served from Vercel's global CDN as a set of static files.
- All backend logic lives in **Vercel Serverless Functions** under `api/`. Each file is an independent Node.js function handling one resource (check-ins, profiles, assessments, training programs, auth).
- There is no persistent server process. Every API call cold-starts (or reuses) a short-lived function instance.

---

## AWS DynamoDB — Data Layer

All application data is stored in **AWS DynamoDB**, accessed from Vercel Serverless Functions using the AWS SDK v3.

### Table Design

All tables use `PAY_PER_REQUEST` billing — no capacity planning required, cost scales with actual usage.

| Table | Primary Key | GSI | Contents |
|---|---|---|---|
| `gymdesk-checkins` | `_id` (String) | `userId-index` | Workout logs with exercise loads |
| `gymdesk-perfis` | `userId` (String) | — | User profiles, roles (student/teacher) |
| `gymdesk-avaliacoes` | `_id` (String) | `userId-index` | Body metric assessments |
| `gymdesk-programas-treino` | `_id` (String) | `userId-index` | Training programs with exercise groups |

User-scoped tables have a **GSI on `userId`** for efficient per-user queries without table scans.

The table prefix (`gymdesk-`) is configurable via `DYNAMO_TABLE_PREFIX` for multi-environment isolation (dev / staging / prod).

### DB Abstraction Layer

A custom abstraction layer (`server/lib/db.ts`, `server/lib/dynamo-provider.ts`) wraps the DynamoDB SDK and exposes a MongoDB-like interface to all route handlers. This means route handlers use `.findOne()`, `.find().sort().toArray()`, `.insertOne()`, `.updateOne()` — standard patterns — regardless of the underlying database.

The `DynamoCollection` class translates these calls:
- Update operators (`$set`, `$push`, `$addToSet`, `$pull`) → `UpdateExpression` with `ExpressionAttributeNames/Values`
- Filter operators (`$or`, `$in`, date ranges, array contains) → `FilterExpression` with client-side post-processing for complex cases
- `.find().sort().toArray()` → `Query` with GSI (userId) or `Scan` with client-side sort
- IDs are plain UUID strings — DynamoDB has no ObjectId type

This design means new data sources can be added without touching any route handler.

### Data Flow

```
Browser (Angular 22)
  → POST /api/checkin   (HTTPS + session cookie)
    → Serverless Function validates session
    → Zod validates request body
    → DynamoCollection.insertOne()
        → AWS SDK PutCommand → DynamoDB (gymdesk-checkins)
    → 201 JSON response
  → signal updated → UI re-renders
```

---

## API Route Handlers

Each handler in `api/` follows the same pattern: validate session → validate body with Zod → call `getCollection()` → return JSON.

| Route | Methods | Purpose |
|---|---|---|
| `/api/auth/[...nextauth]` | GET, POST | Google OAuth sign-in / session management |
| `/api/session` | GET | Current user profile + roles |
| `/api/checkin` | GET, POST | List / create workout check-ins |
| `/api/checkin/[id]` | GET, PATCH, DELETE | Read / update (edit today's loads) / delete |
| `/api/perfil` | GET, PUT | Read / update current user profile |
| `/api/perfis` | GET | List student profiles (teacher only) |
| `/api/avaliacao` | GET, POST | List / create assessments |
| `/api/avaliacao/[id]` | GET, PUT, DELETE | Single assessment operations |
| `/api/programa-treino` | GET, POST | List / create training programs |
| `/api/programa-treino/[id]` | GET, PUT, DELETE | Single program operations |

---

## Frontend (Angular 22)

The SPA uses Angular's standalone component model with **Signals** for reactivity — no NgModules.

Key patterns:
- `signal<T>()` for mutable state, `computed()` for derived state.
- `@if` / `@for` control flow blocks (Angular 17+ syntax).
- Multi-language support (Portuguese, English, French, Chinese) via JSON files loaded at runtime.

Feature pages: **Home** (daily check-in with load tracking), **Training** (collapsible program groups), **Assessment** (body metrics + load history from active programs), **Profile** (role management).

---

## AWS Environment Variables

| Variable | Description |
|---|---|
| `AWS_REGION` | DynamoDB region (e.g. `us-east-1`) |
| `AWS_ACCESS_KEY_ID` | IAM user access key |
| `AWS_SECRET_ACCESS_KEY` | IAM user secret |
| `DYNAMO_TABLE_PREFIX` | Table name prefix (default: `gymdesk-`) |

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Angular 22 (standalone, signals) |
| Hosting / CDN | Vercel |
| Backend | Vercel Serverless Functions (TypeScript) |
| Database | **AWS DynamoDB** |
| DB abstraction | Custom provider (`server/lib/dynamo-provider.ts`) |
| Authentication | Auth.js v5 + Google OAuth |
| Input validation | Zod |
| Language | TypeScript throughout |
