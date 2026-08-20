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
 * Run: node scripts/verify-schema.mjs   (run by `npm test`, the .githooks/pre-push
 * hook, and the Verify Internal Links workflow. The docstring previously claimed
 * `seo-review` ran it; that was never true.)
 */
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { checkFaqVisibility } from "./lib/faq-visibility.mjs";

const ROOT = process.cwd();
const APP_DIR = join(ROOT, "src", "app");
// Single-source content/links now also live outside src/app: data files in
// src/data and the markdown view generators. Scan these too so a non-www URL
// added there can't escape the canonical-host guard below.
const DATA_DIR = join(ROOT, "src", "data");
// Named individually rather than by walking all of src/lib: that directory also
// holds src/lib/pdf-magnet-email.ts, whose non-www URL sits in an email body and
// is legitimately exempt. Add a file here when it starts emitting site links.
const EXTRA_FILES = [
  join(ROOT, "src", "lib", "markdown-views.ts"),
  join(ROOT, "src", "lib", "llms-index.ts"),
  join(ROOT, "src", "lib", "markdown-negotiable.ts"),
];
const STRUCTURED_DATA = join(APP_DIR, "lib", "structured-data.ts");

// Paths whose non-www URLs are legitimately out of scope (email bodies, the RSS
// fallback, server-only job/handler code — not page schema).
//
// /llms.txt was exempt here until 2026-08-20 as "agent plaintext". That was the
// wrong call and it cost a real defect: the exemption is precisely why a non-www
// /book link sat in the live llms.txt, putting a 301 hop on the URL an agent is
// most likely to follow. The route now builds every link from SITE_URL and holds
// no literal origin, so it is covered like everything else. Note this pattern
// never matched llms-full.txt, which was always covered.
const NON_WWW_EXEMPT = [
  /\/emails\//,
  /\/api\//,
  /\/inngest\//,
  /feed\.xml/,
];

const errors = [];
const warnings = [];

function walk(dir) {
  if (!existsSync(dir)) return [];
  const out = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) out.push(...walk(full));
    else if (/\.tsx?$/.test(entry)) out.push(full);
  }
  return out;
}

const files = [...walk(APP_DIR), ...walk(DATA_DIR), ...EXTRA_FILES.filter((f) => existsSync(f))];

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

// 4) FAQPage markup must correspond to FAQ content that is visible on the page.
//    Google ignores (and can penalise) FAQ markup whose Q&A is not rendered. On
//    2026-08-04 /investment was found emitting four Q&As that appeared nowhere:
//    the schema array and the on-page array were disjoint literals with zero
//    overlap. This enforces the one-shared-array pattern that makes that class of
//    drift impossible. See scripts/lib/faq-visibility.mjs for the rule and its
//    documented limits.
const faq = checkFaqVisibility({
  files,
  readFile: (f) => readFileSync(f, "utf8"),
  root: ROOT,
  relative: (f) => relative(ROOT, f),
});
errors.push(...faq.errors);
warnings.push(...faq.warnings);

if (process.argv.includes("--verbose")) {
  for (const s of faq.sites) {
    console.log(`  faq: ${s.file}:${s.line} ${s.root ?? "(directive)"} rendered at ${s.via}`);
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
// The FAQ count is in the success line on purpose. A green line with no number
// in it is indistinguishable from a checker that silently stopped checking,
// which is exactly how verify-links.mjs passed while validating zero slugs.
console.log(
  `✅ verify-schema passed (${files.length} files scanned, ` +
    `${faq.siteCount} FAQPage call site(s) verified visible, ${warnings.length} warning(s)).`,
);
