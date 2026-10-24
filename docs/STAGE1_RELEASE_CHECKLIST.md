# Stage 1 release checklist

Repository: https://github.com/harshvtomar/worksphere-ai

Use the [completion report](../STAGE_1_COMPLETION_REPORT.md) for current evidence. Do not claim full completion until all acceptance requirements are satisfied.

- [x] Existing foundation preserved; no Stage 2 implementation.
- [x] Dependency installation and committed lockfile.
- [x] TypeScript and both production builds.
- [x] Prisma validation, generation and committed migration SQL.
- [x] 11 source tests, 14 runtime tests and 8 embedded database tests.
- [x] Frontend/backend HTTP smoke checks.
- [x] PostgreSQL service CI and repeat migration deployment configured.
- [x] Public target repository created.
- [x] Reproducible setup and continuation documentation.
- [x] Clean `npm ci` (301 packages) and local verification passed.
- [x] Live production-server browser QA: API connected, desktop/mobile/tablet layouts and console inspection passed; previous offline-state observation retained.
- [x] Verified sources, lockfile, migration and workflow published.
- [x] Hosted CI passed, including standalone PostgreSQL deployment and 8 constraint tests.
- [x] Final tested source SHA and Actions run URL recorded.

Before committing, inspect staged files: exclude node_modules, actual environment files, credentials, generated Prisma output, build output and caches. Do not overwrite unrelated repository work. Public production deployment is a later stage; GitHub source publication is part of Stage 1.
