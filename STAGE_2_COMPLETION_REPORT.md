# Stage 2 verification checkpoint

Updated October 27, 2026 (Asia/Kolkata). Stage 2 is not yet accepted; Stage 3 has not started.

Implemented OIDC Authorization Code + PKCE/state/nonce, verified identity mapping, PostgreSQL sessions, CSRF checks, protected pages, organizations, membership roles, invitations and authorization tests. Stage 1 foundation and health contract are preserved.

## Verified source and hosted CI

Implementation SHA: `438b2aca90e5d376edd4066635e8306bbfd4d56a`.

Hosted run: https://github.com/harshvtomar/worksphere-ai/actions/runs/40405606987 — completed, success. This run includes the concurrency regression and late-session-error handling fix. Later documentation/test-fixture commits must also pass CI; their final SHA/run are recorded in the handoff.

## Verification status

| Requirement | Status / evidence |
|---|---|
| Locked dependency installation | Passed locally: 357 packages; hosted npm ci passed |
| Next.js / NestJS production builds | Passed locally and hosted |
| TypeScript / Prisma generation and validation | Passed locally and hosted |
| Foundation source checks | Passed: 11, 0 failures |
| Configuration failure checks | Passed: 17, 0 failures |
| Foundation database constraints | Passed: 8 embedded and 8 standalone PostgreSQL checks, 0 failures |
| OIDC/session/CSRF/authorization/invitations | Passed on PostgreSQL: 21 subtests plus parent, 22 reported, 0 failures |
| Frontend/backend HTTP smoke | Passed in hosted foundation gate |
| PostgreSQL migration and repeat deployment | Passed: both migrations on clean PostgreSQL 17; no pending migrations |
| Concurrent organization panels / invitation acceptance | Passed on standalone PostgreSQL |
| Browser | Partial: sign-in, protected dashboard, organization creation, invitation generation and wrong-email denial observed; final responsive check pending |
| Publication / hosted CI | Passed for implementation SHA/run above |
| Real external OAuth provider | Blocked: issuer/client configuration and real-account test not supplied |
| Documentation / next-stage gate | Updated; Stage 3 remains blocked |

The expanded local concurrency test exposed an API crash when session persistence failed after headers were sent. The middleware now delegates late errors to Express. The underlying PGlite socket multiplexer emits PostgreSQL errors `34000` and `26000` (missing portal/prepared statement) under concurrent client queries. The same expanded tests passed on standalone PostgreSQL in CI. Stage 2 integration tests now explicitly require `STAGE2_TEST_DATABASE_URL` instead of treating PGlite multiplexing as acceptance evidence. The embedded fallback is restricted to the disposable browser preview, whose final concurrency/responsive QA remains incomplete.

The browser observed mobile/tablet frames without horizontal document overflow, but request errors/loading states prevented acceptance of the completed responsive organization screen. Do not interpret those measurements as a full responsive pass. No final application-console clearance is claimed.

No real tokens, credentials or customer data are included. Fixture credentials belong only to disposable test services. See docs/STAGE2_SECURITY.md for policy, setup and limitations. Stage 2 is **not 100% complete** while the browser and external-provider checks remain outstanding.

## External-provider completion

Register an OIDC confidential client with code flow and callback `http://localhost:3000/v1/auth/callback` (or the exact HTTPS deployment origin). Configure `OIDC_ISSUER`, `OIDC_CLIENT_ID`, `OIDC_CLIENT_SECRET`, `SESSION_SECRET`, `WEB_ORIGIN` and `DATABASE_URL` in the ignored API environment. Do not paste secrets into chat or commit them. Verify real-account login, logout, expiry, protected pages and invitations using a provider that supplies verified email claims.
