#!/usr/bin/env node
/**
 * aeo-audit.mjs
 *
 * Deterministic AEO/structure audit across all articles in content/articles.
 * Reports per-article: FAQ block coverage, question-format H2 ratio,
 * relatedSlugs count, em dashes (banned), date qualifiers, word count, and
 * long lead paragraphs (which can bury the direct answer).
 *
 * This is a heuristic scanner, not a validator — use it to FIND candidates for
 * review, then read each flagged article and apply judgment per
 * content/CONTENT-STANDARDS.md. Run from the repo root:
 *
 *   npm run aeo-audit
 */
import fs from "fs";
import path from "path";

const DIR = "content/articles";
const files = fs.readdirSync(DIR).filter((f) => f.endsWith(".md"));

function splitFM(raw) {
  const m = raw.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!m) return { fm: "", body: raw };
  return { fm: m[1], body: m[2] };
}

const rows = [];
for (const f of files) {
  const raw = fs.readFileSync(path.join(DIR, f), "utf8");
  const { fm, body } = splitFM(raw);

  const faqCount = (fm.match(/^\s*-\s*q:/gm) || []).length;
  let relCount = 0;
  const relBlock = fm.match(/relatedSlugs:\n([\s\S]*?)(?:\n\w|\n*$)/);
  if (relBlock) relCount = (relBlock[1].match(/^\s*-\s+/gm) || []).length;

  const h2s = body.match(/^##\s+.+$/gm) || [];
  const h2q = h2s.filter((h) => h.trim().endsWith("?")).length;

  const words = body.replace(/[#>*`\-]/g, " ").split(/\s+/).filter(Boolean).length;
  const emdash = (body.match(/—/g) || []).length;
  const hasAsOf = /as of (20\d\d|\[year\])/i.test(body);
  const firstPara = body.trim().split(/\n\n/)[0] || "";

  rows.push({ f: f.replace(".md", ""), words, h2: h2s.length, h2q, faqCount, relCount, emdash, hasAsOf, leadLen: firstPara.length });
}

const n = rows.length;
const noFaq = rows.filter((r) => r.faqCount === 0);
const lowFaq = rows.filter((r) => r.faqCount > 0 && r.faqCount < 4);
const noQH2 = rows.filter((r) => r.h2 > 0 && r.h2q === 0);
const relNot3 = rows.filter((r) => r.relCount !== 3);
const emdashed = rows.filter((r) => r.emdash > 0);
const thin = rows.filter((r) => r.words < 900);
const longLead = rows.filter((r) => r.leadLen > 320);

const list = (arr, fmt = (r) => r.f) => (arr.length ? " -> " + arr.map(fmt).join(", ") : "");

console.log(`TOTAL ARTICLES: ${n}\n`);
console.log(`FAQ frontmatter:`);
console.log(`  missing entirely: ${noFaq.length}${list(noFaq)}`);
console.log(`  fewer than 4 Q: ${lowFaq.length}${list(lowFaq, (r) => `${r.f}(${r.faqCount})`)}`);
console.log(`\nQuestion-format H2s (AEO extraction):`);
console.log(`  zero question H2s: ${noQH2.length}${list(noQH2)}`);
console.log(`\nrelatedSlugs != 3: ${relNot3.length}${list(relNot3, (r) => `${r.f}(${r.relCount})`)}`);
console.log(`\nEm dashes in body (banned): ${emdashed.length}${list(emdashed, (r) => `${r.f}(${r.emdash})`)}`);
console.log(`\nDate qualifier "as of YYYY": present in ${rows.filter((r) => r.hasAsOf).length}/${n}`);
console.log(`\nThin (<900 words): ${thin.length}${list(thin, (r) => `${r.f}(${r.words})`)}`);
console.log(`Long lead paragraph (>320 chars): ${longLead.length}${list(longLead, (r) => `${r.f}(${r.leadLen})`)}`);

// ─── Section 11 em-dash guard across all of src/ ────────────────────────────
// CONTENT-STANDARDS Section 11 bans em dashes in ALL public-facing and
// agent-generated copy, not just markdown. The per-article scan above only
// covers content/articles, which is exactly why UI, data-layer, and agent/email
// copy violations accumulated undetected. This walks ALL of src/ and FAILS the
// run (exit 1) if any em dash remains.
//
// Escape hatch: a line containing the token "emdash-allow" is skipped, for the
// rare legitimately-functional em dash (e.g. the literal em dash in a banned-
// character detector array). Use sparingly and only for non-copy code.
const EMDASH = String.fromCharCode(0x2014); // avoid a literal em dash in this file
const ALLOW = "emdash-allow";
const CODE_DIRS = ["src"];
const CODE_EXT = /\.(tsx?|css)$/;
function walk(dir, acc = []) {
  if (!fs.existsSync(dir)) return acc;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) walk(full, acc);
    else if (CODE_EXT.test(e.name)) acc.push(full);
  }
  return acc;
}
const codeFiles = CODE_DIRS.flatMap((d) => walk(d));
const emdashViolations = codeFiles
  .map((f) => {
    // Count em dashes line-by-line, skipping any line that opts out via ALLOW.
    const count = fs
      .readFileSync(f, "utf8")
      .split("\n")
      .filter((line) => !line.includes(ALLOW))
      .reduce((s, line) => s + line.split(EMDASH).length - 1, 0);
    return { f, count };
  })
  .filter((r) => r.count > 0)
  .sort((a, b) => b.count - a.count);
const totalCodeEmdash = emdashViolations.reduce((s, r) => s + r.count, 0);
const articleEmdash = rows.reduce((s, r) => s + r.emdash, 0);

console.log(`\nSection 11 em dashes in src/ (banned): ${totalCodeEmdash} across ${emdashViolations.length} files`);
for (const r of emdashViolations.slice(0, 20)) console.log(`  ${r.f} (${r.count})`);
if (emdashViolations.length > 20) console.log(`  ... and ${emdashViolations.length - 20} more`);

if (totalCodeEmdash > 0 || articleEmdash > 0) {
  console.log(`\nFAIL Section 11: ${totalCodeEmdash + articleEmdash} em dashes total (articles: ${articleEmdash}, src/: ${totalCodeEmdash}). Remove every em dash (or mark a functional one with "${ALLOW}").`);
  process.exitCode = 1;
} else {
  console.log(`\nPASS Section 11: 0 em dashes in articles or src/.`);
}

// ─── Brand-duplication guard (title template safety) ────────────────────────
// The root layout applies title.template "%s | Waypoint Franchise Advisors".
// Any title fed into that %s that ALSO hard-codes the brand renders it twice,
// e.g. "Foo | Waypoint Franchise Advisors | Waypoint Franchise Advisors".
// Page-level metadata titles are visible in a page diff and caught in review;
// the data-layer sources below are invisible there, so they are the real
// regression risk and get guarded here.
//
// Scope is deliberately narrow to avoid false positives: only article
// frontmatter `title:` and `metaTitle:` in src/data feed the template. openGraph
// and JSON-LD schema titles legitimately keep the brand and are NOT scanned.
const BRAND = "Waypoint Franchise Advisors";
const brandDupes = [];

// (a) article frontmatter titles
for (const f of files) {
  const { fm } = splitFM(fs.readFileSync(path.join(DIR, f), "utf8"));
  const titleLine = fm.split("\n").find((l) => /^\s*title:/.test(l));
  if (titleLine && titleLine.includes(BRAND)) {
    brandDupes.push(`content/articles/${f} (frontmatter title)`);
  }
}

// (b) metaTitle values in the data layer (any src/data/*.ts, so new data files
//     are covered automatically)
const DATA_DIR = "src/data";
const dataFiles = fs.existsSync(DATA_DIR)
  ? fs.readdirSync(DATA_DIR).filter((f) => f.endsWith(".ts"))
  : [];
for (const f of dataFiles) {
  fs.readFileSync(path.join(DATA_DIR, f), "utf8")
    .split("\n")
    .forEach((line, i) => {
      if (/metaTitle:/.test(line) && line.includes(BRAND)) {
        brandDupes.push(`src/data/${f}:${i + 1} (metaTitle)`);
      }
    });
}

console.log(`\nBrand duplication in template-fed titles (banned): ${brandDupes.length}`);
for (const d of brandDupes) console.log(`  ${d}`);

if (brandDupes.length > 0) {
  console.log(`\nFAIL: ${brandDupes.length} title source(s) hard-code "${BRAND}". The root layout's title.template already appends it, so these render the brand twice. Remove the brand from the metaTitle/frontmatter title and let the template add it once.`);
  process.exitCode = 1;
} else {
  console.log(`PASS: no brand duplication in template-fed titles.`);
}
