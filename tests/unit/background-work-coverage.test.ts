import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";

/**
 * THE STRUCTURAL GUARD for background work, modelled on tests/auth/route-coverage.test.ts.
 *
 * The behavioural tests pin a hard-coded list of seven routes. An eighth route
 * added next month with a bare `notifyCrm(...)` would pass every one of them,
 * and the failure is invisible: leads stop reaching the CRM with no error
 * anywhere. `notifyCrm` returning a promise made this worse, not better, since a
 * bare call is now a floating promise and no lint rule here catches it
 * (@typescript-eslint/no-floating-promises is not enabled).
 *
 * So: in a request handler, work that outlives the response must be scheduled
 * with afterResponse(), or awaited deliberately. Anything else fails this test.
 */

const ROOT = process.cwd();
const APP_DIR = join(ROOT, "src", "app");

/** Helpers whose whole point is to outlive the response if left unattended. */
const BACKGROUND_CALLS = ["notifyCrm", "subscribeToBeehiiv", "inngest.send"];

/**
 * Routes allowed to await a background helper inline, with the reason. Awaiting
 * is always permitted by the check below; this list exists to document the ones
 * where blocking the response is the deliberate, correct choice.
 */
const BLOCKS_BY_DESIGN: Record<string, string> = {
  "api/newsletter-subscribe/route.ts": "The subscribe IS the endpoint's job; its result is the response.",
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
 * A call is accounted for when the text just before it schedules or awaits it.
 * Deliberately crude and over-inclusive: a false positive costs one line in
 * BLOCKS_BY_DESIGN, a false negative silently drops leads in production.
 */
function isAccountedFor(src: string, index: number): boolean {
  const preceding = src.slice(Math.max(0, index - 220), index);
  return /afterResponse\s*\(/.test(preceding) || /\bawait\s*$/.test(preceding.trimEnd() + " ");
}

describe("request background work is always scheduled or awaited", () => {
  const files = walk(APP_DIR);

  it("finds route files to check (guards against a broken walk silently passing)", () => {
    expect(files.length).toBeGreaterThan(10);
  });

  it("no route fires a background helper bare", () => {
    const offenders: string[] = [];

    for (const file of files) {
      const key = relative(APP_DIR, file).split(sep).join("/");
      const src = readFileSync(file, "utf8");

      for (const call of BACKGROUND_CALLS) {
        const pattern = new RegExp(`\\b${call.replace(".", "\\.")}\\s*\\(`, "g");
        for (const m of src.matchAll(pattern)) {
          if (!isAccountedFor(src, m.index!)) {
            offenders.push(`${key} -> ${call}() is neither scheduled with afterResponse() nor awaited`);
          }
        }
      }
    }

    expect(
      offenders,
      `Background work that can be dropped when the response returns. Wrap it in ` +
        `afterResponse() from @/lib/after-response, or await it deliberately:\n  ` +
        offenders.join("\n  "),
    ).toEqual([]);
  });

  it("no route uses the silent-drop .catch(() => {}) idiom", () => {
    // This is what made the original bug invisible: a rejection handler that
    // discards the error, on a promise nothing was keeping alive anyway.
    const offenders = files
      .map((file) => ({ key: relative(APP_DIR, file).split(sep).join("/"), src: readFileSync(file, "utf8") }))
      .filter(({ src }) => /\.catch\(\s*\(\s*\)\s*=>\s*\{\s*\}\s*\)/.test(src))
      .map(({ key }) => key);

    expect(
      offenders,
      `Silently-discarded rejections. Schedule the work with afterResponse(), which ` +
        `logs failures, instead of swallowing them:\n  ${offenders.join("\n  ")}`,
    ).toEqual([]);
  });

  it("BLOCKS_BY_DESIGN has no stale entries (every listed file still exists)", () => {
    const existing = new Set(
      files.map((f) => relative(APP_DIR, f).split(sep).join("/")).filter((k) => k.startsWith("api/")),
    );
    const stale = Object.keys(BLOCKS_BY_DESIGN).filter((k) => !existing.has(k));
    expect(stale, `Remove these from BLOCKS_BY_DESIGN, the files are gone: ${stale.join(", ")}`).toEqual([]);
  });
});
