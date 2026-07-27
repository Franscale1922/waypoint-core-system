/**
 * Who is allowed into the admin surface.
 *
 * ⚠️ ZERO-IMPORT LEAF MODULE. Do not add imports here.
 * This is imported (transitively) by `src/middleware.ts`, which runs on the Edge runtime.
 * Importing anything that reaches Prisma, Node built-ins, or the app's server code would drag
 * them into the Edge bundle and break the build.
 *
 * WHY THIS EXISTS
 * ---------------
 * NextAuth's only authorization check in this app was `!!auth?.user`, i.e. ANY Google account
 * that completed OAuth against this client got full admin access. That is the hole this closes.
 *
 * WHY THE OWNER CONSTANT IS HARDCODED
 * -----------------------------------
 * The allowlist is `ADMIN_EMAILS` (env) UNION a compiled-in owner address. That union is
 * deliberate and it is a safety property, not laziness:
 *   • The threat model is "any stranger's Google account," never "the owner's own address."
 *     Hardcoding the owner closes the hole completely while making lockout IMPOSSIBLE.
 *   • Vercel bakes environment variables into a deployment at build time. If `ADMIN_EMAILS`
 *     were the only source and it were unset or contained a typo, editing the variable would
 *     NOT fix the running deployment; it needs a full redeploy, which on this project also
 *     runs `prisma db push` against the production database. An env-var-only allowlist turns a
 *     one-character typo into "locked out of your own live site until a risky redeploy."
 * `ADMIN_EMAILS` remains the way to grant access to anyone else, without a code change.
 */

/** Compiled-in owner. Confirmed by the account owner as the Google account used for admin. */
const OWNER_EMAIL = "kelsey@waypointfranchise.com";

/** Normalize for comparison: trim + lowercase. Email local-parts are case-insensitive in practice. */
function normalize(email: string): string {
  return email.trim().toLowerCase();
}

/**
 * The full set of allowed admin addresses: the owner plus any configured in `ADMIN_EMAILS`
 * (comma-separated). Exported for tests and for the middleware's in-body re-check.
 */
export function allowedAdminEmails(): Set<string> {
  const allowed = new Set<string>([normalize(OWNER_EMAIL)]);
  for (const entry of (process.env.ADMIN_EMAILS ?? "").split(",")) {
    const normalized = normalize(entry);
    if (normalized) allowed.add(normalized); // skip empty segments from "a,,b" / trailing commas
  }
  return allowed;
}

/**
 * True only for an exact (case-insensitive, trimmed) match against the allowlist.
 * Deliberately exact, never a substring/suffix test, so "notkelsey@waypointfranchise.com.evil.com"
 * and "@waypointfranchise.com" style near-misses are rejected.
 */
export function isAllowedAdmin(email: string | null | undefined): boolean {
  if (!email) return false;
  return allowedAdminEmails().has(normalize(email));
}
