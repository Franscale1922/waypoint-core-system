import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";

/**
 * THE STRUCTURAL GUARD.
 *
 * The bug this fixes wasn't "one route lacked auth" — it was that nothing told anyone which
 * routes were unprotected. The middleware matcher looked comprehensive and wasn't, and four
 * route files carried docblocks asserting auth that no code enforced.
 *
 * So: every mutating route handler (POST/PUT/PATCH/DELETE) must either be wrapped in
 * `withAdmin`, or be listed in PUBLIC_BY_DESIGN below with a stated reason. Adding a new
 * unprotected mutating route fails this test — you must consciously classify it.
 */

const ROOT = process.cwd();
// Scan ALL of src/app, not just src/app/api. App Router route handlers are legal anywhere under
// src/app, and this repo already ships four of them outside /api (llms.txt, feed.xml, robots.txt,
// llms-full.txt). Scanning only /api left a whole directory tree where a mutating route could be
// added without this test ever seeing it, and those paths are outside the middleware matcher too.
const APP_DIR = join(ROOT, "src", "app");
const API_DIR = join(APP_DIR, "api");
const MUTATING = ["POST", "PUT", "PATCH", "DELETE"] as const;

/**
 * Routes that are intentionally reachable without an admin session, each with the reason and
 * whatever control actually protects them. Adding an entry here is a deliberate security decision.
 */
const PUBLIC_BY_DESIGN: Record<string, string> = {
  "auth/[...nextauth]/route.ts": "NextAuth's own endpoints — this IS the sign-in flow.",
  "inngest/route.ts": "Inngest handler; verified by INNGEST_SIGNING_KEY.",
  "webhooks/apify/route.ts": "External webhook; guarded by its own shared secret.",
  // beehiiv's create-webhook API takes only a url, event_types and a description:
  // there is no custom-header field, so a Bearer token is not available and the
  // secret rides in the query string, as TidyCal's does. beehiiv also publishes no
  // payload signature, so that secret is the ONLY primary control on this route.
  // Because a write here is irreversible by design (unsuppressEmail refuses any
  // reason but "unsubscribed"), the handler additionally re-checks the claim
  // against beehiiv's own API and refuses any address beehiiv still reports as
  // active. Rotate this secret like a credential, not like a URL.
  "webhooks/beehiiv/route.ts":
    "External webhook; guarded by BEEHIIV_WEBHOOK_SECRET (query param, fail-closed) plus an API re-check.",
  "webhooks/clay/route.ts": "External webhook; guarded by CLAY_WEBHOOK_SECRET (fail-closed).",
  "webhooks/inbound/route.ts": "External webhook; guarded by its own shared secret.",
  // This entry read "guarded by its own signature check" until 2026-08-05. There is
  // no signature check, and there never was. The route calls verifyBearer against
  // INBOUND_WEBHOOK_SECRET, which is a string comparison against a static shared
  // token. Instantly publishes no payload signature, so possession of that token is
  // the entire control: whoever holds it can forge any reply, bounce or unsubscribe
  // event, and this route writes SUPPRESSED leads and SuppressionList rows off those
  // events. It is also not "its own" secret. The same INBOUND_WEBHOOK_SECRET guards
  // webhooks/inbound, so a rotation has to cover both routes and a leak exposes both.
  //
  // The path name is historical and this route has nothing to do with Resend: the
  // handler serves Instantly.ai (payload fields lead_email / reply_text, event_type
  // "reply_received"), and its URL is registered in the Instantly dashboard, so the
  // directory cannot be renamed without re-pointing that registration first. See the
  // docblock in the route itself and docs/COLD_EMAIL_STACK.md.
  "webhooks/resend/route.ts":
    "External webhook (Instantly, despite the path name); guarded by INBOUND_WEBHOOK_SECRET, a static Bearer token shared with webhooks/inbound, checked fail-closed. No payload signature.",
  "webhooks/tidycal/route.ts": "External webhook; guarded by its own shared secret.",
  "leads/retrigger/route.ts": "Ops endpoint; guarded by RETRIGGER_SECRET (fail-closed).",
  "scorecard-complete/route.ts": "Public site quiz submission.",
  "archetype-complete/route.ts": "Public site quiz submission.",
  "capture-email/route.ts": "Public site lead-magnet capture.",
  "escape-kit/route.ts": "Public site lead-magnet capture.",
  "pitch-decoder/route.ts": "Public site lead-magnet capture.",
  "ai-fdd-reader/route.ts": "Public site lead-magnet capture.",
  "newsletter-subscribe/route.ts": "Public site newsletter capture.",
  "contact/route.ts": "Public site contact form.",
  // The opt-out endpoints. POST is the RFC 8058 one-click target, so it is sent
  // by the recipient's MAIL PROVIDER and can carry no admin session by
  // definition. The control is the HMAC in the URL, verified fail-closed before
  // anything is written; POST holds the mutation precisely so that a GET from a
  // scanner or link prefetcher cannot unsubscribe anyone.
  //
  // Know what that token can do before adding another entry here. It is
  // HMAC(secret, recordId) with NO expiry and NO nonce, so anyone who ever saw
  // the URL (a forwarded email, a shared inbox, a mail archive, a scanner log)
  // can replay it forever. It is also not scoped to a list. And its blast radius
  // grew: a POST now suppresses the address across all six lists AND the
  // canonical SuppressionList that gates cold outreach, so one replayed token
  // permanently silences an address on every channel. That is the right default
  // for an opt-out and the wrong thing to widen further.
  //
  // EXPIRY WAS CONSIDERED AND DECLINED. Under RFC 8058 the POST is sent by the
  // recipient's MAIL PROVIDER, sometimes long after the message was delivered,
  // so any expiry short enough to shrink the replay window also starts failing
  // real one-click unsubscribes. A failed opt-out is a CAN-SPAM and
  // deliverability problem; a replayed one is griefing. Failing an opt-out
  // closed is the wrong direction, so the token deliberately stays permanent.
  //
  // What changed instead is that the damage is now REVERSIBLE: unsuppressEmail
  // plus /api/admin/resubscribe let an admin undo a wrong opt-out without a
  // hand-written database edit. Binding the token to its list was declined for a
  // separate reason: resolve() already looks the id up in that route's own
  // model, so a cross-route replay returns not-found, and a POST suppresses
  // every list regardless. The binding would buy nothing.
  "unsubscribe/route.ts": "Public opt-out; permanent HMAC token in the URL, no expiry or nonce. Suppresses the address on EVERY list; reversible only via /api/admin/resubscribe.",
  "escape-kit-unsubscribe/route.ts": "Public opt-out; permanent HMAC token in the URL, no expiry or nonce. Suppresses the address on EVERY list; reversible only via /api/admin/resubscribe.",
  "pitch-decoder-unsubscribe/route.ts": "Public opt-out; permanent HMAC token in the URL, no expiry or nonce. Suppresses the address on EVERY list; reversible only via /api/admin/resubscribe.",
  "ai-fdd-reader-unsubscribe/route.ts": "Public opt-out; permanent HMAC token in the URL, no expiry or nonce. Suppresses the address on EVERY list; reversible only via /api/admin/resubscribe.",
  "scorecard-unsubscribe/route.ts": "Public opt-out; permanent HMAC token in the URL, no expiry or nonce. Suppresses the address on EVERY list; reversible only via /api/admin/resubscribe.",
  "archetype-unsubscribe/route.ts": "Public opt-out; permanent HMAC token in the URL, no expiry or nonce. Suppresses the address on EVERY list; reversible only via /api/admin/resubscribe.",
};

