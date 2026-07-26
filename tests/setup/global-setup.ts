/**
 * Vitest global setup — runs ONCE before any test file.
 *
 *   1. Hard-asserts the resolved test DB is a local, non-prod database (fail-closed).
 *   2. Applies the current Prisma schema to it via `prisma db push` (idempotent), with
 *      POSTGRES_PRISMA_URL / POSTGRES_URL_NON_POOLING overridden to the test URL for the
 *      child process only — the prod values in .env.local are never used here.
 */
import { spawnSync } from "node:child_process";
import { resolveAndAssertTestUrl } from "./assert-test-db";

export default function setup() {
  const testUrl = resolveAndAssertTestUrl(); // throws unless local + non-prod + "test" marker

  const res = spawnSync(
    "npx",
    ["prisma", "db", "push", "--skip-generate", "--accept-data-loss"],
    {
      encoding: "utf8",
      cwd: process.cwd(),
      env: {
        ...process.env,
        // Point BOTH datasource URLs at the local test DB for this child only.
        POSTGRES_PRISMA_URL: testUrl,
        POSTGRES_URL_NON_POOLING: testUrl,
      },
    },
  );

  if (res.status !== 0) {
    throw new Error(
      `Global setup: 'prisma db push' to the test DB failed.\n${res.stderr || res.stdout}`,
    );
  }
  // `--accept-data-loss` is safe here: this is the dedicated local test DB, asserted above.
}
