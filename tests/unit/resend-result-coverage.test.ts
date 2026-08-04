import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

/**
 * Every Resend call in the codebase must have its result inspected.
 *
 * The SDK resolves with `{ data, error }` instead of rejecting, so `await
 * resend.emails.send(...)` on its own treats a rejected recipient, an exhausted
 * quota and a 5xx as success. That shape is invisible at a glance and was
 * present at every one of the 19 call sites, which is why this is a scan rather
 * than a test of any single route: the next send someone writes will look
 * exactly as correct as the broken ones did.
 */

const ROOT = process.cwd();

function walk(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) out.push(...walk(full));
    else if (full.endsWith(".ts") || full.endsWith(".tsx")) out.push(full);
  }
  return out;
}

const CALL = /(?:const\s+(\w+)\s*=\s*)?await\s+resend\.emails\.send\(/g;

/**
 * Drops comments before scanning. Several of these files DESCRIBE the broken
 * shape in prose (that is the point of the comment), and a scanner that cannot
 * tell an explanation from a call site reports the documentation as the defect.
 * Whole-line handling only, so a URL inside a string is never touched.
 */
function stripComments(src: string): string {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .split("\n")
    .filter((line) => !/^\s*(\/\/|\*)/.test(line))
    .join("\n");
}

describe("Resend result coverage", () => {
  const files = walk(join(ROOT, "src")).filter((f) =>
    stripComments(readFileSync(f, "utf8")).includes("resend.emails.send(")
  );

  it("finds the call sites at all, so this cannot pass vacuously", () => {
    expect(files.length).toBeGreaterThan(0);
  });

  it.each(files.map((f) => [f.slice(ROOT.length + 1), f]))("%s assigns and inspects every send", (_rel, file) => {
    const src = stripComments(readFileSync(file, "utf8"));
    const unchecked: string[] = [];
    const calls = [...src.matchAll(CALL)];

    calls.forEach((m, i) => {
      const variable = m[1];
      if (!variable) {
        unchecked.push(`line ${src.slice(0, m.index).split("\n").length}: result discarded entirely`);
        return;
      }
      // Bounded to THIS call site, ending where the next one begins. Searching
      // the whole remainder of the file let seven sends that share the name
      // `sendResult` cover for each other: drop one check and the six below it
      // still satisfied the scan.
      const region = src.slice(m.index, calls[i + 1]?.index ?? src.length);
      // The reference has to sit in a GUARD, not merely appear. Interpolating
      // the error into a message satisfies "is mentioned" while branching on
      // nothing, which is the same silent success this scan exists to stop.
      const guarded =
        new RegExp(`if\\s*\\(\\s*${variable}\\.error`).test(region) ||
        new RegExp(`resendFailed\\([^)]*${variable}\\s*\\)`).test(region);
      if (!guarded) unchecked.push(`line ${src.slice(0, m.index).split("\n").length}: ${variable}`);
    });

    expect(unchecked, `unchecked Resend result(s) in ${file}`).toEqual([]);
  });
});