function walk(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) out.push(...walk(full));
    else if (entry === "route.ts" || entry === "route.tsx") out.push(full);
  }
  return out;
}

/**
 * Exported HTTP methods in a route file. Covers every shape Next.js accepts:
 *   export async function POST(…)            the common one
 *   export const POST = withAdmin(…)         what this branch introduces
 *   export const { GET, POST } = handlers    destructured (NextAuth + Inngest use this)
 *   export { handler as POST }               aliased re-export
 *   export { POST }                          plain re-export
 * Every one of these was found by an adversarial reviewer who wrote a mutating route in that
 * shape and watched this test stay green. Detection is deliberately over-inclusive: a false
 * positive costs one line in PUBLIC_BY_DESIGN, a false negative ships an open endpoint.
 */
function exportedMethods(src: string): string[] {
  const found = new Set<string>();
  // `export const { GET, POST } = …` and `export { handler as POST, GET }`
  const braced = [
    ...src.matchAll(/export\s+(?:const\s*)?\{([^}]*)\}\s*(?:=|from|;|$)/gm),
  ]
    .map((m) => m[1])
    .join(",");
  for (const m of MUTATING) {
    const asFunction = new RegExp(`export\\s+(?:async\\s+)?function\\s+${m}\\b`);
    const asConst = new RegExp(`export\\s+const\\s+${m}\\s*=`);
    // Matches both `POST` and `handler as POST` inside a braced export clause.
    const inBraced = new RegExp(`(?:\\bas\\s+)?\\b${m}\\b`).test(braced);
    if (asFunction.test(src) || asConst.test(src) || inBraced) found.add(m);
  }
  return [...found];
}

/** Prisma calls that write. Used to catch a GET handler that mutates. */
const WRITE_CALL = /prisma\s*\.\s*\w+\s*\.\s*(create|createMany|update|updateMany|upsert|delete|deleteMany)\b/;

/** Does the file export a GET (in any shape)? */
function exportsGet(src: string): boolean {
  const braced = [...src.matchAll(/export\s+(?:const\s*)?\{([^}]*)\}\s*(?:=|from|;|$)/gm)]
    .map((m) => m[1])
    .join(",");
  return (
    /export\s+(?:async\s+)?function\s+GET\b/.test(src) ||
    /export\s+const\s+GET\s*=/.test(src) ||
    /(?:\bas\s+)?\bGET\b/.test(braced)
  );
}

