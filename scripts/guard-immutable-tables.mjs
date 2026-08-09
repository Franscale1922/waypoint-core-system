#!/usr/bin/env node
/**
 * Fail-closed deploy guard for the immutable match-workspace decision domain.
 *
 * WHY THIS EXISTS
 * ---------------
 * Production reconciles the Prisma schema against Neon via `prisma db push` on every
 * deploy (see vercel.json's buildCommand). `db push` computes the diff between the live
 * DB and the schema and applies it — a destructive diff (DROP TABLE/COLUMN, a lossy
 * column type change) to a decision-record table would silently erase immutable
 * history the moment it slipped through. A feature whose whole point is a tamper-evident
 * record cannot sit unguarded on that path.
 *
 * WHAT IT DOES
 * ------------
 * Before `db push` runs, it recomputes the SAME from(DB)→to(schema) diff via
 * `prisma migrate diff --script` and does two separate things with it:
 *
 *   1. REPORTS the whole diff (reportDrift) — every statement `db push` is about to apply,
 *      whatever table it touches. Report-only; it never affects the exit code.
 *   2. REFUSES the build if the SQL contains a destructive operation touching any of the
 *      protected match-workspace tables (or the 2 frozen enums). DOMAIN-SCOPED on purpose:
 *      it protects only the decision-record tables, not the rest of the schema.
 *
 * WHY (1) EXISTS (added 2026-08-09)
 * ---------------------------------
 * Production drifted off the committed schema between 2026-08-05 and 2026-08-09 and the
 * `a63401f` deploy silently repaired it — `db push` printed "Your database is now in sync"
 * where earlier builds printed "already in sync". Git showed zero changes under prisma/, so
 * the drift did not come from our code, and the cause is still unknown because the push
 * consumed the only evidence. This guard was ALREADY holding that evidence: it computed the
 * diff, found nothing destructive in the 10 protected tables, printed one ✅ line and threw
 * the SQL away. Now it prints it. Grep a build log for SCHEMA_DRIFT_DETECTED.
 *
 * That is also why there is no second `migrate diff` call anywhere in the build: this one
 * already runs before `db push`, and re-running it would add a production round-trip plus a
 * second failure surface to re-fetch SQL we had in hand.
 *
 * FAIL-CLOSED, TWO DISTINCT CLASSES
 * ---------------------------------
 *   • GUARD_BLOCKED    — a destructive op on a protected table was found. Always hard-fails,
 *                        no retry, no bypass.
 *   • GUARD_INFRA_ERROR — the diff itself could not be computed (DB unreachable, bad URL,
 *                        broken schema). Retries a connection-class failure twice with
 *                        backoff, then still fails the build (never a silent pass). There is
 *                        deliberately NO bypass flag — an escape hatch here would be the same
 *                        footgun as `--accept-data-loss`; an infra failure is a call for a
 *                        human in the moment, not an automatic override.
 *
 * A table RENAME on a protected table reads as drop+add against a live DB (there is no
 * shared migration history to diff against) and will hard-block — an accepted, documented
 * operational cost, not a bug. Do such a change deliberately, off the auto-deploy path.
 *
 * USAGE
 *   node scripts/guard-immutable-tables.mjs
 *     Defaults: --from-url = $POSTGRES_URL_NON_POOLING (the repo's directUrl convention),
 *               --schema   = prisma/schema.prisma
 *   Overrides (for tests): --from-url <url> | $GUARD_FROM_URL ; --schema <path> | $GUARD_SCHEMA_PATH
 *
 * Read-only: `migrate diff` only introspects the "from" database; it never writes.
 */
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";

// The immutable decision-domain tables this guard protects. Keep in lockstep with the
// match-workspace models in prisma/schema.prisma.
const PROTECTED_TABLES = [
  "Candidate",
  "CandidateInputVersion",
  "MatchRun",
  "MatchScore",
  "MatchCorrection",
  "MatchDecision",
  "MatchOutcomeEvent",
  "ScoringConfig",
  "MatchRunInput",
  "MatchProjection",
];
// The frozen enum types in the same domain (DROP TYPE on these is destructive too).
const PROTECTED_TYPES = ["MatchDecisionState", "MatchOutcomeType"];

const ROOT = process.cwd();

// ── Best-effort local env load (Vercel injects env at build time; local runs read a
//    dotenv file). Platform/process env always wins — dotenv never overrides it. ──
async function loadLocalEnv() {
  for (const f of [".env.local", ".env"]) {
    const p = join(ROOT, f);
    if (existsSync(p)) {
      try {
        const { config } = await import("dotenv");
        config({ path: p, override: false });
      } catch {
        // dotenv is a devDependency; absent in a pruned prod install — that's fine,
        // the platform supplies env directly there.
      }
    }
  }
}

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--from-url") out.fromUrl = argv[++i];
    else if (argv[i] === "--schema") out.schema = argv[++i];
  }
  return out;
}

