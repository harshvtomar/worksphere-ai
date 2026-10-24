/** Runtime failure-path checks. Run after building the API. */
import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { cpSync, mkdtempSync, rmSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const apiRoot = path.join(root, "apps/api");
const entry = path.join(apiRoot, "dist/main.js");

function expectFailure(environment, pattern, entryPoint = entry) {
  const result = spawnSync(process.execPath, [entryPoint], {
    cwd: apiRoot,
    env: {
      ...process.env,
      PORT: "44673",
      CORS_ORIGINS: "http://localhost:3000",
      ...environment,
    },
    encoding: "utf8",
    timeout: 5000,
    killSignal: "SIGKILL",
    maxBuffer: 1024 * 1024,
  });
  assert.ifError(result.error);
  assert.equal(result.signal, null, "API must exit itself, not time out or crash by signal");
  assert.ok(Number.isInteger(result.status) && result.status !== 0, "API must return a nonzero exit code");
  assert.match(`${result.stdout}\n${result.stderr}`, pattern);
  assert.doesNotMatch(result.stdout, /WorkSphere API listening/, "invalid configuration must not start a listener");
}

for (const port of ["", "0", "-1", "65536", "1.5", "nope", " 4000", "4000 "]) {
  test(`API rejects invalid PORT ${JSON.stringify(port)}`, { timeout: 10000 }, () => {
    expectFailure({ PORT: port }, /PORT must be an integer between 1 and 65535/);
  });
}

for (const origin of ["", "*", "https://example.com/path", "ftp://example.com", "not-a-url"]) {
  test(`API rejects invalid CORS_ORIGINS ${JSON.stringify(origin)}`, { timeout: 10000 }, () => {
    expectFailure({ CORS_ORIGINS: origin }, /CORS_ORIGINS must contain comma-separated HTTP\(S\) origins without paths/);
  });
}

test("missing built health contract fails explicitly in an isolated dist copy", { timeout: 10000 }, () => {
  // Staying under the API package preserves ESM type and dependency resolution.
  // Never alter the application's real dist directory.
  const temporary = mkdtempSync(path.join(apiRoot, ".runtime-config-"));
  try {
    const dist = path.join(temporary, "dist");
    cpSync(path.join(apiRoot, "dist"), dist, { recursive: true });
    rmSync(path.join(dist, "health/health.contract.mjs"));
    expectFailure({}, /ERR_MODULE_NOT_FOUND[\s\S]*health\.contract\.mjs|health\.contract\.mjs[\s\S]*ERR_MODULE_NOT_FOUND/, path.join(dist, "main.js"));
  } finally {
    rmSync(temporary, { recursive: true, force: true });
  }
});
