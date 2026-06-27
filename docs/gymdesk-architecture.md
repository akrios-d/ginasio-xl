# GymDesk — Architecture

## Overview

GymDesk is a full-stack fitness management app deployed on **Vercel** with **AWS DynamoDB** as the database. Teachers manage training programs and track student assessments. Students log daily workouts with exercise loads and follow their progress over time.

---

## Stack

| Layer | Technology |
|---|---|
| Frontend | Angular 22 (standalone components, Signals) |
| Hosting | Vercel (SPA + Serverless Functions) |
| Database | **AWS DynamoDB** |
| Auth | Auth.js v5 + Google OAuth |
| Validation | Zod |
| Language | TypeScript throughout |

---

## Why DynamoDB

GymDesk is built around a key insight: gym data is inherently **user-scoped and write-heavy**. Students log check-ins daily. Teachers update programs frequently. Assessments accumulate over months.

DynamoDB is the right fit because:

- **Serverless-native** — no connection pooling, no idle capacity, no cold-start overhead. Each Vercel function call opens and closes cleanly.
- **PAY_PER_REQUEST billing** — cost scales exactly with usage. Zero traffic = zero cost. A gym with 100 active students costs fractions of a cent per day in DB reads.
- **Millisecond latency at any scale** — whether the app has 10 users or 10,000, read/write latency stays consistent. No query planner, no lock contention.
- **No ops** — no cluster to manage, no replicas to configure, no backups to schedule. AWS handles availability, durability (3-AZ replication), and scaling automatically.
- **GSIs for flexible access patterns** — the primary access pattern (get all items for a user) is served by a Global Secondary Index on `userId`, making per-user queries efficient without table scans.

---

## Data Model

All tables use **PAY_PER_REQUEST** billing and **String** primary keys (UUIDs).

### gymdesk-checkins

Records a student's workout session for a specific training group on a specific day.

| Attribute | Type | Notes |
|---|---|---|
| `_id` | String (PK) | UUID |
| `userId` | String (GSI) | links to the student |
| `programaTreinoId` | String | which training program |
| `grupoLetra` | String | exercise group (A, B, C…) |
| `data` | String | ISO date |
| `cargas` | List | `[{ nome, carga }]` — exercise loads in kg |
| `notas` | String | optional notes |

**Access patterns:** list all check-ins for a user (GSI `userId-index`); get single check-in by ID; update today's entry (PATCH).

### gymdesk-perfis

User profile — one item per user, keyed directly by `userId`.

| Attribute | Type | Notes |
|---|---|---|
| `userId` | String (PK) | Auth.js user ID |
| `nome` | String | display name |
| `roles` | List | `["student"]`, `["teacher"]`, or both |
| `teacherIds` | List | teacher IDs the student is linked to |
| `sharedWithTeacherIds` | List | teachers who can view this profile |

No GSI needed — all queries are by `userId` directly.

### gymdesk-programas-treino

Training programs created by teachers and assigned to students.

| Attribute | Type | Notes |
|---|---|---|
| `_id` | String (PK) | UUID |
| `userId` | String (GSI) | owner (teacher or student) |
| `nome` | String | program name |
| `ativo` | Boolean | only active programs shown to students |
| `grupos` | List | exercise groups, each with a list of exercises |
| `studentId` | String | student this program is assigned to |

**Access patterns:** list programs for a user (GSI `userId-index`); get by ID.

### gymdesk-avaliacoes

Body metric assessments with historical tracking and targets.

| Attribute | Type | Notes |
|---|---|---|
| `_id` | String (PK) | UUID |
| `userId` | String (GSI) | student |
| `data` | String | ISO date of assessment |
| `peso`, `altura`, `imc` | Number | body metrics |
| `massaMuscular`, `massaGorda` | Number | composition |
| `metas` | Map | target values per metric |

**Access patterns:** list assessments for a user sorted by date (GSI + client sort); get by ID.

---

## API Endpoints

Vercel Serverless Functions in `api/`. Each function: validates session → validates body (Zod) → reads/writes DynamoDB → returns JSON.

| Route | Methods | DynamoDB table |
|---|---|---|
| `/api/auth/[...nextauth]` | GET, POST | — (Auth.js managed) |
| `/api/session` | GET | — (session lookup) |
| `/api/checkin` | GET, POST | `gymdesk-checkins` |
| `/api/checkin/[id]` | GET, PATCH, DELETE | `gymdesk-checkins` |
| `/api/perfil` | GET, PUT | `gymdesk-perfis` |
| `/api/perfis` | GET | `gymdesk-perfis` |
| `/api/avaliacao` | GET, POST | `gymdesk-avaliacoes` |
| `/api/avaliacao/[id]` | GET, PUT, DELETE | `gymdesk-avaliacoes` |
| `/api/programa-treino` | GET, POST | `gymdesk-programas-treino` |
| `/api/programa-treino/[id]` | GET, PUT, DELETE | `gymdesk-programas-treino` |

---

## Request Lifecycle

```
User logs a workout
  → Angular signals update the UI optimistically
  → POST /api/checkin  (HTTPS + session cookie)
    → Vercel Serverless Function starts (cold or warm)
    → Auth.js validates session token
    → Zod parses and validates request body
    → AWS SDK v3 PutCommand → DynamoDB (gymdesk-checkins)
        ↳ 3-AZ durable write, single-digit ms latency
    → 201 JSON response
  → UI confirms, signal state settled
```

---

## Scaling Characteristics

| Scenario | DynamoDB behaviour |
|---|---|
| Single gym, 20 students | PAY_PER_REQUEST — minimal cost, instant |
| 50 gyms, 2 000 students | Same latency, linear cost increase, zero config |
| Daily check-in spike (6–8pm) | Auto-scales write throughput on demand |
| New country / region | Deploy DynamoDB global tables for local latency |
| Zero traffic (night) | Zero cost, zero idle capacity |

DynamoDB's on-demand mode means GymDesk can go from a single gym to a national fitness chain without a single infrastructure change.

---

## Diagram

See [`gymdesk-architecture.svg`](./gymdesk-architecture.svg) for the visual representation.
