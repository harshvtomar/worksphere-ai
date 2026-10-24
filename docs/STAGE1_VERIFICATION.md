# Stage 1 verification

See [the completion report](../STAGE_1_COMPLETION_REPORT.md) for dated results, pending acceptance requirements, commit SHA and hosted run evidence.

## Reproduce local checks

Use Node 22.12+ or Node 24, run `npm ci`, then `npm run verify:stage1` from the repository root. The gate stops on failure and runs:

1. 11 source/contract tests.
2. API and web TypeScript checks.
3. API and web production builds.
4. Prisma schema validation and client generation.
5. 14 built-API invalid-configuration/missing-contract tests.
6. 8 database schema/constraint tests (isolated PGlite by default).
7. Real HTTP smoke tests on built API/web applications, including CORS and rendered content.

Smoke ports are 44671 and 44672. Runtime failure tests use isolated build copies for missing-file simulation and terminate timed-out processes. No browser layout or console result is implied by HTTP checks.

## Standalone PostgreSQL checks

Start the local development PostgreSQL service with Docker Compose and copy the database environment example. Run `npm run db:deploy`, repeat it, then run `npm run status -w @worksphere/database`. On a disposable migrated database, set `DATABASE_URL` and `DATABASE_TEST_MODE=postgres` before `npm run test:database`.

Hosted CI performs this sequence against PostgreSQL 17 after the local gate. Default PGlite tests execute migration SQL but do not prove Prisma network connectivity or migration tracking. Observe the actual GitHub Actions conclusion before claiming hosted success.

## Browser checks

Start both apps and inspect desktop and narrow-screen layouts, sample-data labeling, the online/offline API indicator and console errors. Record what was actually observed. Static-mirror desktop/mobile/tablet QA is recorded in the completion report, including its limitation: the mirror had no backend, so online API connectivity was not tested through the browser.
