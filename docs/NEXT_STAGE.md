# Stage 2 handoff

Stage 2 is not started. Follow [the exact starting prompt](../NEXT_STAGE_PROMPT.md) only after [Stage 1 acceptance](../STAGE_1_COMPLETION_REPORT.md) is complete.

Stage 2 covers proven authentication, secure sessions, organizations, invitations and server-enforced owner/admin/member policies. Existing organization foreign keys do not implement authorization. There is no independent Workspace model.

Before coding, inspect current remote `main`, its hosted CI evidence and project checkpoint documents; run `npm ci`, `npm run verify:stage1`, and apply committed migrations to an isolated PostgreSQL database with `npm run db:deploy`.

Acceptance requires unauthenticated and cross-tenant rejection, privilege-escalation prevention, safe invitation handling, migration replayability, session/CSRF checks, passing hosted CI and a recorded source SHA. Preserve Stage 1 liveness/metadata and explicit sample-data labeling. Task/project CRUD remains Stage 3.
