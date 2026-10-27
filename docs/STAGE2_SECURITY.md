# Stage 2 security and operations

## Identity and sessions

The API uses `openid-client` for OIDC Authorization Code with S256 PKCE, state and nonce. It validates the ID token (including its signature), issuer and audience through the library. Only identities with an explicitly verified email may sign in. Identity keys are `(issuer, subject)`; matching an email does not silently link another identity. Provider access/refresh tokens are not saved or sent to the browser. No application passwords are collected.

`express-session` stores an opaque signed session ID in an HttpOnly, SameSite=Lax cookie; `connect-pg-simple` stores the session in PostgreSQL. Login regenerates the session ID. Sessions have a 30-minute idle lifetime and an 8-hour absolute lifetime. Logout destroys the server record and clears the cookie. This signs out of WorkSphere; it does not terminate the identity provider's global session. Sessions need a persistent database; no in-memory production fallback exists.

All state-changing API requests, including login/logout, require the exact configured `Origin` and a synchronizer CSRF token held in the server session. GET endpoints do not perform organization mutations. The OIDC GET callback consumes its one-use, ten-minute state/nonce/PKCE flow. Private API responses use `Cache-Control: no-store`. No session credential is stored in localStorage.

Production requires `NODE_ENV=production`, HTTPS `WEB_ORIGIN`, a random `SESSION_SECRET` of at least 32 characters, and `DATABASE_URL`. Production cookies use `__Host-ws.sid`, `Secure`, `/`, and no Domain. Use `TRUST_PROXY=1` only when a controlled single-hop TLS proxy is the exclusive API ingress; direct untrusted access to that ingress must be blocked. All public `/v1` traffic is forwarded through Next.js; `API_INTERNAL_URL` is server-only. Rebuild Next after changing its rewrite destination.

The API remains startable without auth configuration in non-production for foundation health checks; authenticated functionality then returns 503. `/v1/health` and `/v1/info` bypass session/database middleware and remain database-independent. Database failure never creates an authenticated fallback.

## Authorization policy

| Capability | Owner | Admin | Member |
|---|---|---|---|
| View own organization/members; select active organization | Yes | Yes | Yes |
| Invite Member | Yes | Yes | No |
| Invite Admin | Yes | No | No |
| Change Member/Admin roles | Yes | No | No |
| Remove Member | Yes | Yes | No |
| Remove Admin | Yes | No | No |
| Remove or demote Owner | No | No | No |
| Revoke invitations | Any role invitation | Member invitations | No |

Every scoped API request verifies membership from the database. Nonmembers get 404 without tenant details. An active organization in a session is a selection preference, never an authorization grant. Membership IDs must also belong to the requested organization. The owner cannot be removed/demoted via these endpoints; ownership transfer and organization deletion are deliberately absent.

Authorization-sensitive operations use transactions and lock the organization row. Membership revocation and role changes therefore serialize with invitations and membership mutations. This prevents stale roles from authorizing a concurrent write. Stage 3 must reuse this tenant boundary for project/task access rather than trusting foreign keys alone.

## Invitations

Only the cryptographic hash of the random 256-bit invitation token is stored. The plaintext link is returned once to its authorized creator; it uses a URL fragment to keep the token out of server URL logs/referrers. Share the link directly with the intended teammate. There is no email delivery integration in Stage 2.

Acceptance requires an authenticated verified email matching the canonical invited address, an unexpired and unrevoked token, no previous acceptance and a currently authorized inviter. Expiry is 48 hours. Acceptance and membership creation occur in one transaction. Reissuing revokes outstanding invitations for that email. An Admin cannot replace a pending Admin invitation. Invalid role values and extra input fields are rejected. Accepting an invitation never upgrades an existing member.

## Local setup on Apple Silicon

Use Node 22.12+ and Docker Desktop for Apple Silicon. Run `npm ci`, copy the per-workspace `.env.example` files, and start `docker compose up -d postgres`. Set the same database URL in API and database package env files. Generate a session secret locally with `openssl rand -hex 32`. Set the OIDC issuer URL, client ID and client secret in `apps/api/.env` only.

Register the exact callback `http://localhost:3000/v1/auth/callback` for local development, with OIDC code flow and scopes `openid email profile`. Provider accounts must expose `email_verified: true`. Use an OIDC provider such as Google, Auth0, Entra ID configured to supply these verified claims, or a local OIDC server. Ordinary GitHub OAuth alone is not an OIDC end-user provider for this implementation.

Run `npm run db:generate`, `npm run db:deploy`, then `npm run dev`. Visit `/login`, authenticate, and open `/organizations`. Public `/` retains the Stage 1 sample dashboard; `/dashboard` and `/organizations` are protected both before rendering and by backend authorization. Real organizations/members persist; project/task metrics remain labeled sample data.

## Verification and boundary

`npm run verify:stage2` runs the foundation gate then integration tests against a disposable PostgreSQL database specified by `STAGE2_TEST_DATABASE_URL` and a local `oidc-provider` fixture. Apply both migrations to that test database first. The suite fails explicitly if its database URL is absent. This exercises real HTTP redirects, signed ID tokens, code exchange, PKCE, session persistence and actual Prisma queries. It is not a claim of successful live Google/Auth0/Entra sign-in. CI repeats the integration suite against a migrated standalone PostgreSQL 17 service using `STAGE2_TEST_DATABASE_URL`.

The test identity provider uses synthetic accounts and an in-memory store, intentionally. Application code never imports the test fixtures and has no bypass login route. `scripts/preview-stage2.mjs` is a disposable QA supervisor, not a deployment entry point. Its browser-facing provider routing retains the same protocol and signing checks. It can use an embedded PGlite fallback for limited manual previews only; that socket multiplexer has demonstrated missing prepared statements/portals under concurrency and is not accepted as Stage 2 database verification.

External provider configuration and a real-account browser sign-in/sign-out remain a separate acceptance check until performed. Production deployment, email delivery, centralized rate limits, provider-wide logout and account recovery/ownership transfer are not implemented here.

References: https://github.com/panva/openid-client ; https://expressjs.com/en/resources/middleware/session/ ; https://github.com/voxpelli/node-connect-pg-simple
