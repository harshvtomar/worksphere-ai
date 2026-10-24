# WorkSphere AI — Stage 2 starting prompt

Use this prompt only after the Stage 1 completion report records all required acceptance checks as passed. If Stage 1 is still pending, finish its specific blockers first and do not begin Stage 2.

---

Continue WorkSphere AI from https://github.com/harshvtomar/worksphere-ai. Do not restart or overwrite completed work. Scope this session to Stage 2: authentication, organization membership and server-side role authorization. Do not implement later-stage task CRUD, real-time features, AI or billing.

Before editing:

1. Inspect current remote `main`, repository instructions and the current commit.
2. Read README.md, PROJECT_STATE.md, SESSION_LOG.md, STAGE_1_COMPLETION_REPORT.md, docs/ARCHITECTURE.md and docs/STAGE_TRACKER.md.
3. Confirm a successful hosted Stage 1 Actions run for its recorded source commit, including standalone PostgreSQL migration deployment/status and constraint tests. If missing, complete Stage 1 and report its evidence before proceeding.
4. Run `npm ci` and `npm run verify:stage1`. Preserve the health/info contracts and dashboard preview.
5. Start an isolated PostgreSQL database and use `npm run db:deploy` to apply existing migrations. Never reset an unrelated database.

Implement proven OIDC/OAuth authentication and secure sessions, sign-in/sign-out, protected frontend routes and authenticated API requests. Do not invent password cryptography. Add organization creation/selection, invitations/acceptance and membership listing, with owner/admin/member policies enforced in the API.

Treat Organization as the current tenant boundary. There is no separate Workspace entity; explicitly justify and migrate any necessary schema change. Existing foreign keys do not prove user membership within a project/task organization. Enforce membership and ownership for every scoped request and future data write. Never trust a client-provided organization ID by itself.

Add meaningful tests: unauthenticated calls rejected, nonmember/cross-tenant access denied without disclosure, no member-to-owner escalation, invitation ownership/expiry/replay handling, session/CSRF policy, and migrations replayable on a clean database. Keep `/v1/health` database-independent; add readiness separately when database connectivity is introduced.

Use environment templates and keep secrets out of Git. Update documentation and evidence, publish only verified changes, observe actual hosted CI, and record commit SHA and run URL. Report passed/failed/pending acceptance criteria honestly. Keep sample-data labels until corresponding data actually persists. Do not start Stage 3.
