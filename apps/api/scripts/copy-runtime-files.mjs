import { copyFileSync, existsSync, mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

// The health contract is an executable ESM file with an adjacent .d.mts typing.
// The TypeScript compiler does not copy this .mjs into dist; do it explicitly.
const apiRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const source = path.join(apiRoot, "src", "health", "health.contract.mjs");
const targetDir = path.join(apiRoot, "dist", "health");
if (!existsSync(source)) throw new Error(`Missing API runtime module: ${source}`);
mkdirSync(targetDir, { recursive: true });
const output = path.join(targetDir, "health.contract.mjs");
copyFileSync(source, output);
console.log(`Copied runtime module: ${path.relative(apiRoot, output)}`);
