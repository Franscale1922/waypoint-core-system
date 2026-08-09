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
 * WHAT THE REPORT DOES *NOT* PROVE
 * --------------------------------
 * The report and `db push` are two separate observations of the database, seconds apart, and
 * `db push` recomputes its own diff rather than applying the SQL printed here. So a change
 * landing inside that window is applied without appearing in the report. The same
 * time-of-check/time-of-use gap has always existed between this guard and `db push`, and
 * closing it would mean applying the captured SQL ourselves instead of calling `db push` —
 * a much larger and riskier change than the one this file is making. Raised by a Codex
 * round-1 review and knowingly accepted; recorded here so the report is not read as a
 * guarantee it cannot give. The report narrows the blind spot from "always" to "a few
 * seconds"; it does not eliminate it.
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

/**
 * Split SQL on `delimiter`, respecting quoting, and drop comments as it goes.
 *
 * WHY THIS IS NOT A REGEX (found by a Codex round-1 review, 2026-08-09, and reproduced)
 * ------------------------------------------------------------------------------------
 * The previous implementation stripped comments with /--.*$/ per line and split on a bare
 * ";". Both are blind to string literals, and that made the guard FAIL OPEN:
 *
 *   ALTER TABLE "MatchScore" ALTER COLUMN "note" SET DEFAULT 'https://x--y', DROP COLUMN "rank";
 *
 * The `--` inside the literal truncated the statement, the `DROP COLUMN "rank"` clause
 * vanished, and findDestructiveOps returned NOTHING for a destructive change to a protected
 * decision-record table. A guard that exists to prevent silent data loss must not be
 * defeated by a default value containing two hyphens.
 *
 * Handles, outside of quotes: `--` line comments and nested block comments. Preserves
 * verbatim: single-quoted literals ('' escape), double-quoted identifiers ("" escape) and
 * dollar-quoted bodies ($tag$…$tag$). `respectParens` additionally keeps the delimiter from
 * splitting inside parentheses, which is what clause-splitting needs and statement-splitting
 * must not do.
 */
function sqlSplit(text, delimiter, respectParens) {
  const parts = [];
  let cur = "";
  let depth = 0;
  let i = 0;
  const n = text.length;

  while (i < n) {
    const ch = text[i];
    const next = text[i + 1];

    // -- line comment: drop through end of line (the newline itself is kept as whitespace).
    if (ch === "-" && next === "-") {
      while (i < n && text[i] !== "\n") i++;
      continue;
    }
    // /* block comment */, nested per PostgreSQL.
    if (ch === "/" && next === "*") {
      i += 2;
      let nest = 1;
      while (i < n && nest > 0) {
        if (text[i] === "/" && text[i + 1] === "*") { nest++; i += 2; }
        else if (text[i] === "*" && text[i + 1] === "/") { nest--; i += 2; }
        else i++;
      }
      continue;
    }
    // 'string literal' / "quoted identifier" — copied through untouched, doubled quote escapes.
    if (ch === "'" || ch === '"') {
      const q = ch;
      cur += q;
      i++;
      while (i < n) {
        if (text[i] === q && text[i + 1] === q) { cur += q + q; i += 2; continue; }
        if (text[i] === q) { cur += q; i++; break; }
        cur += text[i++];
      }
      continue;
    }
    // $tag$ dollar-quoted body $tag$.
    if (ch === "$") {
      const tag = /^\$[A-Za-z_-￿][A-Za-z_0-9-￿]*\$|^\$\$/.exec(text.slice(i));
      if (tag) {
        const close = text.indexOf(tag[0], i + tag[0].length);
        const end = close === -1 ? n : close + tag[0].length;
        cur += text.slice(i, end);
        i = end;
        continue;
      }
    }

    if (respectParens && ch === "(") depth++;
    else if (respectParens && ch === ")") depth = Math.max(0, depth - 1);

    if (ch === delimiter && depth === 0) {
      parts.push(cur);
      cur = "";
      i++;
      continue;
    }
    cur += ch;
    i++;
  }

  if (cur.trim()) parts.push(cur);
  return parts;
}

// Split a string on top-level commas (ignoring commas inside parentheses and inside string
// literals), so a multi-clause `ALTER TABLE ... ADD ..., DROP COLUMN ...` is examined
// clause-by-clause.
function splitTopLevel(s) {
  return sqlSplit(s, ",", true);
}

/**
 * Drop SQL line comments (-- ...), then split into normalized statements on ";".
 * Shared by findDestructiveOps() and summarizeDrift() so the two can never disagree
 * about what counts as a statement.
 */
export function splitStatements(sql) {
  return sqlSplit(sql, ";", false)
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
  if (!hasDrift && unrecognized.length === 0) {
    log("SCHEMA_DRIFT_NONE: the live database already matches the schema; `db push` will be a no-op.");
  } else if (!hasDrift) {
    // Deliberately NOT SCHEMA_DRIFT_NONE. There is output we could not classify, so we do not
    // know the database is clean, and printing an all-clear next to a warning would be exactly
    // the false reassurance this change exists to remove.
    log(
      "SCHEMA_DRIFT_UNKNOWN: no recognizable DDL, but the diff produced output this guard could not\n" +
        "classify, so it cannot assert the database matches the schema. The raw output is below.",
    );
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
    if (unrecognized.length > MAX_REPORTED_STATEMENTS) {
      // Say what was dropped. A silent cap reads as "you have seen everything" when you have not.
      log(`  … and ${unrecognized.length - MAX_REPORTED_STATEMENTS} more (truncated at ${MAX_REPORTED_STATEMENTS}).`);
    }
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
    process.exitCode = 1;
    return;
  }
  if (!existsSync(schemaPath)) {
    console.error(`GUARD_INFRA_ERROR: schema not found at ${schemaPath}. Failing closed.`);
    process.exitCode = 1;
    return;
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
    process.exitCode = 1;
    return;
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
    process.exitCode = 1;
    return;
  }

  console.log(
    `✅ guard-immutable-tables: no destructive change to the ${PROTECTED_TABLES.length} protected match-workspace tables.`,
  );
}

// Only run when invoked directly, so tests can import findDestructiveOps() without
// triggering a real diff + process.exit.
const invokedDirectly =
  process.argv[1] && (process.argv[1].endsWith("guard-immutable-tables.mjs") || process.argv[1].endsWith("guard-immutable-tables"));
if (invokedDirectly) {
  // No process.exit() anywhere in main(): on Linux CI stdout is a pipe and therefore
  // ASYNCHRONOUS, so process.exit() discards whatever is still queued. That would drop the
  // drift report this script exists to print, worst of all on the GUARD_BLOCKED path where
  // the findings matter most. Setting process.exitCode and returning lets Node drain both
  // streams and exit on its own; nothing here holds the event loop open (the diff runs via
  // spawnSync, and the retry timers have already fired). Found by a Codex round-1 review.
  main().catch((err) => {
    console.error(`GUARD_INFRA_ERROR: the guard itself threw. Failing closed.\n${err?.stack || err}`);
    process.exitCode = 1;
  });
}
