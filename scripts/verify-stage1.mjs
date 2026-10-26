import { spawnSync } from "node:child_process";

const steps = [
  ["npm", ["run", "db:generate"]],
  ["npm", ["test"]],
  ["npm", ["run", "typecheck"]],
  ["npm", ["run", "build"]],
  ["npm", ["run", "db:validate"]],
  ["npm", ["run", "db:generate"]],
  ["npm", ["run", "test:config"]],
  ["npm", ["run", "test:database"]],
  ["npm", ["run", "smoke"]],
];

const env = {
  ...process.env,
  // Schema validation only: this URL is never used to connect to a database.
  DATABASE_URL: process.env.DATABASE_URL ??
    "postgresql://worksphere:local_only@127.0.0.1:5432/worksphere?schema=public",
};

for (const [command, args] of steps) {
  process.stdout.write(`\n=== ${[command, ...args].join(" ")} ===\n`);
  const result = spawnSync(command, args, { stdio: "inherit", env });
  if (result.error) {
    console.error(result.error);
    process.exit(1);
  }
  if (result.status !== 0) {
    console.error(`Verification stopped: ${command} ${args.join(" ")} failed.`);
    process.exit(result.status ?? 1);
  }
}
console.log("\nLocal Stage 1 gate passed. Standalone PostgreSQL migration, browser QA and hosted CI require separate evidence." );
