/**
 * Vitest global setup — runs ONCE before any test file.
 *
 *   1. Hard-asserts the resolved test DB is a local, non-prod database (fail-closed).
 *   2. Applies the current Prisma schema to it via `prisma db push` (idempotent), with
 *      POSTGRES_PRISMA_URL / POSTGRES_URL_NON_POOLING overridden to the test URL for the
 *      child process only — the prod values in .env.local are never used here.
 */
import { spawnSync } from "node:child_process";
import { resolveAndAssertTestUrl, MATCH_WORKSPACE_TABLES } from "./assert-test-db";

/**
 * Empty the domain tables before pushing the schema.
 *
 * Without this, adding a REQUIRED column fails: `prisma db push` refuses to add a non-nullable
 * column without a default to a table that still holds rows, and the test database keeps whatever
 * the previous run's last test left behind. That surfaced as an opaque global-setup failure the
 * first time a required column was added, and would recur on every future one.
 *
 * Note that `--accept-data-loss` does not cover this case: it permits destructive changes, not
 * impossible ones. Truncating first is what makes the push unconditionally applicable.
 *
 * Safe by construction: the URL has already passed the three-way local/non-prod/"test" assertion,
 * and the per-test setup truncates these same tables before every test anyway. Missing tables are
 * skipped, so this also works against a brand-new empty database.
 */
function truncateDomainTables(testUrl: string) {
  const sql = MATCH_WORKSPACE_TABLES.map(
    (t) =>
      `DO $$ BEGIN IF to_regclass('public."${t}"') IS NOT NULL THEN EXECUTE 'TRUNCATE TABLE public."${t}" CASCADE'; END IF; END $$;`,
  ).join("\n");

  const res = spawnSync("npx", ["prisma", "db", "execute", "--url", testUrl, "--stdin"], {
    encoding: "utf8",
    input: sql,
    cwd: process.cwd(),
    env: process.env,
  });
  if (res.status !== 0) {
    throw new Error(`Global setup: could not clear the test DB before push.\n${res.stderr || res.stdout}`);
  }
}

export default function setup() {
  const testUrl = resolveAndAssertTestUrl(); // throws unless local + non-prod + "test" marker

  truncateDomainTables(testUrl);

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
