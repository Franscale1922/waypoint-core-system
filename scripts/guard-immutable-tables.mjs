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
 * `prisma migrate diff --script` and refuses the build if the SQL contains a destructive
 * operation touching any of the protected match-workspace tables (or the 2 frozen enums). It is
 * DOMAIN-SCOPED on purpose: it protects only the decision-record tables, not the rest of
 * the schema.
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
 * Scan migrate-diff SQL and return an array of {table, statement, reason} for every
 * destructive operation on a protected table/type. Empty array = clean.
 */
export function findDestructiveOps(sql) {
  const findings = [];
  // Drop SQL line comments (-- ...), then split into statements on ";".
  const noComments = sql
    .split("\n")
    .map((line) => line.replace(/--.*$/, ""))
    .join("\n");
  const statements = noComments
    .split(";")
    .map((s) => s.trim().replace(/\s+/g, " "))
    .filter(Boolean);

  for (const stmt of statements) {
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
    { encoding: "utf8", cwd: ROOT, env: process.env },
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