// Normalize a possibly-quoted, possibly-schema-qualified identifier to its bare name:
//   "public"."MatchScore"  ->  MatchScore
//   "MatchScore"           ->  MatchScore
//   public.MatchScore      ->  MatchScore
function bareIdent(raw) {
  if (!raw) return "";
  const lastPart = raw.trim().split(".").pop();
  return lastPart.replace(/"/g, "").trim();
}

const isProtectedTable = (name) => {
  const bare = bareIdent(name).toLowerCase();
  // Case-insensitive so an unquoted (lowercased) identifier can't sneak past. None of
  // this DB's other tables share a name with a protected one, so over-matching is safe.
  return PROTECTED_TABLES.some((t) => t.toLowerCase() === bare);
};
const isProtectedType = (name) => {
  const bare = bareIdent(name).toLowerCase();
  return PROTECTED_TYPES.some((t) => t.toLowerCase() === bare);
};

// Split a string on top-level commas (ignoring commas inside parentheses), so a
// multi-clause `ALTER TABLE ... ADD ..., DROP COLUMN ...` is examined clause-by-clause.
function splitTopLevel(s) {
  const parts = [];
  let depth = 0;
  let cur = "";
  for (const ch of s) {
    if (ch === "(") depth++;
    else if (ch === ")") depth = Math.max(0, depth - 1);
    if (ch === "," && depth === 0) {
      parts.push(cur);
      cur = "";
    } else {
      cur += ch;
    }
  }
  if (cur.trim()) parts.push(cur);
  return parts;
}

/**
 * Drop SQL line comments (-- ...), then split into normalized statements on ";".
 * Shared by findDestructiveOps() and summarizeDrift() so the two can never disagree
 * about what counts as a statement.
 */
export function splitStatements(sql) {
  const noComments = sql
    .split("\n")
    .map((line) => line.replace(/--.*$/, ""))
    .join("\n");
  return noComments
    .split(";")
    .map((s) => s.trim().replace(/\s+/g, " "))
    .filter(Boolean);
}

// A statement Prisma's migrate-diff can emit. Used only to tell real DDL apart from
// non-SQL noise on stdout (see summarizeDrift); the destructive scan does not use it.
const SQL_STATEMENT = /^(ALTER|CREATE|DROP|COMMENT|TRUNCATE|INSERT|UPDATE|DELETE|SET|GRANT|REVOKE|RENAME)\b/i;

// Prisma's update-notifier draws a box. Those lines must be removed BEFORE splitting on
// ";", not classified afterwards: the banner contains no semicolon, so if it were ever
// printed ahead of the SQL it would merge with the first real statement into one chunk and
// that chunk would fail the SQL_STATEMENT test — silently hiding genuine drift. Observed
// order today is SQL-then-banner, but correctness here must not depend on it.
// Anchored to the START of the line (every notifier line opens with ┌ │ or └) so a box
// character appearing inside a real SQL string literal cannot delete that statement.
const BANNER_LINE = /^\s*[─-╿]/;

/**
 * Classify `migrate diff --script` output into "the DB matches the schema" vs "it does not".
 *
 * Two things make a naive emptiness check wrong, both verified against Prisma 6.19.2:
 *   • A clean diff is NOT an empty string — it is the single line
 *     `-- This is an empty migration.`, which only disappears after comments are stripped.
 *   • Prisma's update-notifier banner can land on stdout. It carries no ";", so it would
 *     survive as one pseudo-statement and read as permanent drift on every build.
 *
 * So: statements are comment-stripped chunks that begin with a SQL verb. Anything left over
 * is returned as `unrecognized` and reported rather than silently dropped — under-reporting
 * here would recreate the exact silence this whole change exists to remove.
 */
export function summarizeDrift(sql) {
  const withoutBanner = sql
    .split("\n")
    .filter((line) => !BANNER_LINE.test(line))
    .join("\n");
  const chunks = splitStatements(withoutBanner);
  const statements = chunks.filter((c) => SQL_STATEMENT.test(c));
  const unrecognized = chunks.filter((c) => !SQL_STATEMENT.test(c));
  return { statements, unrecognized, hasDrift: statements.length > 0 };
}

/**
 * Scan migrate-diff SQL and return an array of {table, statement, reason} for every
 * destructive operation on a protected table/type. Empty array = clean.
 */
export function findDestructiveOps(sql) {
  const findings = [];

  for (const stmt of splitStatements(sql)) {
    // DROP TABLE [IF EXISTS] <table>
    let m = /^DROP TABLE\s+(?:IF EXISTS\s+)?([^\s]+)/i.exec(stmt);
    if (m && isProtectedTable(m[1])) {
      findings.push({ table: bareIdent(m[1]), statement: stmt, reason: "DROP TABLE" });
      continue;
    }

    // DROP TYPE [IF EXISTS] <enumType>
    m = /^DROP TYPE\s+(?:IF EXISTS\s+)?([^\s]+)/i.exec(stmt);
    if (m && isProtectedType(m[1])) {
      findings.push({ table: bareIdent(m[1]), statement: stmt, reason: "DROP TYPE (frozen enum)" });
      continue;
    }

    // ALTER TABLE [ONLY] <table> <clauses...>
    m = /^ALTER TABLE\s+(?:ONLY\s+)?([^\s]+)\s+(.*)$/i.exec(stmt);
    if (m && isProtectedTable(m[1])) {
      const table = bareIdent(m[1]);
      for (const clause of splitTopLevel(m[2])) {
        const c = clause.trim();
        // Prisma renders a column drop as `DROP COLUMN "x"`. A `DROP CONSTRAINT` /
        // `DROP DEFAULT` / `DROP NOT NULL` clause is NOT data-destroying and is not matched.
        if (/^DROP COLUMN\b/i.test(c)) {
          findings.push({ table, statement: stmt, reason: "DROP COLUMN" });
        } else if (/\bSET DATA TYPE\b/i.test(c) || /\bALTER COLUMN\b.*\bTYPE\b/i.test(c)) {
          // A column type change may be lossy; losslessness isn't reliably knowable from
          // SQL text, so treat every type change on a protected table as destructive.
          findings.push({ table, statement: stmt, reason: "ALTER COLUMN TYPE (possibly lossy)" });
        } else if (/^RENAME\b/i.test(c)) {
          // Renaming a protected table/column breaks the immutable identity contract.
          // `prisma migrate diff` currently emits DROP+CREATE (already caught above) rather
          // than RENAME, so this is defense-in-depth against the diff source ever changing.
          findings.push({ table, statement: stmt, reason: "RENAME (breaks immutable identity)" });
        }
      }
    }
  }
  return findings;
}

function looksLikeConnectionError(stderr) {
  return /P1001|P1002|can'?t reach database|connection refused|ECONNREFUSED|ETIMEDOUT|timed out|could not connect|server closed the connection/i.test(
    stderr || "",
  );
}

