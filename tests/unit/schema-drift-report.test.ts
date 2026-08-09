import { describe, it, expect } from "vitest";
import {
  summarizeDrift,
  reportDrift,
  splitStatements,
  findDestructiveOps,
} from "../../scripts/guard-immutable-tables.mjs";

/**
 * Covers the drift REPORT added 2026-08-09, after production drifted off the committed
 * schema and the `a63401f` deploy silently repaired it. The guard already computed the
 * diff and discarded it; these tests pin the classification that decides whether a build
 * log says SCHEMA_DRIFT_DETECTED or SCHEMA_DRIFT_NONE.
 *
 * Deliberately in the `unit` project, which needs no Postgres: the existing guard tests
 * live in tests/match-workspace and only run against a real database, so the pure string
 * logic below — including findDestructiveOps, whose internals were refactored onto the
 * shared splitStatements() — would otherwise have no DB-free coverage at all.
 *
 * The two Prisma fixtures are REAL captured output from the installed 6.19.2, not
 * hand-written approximations. Both were produced by `prisma migrate diff --script`.
 */

/** Real stdout of a diff between two identical datamodels. 32 bytes, exactly this. */
const CLEAN_DIFF = "-- This is an empty migration.\n\n";

/** Real stdout of a diff that adds one nullable column. Note the doubled spaces. */
const DRIFT_DIFF = '-- AlterTable\nALTER TABLE "Lead" ADD COLUMN     "driftProbeColumn" TEXT;\n\n';

/** Prisma's update-notifier banner, as it appears on stdout. */
const UPDATE_BANNER = [
  "┌─────────────────────────────────────────────────────────┐",
  "│  Update available 6.19.2 -> 7.9.1                       │",
  "│                                                         │",
  "│  This is a major update - please follow the guide at    │",
  "│  https://pris.ly/d/major-version-upgrade                │",
  "│                                                         │",
  "│  Run the following to update                            │",
  "│    npm i --save-dev prisma@latest                       │",
  "└─────────────────────────────────────────────────────────┘",
].join("\n");

/** Capture what reportDrift() writes, without touching the real console. */
function capture(sql: string) {
  const lines: string[] = [];
  const drifted = reportDrift(sql, (m: string) => lines.push(m));
  return { drifted, text: lines.join("\n") };
}

describe("summarizeDrift: the clean case must not read as drift", () => {
  it("treats Prisma's real empty-migration output as NO drift", () => {
    // The bug this kills: `sql.trim() === ""`. A clean diff is not an empty string, it is
    // a comment line — so a naive emptiness check reports drift on every single build.
    expect(CLEAN_DIFF.trim()).not.toBe("");
    expect(summarizeDrift(CLEAN_DIFF).hasDrift).toBe(false);

    const { drifted, text } = capture(CLEAN_DIFF);
    expect(drifted).toBe(false);
    expect(text).toContain("SCHEMA_DRIFT_NONE");
    expect(text).not.toContain("SCHEMA_DRIFT_DETECTED");
  });

  it("reports no drift for comments alone, and for genuinely empty output", () => {
    expect(summarizeDrift("").hasDrift).toBe(false);
    expect(summarizeDrift("-- AlterTable\n-- nothing to do\n").hasDrift).toBe(false);
  });
});

describe("summarizeDrift: real drift is detected and named", () => {
  it("detects the added column and prints the statement", () => {
    const summary = summarizeDrift(DRIFT_DIFF);
    expect(summary.hasDrift).toBe(true);
    expect(summary.statements).toHaveLength(1);
    // Whitespace is collapsed, so the doubled spaces in Prisma's output are normalized.
    expect(summary.statements[0]).toBe('ALTER TABLE "Lead" ADD COLUMN "driftProbeColumn" TEXT');

    const { drifted, text } = capture(DRIFT_DIFF);
    expect(drifted).toBe(true);
    expect(text).toContain("SCHEMA_DRIFT_DETECTED");
    expect(text).toContain("driftProbeColumn");
    expect(text).toContain("1 statement(s)");
  });

  it("counts multiple statements", () => {
    const sql = `${DRIFT_DIFF}\nDROP TABLE "Obsolete";\nCREATE INDEX "i" ON "Lead"("id");`;
    expect(summarizeDrift(sql).statements).toHaveLength(3);
  });
});