/**
 * Route handlers outside src/app/api that are read-only content endpoints. Listed explicitly so
 * a NEW file appearing outside /api has to be classified rather than silently trusted.
 */
const NON_API_READONLY = new Set([
  "llms.txt/route.ts",
  "llms-full.txt/route.ts",
  "feed.xml/route.ts",
  "robots.txt/route.ts",
]);

/**
 * GET handlers that legitimately write. Each must be protected by something other than a
 * session, because they are reached from an email link with no cookie.
 */
const MUTATING_GET_BY_DESIGN: Record<string, string> = {
  "api/unsubscribe/route.ts": "One-click unsubscribe from an email link; HMAC-signed token.",
  "api/scorecard-unsubscribe/route.ts": "Unsubscribe from an email link; HMAC-signed token.",
  "api/archetype-unsubscribe/route.ts": "Unsubscribe from an email link; HMAC-signed token.",
  "api/escape-kit-unsubscribe/route.ts": "Unsubscribe from an email link; HMAC-signed token.",
  "api/pitch-decoder-unsubscribe/route.ts": "Unsubscribe from an email link; HMAC-signed token.",
  "api/ai-fdd-reader-unsubscribe/route.ts": "Unsubscribe from an email link; HMAC-signed token.",
};

describe("API route auth coverage", () => {
  const files = walk(APP_DIR);

  it("finds route files to check (guards against a broken glob silently passing)", () => {
    expect(files.length).toBeGreaterThan(10);
  });

  it("every mutating route is either withAdmin-wrapped or explicitly public-by-design", () => {
    const unprotected: string[] = [];

    for (const file of files) {
      const key = relative(APP_DIR, file).split(sep).join("/");
      const src = readFileSync(file, "utf8");
      const methods = exportedMethods(src);
      if (methods.length === 0) continue; // read-only route
      if (NON_API_READONLY.has(key)) continue;
      // PUBLIC_BY_DESIGN keys are api-relative; normalize.
      if (key.startsWith("api/") && key.slice(4) in PUBLIC_BY_DESIGN) continue;

      // The export must be assigned from withAdmin(...) AND the file must actually import the
      // real wrapper. A locally-defined `withAdmin` shadow would otherwise satisfy a text match.
      const importsWrapper =
        /import\s*\{[^}]*\bwithAdmin\b[^}]*\}\s*from\s*["']@\/lib\/with-admin["']/.test(src);
      for (const m of methods) {
        const wrapped = new RegExp(`export\\s+const\\s+${m}\\s*=\\s*withAdmin\\s*\\(`).test(src);
        if (!wrapped) unprotected.push(`${key} → ${m} (not wrapped)`);
        else if (!importsWrapper) unprotected.push(`${key} → ${m} (withAdmin is not the real one)`);
      }
    }

    expect(
      unprotected,
      `Unprotected mutating route handler(s). Wrap with withAdmin() imported from ` +
        `@/lib/with-admin, or add the file to PUBLIC_BY_DESIGN with a reason:\n  ` +
        unprotected.join("\n  "),
    ).toEqual([]);
  });

  it("no GET handler writes to the database unless explicitly classified", () => {
    // A mutating GET is invisible to the check above, since GET is not in MUTATING. The repo has
    // six legitimate ones (email-link unsubscribes, HMAC-protected); anything new must be listed.
    const offenders: string[] = [];
    for (const file of files) {
      const key = relative(APP_DIR, file).split(sep).join("/");
      const src = readFileSync(file, "utf8");
      if (!exportsGet(src) || !WRITE_CALL.test(src)) continue;
      if (key in MUTATING_GET_BY_DESIGN) continue;
      // A GET in a file whose writes all sit inside withAdmin-wrapped mutating handlers is fine.
      if (/export\s+const\s+GET\s*=\s*withAdmin\s*\(/.test(src)) continue;
      offenders.push(key);
    }
    expect(
      offenders,
      `GET handler(s) that write to the database. Gate them, or add to MUTATING_GET_BY_DESIGN ` +
        `with the control that actually protects them:\n  ${offenders.join("\n  ")}`,
    ).toEqual([]);
  });

  it("PUBLIC_BY_DESIGN has no stale entries (every listed file still exists)", () => {
    const existing = new Set(
      files
        .map((f) => relative(APP_DIR, f).split(sep).join("/"))
        .filter((k) => k.startsWith("api/"))
        .map((k) => k.slice(4)),
    );
    const stale = Object.keys(PUBLIC_BY_DESIGN).filter((k) => !existing.has(k));
    expect(stale, `Remove these from PUBLIC_BY_DESIGN — the files are gone: ${stale.join(", ")}`).toEqual([]);
  });

  it("the two verified-dead admin routes stay deleted", () => {
    const keys = files.map((f) => relative(API_DIR, f).split(sep).join("/"));
    void APP_DIR;
    expect(keys).not.toContain("admin/suppress-lead/route.ts");
    expect(keys).not.toContain("admin/settings/route.ts");
  });
});
