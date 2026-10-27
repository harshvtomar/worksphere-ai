# Stage 2 browser acceptance

The automated browser suite drives real Chromium, built Next.js/NestJS servers and standalone PostgreSQL 17. No API response interception, mocked sessions or PGlite socket fallback is used. The isolated OIDC provider performs signed Authorization Code exchanges; it is a synthetic identity fixture and does not satisfy external-account acceptance.

## Reproduce

Use a fresh disposable PostgreSQL 17 database, not an existing development or production database. Both HTTP and browser suites insert test data and require unique fixture names.

```bash
npm ci
# Export DATABASE_URL for the fresh disposable PostgreSQL 17 database.
export STAGE2_TEST_DATABASE_URL="$DATABASE_URL"
npm run verify:stage1
npm run db:deploy
npm run test:stage2
npx playwright install --with-deps chromium
npm run test:browser
```

On Apple Silicon with Docker Desktop, the repository's PostgreSQL image supports ARM64. Create a separate test database in the container and use its URL. Do not delete the development volume to run tests. The runtime needs ports 3000, 4000 and 44683 free. The browser suite checks the database's major version is 17.

The GitHub workflow provisions a fresh PostgreSQL 17 service, deploys both migrations, runs all regressions, installs Chromium and executes `test:browser`. It uploads `stage2-browser-evidence` with a 14-day retention period. The report contains screenshots and a sanitized list of API paths, methods and response statuses. Query strings, authorization codes, cookie values and invitation tokens are not included in network evidence.

## Coverage

At desktop (1440×900), tablet (768×1024) and mobile (390×844):

- Unauthenticated protected-route redirect and OIDC login to the protected dashboard.
- Organization creation, persistence across reload, member listing and duplicate-slug error.
- Actual row-lock-delayed invitation creation verifies the disabled pending button without mocking a response.
- Wrong-email invitation rejection, matching-email acceptance and replay rejection.
- Member view lacks management controls; owner role changes persist in PostgreSQL.
- Database-expired session redirects to login; logout removes protected-page access.
- Document overflow checks, screenshots, no uncaught page errors, no unexpected console errors and no server-error responses.

Existing HTTP tests separately cover CSRF, cross-tenant attempts, owner/admin/member enforcement, invitation expiry/revocation, absolute/idle session expiration and concurrent acceptance.

## External-provider gate

These tests cannot replace real Google/Auth0 account login. The separate external-provider acceptance remains blocked until a confidential OIDC client is registered, secrets are supplied privately to the runtime, and the user completes login/consent. The local callback is exactly `http://localhost:3000/v1/auth/callback`. Stage 3 must remain gated until that test passes.
