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