// Run `prisma migrate diff` once. Returns {ok:true, sql} on success, or
// {ok:false, connectionError, stderr} when the diff could not be computed.
function runMigrateDiff(fromUrl, schemaPath) {
  const res = spawnSync(
    "npx",
    [
      "prisma",
      "migrate",
      "diff",
      "--from-url",
      fromUrl,
      "--to-schema-datamodel",
      schemaPath,
      "--script",
    ],
    {
      encoding: "utf8",
      cwd: ROOT,
      // Keep Prisma's update-notifier banner off stdout so it cannot be mistaken for DDL.
      // summarizeDrift() also filters it defensively — a false "drift detected" on every
      // build would train everyone to ignore the marker, which is the failure being fixed.
      env: { ...process.env, PRISMA_HIDE_UPDATE_MESSAGE: "1" },
    },
  );
  if (res.error) {
    return { ok: false, connectionError: false, stderr: String(res.error.message || res.error) };
  }
  if (res.status !== 0) {
    const stderr = res.stderr || res.stdout || `exit code ${res.status}`;
    return { ok: false, connectionError: looksLikeConnectionError(stderr), stderr };
  }
  return { ok: true, sql: res.stdout || "" };
}

// Cap on printed DDL, so a pathological diff cannot flood the build log. A real drift is
// a handful of statements; anything near this cap is itself the story.
const MAX_REPORTED_STATEMENTS = 200;

/**
 * Print what the live database and prisma/schema.prisma disagree about.
 *
 * REPORT-ONLY BY CONTRACT — this never fails the build and never touches the exit code.
 * Rationale: `db push` reconciling production onto the committed schema is this repo's
 * INTENDED mechanism, so failing on any drift would deadlock every deploy — including the
 * deploy that would repair it — behind an out-of-band change (a Neon-side index, an
 * extension) nobody committed. `--no-verify` is banned and there is no valve. The harm
 * this addresses is drift being INVISIBLE, not drift being repaired; the genuinely
 * dangerous case (a destructive op on a protected table) stays fail-closed in
 * findDestructiveOps() and is unaffected by anything here.
 */
