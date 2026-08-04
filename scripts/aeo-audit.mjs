#!/usr/bin/env node
/**
 * aeo-audit.mjs
 *
 * Deterministic AEO/structure audit across all articles in content/articles,
 * plus the Section 11 em-dash gate and the Section 14 brand/title gate over
 * src/. This is the pre-push gate: .githooks/pre-push runs it first and blocks
 * the push on a non-zero exit. CI runs it too (.github/workflows/verify-links.yml).
 *
 * Per-article it reports FAQ coverage, question-format H2 ratio, relatedSlugs
 * count, em dashes (banned), date qualifiers, word count, and long lead
 * paragraphs (which can bury the direct answer).
 *
 * The article checks are heuristics, not a validator: use them to FIND
 * candidates for review, then read each flagged article and apply judgment per
 * content/CONTENT-STANDARDS.md. The excerpt/description, em-dash and brand
 * checks below are NOT heuristics; they fail the run.
 *
 * ── Why this file parses instead of regexing ────────────────────────────────
 * Front matter is read with gray-matter, the same parser (and therefore the
 * same YAML semantics) production uses in src/lib/articles.ts. An earlier
 * version regexed the raw front-matter text, which meant a CRLF checkout
 * silently produced zero FAQs and null excerpts, a single-quoted excerpt was
 * "unparseable", and `- q:` keys were counted across the whole block instead of
 * within `faqs:`. verify-links.mjs was rewritten for exactly this class of bug
 * after its regex matched nothing in all 45 articles and reported green for
 * months. The failure mode that matters here is not "a violation slipped
 * through", it is "the checker stopped checking and still printed PASS".
 *
 * Run: node scripts/aeo-audit.mjs   (or npm run aeo-audit)
 * Unit tests: tests/unit/aeo-audit.test.ts
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import matter from "gray-matter";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.join(__dirname, "..");

export const DEFAULT_ARTICLES_DIR = path.join(REPO_ROOT, "content", "articles");
export const DEFAULT_APP_DIR = path.join(REPO_ROOT, "src", "app");
export const DEFAULT_DATA_DIR = path.join(REPO_ROOT, "src", "data");
export const DEFAULT_CODE_DIRS = [path.join(REPO_ROOT, "src")];

// CONTENT-STANDARDS Section 4 requires a search-snippet-ready excerpt, and the
// seo-review workflow's Step 3 puts the target at 150-160 characters.
//
// Over 160 is a hard failure because it does actual damage: the description is
// truncated mid-sentence in the SERP, in social previews, and in the JSON-LD
// that answer engines read. Under 150 is only wasted space, so it is reported
// and not enforced. When this guard was added, 43 of 45 articles were over and
// exactly 0 were inside the window, which is how a whole-catalogue defect stayed
// invisible while every other AEO check passed.
export const EXCERPT_MAX = 160;
export const EXCERPT_MIN = 150;

// Google renders roughly 60 characters of a title. Anything past that is
// truncated, so the budget is the suffix plus the page's own words.
export const TITLE_BUDGET = 60;
export const BRAND_SHORT = "Waypoint";
export const SUFFIX = ` | ${BRAND_SHORT}`;

// Escape hatch: a line containing this token is skipped by the em-dash gate,
// for the rare legitimately-functional em dash (the literal em dash inside a
// banned-character detector, or a sanitizer's search pattern). Non-copy code
// only. Documented in CONTENT-STANDARDS Section 11.
export const EMDASH_ALLOW = "emdash-allow";

// Escape hatch for the description gate: a route whose description cannot be
// resolved statically (generateMetadata, an interpolated template literal, a
// variable) must name itself with this token plus a reason. The gate fails
// closed without it, so a NEW unparseable page cannot be silently dropped the
// way layout.tsx was for the life of the previous implementation.
export const DESC_DYNAMIC_ALLOW = "aeo-desc-dynamic";

const CODE_EXT = /\.(tsx?|css)$/;

// ─── Em dash detection ──────────────────────────────────────────────────────
// Section 11 bans em dashes in all public-facing and agent-generated copy. The
// previous implementation counted only the literal U+2014 character, so copy
// that RENDERS an em dash without containing one was invisible: `&mdash;` in
// the public contact hero and two email footers, and a — escape inside a
// live prompt template literal, all passed while the gate printed
// "PASS Section 11: 0 em dashes". Normalize every rendering form to the
// character, then count.
const EMDASH = String.fromCharCode(0x2014); // avoid a literal em dash in this file
const EMDASH_ESCAPES = [
  /&mdash;/gi, // HTML named entity
  /&#0*8212;/g, // HTML decimal entity
  /&#x0*2014;/gi, // HTML hex entity
  /\\u0*2014/gi, // JS escape inside a string or template literal
  /\\u\{0*2014\}/gi, // ES6 code-point escape
  /String\.from(?:CharCode|CodePoint)\(\s*(?:0x0*2014|8212)\s*\)/gi,
];

/**
 * Count em dashes a reader or model would actually see in this text, counting
 * escaped and entity-encoded forms as the character they render to.
 */
