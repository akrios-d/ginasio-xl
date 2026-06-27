# GymDesk

Fitness management app for gym teachers and students. Teachers create training programs and track assessments. Students log daily workouts with exercise loads and monitor their progress over time.

Built on **Vercel** + **AWS DynamoDB** — fully serverless, zero ops, scales on demand.

## Stack

- **Angular 22** — standalone components, Signals, `@if`/`@for` control flow
- **Vercel Serverless Functions** — TypeScript, one file per resource
- **AWS DynamoDB** — PAY_PER_REQUEST, GSIs for user-scoped queries
- **Auth.js v5** — Google OAuth, database sessions
- **Zod** — request body validation
- **i18n** — Portuguese, English, French, Chinese

## Features

- Teacher creates training programs with exercise groups (A, B, C…) and assigns them to students
- Student checks in daily, logging loads (kg) per exercise
- Teacher tracks student body assessments (weight, BMI, muscle/fat mass) with target goals
- Students can edit today's check-in to update loads after the session
- Collapsible exercise groups, load progression history, multi-language UI

## Getting Started

```bash
npm install
cp .env.example .env.local
# fill in the variables below
vercel dev   # runs Angular + API together
```

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `AUTH_SECRET` | yes | Random secret — `openssl rand -hex 32` |
| `AUTH_GOOGLE_ID` | yes | Google OAuth client ID |
| `AUTH_GOOGLE_SECRET` | yes | Google OAuth client secret |
| `NEXTAUTH_URL` | yes | Base URL (e.g. `http://localhost:3000`) |
| `MONGODB_URI` | yes | MongoDB connection string (Auth.js session storage) |
| `AWS_REGION` | yes | DynamoDB region (e.g. `us-east-1`) |
| `AWS_ACCESS_KEY_ID` | yes | IAM access key |
| `AWS_SECRET_ACCESS_KEY` | yes | IAM secret |
| `DYNAMO_TABLE_PREFIX` | no | Table prefix (default: `gymdesk-`) |

### Google OAuth callback URL

```
Dev:  http://localhost:3000/api/auth/callback/google
Prod: https://your-domain.vercel.app/api/auth/callback/google
```

## DynamoDB Setup

Bootstrap all tables in one command:

```bash
AWS_REGION=us-east-1 npx tsx scripts/dynamo-bootstrap.ts
```

This creates four tables with PAY_PER_REQUEST billing:
`gymdesk-checkins`, `gymdesk-perfis`, `gymdesk-avaliacoes`, `gymdesk-programas-treino`

See [`docs/dynamo-setup.md`](docs/dynamo-setup.md) for the full IAM + table setup guide.

## Docs

- [`docs/gymdesk-architecture.md`](docs/gymdesk-architecture.md) — architecture overview
- [`docs/gymdesk-architecture.svg`](docs/gymdesk-architecture.svg) — architecture diagram
- [`docs/dynamo-setup.md`](docs/dynamo-setup.md) — DynamoDB setup guide
- [`docs/hackathon-submission.md`](docs/hackathon-submission.md) — hackathon submission

## Project Structure

```
api/                        Vercel Serverless Functions
server/
  lib/                      Shared utilities (auth, cors, DynamoDB provider)
  schemas/                  Zod schemas
scripts/
  dynamo-bootstrap.ts       Creates DynamoDB tables
src/app/
  core/                     Auth, i18n, theme, interceptors, guards
  features/
    home/                   Daily check-in, workout log
    training/               Training programs view
    assessment/             Body assessment history + targets
    profile/                User profile + role management
  shared/                   Reusable components (Toast, Icon, ConfirmDialog…)
public/i18n/                Translation files (pt, en, fr, zh)
docs/                       Architecture docs + hackathon submission
```
