# Continuation / Stage 3 gate

First finish Stage 2 acceptance. Read PROJECT_STATE.md, STAGE_2_COMPLETION_REPORT.md, docs/STAGE2_SECURITY.md and SESSION_LOG.md. Inspect main and preserve existing work.

1. Verify hosted CI on the latest commit, including both migrations and all Stage 2 tests against PostgreSQL 17.
2. Preserve the passing PostgreSQL-backed Chromium suite and screenshot evidence; never use PGlite socket multiplexing for acceptance.
3. Complete live external OIDC client configuration and real-account browser login/logout using secrets supplied privately through the environment, never committed. Desktop/tablet/mobile fixture-based browser acceptance has passed.
4. Record verified implementation SHA and CI run. Do not mark Stage 2 complete while acceptance is blocked.

Only after Stage 2 is accepted, and the user authorizes Stage 3, implement tenant-scoped project CRUD, tasks, Kanban, assignments and due dates. Reuse Organization and server membership/role checks; never trust client-supplied tenant IDs. Preserve health independence, authentication, migrations, sample-data labels and CI. Include cross-tenant tests for every new resource. Do not begin Stage 4.