export function countRenderedEmDashes(text) {
  let normalized = String(text);
  for (const re of EMDASH_ESCAPES) normalized = normalized.replace(re, EMDASH);
  return normalized.split(EMDASH).length - 1;
}

/** Every string reachable in a parsed front-matter value, including nested FAQ answers. */
export function collectStrings(value, acc = []) {
  if (typeof value === "string") acc.push(value);
  else if (Array.isArray(value)) for (const v of value) collectStrings(v, acc);
  else if (value && typeof value === "object") for (const v of Object.values(value)) collectStrings(v, acc);
  return acc;
}

/**
 * Drop fenced code blocks so a `## ` line inside a code sample is not counted as
 * document structure. Handles ``` and ~~~ fences of any length, per CommonMark:
 * a closing fence must use the same character and be at least as long.
 */
export function stripCodeFences(body) {
  const out = [];
  let fence = null;
  for (const line of body.split("\n")) {
    const m = line.match(/^\s{0,3}(`{3,}|~{3,})/);
    if (fence) {
      if (m && m[1][0] === fence[0] && m[1].length >= fence.length) fence = null;
      continue; // drop the fenced content and both fence lines
    }
    if (m) {
      fence = m[1];
      continue;
    }
    out.push(line);
  }
  return out.join("\n");
}

// ─── Article audit ──────────────────────────────────────────────────────────

/**
 * Audit one article's raw text. `parseError` is non-null when the front matter
 * is not valid YAML, which is a hard failure rather than a silently empty row:
 * the previous regex implementation returned an empty front matter for anything
 * it could not match, so a malformed file looked exactly like a clean one.
 */
export function auditArticle(raw, file) {
  const slug = path.basename(file, ".md");
  let data = {};
  let body = raw;
  let parseError = null;

  try {
    const parsed = matter(raw);
    data = parsed.data || {};
    body = parsed.content || "";
  } catch (err) {
    parseError = `${file}: front matter is not valid YAML - ${err.message}`;
  }

  // FAQ count is scoped to the `faqs:` field by construction. Counting `- q:`
  // across the whole front matter meant an unrelated list could mask a missing
  // FAQ block. Note the real key is plural; the old regex never named it and
  // worked by accident.
  const faqs = data.faqs;
  const faqCount = Array.isArray(faqs) ? faqs.length : 0;
  const faqsMalformed = faqs !== undefined && !Array.isArray(faqs);

  const rel = data.relatedSlugs;
  const relCount = Array.isArray(rel) ? rel.length : 0;

  const prose = stripCodeFences(body);
  const h2s = prose.match(/^##\s+.+$/gm) || [];
  const h2q = h2s.filter((h) => h.trim().endsWith("?")).length;

  const words = body.replace(/[#>*`\-]/g, " ").split(/\s+/).filter(Boolean).length;

  // Section 11 covers front matter too (title, excerpt, FAQ answers), which the
  // body-only scan excluded.
  const bodyEmdash = countRenderedEmDashes(body);
  const fmEmdash = collectStrings(data).reduce((s, v) => s + countRenderedEmDashes(v), 0);

  // An unfilled `as of [year]` placeholder is broken copy, not a satisfied date
  // qualifier. The old single regex counted it as present, so a template that
  // shipped unfilled IMPROVED the coverage number.
  const hasAsOf = /as of 20\d\d/i.test(body);
  const asOfPlaceholder = /as of \[year\]/i.test(body);

  const firstPara = body.trim().split(/\n\n/)[0] || "";

  // Excerpt length. This field is not decorative: resources/[slug]/page.tsx
  // feeds it to the meta description, the OpenGraph description, AND the
  // Article JSON-LD description. Parsed rather than regexed, so any quote style,
  // block scalar or escaped quote measures its true rendered length.
  const excerpt = data.excerpt;
  const excerptLen = typeof excerpt === "string" ? excerpt.length : null;

  return {
    f: slug,
    words,
    h2: h2s.length,
    h2q,
    faqCount,
    faqsMalformed,
    relCount,
    emdash: bodyEmdash + fmEmdash,
    hasAsOf,
    asOfPlaceholder,
    leadLen: firstPara.length,
    excerptLen,
    title: typeof data.title === "string" ? data.title : null,
    parseError,
  };
}

export function auditArticles(dir) {
  const files = fs.readdirSync(dir).filter((f) => f.endsWith(".md"));
  const rows = files.map((f) => auditArticle(fs.readFileSync(path.join(dir, f), "utf8"), f));
  return { files, rows };
}

// ─── Static JS/TS literal resolution ────────────────────────────────────────
// A real scanner, not a regex. The previous implementation keyed off a two-space
// indent and a double quote, which happened to match all 31 static pages but
// could not see anything else, and reported nothing at all rather than reporting
// that it could not tell.

/** Skip a string or template literal starting at `i`. Returns { end, interpolated }. */
function skipLiteral(src, i) {
  const quote = src[i];
  let interpolated = false;
  let j = i + 1;
  while (j < src.length) {
    const ch = src[j];
    if (ch === "\\") {
      j += 2;
      continue;
    }
    if (quote === "`" && ch === "$" && src[j + 1] === "{") {
      interpolated = true;
      let depth = 1;
      j += 2;
      while (j < src.length && depth > 0) {
        if (src[j] === "{") depth++;
        else if (src[j] === "}") depth--;
        else if (src[j] === '"' || src[j] === "'" || src[j] === "`") {
          j = skipLiteral(src, j).end - 1;
        }
        j++;
      }
      continue;
    }
    if (ch === quote) return { end: j + 1, interpolated };
    j++;
  }
  return { end: src.length, interpolated };
}

/**
 * Read a static string literal at `i`, returning its RENDERED value, or null if
 * the literal is interpolated or unterminated. Escape sequences collapse to one
 * character so the measured length is the length a search engine sees.
 */
export function readStaticString(src, i) {
  const quote = src[i];
  if (quote !== '"' && quote !== "'" && quote !== "`") return null;
  let value = "";
  let j = i + 1;
  while (j < src.length) {
    const ch = src[j];
    if (ch === "\\") {
      const next = src[j + 1];
      if (next === "u" && src[j + 2] === "{") {
        const close = src.indexOf("}", j + 3);
        if (close < 0) return null;
        value += String.fromCodePoint(parseInt(src.slice(j + 3, close), 16) || 0);
        j = close + 1;
        continue;
      }
      if (next === "u") {
        value += String.fromCharCode(parseInt(src.slice(j + 2, j + 6), 16) || 0);
        j += 6;
        continue;
      }
      if (next === "x") {
        value += String.fromCharCode(parseInt(src.slice(j + 2, j + 4), 16) || 0);
        j += 4;
        continue;
      }
      if (next === "\n") {
        j += 2; // line continuation contributes nothing
        continue;
      }
      const simple = { n: "\n", t: "\t", r: "\r", b: "\b", f: "\f", v: "\v", "0": "\0" };
      value += simple[next] ?? next;
      j += 2;
      continue;
    }
    if (quote === "`" && ch === "$" && src[j + 1] === "{") return null; // interpolated
    if (ch === quote) return value;
    value += ch;
    j++;
  }
  return null;
}

/**
 * Find the value position of a TOP-LEVEL `key` inside the object whose interior
 * begins at `start`. Depth-aware, so a `description` nested in openGraph or
 * twitter is correctly ignored without relying on indentation.
 */
export function findTopLevelKey(src, start, key) {
  let depth = 0;
  let i = start;
  while (i < src.length) {
    const ch = src[i];
    if (ch === "/" && src[i + 1] === "/") {
      const nl = src.indexOf("\n", i);
      if (nl < 0) break;
      i = nl + 1;
      continue;
    }
    if (ch === "/" && src[i + 1] === "*") {
      const close = src.indexOf("*/", i + 2);
      i = close < 0 ? src.length : close + 2;
      continue;
    }
    if (ch === '"' || ch === "'" || ch === "`") {
      i = skipLiteral(src, i).end;
      continue;
    }
    if (ch === "{" || ch === "[" || ch === "(") {
      depth++;
      i++;
      continue;
    }
    if (ch === "}" || ch === "]" || ch === ")") {
      if (depth === 0) return null; // closed the metadata object without a hit
      depth--;
      i++;
      continue;
    }
    if (depth === 0 && src.startsWith(key, i)) {
      const before = src[i - 1] ?? " ";
      const after = src[i + key.length] ?? " ";
      if (!/[A-Za-z0-9_$]/.test(before) && !/[A-Za-z0-9_$]/.test(after)) {
        let j = i + key.length;
        while (j < src.length && /\s/.test(src[j])) j++;
        if (src[j] === ":") {
          j++;
          while (j < src.length && /\s/.test(src[j])) j++;
          return j;
        }
      }
    }
    i++;
  }
  return null;
}

/**
 * Classify a route module's meta description into resolved / unresolved / absent.
 *
 * absent      no metadata export at all (admin pages) - not a violation, the
 *             route inherits the layout default.
 * unresolved  a description exists but cannot be measured statically
 *             (generateMetadata, interpolation, a variable). FAILS unless the
 *             file carries DESC_DYNAMIC_ALLOW.
 * resolved    a static literal; its rendered length is measured.
 */
export function classifyMetaDescription(src) {
  const acknowledged = src.includes(DESC_DYNAMIC_ALLOW);

  if (/export\s+(?:async\s+)?function\s+generateMetadata\b/.test(src)) {
    return { state: "unresolved", reason: "generateMetadata computes it at request time", acknowledged };
  }

  const start = src.match(/export\s+const\s+metadata[^=]*=\s*\{/);
  if (!start) return { state: "absent", acknowledged };

  const valueAt = findTopLevelKey(src, start.index + start[0].length, "description");
  if (valueAt === null) return { state: "absent", acknowledged };

  const value = readStaticString(src, valueAt);
  if (value === null) {
    return { state: "unresolved", reason: "description is not a static string literal", acknowledged };
  }
  return { state: "resolved", len: value.length, acknowledged };
}

function walk(dir, acc = []) {
  if (!fs.existsSync(dir)) return acc;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) walk(full, acc);
    else acc.push(full);
  }
  return acc;
}

