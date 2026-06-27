# GymDesk — Hackathon Submission

**H0: Hack the Zero Stack with Vercel v0 and AWS Databases**

---

## Inspiration

Personal trainers track their students in WhatsApp messages, spreadsheets, and paper notebooks. There's no low-cost tool that lets a teacher manage multiple students' programs, let students self-report workout data from their phone, and actually show load progression over time. We built GymDesk to fix that.

## What it does

GymDesk connects gym teachers and students. Teachers create training programs with exercise groups and assign them to students. Students open the app after their workout, see today's training group, and log the weight used for each exercise. Over weeks, GymDesk builds a load progression history — both teacher and student can see exactly whether the student is evolving, stalling, or overloading.

The app is designed for two distinct contexts: students use it on mobile — they finish a set, pick up their phone, and log the weight before moving to the next exercise. Teachers use it on desktop — reviewing student progression, updating programs, and managing assessments across multiple students at once. Being a web app means no installs, no app store, works on any device the moment you share the link.

Teachers also track body assessments (weight, BMI, muscle mass, body fat) with configurable targets per student.

## How we built it

GymDesk started on MongoDB Atlas. It worked, but we kept running into the same friction: connection pooling in serverless functions, idle cluster costs even with zero traffic, and having to think about replica sets and cluster tiers as soon as we imagined scaling to multiple gyms.

Joining this hackathon gave us the push to migrate to AWS DynamoDB — and it turned out to be the right call for every reason that matters for this kind of app.

The migration required us to design our access patterns explicitly upfront. Each table has a String primary key (`_id`, UUID) and a Global Secondary Index on `userId`, which covers the single most common query in the entire app: "give me everything belonging to this user." What was a `.find({ userId })` in MongoDB became a `Query` against the GSI — same result, but now enforced at the schema level instead of relying on an index that may or may not exist.

We also built a thin provider layer that wraps the AWS SDK v3 and exposes a MongoDB-like interface to the API route handlers. This let us migrate incrementally without rewriting every handler at once.

- **Frontend:** Angular 22 with standalone components and Signals
- **Backend:** Vercel Serverless Functions (TypeScript) — one file per resource
- **Database:** AWS DynamoDB — PAY_PER_REQUEST, four tables, GSI on `userId` per table
- **Auth:** Auth.js v5 with Google OAuth
- **Validation:** Zod schemas on every API route
- **Bootstrap:** `npx tsx scripts/dynamo-bootstrap.ts` creates all tables and indexes in any AWS region in seconds

## Challenges we ran into

Designing the DynamoDB access patterns upfront was the hardest part. MongoDB lets you query anything and add indexes later. DynamoDB rewards you when you model for your queries from day one — if you don't, you end up with full table scans. Getting the GSI design right so that per-user list queries are always O(log n) took several iterations.

We also had to implement update operators (`$set`, `$push`, `$addToSet`, `$pull`) on top of DynamoDB's `UpdateExpression` syntax, which is powerful but very explicit compared to MongoDB's terse update syntax.

## Accomplishments that we're proud of

Switching from MongoDB to DynamoDB made the app strictly better in every dimension that matters for production:

- **No idle cost.** MongoDB Atlas charges for a running cluster even at zero traffic. DynamoDB PAY_PER_REQUEST charges per request — zero traffic means zero cost.
- **No connection management.** Serverless functions can't maintain persistent connections cleanly. DynamoDB's HTTP-based API opens and closes per request with no pooling overhead.
- **No ops.** No cluster tier to choose, no replica set to configure, no backups to schedule. AWS handles three-AZ durability automatically.
- **Predictable scaling.** A gym with 50 students costs fractions of a cent per day. A chain with 500 gyms costs proportionally more — no sudden tier jumps, no surprises.

The entire stack — from a student tapping "check in" on their phone to a durable write landing in DynamoDB — runs with zero managed infrastructure.

## What we learned

DynamoDB's on-demand mode is genuinely the right fit for bursty, user-scoped workloads. Gym check-ins spike between 6pm and 9pm and are nearly zero at 3am — PAY_PER_REQUEST handles that automatically. MongoDB required us to overprovision for the peak; DynamoDB just scales.

The bigger lesson was about schema design philosophy. MongoDB's flexibility is great for prototyping but can hide access pattern problems until they become performance problems in production. DynamoDB forces you to think about how you'll query your data before you write a single item — which turns out to produce a better data model, not just a faster one.

## What's next for Gym-Desk

- DynamoDB Global Tables for multi-region deployments with local latency per country
- Push notifications via Amazon SNS when a teacher updates a student's program
- AI-powered load recommendations using workout history stored in DynamoDB
- Gym management tier: multiple teachers, class scheduling, membership tracking
