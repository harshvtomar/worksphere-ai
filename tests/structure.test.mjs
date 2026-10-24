import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { healthPayload, infoPayload } from "../apps/api/src/health/health.contract.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (file) => readFileSync(path.join(root, file), "utf8");

test("workspace has the required code and documentation", () => {
  for (const relative of ["apps/web/app/page.tsx", "apps/web/app/globals.css", "apps/api/src/main.ts", "apps/api/src/health/health.controller.ts", "packages/database/prisma/schema.prisma", "docs/ARCHITECTURE.md", "docs/STAGE_TRACKER.md", "README.md"]) {
    assert.ok(existsSync(path.join(root, relative)), `${relative} missing`);
  }
});

test("root workspaces and scripts are configured", () => {
  const pkg = JSON.parse(read("package.json"));
  assert.deepEqual(pkg.workspaces, ["apps/*", "packages/*"]);
  assert.ok(pkg.scripts.dev && pkg.scripts.build && pkg.scripts.typecheck);
});

test("API health contract is stable", () => {
  assert.deepEqual(healthPayload(), { status: "ok", service: "worksphere-api", version: "0.1.0" });
  assert.equal(infoPayload().stage, 1);
});

test("database defines the tenant and membership boundaries", () => {
  const schema = read("packages/database/prisma/schema.prisma");
  for (const name of ["User", "Organization", "Membership", "Project", "Task", "Comment", "AuditEvent"]) assert.match(schema, new RegExp(`model ${name} \{`));
  assert.match(schema, /@@unique\(\[userId, organizationId\]\)/);
  assert.match(schema, /@@unique\(\[organizationId, key\]\)/);
});

test("secrets and generated output are excluded", () => {
  const ignore = read(".gitignore");
  assert.match(ignore, /^\.env$/m);
  assert.match(ignore, /node_modules\//);
  assert.match(ignore, /packages\/database\/generated\//);
});

test("API limits CORS to configured origins", () => {
  const source = read("apps/api/src/main.ts");
  assert.match(source, /allowedOrigins\.includes\(origin\)/);
  assert.doesNotMatch(source, /origin:\s*true/);
});
