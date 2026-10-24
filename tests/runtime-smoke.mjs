/** Real HTTP smoke checks for built Next.js and NestJS apps; run after npm run build. */
import { spawn } from "node:child_process";
import { setTimeout as sleep } from "node:timers/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import assert from "node:assert/strict";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const apiPort = 44671;
const webPort = 44672;
const processes = [];
let stderr = "";

function start(workspace, extraEnv = {}) {
  const args = ["run", "start", "-w", workspace];
  if (workspace === "@worksphere/web") args.push("--", "--hostname", "127.0.0.1");
  const child = spawn("npm", args, {
    cwd: root,
    env: { ...process.env, ...extraEnv },
    stdio: ["ignore", "pipe", "pipe"],
    detached: process.platform !== "win32",
  });
  child.stdout.on("data", (chunk) => {
    const line = String(chunk);
    process.stdout.write(`[${workspace}] ${line}`);
  });
  child.stderr.on("data", (chunk) => {
    const line = String(chunk);
    stderr = `${stderr}${line}`.slice(-6000);
    process.stderr.write(`[${workspace}] ${line}`);
  });
  processes.push(child);
  return child;
}

async function waitFor(url, child) {
  for (let attempt = 0; attempt < 80; attempt++) {
    if (child.exitCode !== null) throw new Error(`Server exited (${child.exitCode}) before responding: ${url}`);
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(1200) });
      if (response.ok) return response;
    } catch { /* wait for boot */ }
    await sleep(350);
  }
  throw new Error(`Timed out waiting for ${url}; recent errors: ${stderr}`);
}

function killProcessTree(child) {
  // npm may spawn a child process. Terminate the runner and its descendants.
  if (child.pid && process.platform !== "win32") {
    try { process.kill(-child.pid, "SIGTERM"); return; } catch { /* fallback */ }
  }
  if (child.pid) child.kill("SIGTERM");
}

async function main() {
  const api = start("@worksphere/api", {
    PORT: String(apiPort),
    CORS_ORIGINS: `http://127.0.0.1:${webPort}`,
  });
  const web = start("@worksphere/web", { PORT: String(webPort) });
  await Promise.all([
    waitFor(`http://127.0.0.1:${apiPort}/v1/health`, api),
    waitFor(`http://127.0.0.1:${webPort}`, web),
  ]);

  const health = await fetch(`http://127.0.0.1:${apiPort}/v1/health`);
  assert.equal(health.status, 200);
  assert.deepEqual(await health.json(), {
    status: "ok", service: "worksphere-api", version: "0.1.0",
  });

  const info = await fetch(`http://127.0.0.1:${apiPort}/v1/info`);
  assert.equal(info.status, 200);
  assert.equal((await info.json()).stage, 1);

  const corsGood = await fetch(`http://127.0.0.1:${apiPort}/v1/health`, {
    headers: { Origin: `http://127.0.0.1:${webPort}` },
  });
  assert.equal(corsGood.headers.get("access-control-allow-origin"), `http://127.0.0.1:${webPort}`);
  const corsBad = await fetch(`http://127.0.0.1:${apiPort}/v1/health`, {
    headers: { Origin: "https://untrusted.invalid" },
  });
  assert.equal(corsBad.headers.get("access-control-allow-origin"), null);

  const page = await fetch(`http://127.0.0.1:${webPort}`);
  assert.equal(page.status, 200);
  const html = await page.text();
  assert.match(html, /WorkSphere/);
  assert.match(html, /sample data|demo workspace|preview/i);
  console.log("SMOKE OK: API health, metadata, CORS allowlist, and rendered web homepage.");
}

try {
  await main();
} catch (error) {
  console.error("SMOKE FAILED:", error);
  process.exitCode = 1;
} finally {
  for (const child of processes) killProcessTree(child);
  await sleep(500);
}
