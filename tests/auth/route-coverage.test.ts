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
const API_DIR = join(ROOT, "src", "app", "api");
const MUTATING = ["POST", "PUT", "PATCH", "DELETE"] as const;

/**
 * Routes that are intentionally reachable without an admin session, each with the reason and
 * whatever control actually protects them. Adding an entry here is a deliberate security decision.
 */
const PUBLIC_BY_DESIGN: Record<string, string> = {
  "auth/[...nextauth]/route.ts": "NextAuth's own endpoints — this IS the sign-in flow.",
  "inngest/route.ts": "Inngest handler; verified by INNGEST_SIGNING_KEY.",
  "webhooks/apify/route.ts": "External webhook; guarded by its own shared secret.",
  "webhooks/clay/route.ts": "External webhook; guarded by CLAY_WEBHOOK_SECRET (fail-closed).",
  "webhooks/inbound/route.ts": "External webhook; guarded by its own shared secret.",
  "webhooks/resend/route.ts": "External webhook; guarded by its own signature check.",
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
 * Exported HTTP methods in a route file. Covers all three shapes Next.js accepts:
 *   export async function POST(…)          — the common one
 *   export const POST = withAdmin(…)       — what this branch introduces
 *   export const { GET, POST } = handlers  — destructured (NextAuth + Inngest use this)
 * The destructured form is included deliberately: an early version of this test missed it, which
 * would have let a whole class of mutating route ship without ever being classified.
 */
function exportedMethods(src: string): string[] {
  const found = new Set<string>();
  const destructured = [...src.matchAll(/export\s+const\s*\{([^}]*)\}\s*=/g)]
    .map((m) => m[1])
    .join(",");
  for (const m of MUTATING) {
    const asFunction = new RegExp(`export\\s+(?:async\\s+)?function\\s+${m}\\b`);
    const asConst = new RegExp(`export\\s+const\\s+${m}\\s*=`);
    const inDestructured = new RegExp(`\\b${m}\\b`).test(destructured);
    if (asFunction.test(src) || asConst.test(src) || inDestructured) found.add(m);
  }
  return [...found];
}

describe("API route auth coverage", () => {
  const files = walk(API_DIR);

  it("finds route files to check (guards against a broken glob silently passing)", () => {
    expect(files.length).toBeGreaterThan(10);
  });

  it("every mutating route is either withAdmin-wrapped or explicitly public-by-design", () => {
    const unprotected: string[] = [];

    for (const file of files) {
      const key = relative(API_DIR, file).split(sep).join("/");
      const src = readFileSync(file, "utf8");
      const methods = exportedMethods(src);
      if (methods.length === 0) continue; // read-only route
      if (key in PUBLIC_BY_DESIGN) continue;

      // Each mutating export must be assigned from withAdmin(...)
      for (const m of methods) {
        const wrapped = new RegExp(`export\\s+const\\s+${m}\\s*=\\s*withAdmin\\s*\\(`).test(src);
        if (!wrapped) unprotected.push(`${key} → ${m}`);
      }
    }

    expect(
      unprotected,
      `Unprotected mutating route handler(s). Wrap with withAdmin(), or add the file to ` +
        `PUBLIC_BY_DESIGN with a reason:\n  ${unprotected.join("\n  ")}`,
    ).toEqual([]);
  });

  it("PUBLIC_BY_DESIGN has no stale entries (every listed file still exists)", () => {
    const existing = new Set(files.map((f) => relative(API_DIR, f).split(sep).join("/")));
    const stale = Object.keys(PUBLIC_BY_DESIGN).filter((k) => !existing.has(k));
    expect(stale, `Remove these from PUBLIC_BY_DESIGN — the files are gone: ${stale.join(", ")}`).toEqual([]);
  });

  it("the two verified-dead admin routes stay deleted", () => {
    const keys = files.map((f) => relative(API_DIR, f).split(sep).join("/"));
    expect(keys).not.toContain("admin/suppress-lead/route.ts");
    expect(keys).not.toContain("admin/settings/route.ts");
  });
});
