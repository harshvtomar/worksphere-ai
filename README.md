# WorkSphere AI

Enterprise workflow automation and real-time collaboration SaaS — Stage 1 of 14.

Repository: https://github.com/harshvtomar/worksphere-ai

This foundation contains a responsive dashboard with clearly labeled sample data, a real NestJS health API, and a PostgreSQL schema with an initial migration. Authentication, persistent application workflows, authorization, AI and billing are not implemented. Stage 2 has not started.

Local installation (`npm ci`: 301 packages), TypeScript, production builds, Prisma validation/generation, automated tests and HTTP smoke checks have passed. Sources are published and hosted CI passed, including PostgreSQL 17 migration and constraint checks. Stage 1 is complete within the documented foundation scope. See [completion report](STAGE_1_COMPLETION_REPORT.md) for acceptance status; a passing local gate alone does not mean Stage 1 is complete.

## Stack and layout

| Area | Technology / location |
|---|---|
| Frontend | Next.js 16, React 19, TypeScript — `apps/web` |
| Backend | NestJS 12, TypeScript, ESM — `apps/api` |
| Database | PostgreSQL 17, Prisma 7 — `packages/database` |
| Tests | Node test runner, HTTP smoke, embedded PGlite and PostgreSQL constraint checks — `tests` |
| CI | GitHub Actions with PostgreSQL 17 service — `.github/workflows/ci.yml` |
| Design and checkpoints | `docs`, `PROJECT_STATE.md`, `SESSION_LOG.md` |

The frontend calls `/v1/health` on the API. The API currently serves health and metadata only; it does not query the database. Organizations contain projects, projects contain tasks, and tasks contain comments. Membership links users to organizations. There is no separate Workspace entity.

## MacBook Air with Apple Silicon

Use a native Apple Silicon Node.js installation, version 22.12+ (Node 24 is suitable), npm, Git, and Docker Desktop for Apple Silicon if running PostgreSQL. Use one Node/npm installation consistently; no global Nest CLI is required.

```bash
git clone https://github.com/harshvtomar/worksphere-ai.git
cd worksphere-ai
node --version
npm ci
cp apps/web/.env.example apps/web/.env.local
cp apps/api/.env.example apps/api/.env
cp packages/database/.env.example packages/database/.env
npm run dev
```

For a downloaded ZIP, open Terminal in its extracted project folder instead of cloning. Open http://localhost:3000. API endpoints are http://localhost:4000/v1/health and http://localhost:4000/v1/info. Stop development servers with Control-C.

| Variable | Loaded by | Purpose |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | Web `.env.local` | Public API base URL; defaults to `http://localhost:4000`; embedded at build time |
| `PORT` | API `.env` | API listening port, default 4000; integer 1–65535 |
| `CORS_ORIGINS` | API `.env` | Comma-separated exact HTTP(S) origins without paths; default `http://localhost:3000` |
| `DATABASE_URL` | Database package `.env` | PostgreSQL connection string for Prisma commands |

Root `.env` is not a substitute for each workspace's environment file. Never commit actual `.env` files. Example database credentials are for local development only. Changing a public frontend environment variable requires rebuilding a production frontend.

## Database setup and committed migration

```bash
docker compose up -d postgres
npm run db:validate
npm run db:generate
npm run db:deploy
npm run status -w @worksphere/database
```

`db:deploy` applies the committed initial migration without creating another migration. `db:migrate` is an authoring command for deliberate future schema changes, not the setup command. Docker binds PostgreSQL to localhost and retains development data in a named volume. `docker compose down` stops the database without deleting that volume.

For constraint checks against a **disposable, migrated test database**, explicitly export its connection string and run:

```bash
DATABASE_URL='postgresql://worksphere:worksphere_dev_only@127.0.0.1:5432/worksphere?schema=public' DATABASE_TEST_MODE=postgres npm run test:database
```

Never direct tests at an unrelated or production database. Fixtures are inserted inside a transaction and rolled back. Without `DATABASE_TEST_MODE=postgres`, the database test creates an isolated in-memory PGlite database, applies the migration SQL, and destroys it afterwards. This embedded test does not prove Prisma network connectivity or `migrate deploy` against standalone PostgreSQL.

## Verification and production startup

```bash
npm run verify:stage1
```

The fail-fast gate runs 11 source/contract tests, both TypeScript checks and production builds, Prisma validation and generation, 14 configuration/runtime failure tests, 8 embedded database tests, and HTTP smoke checks. Smoke tests start and stop built applications on ports 44671 and 44672. Leave these ports available. If `DATABASE_TEST_MODE=postgres` is set, database checks instead use the explicitly configured disposable PostgreSQL database.

Individual commands: `npm test`, `npm run typecheck`, `npm run build`, `npm run test:config`, `npm run test:database`, and `npm run smoke`. Configuration and smoke checks require built applications. Production startup uses separate terminals:

```bash
npm run start -w @worksphere/api
npm run start -w @worksphere/web
```

The local gate does not deploy a migration through Prisma, inspect a browser, publish GitHub sources, or validate hosted CI. Those are separate acceptance requirements.

## Hosted CI

On pushes to `main`, pull requests, or manual dispatch, CI installs from the lockfile with `npm ci`, runs the local gate, deploys the initial migration into a PostgreSQL 17 service, repeats deployment to check idempotency, checks migration status, and runs all 8 database tests against that service. A configured workflow is not evidence of a passing hosted run; record its actual URL, conclusion and commit in the completion report.

## Scope and security limits

The preview has no real accounts or customer data. CORS is an origin policy, not authentication. Foreign keys and uniqueness constraints do not enforce organization membership of creators, reporters, assignees, comment authors or audit actors. No row-level security is configured. Stage 2 must implement authenticated tenant-scoped access and negative cross-tenant tests before exposing private data. Health reports API liveness only, not database readiness.

Continue using [NEXT_STAGE_PROMPT.md](NEXT_STAGE_PROMPT.md), only after all Stage 1 acceptance requirements pass. Public production deployment remains Stage 13.

## Build and browser verification notes

A repeated production build reproduced a Turbopack persistent-cache reopen error. The supported `experimental.turbopackFileSystemCacheForBuild: false` setting disables that optional cache; two repeat builds then passed. This does not disable compilation or checks.

Browser inspection used a temporary static mirror of built, prerendered HTML plus JavaScript/CSS. Desktop, 390px mobile and 768px tablet layouts were inspected without document-level horizontal overflow. Sample labels, responsive cards/sidebar and API offline state were observed; no application console errors were observed. The mirror had no backend, so browser online connectivity and full Next browser behavior were not verified. Built Next/Nest HTTP runtime checks passed separately.
