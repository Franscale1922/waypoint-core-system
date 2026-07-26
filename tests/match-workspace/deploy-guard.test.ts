import { describe, it, expect } from "vitest";
import { spawnSync } from "node:child_process";
import { readFileSync, writeFileSync, mkdtempSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { resolveAndAssertTestUrl } from "../setup/assert-test-db";
import { findDestructiveOps } from "../../scripts/guard-immutable-tables.mjs";

const ROOT = process.cwd();
const GUARD = join(ROOT, "scripts", "guard-immutable-tables.mjs");
const SCHEMA = join(ROOT, "prisma", "schema.prisma");

function runGuard(env: Record<string, string>) {
  return spawnSync("node", [GUARD], {
    encoding: "utf8",
    cwd: ROOT,
    env: { ...process.env, ...env },
  });
}

describe("deploy guard SQL parser (unit)", () => {
  it("flags DROP TABLE / DROP COLUMN / ALTER TYPE on protected tables, ignores safe ops", () => {
    const destructive = [
      `-- DropTable\nDROP TABLE "public"."MatchScore";`, // schema-qualified
      `ALTER TABLE "MatchRun" DROP COLUMN "actor";`,
      `ALTER TABLE "MatchScore" ALTER COLUMN "rank" SET DATA TYPE bigint;`,
      `ALTER TABLE "MatchDecision" ADD COLUMN "note" TEXT, DROP COLUMN "reason";`, // drop as 2nd clause
      `DROP TYPE "MatchOutcomeType";`,
    ];
    for (const sql of destructive) {
      expect(findDestructiveOps(sql).length, sql).toBeGreaterThan(0);
    }

    const safe = [
      `ALTER TABLE "Lead" DROP COLUMN "draftEmail";`, // unprotected table — domain-scoped guard
      `ALTER TABLE "MatchScore" ADD COLUMN "note" TEXT;`, // additive
      `ALTER TABLE "MatchDecision" DROP CONSTRAINT "x_fkey";`, // constraint, not data
      `CREATE TABLE "MatchScore_new" ("id" TEXT);`, // unrelated create
      `ALTER TABLE "MatchRun" ALTER COLUMN "status" DROP NOT NULL;`, // not data-destroying
    ];
    for (const sql of safe) {
      expect(findDestructiveOps(sql), sql).toHaveLength(0);
    }
  });
});

describe("deploy guard end-to-end (integration)", () => {
  const testUrl = resolveAndAssertTestUrl();

  it("exits 0 when the schema matches the DB (no destructive change)", () => {
    const res = runGuard({ GUARD_FROM_URL: testUrl, GUARD_SCHEMA_PATH: SCHEMA });
    expect(res.status, res.stderr).toBe(0);
    expect(res.stdout).toMatch(/no destructive change/i);
  });

  it("GUARD_BLOCKED (exit 1) when a protected column is dropped, naming the table", () => {
    const mutated = readFileSync(SCHEMA, "utf8")
      .split("\n")
      .filter((l) => !/^\s*exclusions\s+String\[\]/.test(l))
      .join("\n");
    const dir = mkdtempSync(join(tmpdir(), "guard-block-"));
    const path = join(dir, "schema.prisma");
    writeFileSync(path, mutated);

    const res = runGuard({ GUARD_FROM_URL: testUrl, GUARD_SCHEMA_PATH: path });
    expect(res.status).toBe(1);
    expect(res.stderr).toMatch(/GUARD_BLOCKED/);
    expect(res.stderr).toMatch(/MatchScore/);
  });

  it("exits 0 when a NON-protected (Lead) column is dropped (domain-scoped)", () => {
    const mutated = readFileSync(SCHEMA, "utf8")
      .split("\n")
      .filter((l) => !/^\s*draftEmail\s+String\?/.test(l))
      .join("\n");
    const dir = mkdtempSync(join(tmpdir(), "guard-lead-"));
    const path = join(dir, "schema.prisma");
    writeFileSync(path, mutated);

    const res = runGuard({ GUARD_FROM_URL: testUrl, GUARD_SCHEMA_PATH: path });
    expect(res.status, res.stderr).toBe(0);
  });

  it("GUARD_INFRA_ERROR (exit 1) when the database is unreachable", () => {
    const badUrl = "postgresql://waypoint_test:waypoint_test_local@localhost:5599/waypoint_test?schema=public";
    const res = runGuard({ GUARD_FROM_URL: badUrl, GUARD_SCHEMA_PATH: SCHEMA });
    expect(res.status).toBe(1);
    expect(res.stderr).toMatch(/GUARD_INFRA_ERROR/);
    expect(res.stderr).not.toMatch(/GUARD_BLOCKED/);
  });
});
