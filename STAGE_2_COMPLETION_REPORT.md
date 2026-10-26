# Stage 2 verification checkpoint

Updated October 27, 2026 (Asia/Kolkata). Stage 2 is not yet accepted; Stage 3 has not started.

Implemented OIDC Authorization Code + PKCE/state/nonce, verified identity mapping, PostgreSQL sessions, CSRF checks, protected pages, organizations, membership roles, invitations and authorization tests. Stage 1 foundation and health contract are preserved.

## Verification status

| Requirement | Status / evidence |
|---|---|
| Next.js / NestJS production builds | Passed locally |
| TypeScript / Prisma generation and validation | Passed locally; hosted rerun pending |
| Configuration failure checks | Passed: 17 tests, 0 failures |
| Foundation source / database / smoke | Previously passed; final hosted rerun pending |
| OIDC, session and authorization integration | Single-request suite passed; expanded concurrency validation pending on PostgreSQL |
| Browser | Sign-in, protected dashboard, organization creation, invitation generation and wrong-email denial observed; concurrent responsive check unresolved |
| PostgreSQL migrations | Stage 2 hosted verification pending |
| Publication / hosted CI | This checkpoint requests hosted PostgreSQL validation; record result after completion |
| Real external OAuth provider | Blocked: issuer/client configuration and real-account test not supplied |

The expanded local concurrency test exposed an API crash when session persistence failed after headers were sent. The middleware now delegates late errors to Express. The underlying PGlite socket multiplexer emits PostgreSQL errors `34000` and `26000` (missing portal/prepared statement) under concurrent client queries. This is an unresolved local test-infrastructure limitation, not a passing concurrency result. The same tests must pass against CI's standalone PostgreSQL 17 service before acceptance.

No real tokens, credentials or customer data are included. Fixture credentials belong only to disposable test services. See docs/STAGE2_SECURITY.md for policy, setup and limitations.

## External-provider completion

Register an OIDC confidential client with code flow and callback `http://localhost:3000/v1/auth/callback` (or the exact HTTPS deployment origin). Configure `OIDC_ISSUER`, `OIDC_CLIENT_ID`, `OIDC_CLIENT_SECRET`, `SESSION_SECRET`, `WEB_ORIGIN` and `DATABASE_URL` in the ignored API environment. Do not paste secrets into chat or commit them. Verify real-account login, logout, expiry, protected pages and invitations using a provider that supplies verified email claims.
