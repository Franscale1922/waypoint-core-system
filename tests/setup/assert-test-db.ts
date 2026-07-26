/**
 * Fail-closed resolution of the LOCAL test database URL.
 *
 * This is the single safety choke point that guarantees the match-workspace test suite
 * (which runs `prisma db push` and `TRUNCATE ... CASCADE`) can NEVER touch the production
 * Neon database. It is deliberately over-strict: three independent checks must all pass.
 *
 *   1. The test host must be localhost / 127.0.0.1.               (prod Neon never is)
 *   2. The test host must not equal EITHER prod host resolved      (self-updating: robust
 *      live from .env.local at call time.                           to Neon rotating its
 *                                                                    compute-endpoint id)
 *   3. The test database name must contain "test".                 (positive marker)
 *
 * Any failure throws — the suite aborts rather than risk a real database.
 */
import { existsSync } from "node:fs";
import { join } from "node:path";
import { config as dotenvConfig } from "dotenv";

const ROOT = process.cwd();

function loadEnvFile(file: string): Record<string, string> {
  const p = join(ROOT, file);
  if (!existsSync(p)) return {};
  // Parse into a throwaway object so we can inspect prod values without mutating process.env.
  return dotenvConfig({ path: p, processEnv: {} }).parsed ?? {};
}

function hostOf(url: string | undefined): string | null {
  if (!url) return null;
  try {
    return new URL(url).hostname.toLowerCase();
  } catch {
    return null;
  }
}

function dbNameOf(url: string): string {
  try {
    return new URL(url).pathname.replace(/^\//, "").toLowerCase();
  } catch {
    return "";
  }
}

/**
 * Resolve and hard-validate the test DB URL. Returns the URL string on success; throws
 * on any violation. Reads TEST_DATABASE_URL from process.env (populated from .env.test).
 */
export function resolveAndAssertTestUrl(): string {
  // .env.test supplies the test URL; .env.local supplies the prod URLs we must diverge from.
  const testEnv = loadEnvFile(".env.test");
  const localEnv = loadEnvFile(".env.local");

  const testUrl =
    process.env.TEST_DATABASE_URL || testEnv.TEST_DATABASE_URL || "";
  if (!testUrl) {
    throw new Error(
      "TEST_DATABASE_URL is not set (expected in .env.test). Refusing to run tests without an explicit LOCAL test database.",
    );
  }

  const testHost = hostOf(testUrl);
  const testDb = dbNameOf(testUrl);
  const prodPooledHost = hostOf(localEnv.POSTGRES_PRISMA_URL);
  const prodDirectHost = hostOf(localEnv.POSTGRES_URL_NON_POOLING);

  const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1"]);

  if (!testHost || !LOCAL_HOSTS.has(testHost)) {
    throw new Error(
      `TEST_DATABASE_URL host is "${testHost}", not localhost/127.0.0.1. Refusing to run: the test suite truncates data and must only run against a local database.`,
    );
  }
  for (const prodHost of [prodPooledHost, prodDirectHost]) {
    if (prodHost && testHost === prodHost) {
      throw new Error(
        `TEST_DATABASE_URL host matches a PRODUCTION host resolved from .env.local ("${prodHost}"). Refusing to run.`,
      );
    }
  }
  if (!testDb.includes("test")) {
    throw new Error(
      `TEST_DATABASE_URL database name "${testDb}" does not contain "test". Refusing to run as a safety marker.`,
    );
  }

  return testUrl;
}

/** The 8 protected tables, quoted, in an order safe for a single TRUNCATE ... CASCADE. */
export const MATCH_WORKSPACE_TABLES = [
  "Candidate",
  "CandidateInputVersion",
  "MatchRun",
  "MatchScore",
  "MatchCorrection",
  "MatchDecision",
  "MatchOutcomeEvent",
  "ScoringConfig",
];
