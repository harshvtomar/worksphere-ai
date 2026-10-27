# Stage 2 verification checkpoint

Updated October 27, 2026 (Asia/Kolkata). Stage 2 is not yet accepted; Stage 3 has not started.

Implemented OIDC Authorization Code + PKCE/state/nonce, verified identity mapping, PostgreSQL sessions, CSRF checks, protected pages, organizations, membership roles, invitations and authorization tests. Stage 1 foundation and health contract are preserved.

## Verified browser checkpoint

Browser-tested implementation SHA: `56801e17cd8b2690c2882cdbba64f8bb61ac558a`.

Successful hosted run: https://github.com/harshvtomar/worksphere-ai/actions/runs/40487980283. All three responsive Chromium journeys passed against standalone PostgreSQL 17 and actual Next.js/NestJS builds. The evidence artifact is `stage2-browser-evidence` (ID 12726295792, SHA-256 `13c785e171728a503a52154e798c8097603d36f91ee1f0717641b462838bf044`). Screenshots from that run are preserved under `docs/evidence/stage2/`. A subsequent checkpoint strengthens registration evidence by giving browser tests their own fresh database; its final SHA/run are recorded in the handoff.

## Acceptance matrix

| Requirement | Status / evidence |
|---|---|
| Locked install, TypeScript, Next/Nest production builds | Passed in hosted regression |
| Prisma generation/validation and both migrations | Passed against clean PostgreSQL 17; repeat deployment passed |
| Source/configuration tests | Passed: 11 + 17; zero failures |
| Database constraint tests | Passed: 8 embedded + 8 PostgreSQL; zero failures |
| HTTP OIDC/session/CSRF/authorization/invitation tests | Passed: 22 reported (21 subtests + parent); zero failures |
| Frontend/backend health, metadata, CORS and homepage smoke | Passed |
| Actual Chromium desktop/tablet/mobile journeys | Passed: 3; zero failures |
| Organization/member/invitation UI and persisted changes | Passed |
| Wrong-email/replay errors, role controls, expiry and logout UI | Passed |
| Loading state and duplicate-slug error | Passed using real database responses and a temporary row lock |
| Browser console/network and document overflow | Passed: no uncaught page errors, unexpected console errors, API 5xx or horizontal document overflow |
| Screenshots | 18 captured; three organization screenshots reviewed and preserved in repository |
| Publication and hosted CI | Passed for checkpoint above; final handoff records latest verification |
| Real external OIDC client configuration | Blocked: no confidential client supplied; connected browser context unavailable |
| Real external-account login/logout | Blocked; synthetic-provider tests are not a substitute |
| Overall Stage 2 acceptance | Pending external-provider configuration and real-account verification |

The local Work runtime cannot launch Docker/PostgreSQL and cannot switch from its sole mapped root user. Browser acceptance therefore ran in GitHub Actions using a fresh standalone PostgreSQL 17 service. No PGlite socket fallback or mocked browser responses were used. The historical PGlite concurrency issue is no longer the browser acceptance blocker.

The first browser attempt stopped on a test-locator ambiguity: Next.js's accessibility route announcer also uses `role=alert`. The assertion was narrowed to the visible application error; all three journeys then passed. No application behavior or authorization check was weakened. Existing Stage 1 and Stage 2 checks remain enabled.

Google's public discovery endpoint was reachable and advertised issuer `https://accounts.google.com`, code flow, `openid email profile`, and client-secret token authentication. This only verifies protocol compatibility, not client registration or a real login.

## Remaining user action

Open this chat in the browser containing the connected ChatGPT extension, sign into Google Cloud Console and select the dedicated WorkSphere project. The Browser connector currently reports that it requires the originating browser context. After that connection/login step, the confidential web client can be registered with the exact local callback below and secrets entered privately into the runtime. Do not send credentials in chat. Stage 3 remains unstarted.

## External-provider completion

Register an OIDC confidential client with code flow and callback `http://localhost:3000/v1/auth/callback` (or the exact HTTPS deployment origin). Configure `OIDC_ISSUER`, `OIDC_CLIENT_ID`, `OIDC_CLIENT_SECRET`, `SESSION_SECRET`, `WEB_ORIGIN` and `DATABASE_URL` in the ignored API environment. Do not paste secrets into chat or commit them. Verify real-account login, logout, expiry, protected pages and invitations using a provider that supplies verified email claims.
