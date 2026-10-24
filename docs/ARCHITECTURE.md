# WorkSphere AI — Architecture Decision Record (Stage 1)

## Purpose

Portfolio-level enterprise work management product. Primary user is an organization member with one or more project roles. UX targets desktop and mobile; public-facing demo will be deployed once stable.

## Design decisions

1. **Monorepo with npm workspaces**: one repository, two independently deployable apps, and a schema package. Keeps Mac setup simple without requiring global pnpm tooling.
2. **Next.js 16 App Router and React 19**: server-friendly responsive frontend; preview uses only static illustrative data. No protected routes are implemented in Stage 1.
3. **NestJS 12 API**: provides a stable modular backend boundary with versioned `/v1` route prefix. Health check verifies API is reachable, not database or auth.
4. **PostgreSQL + Prisma**: relational tenant / membership / project / task model. Prisma 7 datasource configuration is stored in `prisma.config.ts`, while the schema declares provider and models.
5. **REST first**: WebSocket gateway, background queue and event/outbox pattern are later-stage architectural extensions, not active services today.
6. **Security by explicit tenant context**: all future organization-scoped API operations must authenticate the caller and verify membership and resource ownership. Never trust an `organizationId` from the request body on its own.
7. **Dev process**: localhost:3000 (web), localhost:4000 (api), localhost:5432 (PostgreSQL when started separately); no credentials in Git.

## Logical architecture

```text
                        Browser
                           │
                           ▼
                Next.js Web App :3000
             public mock dashboard only
                           │
           GET /v1/health  │  (CORS allowlist)
                           ▼
                 NestJS API :4000
              health + info only today
                           │
             (planned, not connected)
                           ▼
                  PostgreSQL :5432
               Prisma schema + migration

Stage 2: auth -> membership -> organization-aware CRUD
Stage 4: socket events -> realtime fanout
Stage 5: durable queue -> workflow execution
Stage 7: LLM provider -> prompt/policy boundary
Stage 8: payment gateway -> webhook validation
```

## Database entity relationships

```text
User 1..N Membership N..1 Organization
Organization 1..N Project 1..N Task 1..N Comment
User 1..N Project (creator)
User 1..N Task (reporter) / Task (optional assignee)
User 1..N Comment
Organization 1..N AuditEvent
User 0..N AuditEvent (actor)
```

All domain IDs use CUID strings. Membership uses a unique `(userId, organizationId)` constraint. Project keys are unique per organization (not globally). Project deletion cascades to tasks/comments; user deletion cascades membership records but does not implicitly delete owned organizations/projects. These deletion semantics must be reviewed with account closure requirements in Stage 2.

## Threat model and future authorization requirements

- **Cross-tenant IDOR**: a malicious user guesses another organization's project ID. Mitigation: every lookup scopes by authenticated organization membership, with negative cross-org tests.
- **Privilege escalation**: only owner/admin may invite or remove members. Enforce on server and test, not only via hidden UI buttons.
- **Session theft**: use well-reviewed Auth.js/OIDC with secure, httpOnly cookies and CSRF handling; implement in Stage 2.
- **Audit integrity**: write activity records on privileged actions, mark immutable to app users; implement with transactions in Stage 6.
- **Webhook forgery**: future payment and automation endpoints must validate signatures, idempotency and replay limits.
- **Prompt injection**: future LLM tool calls must limit tool permissions and filter sources; model outputs never grant authorization.
- **CORS does not authenticate users**: an allowlisted origin is not a security boundary for private data.

## Release strategy

- Stage 1: local foundation, static dashboard preview, compiled API, schema migration, runtime/database checks and GitHub CI verification.
- Stage 2: authenticated organizations and role permissions, with new migrations only as required.
- Stage 3: tasks/projects persist to DB with owner scope and tests.
- Stage 4+: collaborating systems, automations, analytics, monetization, integrations.
- Stage 13: production deploy only after CI, smoke tests, policies and secrets review.

## Known gaps

Local installation, TypeScript, production builds, Prisma validation/generation, source/runtime tests, embedded PostgreSQL schema checks and HTTP smoke checks have passed. Sources are published; hosted CI with standalone PostgreSQL 17 migration and constraint tests passed. Live Next/Nest browser-to-backend connectivity and desktop/mobile/tablet layouts passed through a temporary same-origin QA proxy. See `STAGE_1_COMPLETION_REPORT.md` for current evidence.

Organization is the current tenant grouping; there is no separate Workspace entity. Foreign keys do not ensure that creators, reporters, assignees, comment authors or audit actors belong to the resource organization. No row-level security is present. Stage 2 must enforce tenant membership in authenticated data access before private data is exposed.
