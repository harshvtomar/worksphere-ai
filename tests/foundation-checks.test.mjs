import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const source = (pathName) => readFileSync(path.join(root, pathName), "utf8");

test("API build explicitly copies dependency-free .mjs health contract to dist", () => {
  const pkg = JSON.parse(source("apps/api/package.json"));
  assert.match(pkg.scripts.build, /copy-runtime-files\.mjs/);
  assert.match(source("apps/api/scripts/copy-runtime-files.mjs"), /copyFileSync/);
  assert.ok(existsSync(path.join(root, "apps/api/src/health/health.contract.mjs")));
});

test("verification pipeline includes build, schema and live HTTP checks", () => {
  const scripts = JSON.parse(source("package.json")).scripts;
  assert.match(scripts["verify:stage1"], /verify-stage1\.mjs/);
  assert.match(scripts.smoke, /runtime-smoke\.mjs/);
  const verifier = source("scripts/verify-stage1.mjs");
  for (const command of ["test", "typecheck", "build", "db:validate", "smoke"]) {
    assert.ok(verifier.includes(`"${command}"`), `${command} gate missing`);
  }
});

test("CORS failure does not turn non-allowlisted requests into 500 errors", () => {
  const code = source("apps/api/src/main.ts");
  assert.match(code, /allowedOrigins\.includes\(origin\)/);
  assert.match(code, /callback\(null, false\)/);
});

test("database script never commits or depends on real secrets", () => {
  assert.match(source(".gitignore"), /^\.env\.\*$/m);
  const config = source("packages/database/prisma.config.ts");
  assert.match(config, /env\("DATABASE_URL"\)/);
  assert.doesNotMatch(config, /localhost:\d+\/worksphere/);
});

test("CI executes real HTTP checks after compiling", () => {
  const workflow = source(".github/workflows/ci.yml");
  assert.match(workflow, /npm run verify:stage1/);
  assert.match(source("tests/runtime-smoke.mjs"), /await fetch\(/);
});
