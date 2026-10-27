# WorkSphere AI

Enterprise workflow automation and real-time collaboration SaaS — Stage 2 of 14.

Repository: https://github.com/harshvtomar/worksphere-ai

Stage 2 adds OIDC sign-in, PostgreSQL-backed sessions, protected pages, organizations, invitations and server-enforced Owner/Admin/Member permissions. The public dashboard retains clearly labeled sample project/task data. Organization is the tenant boundary; no separate Workspace entity exists.

Stage 2 implementation is published and hosted PostgreSQL CI passed. Final browser acceptance is pending. Real external-provider sign-in remains blocked on provider configuration. See [Stage 2 completion report](STAGE_2_COMPLETION_REPORT.md) and [security/setup guide](docs/STAGE2_SECURITY.md). Stage 3 has not started.

## Stack and layout

| Area | Technology / location |
|---|---|
| Frontend | Next.js 16, React 19, TypeScript — `apps/web` |
| Backend | NestJS 12, TypeScript, ESM — `apps/api` |
| Database | PostgreSQL 17, Prisma 7 — `packages/database` |
| Tests | Node test runner, HTTP smoke, embedded PGlite and PostgreSQL constraint checks — `tests` |
| CI | GitHub Actions with PostgreSQL 17 service — `.github/workflows/ci.yml` |
| Design and checkpoints | `docs`, `PROJECT_STATE.md`, `SESSION_LOG.md` |

The frontend forwards same-origin `/v1` requests to NestJS. Health and metadata bypass authentication and database access. Private APIs authenticate the session and verify organization membership on every scoped request. Projects/tasks are schema foundations only.

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
npm run db:generate
npm run db:deploy
npm run dev
```

For a downloaded ZIP, open Terminal in its extracted project folder instead of cloning. Open http://localhost:3000. API endpoints are http://localhost:4000/v1/health and http://localhost:4000/v1/info. Stop development servers with Control-C.

| Variable | Loaded by | Purpose |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | Web `.env.local` | Optional health base; empty defaults to same-origin `/v1` |
| `API_INTERNAL_URL` | Web `.env.local` | Server-only Nest origin, default `http://127.0.0.1:4000`; rebuild after changing |
| `WEB_ORIGIN` | API `.env` | Exact public frontend origin for CSRF and callback |
| `SESSION_SECRET` | API `.env` | Generate locally with `openssl rand -hex 32` |
| `OIDC_ISSUER`, `OIDC_CLIENT_ID`, `OIDC_CLIENT_SECRET` | API `.env` | Registered OIDC confidential client; never commit secrets |
| `TRUST_PROXY` | API `.env` | Set to 1 only behind a controlled single-hop TLS proxy |
| `PORT` | API `.env` | API listening port, default 4000; integer 1–65535 |
| `CORS_ORIGINS` | API `.env` | Comma-separated exact HTTP(S) origins without paths; default `http://localhost:3000` |
| `DATABASE_URL` | API and database package `.env` | Same PostgreSQL connection string for runtime and Prisma commands |

Before starting authenticated development, start the database and configure the OIDC client as described in [Stage 2 security/setup](docs/STAGE2_SECURITY.md). The local callback is `http://localhost:3000/v1/auth/callback`. Without these settings only foundation health is available.

Root `.env` is not a substitute for each workspace's environment file. Never commit actual `.env` files. Example database credentials are for local development only. Changing a public frontend environment variable requires rebuilding a production frontend.

## Database setup and committed migration

```bash
docker compose up -d postgres
npm run db:validate
npm run db:generate
npm run db:deploy
npm run status -w @worksphere/database
```

`db:deploy` applies both committed migrations without creating another migration. `db:migrate` is an authoring command for deliberate future schema changes, not the setup command. Docker binds PostgreSQL to localhost and retains development data in a named volume. `docker compose down` stops the database without deleting that volume.

For constraint checks against a **disposable, migrated test database**, explicitly export its connection string and run:

```bash
DATABASE_URL='postgresql://worksphere:worksphere_dev_only@127.0.0.1:5432/worksphere?schema=public' DATABASE_TEST_MODE=postgres npm run test:database
```

Never direct tests at an unrelated or production database. Fixtures are inserted inside a transaction and rolled back. Without `DATABASE_TEST_MODE=postgres`, the database test creates an isolated in-memory PGlite database, applies the migration SQL, and destroys it afterwards. This embedded test does not prove Prisma network connectivity or `migrate deploy` against standalone PostgreSQL.

## Verification and production startup

```bash
npm run verify:stage2
```

The foundation part of the fail-fast gate runs 11 source/contract tests, both TypeScript checks and production builds, Prisma validation and generation, 17 configuration/runtime failure tests, 8 embedded database tests, and HTTP smoke checks. Smoke tests start and stop built applications on ports 44671 and 44672. Leave these ports available. If `DATABASE_TEST_MODE=postgres` is set, database checks instead use the explicitly configured disposable PostgreSQL database.

Stage 2 then runs signed OIDC code-flow, session, CSRF, authorization and invitation HTTP integration tests against a disposable PostgreSQL database. `STAGE2_TEST_DATABASE_URL` is required for this suite. Leave ports 3000, 4000, 44683 and 44684 free. Create a separate test database, apply both migrations with its `DATABASE_URL`, then export that URL as `STAGE2_TEST_DATABASE_URL`. The foundation gate alone is available as `npm run verify:stage1`. Never use a production database: Stage 2 tests create persistent fixtures.

Individual commands: `npm test`, `npm run typecheck`, `npm run build`, `npm run test:config`, `npm run test:database`, and `npm run smoke`. Configuration and smoke checks require built applications. Production startup uses separate terminals:

```bash
npm run start -w @worksphere/api
npm run start -w @worksphere/web
```

The local gate does not deploy a migration through Prisma, inspect a browser, publish GitHub sources, or validate hosted CI. Those are separate acceptance requirements.

## Hosted CI

On pushes to `main`, pull requests, or manual dispatch, CI installs from the lockfile with `npm ci`, runs the local gate, deploys both migrations into a PostgreSQL 17 service, repeats deployment to check idempotency, checks migration status, and runs all 8 database tests against that service, then runs the Stage 2 integration suite on PostgreSQL. A configured workflow is not evidence of a passing hosted run; record its actual URL, conclusion and commit in the completion report.

## Scope and security limits

Organization data and memberships are real; project/task metrics remain samples. Application-level authorization applies to the Stage 2 organization APIs. Future project/task endpoints must enforce their own tenant membership. No PostgreSQL row-level security is configured. Health is liveness, not database readiness. Invitations are shared manually; email delivery and ownership transfer are outside this stage.

Stage 3 remains gated by [NEXT_STAGE_PROMPT.md](NEXT_STAGE_PROMPT.md). Public production deployment remains Stage 13.

## Build and browser verification notes

A repeated production build reproduced a Turbopack persistent-cache reopen error. The supported `experimental.turbopackFileSystemCacheForBuild: false` setting disables that optional cache; two repeat builds then passed. This does not disable compilation or checks.

Live production-server browser QA passed on October 25, 2026 (Asia/Kolkata). Next.js and NestJS ran together behind a temporary same-origin QA reverse proxy; NEXT_PUBLIC_API_URL was set to an empty string at build time. The browser displayed API connected on desktop, 390px mobile and 768px tablet layouts. Document width/scrollWidth matched at 1348/1348, 375/375 and 753/753 respectively. No application console errors were observed; one browser-extension metadata error was unrelated. The browser also displayed the real NestJS health JSON. See docs/BROWSER_QA.md for reproduction and scope.
