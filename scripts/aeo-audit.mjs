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

// ─── Section 11 em-dash guard across rendered code (src/app, src/data) ───────
// CONTENT-STANDARDS Section 11 bans em dashes in ALL public-facing and
// agent-generated copy, not just markdown. The per-article scan above only
// covers content/articles, which is exactly why UI and data-layer violations
// accumulated undetected. This walks the code that renders to users/agents and
// FAILS the run (exit 1) if any em dash remains, so the rule is enforceable in CI.
const EMDASH = String.fromCharCode(0x2014); // avoid putting a literal em dash in this file
const CODE_DIRS = ["src/app", "src/data"];
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
  .map((f) => ({ f, count: fs.readFileSync(f, "utf8").split(EMDASH).length - 1 }))
  .filter((r) => r.count > 0)
  .sort((a, b) => b.count - a.count);
const totalCodeEmdash = emdashViolations.reduce((s, r) => s + r.count, 0);
const articleEmdash = rows.reduce((s, r) => s + r.emdash, 0);

console.log(`\nSection 11 em dashes in src/app + src/data (banned): ${totalCodeEmdash} across ${emdashViolations.length} files`);
for (const r of emdashViolations.slice(0, 20)) console.log(`  ${r.f} (${r.count})`);
if (emdashViolations.length > 20) console.log(`  ... and ${emdashViolations.length - 20} more`);

if (totalCodeEmdash > 0 || articleEmdash > 0) {
  console.log(`\nFAIL Section 11: ${totalCodeEmdash + articleEmdash} em dashes total (articles: ${articleEmdash}, code: ${totalCodeEmdash}). Remove every em dash.`);
  process.exitCode = 1;
} else {
  console.log(`\nPASS Section 11: 0 em dashes in articles, src/app, or src/data.`);
}