/**
 * Every route module under `dir` that can carry a meta description.
 * layout.tsx is included: filtering to page.tsx alone is why the 168-character
 * site-wide default in src/app/layout.tsx was never measured.
 */
export function collectRouteDescriptions(dir) {
  return walk(dir)
    .filter((f) => /(?:^|[\\/])(page|layout)\.tsx$/.test(f))
    .sort()
    .map((f) => ({ f, ...classifyMetaDescription(fs.readFileSync(f, "utf8")) }));
}

/**
 * Blank out `type X = { ... }` and `interface X { ... }` bodies, preserving line
 * numbers. Without this, the TS shape declarations in src/data (`metaDescription:
 * string;`) are indistinguishable from real values and get reported as unreadable
 * -- a false failure that would have blocked every push.
 */
export function stripTypeDeclarations(src) {
  let out = src;
  const re = /\b(?:type|interface)\s+\w+[^{;]*\{/g;
  let m;
  while ((m = re.exec(out)) !== null) {
    const open = m.index + m[0].length - 1;
    let depth = 0;
    let i = open;
    while (i < out.length) {
      const ch = out[i];
      if (ch === '"' || ch === "'" || ch === "`") {
        i = skipLiteral(out, i).end;
        continue;
      }
      if (ch === "{") depth++;
      else if (ch === "}") {
        depth--;
        if (depth === 0) break;
      }
      i++;
    }
    const body = out.slice(open, i);
    // Keep newlines so reported line numbers stay accurate.
    out = out.slice(0, open) + body.replace(/[^\n]/g, " ") + out.slice(i);
    re.lastIndex = i;
  }
  return out;
}

/**
 * metaDescription values in the data layer. These feed industries/[slug] and
 * franchise-financing/[method] through generateMetadata, so they are invisible
 * to any scan of src/app and were never length-checked.
 */
export function collectDataDescriptions(dir) {
  if (!fs.existsSync(dir)) return [];
  const out = [];
  for (const f of fs.readdirSync(dir).filter((n) => n.endsWith(".ts")).sort()) {
    const full = path.join(dir, f);
    const src = stripTypeDeclarations(fs.readFileSync(full, "utf8"));
    const re = /\bmetaDescription\s*:\s*/g;
    let m;
    while ((m = re.exec(src)) !== null) {
      const at = m.index + m[0].length;
      const value = readStaticString(src, at);
      const line = src.slice(0, m.index).split("\n").length;
      out.push({ f: path.join(path.basename(dir), f), line, len: value === null ? null : value.length });
    }
  }
  return out;
}

/** metaTitle values in the data layer, for the brand gate. */
export function collectDataTitles(dir) {
  if (!fs.existsSync(dir)) return [];
  const out = [];
  for (const f of fs.readdirSync(dir).filter((n) => n.endsWith(".ts")).sort()) {
    const src = fs.readFileSync(path.join(dir, f), "utf8");
    src.split("\n").forEach((line, i) => {
      if (/metaTitle:/.test(line)) out.push({ f: path.join(path.basename(dir), f), line: i + 1, text: line });
    });
  }
  return out;
}

/** Em dashes in code, counting rendered forms, honouring the per-line opt-out. */
export function scanCodeEmDashes(dirs) {
  return dirs
    .flatMap((d) => walk(d))
    .filter((f) => CODE_EXT.test(f))
    .sort()
    .map((f) => {
      const count = fs
        .readFileSync(f, "utf8")
        .split("\n")
        .filter((line) => !line.includes(EMDASH_ALLOW))
        .reduce((s, line) => s + countRenderedEmDashes(line), 0);
      return { f, count };
    })
    .filter((r) => r.count > 0)
    .sort((a, b) => b.count - a.count);
}

// ─── Aggregate ──────────────────────────────────────────────────────────────

/**
 * Run every check and return the full result plus a `failures` list. Keeping the
 * pass/fail decision in data (rather than in console.log side effects) is what
 * lets tests assert that the title advisory NEVER contributes a failure.
 */
export function auditAll({
  articlesDir = DEFAULT_ARTICLES_DIR,
  appDir = DEFAULT_APP_DIR,
  dataDir = DEFAULT_DATA_DIR,
  codeDirs = DEFAULT_CODE_DIRS,
} = {}) {
  const { files, rows } = auditArticles(articlesDir);
  const failures = [];

  const parseErrors = rows.filter((r) => r.parseError);
  const malformedFaqs = rows.filter((r) => r.faqsMalformed);

  const missingExcerpt = rows.filter((r) => r.excerptLen === null);
  const tooLong = rows
    .filter((r) => r.excerptLen !== null && r.excerptLen > EXCERPT_MAX)
    .sort((a, b) => b.excerptLen - a.excerptLen);
  const tooShort = rows.filter((r) => r.excerptLen !== null && r.excerptLen < EXCERPT_MIN);

  const routes = collectRouteDescriptions(appDir);
  const resolved = routes.filter((r) => r.state === "resolved");
  const unresolved = routes.filter((r) => r.state === "unresolved");
  const absent = routes.filter((r) => r.state === "absent");
  const unacknowledged = unresolved.filter((r) => !r.acknowledged);
  const routeTooLong = resolved.filter((r) => r.len > EXCERPT_MAX).sort((a, b) => b.len - a.len);

  const dataDescs = collectDataDescriptions(dataDir);
  const dataTooLong = dataDescs.filter((d) => d.len !== null && d.len > EXCERPT_MAX).sort((a, b) => b.len - a.len);
  const dataUnreadable = dataDescs.filter((d) => d.len === null);

  const codeEmdash = scanCodeEmDashes(codeDirs);
  const totalCodeEmdash = codeEmdash.reduce((s, r) => s + r.count, 0);
  const articleEmdash = rows.reduce((s, r) => s + r.emdash, 0);

  const asOfPlaceholders = rows.filter((r) => r.asOfPlaceholder);

  const brandDupes = [];
  const longTitles = [];
  const hardCodesBrand = (text) => text.includes(BRAND_SHORT);
  for (const r of rows) {
    if (r.title === null) continue;
    if (hardCodesBrand(r.title)) brandDupes.push(`content/articles/${r.f}.md (frontmatter title)`);
    const rendered = r.title.length + SUFFIX.length;
    if (rendered > TITLE_BUDGET) longTitles.push({ file: `content/articles/${r.f}.md`, rendered, bare: r.title });
  }
  for (const t of collectDataTitles(dataDir)) {
    if (hardCodesBrand(t.text)) brandDupes.push(`${t.f}:${t.line} (metaTitle)`);
  }
  longTitles.sort((a, b) => b.rendered - a.rendered);

  if (parseErrors.length) failures.push(`${parseErrors.length} article(s) have unparseable front matter`);
  if (malformedFaqs.length) failures.push(`${malformedFaqs.length} article(s) have a non-list faqs field`);
  if (tooLong.length || missingExcerpt.length) {
    failures.push(`${tooLong.length} excerpt(s) over ${EXCERPT_MAX}, ${missingExcerpt.length} unparseable`);
  }
  if (routeTooLong.length) failures.push(`${routeTooLong.length} route description(s) over ${EXCERPT_MAX}`);
  if (unacknowledged.length) failures.push(`${unacknowledged.length} route description(s) unresolvable and unacknowledged`);
  if (dataTooLong.length || dataUnreadable.length) {
    failures.push(`${dataTooLong.length} data metaDescription(s) over ${EXCERPT_MAX}, ${dataUnreadable.length} unreadable`);
  }
  if (totalCodeEmdash || articleEmdash) failures.push(`${totalCodeEmdash + articleEmdash} em dash(es)`);
  if (asOfPlaceholders.length) failures.push(`${asOfPlaceholders.length} unfilled "as of [year]" placeholder(s)`);
  if (brandDupes.length) failures.push(`${brandDupes.length} title source(s) hard-code the brand`);

  return {
    files,
    rows,
    parseErrors,
    malformedFaqs,
    missingExcerpt,
    tooLong,
    tooShort,
    routes,
    resolved,
    unresolved,
    absent,
    unacknowledged,
    routeTooLong,
    dataDescs,
    dataTooLong,
    dataUnreadable,
    codeEmdash,
    totalCodeEmdash,
    articleEmdash,
    asOfPlaceholders,
    brandDupes,
    longTitles,
    failures,
  };
}

// ─── Report ─────────────────────────────────────────────────────────────────

function main() {
  const rel = (f) => path.relative(REPO_ROOT, f) || f;
  const a = auditAll();
  const { rows } = a;
  const n = rows.length;
  const list = (arr, fmt = (r) => r.f) => (arr.length ? " -> " + arr.map(fmt).join(", ") : "");

  console.log(`TOTAL ARTICLES: ${n}\n`);

  if (a.parseErrors.length) {
    console.log(`Front matter that failed to parse: ${a.parseErrors.length}`);
    for (const r of a.parseErrors) console.log(`  ${r.parseError}`);
    console.log("");
  }

  console.log(`FAQ frontmatter:`);
  console.log(`  missing entirely: ${rows.filter((r) => r.faqCount === 0).length}${list(rows.filter((r) => r.faqCount === 0))}`);
  const lowFaq = rows.filter((r) => r.faqCount > 0 && r.faqCount < 4);
  console.log(`  fewer than 4 Q: ${lowFaq.length}${list(lowFaq, (r) => `${r.f}(${r.faqCount})`)}`);
  if (a.malformedFaqs.length) console.log(`  faqs present but not a list: ${a.malformedFaqs.length}${list(a.malformedFaqs)}`);

  const noQH2 = rows.filter((r) => r.h2 > 0 && r.h2q === 0);
  const totalH2 = rows.reduce((s, r) => s + r.h2, 0);
  const totalH2q = rows.reduce((s, r) => s + r.h2q, 0);
  console.log(`\nQuestion-format H2s (AEO extraction):`);
  // The header has always advertised a ratio; it was never actually computed.
  console.log(`  question-format ratio: ${totalH2q}/${totalH2} (${totalH2 ? Math.round((totalH2q / totalH2) * 100) : 0}%)`);
  console.log(`  zero question H2s: ${noQH2.length}${list(noQH2)}`);

  const relNot3 = rows.filter((r) => r.relCount !== 3);
  console.log(`\nrelatedSlugs != 3: ${relNot3.length}${list(relNot3, (r) => `${r.f}(${r.relCount})`)}`);

  const emdashed = rows.filter((r) => r.emdash > 0);
  console.log(`\nEm dashes in articles (banned): ${emdashed.length}${list(emdashed, (r) => `${r.f}(${r.emdash})`)}`);

  console.log(`\nDate qualifier "as of YYYY": present in ${rows.filter((r) => r.hasAsOf).length}/${n}`);
  if (a.asOfPlaceholders.length) {
    console.log(`  UNFILLED "as of [year]" placeholder: ${a.asOfPlaceholders.length}${list(a.asOfPlaceholders)}`);
  }

  const thin = rows.filter((r) => r.words < 900);
  const longLead = rows.filter((r) => r.leadLen > 320);
  console.log(`\nThin (<900 words): ${thin.length}${list(thin, (r) => `${r.f}(${r.words})`)}`);
  console.log(`Long lead paragraph (>320 chars): ${longLead.length}${list(longLead, (r) => `${r.f}(${r.leadLen})`)}`);

  console.log(`\nExcerpt length (target ${EXCERPT_MIN}-${EXCERPT_MAX} chars, feeds meta + OG + JSON-LD):`);
  console.log(`  within target: ${n - a.missingExcerpt.length - a.tooLong.length - a.tooShort.length}/${n}`);
  console.log(`  OVER ${EXCERPT_MAX} (truncated in search): ${a.tooLong.length}${list(a.tooLong, (r) => `${r.f}(${r.excerptLen})`)}`);
  console.log(`  under ${EXCERPT_MIN} (wastes snippet space): ${a.tooShort.length}${list(a.tooShort, (r) => `${r.f}(${r.excerptLen})`)}`);
  if (a.missingExcerpt.length) console.log(`  unparseable excerpt: ${a.missingExcerpt.length}${list(a.missingExcerpt)}`);

  console.log(`\nRoute meta descriptions in src/app (target ${EXCERPT_MIN}-${EXCERPT_MAX}):`);
  console.log(`  measured: ${a.resolved.length}   dynamic: ${a.unresolved.length}   no metadata: ${a.absent.length}`);
  console.log(`  within ${EXCERPT_MAX}: ${a.resolved.length - a.routeTooLong.length}/${a.resolved.length}`);
  console.log(
    `  OVER ${EXCERPT_MAX} (truncated in search): ${a.routeTooLong.length}${list(a.routeTooLong, (r) => `${rel(r.f)}(${r.len})`)}`,
  );
  for (const r of a.unresolved) {
    const mark = r.acknowledged ? "acknowledged" : "UNACKNOWLEDGED";
    console.log(`  dynamic [${mark}]: ${rel(r.f)} (${r.reason})`);
  }
  if (a.unacknowledged.length) {
    console.log(
      `  Mark each with a "${DESC_DYNAMIC_ALLOW}:" comment naming how its length is bounded, or make the description static.`,
    );
  }

  console.log(`\nData-layer metaDescriptions (${a.dataDescs.length} found):`);
  console.log(`  within ${EXCERPT_MAX}: ${a.dataDescs.length - a.dataTooLong.length - a.dataUnreadable.length}/${a.dataDescs.length}`);
  console.log(
    `  OVER ${EXCERPT_MAX}: ${a.dataTooLong.length}${list(a.dataTooLong, (d) => `${d.f}:${d.line}(${d.len})`)}`,
  );
  if (a.dataUnreadable.length) {
    console.log(`  unreadable: ${a.dataUnreadable.length}${list(a.dataUnreadable, (d) => `${d.f}:${d.line}`)}`);
  }

  console.log(`\nSection 11 em dashes in src/ (banned): ${a.totalCodeEmdash} across ${a.codeEmdash.length} files`);
  for (const r of a.codeEmdash.slice(0, 20)) console.log(`  ${rel(r.f)} (${r.count})`);
  if (a.codeEmdash.length > 20) console.log(`  ... and ${a.codeEmdash.length - 20} more`);

  // Advisory, not a gate. Google truncates past ~60 characters, but a long title
  // is a content judgement rather than a defect: the keyword sits at the FRONT, so
  // truncation costs the brand rather than the match, and rewriting a title on a
  // page that already ranks is a real risk. Failing here would force exactly that
  // rushed rewrite. Reported loudly so it cannot rot unseen.
  //
  // DO NOT add this to `failures` in auditAll(). tests/unit/aeo-audit.test.ts
  // asserts that a wildly over-budget title still exits 0, precisely so this
  // decision cannot be quietly reversed.
  console.log(`\nTitles over ${TITLE_BUDGET} chars once "${SUFFIX}" is applied (advisory): ${a.longTitles.length}/${a.files.length}`);
  for (const t of a.longTitles.slice(0, 5)) console.log(`  ${String(t.rendered).padStart(3)}  ${t.bare}`);
  if (a.longTitles.length > 5) console.log(`  ...and ${a.longTitles.length - 5} more`);

  console.log(`\nBrand duplication in template-fed titles (banned): ${a.brandDupes.length}`);
  for (const d of a.brandDupes) console.log(`  ${d}`);

  if (a.failures.length) {
    console.log(`\nFAIL: ${a.failures.join("; ")}.`);
    if (a.totalCodeEmdash || a.articleEmdash) {
      console.log(
        `  Section 11: remove every em dash, including &mdash; and \\u2014 forms (or mark a functional one with "${EMDASH_ALLOW}").`,
      );
    }
    if (a.brandDupes.length) {
      console.log(`  Section 14: the layout's title.template already appends "${SUFFIX}". Remove the brand from the title source.`);
    }
    process.exitCode = 1;
  } else {
    console.log(`\nPASS: excerpts, route and data descriptions, em dashes and brand titles all clean.`);
  }
}

// Run only when invoked directly, not when imported by the tests. `realpathSync` is
// load-bearing: Node resolves symlinks for the ESM main module but `path.resolve` does
// not, so comparing the raw argv path would silently fail whenever the script is reached
// through a symlinked directory - and main() never running means this exits 0 having
// printed nothing, which is the same silent-green failure the rest of this file exists to
// prevent. Falls back to the unresolved path if argv[1] no longer exists on disk.
export function invokedDirectly() {
  if (!process.argv[1]) return false;
  let invoked = path.resolve(process.argv[1]);
  try {
    invoked = fs.realpathSync(invoked);
  } catch {
    // argv[1] is not a real path (deleted, or a virtual entry point); use it as-is.
  }
  return invoked === fs.realpathSync(__filename);
}

if (invokedDirectly()) {
  main();
}