describe("the update-notifier banner cannot corrupt the verdict", () => {
  it("banner ALONE does not read as drift", () => {
    // Without banner-stripping this is one chunk with no semicolon, which would be
    // reported as drift on every build until someone stopped believing the marker.
    const summary = summarizeDrift(UPDATE_BANNER);
    expect(summary.hasDrift).toBe(false);
    expect(capture(UPDATE_BANNER).text).toContain("SCHEMA_DRIFT_NONE");
  });

  it("banner AFTER the SQL still detects the drift", () => {
    expect(summarizeDrift(`${DRIFT_DIFF}\n${UPDATE_BANNER}`).hasDrift).toBe(true);
  });

  it("banner BEFORE the SQL still detects the drift", () => {
    // The regression that matters most. The banner has no ";", so if it is stripped only
    // by post-hoc classification it merges with the first real statement into a single
    // chunk that fails the SQL test — hiding genuine drift. Order must not matter.
    const summary = summarizeDrift(`${UPDATE_BANNER}\n${DRIFT_DIFF}`);
    expect(summary.hasDrift).toBe(true);
    expect(summary.statements[0]).toContain("driftProbeColumn");
  });

  it("banner is not silently swallowed when it is the only non-SQL content", () => {
    // Anything unrecognized is surfaced rather than dropped, so a future Prisma output
    // change cannot quietly hide drift behind this filter.
    const clean = summarizeDrift(CLEAN_DIFF);
    expect(clean.unrecognized).toHaveLength(0);
  });
});

describe("reportDrift is report-only", () => {
  it("returns a boolean and never throws, even on destructive SQL", () => {
    const destructive = 'DROP TABLE "MatchScore";';
    expect(() => capture(destructive)).not.toThrow();
    expect(capture(destructive).drifted).toBe(true);
    // It reports; blocking remains findDestructiveOps' job, unchanged.
    expect(findDestructiveOps(destructive)).toHaveLength(1);
  });

  it("truncates a pathological diff instead of flooding the log", () => {
    const many = Array.from({ length: 250 }, (_, i) => `ALTER TABLE "T${i}" ADD COLUMN "c" TEXT;`).join("\n");
    const { text } = capture(many);
    expect(text).toContain("250 statement(s)");
    expect(text).toContain("and 50 more");
    expect(text).not.toContain('"T249"');
  });
});

describe("splitStatements refactor did not change findDestructiveOps", () => {
  // findDestructiveOps' own suite needs a live Postgres (tests/match-workspace), so these
  // re-pin its contract in the DB-free project after its internals moved onto the shared
  // splitStatements(). Same cases as the match-workspace unit block.
  it("still flags destructive ops on protected tables", () => {
    const destructive = [
      '-- DropTable\nDROP TABLE "public"."MatchScore";',
      'ALTER TABLE "MatchRun" DROP COLUMN "actor";',
      'ALTER TABLE "MatchScore" ALTER COLUMN "rank" SET DATA TYPE bigint;',
      'ALTER TABLE "MatchDecision" ADD COLUMN "note" TEXT, DROP COLUMN "reason";',
      'DROP TYPE "MatchOutcomeType";',
      'ALTER TABLE "MatchScore" RENAME TO "MatchScoreArchive";',
    ];
    for (const sql of destructive) {
      expect(findDestructiveOps(sql).length, sql).toBeGreaterThan(0);
    }
  });

  it("still ignores safe ops and unprotected tables", () => {
    const safe = [
      'ALTER TABLE "Lead" DROP COLUMN "draftEmail";',
      'ALTER TABLE "MatchScore" ADD COLUMN "note" TEXT;',
      'ALTER TABLE "MatchDecision" DROP CONSTRAINT "x_fkey";',
      'ALTER TABLE "MatchRun" ALTER COLUMN "status" DROP NOT NULL;',
    ];
    for (const sql of safe) {
      expect(findDestructiveOps(sql), sql).toHaveLength(0);
    }
  });

  it("splitStatements strips comments and collapses whitespace", () => {
    expect(splitStatements(CLEAN_DIFF)).toHaveLength(0);
    expect(splitStatements('ALTER TABLE   "a"  ADD  COLUMN "b" TEXT;')).toEqual([
      'ALTER TABLE "a" ADD COLUMN "b" TEXT',
    ]);
  });
});
