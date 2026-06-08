#!/usr/bin/env node
/**
 * Static guardrails for the JSON-LD / structured-data surface.
 *
 * The entity graph now spans many files with cross-script @id references and a
 * few deliberate decisions (no self-serving review markup, www-only canonical
 * hosts, JSON-LD rendered through the escaping <JsonLd> component). Nothing else
 * guards those, so this script fails the build/CI if a future edit regresses one.
 *
 * It is intentionally a fast static check (no server, no deps). Deep @id-resolution
 * validation against rendered HTML is a separate, heavier concern.
 *
 * Run: node scripts/verify-schema.mjs   (wired into the `seo-review` npm script)
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const ROOT = process.cwd();
const APP_DIR = join(ROOT, "src", "app");
const STRUCTURED_DATA = join(APP_DIR, "lib", "structured-data.ts");

// Paths whose non-www URLs are legitimately out of scope (email bodies, the RSS
// fallback, agent plaintext, server-only job/handler code — not page schema).
const NON_WWW_EXEMPT = [
  /\/emails\//,
  /\/api\//,
  /\/inngest\//,
  /feed\.xml/,
  /llms\.txt/,
];

const errors = [];
const warnings = [];

function walk(dir) {
  const out = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) out.push(...walk(full));
    else if (/\.(tsx?|ts)$/.test(entry)) out.push(full);
  }
  return out;
}

const files = walk(APP_DIR);

// 1) No self-serving review/rating markup reintroduced on the business entity.
//    Match the property-assignment / typed-node FORM (not the word in a comment),
//    so the explanatory "…aggregateRating omitted…" note doesn't false-positive.
const sd = readFileSync(STRUCTURED_DATA, "utf8");
const reviewPatterns = [
  /aggregateRating\s*:/,
  /reviewRating\s*:/,
  /"@type"\s*:\s*"Review"/,
];
for (const re of reviewPatterns) {
  if (re.test(sd)) {
    errors.push(
      `structured-data.ts reintroduced ${re} — self-serving review/rating markup ` +
        `is disallowed on the LocalBusiness/Organization entity (Google policy).`,
    );
  }
}

// 2) No non-www canonical host leakage in page/schema files (www is canonical).
const NON_WWW = /https?:\/\/waypointfranchise\.com/g; // i.e. missing the www.
for (const file of files) {
  const rel = relative(ROOT, file);
  if (NON_WWW_EXEMPT.some((re) => re.test(rel))) continue;
  const src = readFileSync(file, "utf8");
  const hits = src.match(NON_WWW);
  if (hits) {
    errors.push(`${rel}: ${hits.length} non-www "waypointfranchise.com" URL(s) — use https://www.…`);
  }
}

// 3) Enforce the escaping <JsonLd> component: no raw application/ld+json <script>
//    tags in JSX (which skip the "<" → < escaping that prevents </script>
//    breakout). Only .tsx files render JSX; .ts files mentioning the tag in a
//    docstring are not a render site.
for (const file of files) {
  const rel = relative(ROOT, file);
  if (!file.endsWith(".tsx")) continue;
  if (rel.endsWith(join("components", "JsonLd.tsx"))) continue;
  const src = readFileSync(file, "utf8");
  if (src.includes('type="application/ld+json"')) {
    warnings.push(`${rel}: raw application/ld+json <script> — prefer the <JsonLd> component (escapes "<").`);
  }
}

if (warnings.length) {
  console.warn("\n⚠ verify-schema warnings:");
  for (const w of warnings) console.warn("  - " + w);
}
if (errors.length) {
  console.error("\n❌ verify-schema FAILED:");
  for (const e of errors) console.error("  - " + e);
  process.exit(1);
}
console.log(`✅ verify-schema passed (${files.length} files scanned, ${warnings.length} warning(s)).`);