export function reportDrift(sql, log = console.log) {
  const { statements, unrecognized, hasDrift } = summarizeDrift(sql);

  // Deliberately says "the live database", not "production": this same guard runs against a
  // local database in tests, and a log line that names production when it is not looking at
  // production is exactly the kind of confidently-wrong claim this change exists to remove.
  if (!hasDrift) {
    log("SCHEMA_DRIFT_NONE: the live database already matches the schema; `db push` will be a no-op.");
  } else {
    log(
      `SCHEMA_DRIFT_DETECTED: the live database differs from the schema in ${statements.length} statement(s).\n` +
        "`prisma db push` is about to apply the following. If no commit under prisma/ explains it,\n" +
        "the database drifted out-of-band and this deploy is repairing it — investigate rather than ignore.",
    );
    for (const stmt of statements.slice(0, MAX_REPORTED_STATEMENTS)) log(`  ${stmt};`);
    if (statements.length > MAX_REPORTED_STATEMENTS) {
      log(`  … and ${statements.length - MAX_REPORTED_STATEMENTS} more (truncated at ${MAX_REPORTED_STATEMENTS}).`);
    }
  }

  // Never dropped silently: anything on stdout that is not SQL and not a comment is
  // reported, so a future Prisma output change cannot quietly hide drift behind this filter.
  if (unrecognized.length > 0) {
    log(`SCHEMA_DRIFT_UNRECOGNIZED_OUTPUT: ${unrecognized.length} non-SQL chunk(s) on stdout, shown verbatim:`);
    for (const chunk of unrecognized.slice(0, MAX_REPORTED_STATEMENTS)) log(`  ${chunk}`);
  }

  return hasDrift;
}

async function main() {
  await loadLocalEnv();
  const args = parseArgs(process.argv.slice(2));
  const fromUrl = args.fromUrl || process.env.GUARD_FROM_URL || process.env.POSTGRES_URL_NON_POOLING;
  const schemaPath = args.schema || process.env.GUARD_SCHEMA_PATH || join(ROOT, "prisma", "schema.prisma");

  if (!fromUrl) {
    console.error(
      "GUARD_INFRA_ERROR: no database URL. Set POSTGRES_URL_NON_POOLING (or pass --from-url / GUARD_FROM_URL). Failing closed.",
    );
    process.exit(1);
  }
  if (!existsSync(schemaPath)) {
    console.error(`GUARD_INFRA_ERROR: schema not found at ${schemaPath}. Failing closed.`);
    process.exit(1);
  }

  // Compute the diff, retrying only connection-class failures (transient DB blips).
  const MAX_ATTEMPTS = 3; // 1 try + 2 retries
  let result;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    result = runMigrateDiff(fromUrl, schemaPath);
    if (result.ok) break;
    if (!result.connectionError || attempt === MAX_ATTEMPTS) break;
    const backoffMs = 1000 * attempt;
    console.warn(
      `guard: could not reach the database (attempt ${attempt}/${MAX_ATTEMPTS}); retrying in ${backoffMs}ms…`,
    );
    // Async backoff (no CPU-pegging busy-wait) — main() is async and build-time only.
    await new Promise((resolve) => setTimeout(resolve, backoffMs));
  }

  if (!result.ok) {
    console.error(
      `GUARD_INFRA_ERROR: could not compute the schema diff${
        result.connectionError ? " (database unreachable after retries)" : ""
      }. This is NOT a detected destructive change — it means the guard could not verify the deploy is safe, so it fails closed.\n${result.stderr}`,
    );
    process.exit(1);
  }

  // ── Drift report ────────────────────────────────────────────────────────────────
  // Printed BEFORE the destructive scan on purpose: if the guard is about to hard-fail,
  // the log should still carry what drifted. This step never changes the exit code —
  // see reportDrift()'s contract.
  reportDrift(result.sql);

  const findings = findDestructiveOps(result.sql);
  if (findings.length > 0) {
    console.error(
      "GUARD_BLOCKED: destructive change to the immutable match-workspace domain — refusing to `db push`.\n" +
        "These operations would erase immutable decision records:",
    );
    for (const f of findings) {
      console.error(`  • [${f.reason}] on "${f.table}":  ${f.statement}`);
    }
    console.error(
      "\nIf this change is intentional, it must be done deliberately and off the auto-deploy path — not through a `prisma db push` deploy.",
    );
    process.exit(1);
  }

  console.log(
    `✅ guard-immutable-tables: no destructive change to the ${PROTECTED_TABLES.length} protected match-workspace tables.`,
  );
  process.exit(0);
}

// Only run when invoked directly, so tests can import findDestructiveOps() without
// triggering a real diff + process.exit.
const invokedDirectly =
  process.argv[1] && (process.argv[1].endsWith("guard-immutable-tables.mjs") || process.argv[1].endsWith("guard-immutable-tables"));
if (invokedDirectly) {
  main();
}
