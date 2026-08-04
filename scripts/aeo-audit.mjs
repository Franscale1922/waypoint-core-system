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
import ts from "typescript";

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

// Whole word, any case. A plain `includes("Waypoint")` was wrong in both
// directions: `WHY WAYPOINT WORKS` sailed through and got the brand appended a
// second time, while `Waypointing` was blocked despite not naming the brand.
const BRAND_RE = new RegExp(`\\b${BRAND_SHORT}\\b`, "i");
export const hardCodesBrand = (text) => BRAND_RE.test(text);

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
//
// The reason is required, not decorative: a bare token would let anyone silence
// the gate with six characters and no argument, which is how an escape hatch
// becomes the default. The regex demands "aeo-desc-dynamic:" followed by actual
// words, so the file has to say what bounds the length.
export const DESC_DYNAMIC_ALLOW = "aeo-desc-dynamic";
// The reason must be on the SAME line as the token. `\s*` here would span the
// newline and match the next line of code, so a bare `aeo-desc-dynamic:` would
// have satisfied the very requirement this regex exists to impose.
const DESC_DYNAMIC_RE = /aeo-desc-dynamic:[ \t]*\S+/;

/**
 * A waiver counts only when it is written as a comment. Matching raw source text
 * meant any string that happened to contain the token, including documentation
 * about the token itself, silently waived an unrelated unbounded description.
 */
export function hasDynamicWaiver(src) {
  return src
    .split("\n")
    .some((line) => /^\s*(\/\/|\/\*|\*)/.test(line) && DESC_DYNAMIC_RE.test(line));
}

// Section 11 covers copy wherever it lives, so this is every text-bearing
// extension under src/, not just the ones the UI happens to be written in. The
// previous tsx?|css list silently exempted .mjs, .js, .jsx and .json, and src/
// contains data files of both kinds today.
const CODE_EXT = /\.(tsx?|jsx?|mjs|cjs|css|json)$/;

// ─── Em dash detection ──────────────────────────────────────────────────────
// Section 11 bans em dashes in all public-facing and agent-generated copy. The
// previous implementation counted only the literal U+2014 character, so copy
// that RENDERS an em dash without containing one was invisible: `&mdash;` in
// the public contact hero and two email footers, and a — escape inside a
// live prompt template literal, all passed while the gate printed
// "PASS Section 11: 0 em dashes". Normalize every rendering form to the
// character, then count.
// Case sensitivity here is not fussiness, it is accuracy. Only forms that
// genuinely RENDER an em dash count. HTML5 named character references are
// case-sensitive, so `&MDASH;` renders literal text, not a dash. `\U2014` is not
// a JavaScript escape at all (it renders "U2014"). Flagging either would fail a
// push over a string that contains no em dash and cannot be fixed by rewording,
// which is worse than useless in a gate. Numeric escapes DO accept either case
// on the `x`, so those keep it.
const EMDASH = String.fromCharCode(0x2014); // avoid a literal em dash in this file
const EMDASH_ESCAPES = [
  /&mdash;/g, // HTML named entity
  /&#0*8212;/g, // HTML decimal entity
  /&#[xX]0*2014;/g, // HTML hex entity
  /\\u0*2014/g, // JS escape inside a string or template literal
  /\\u\{0*2014\}/g, // ES6 code-point escape
  /String\.from(?:CharCode|CodePoint)\(\s*(?:0[xX]0*2014|8212)\s*\)/g,
];

// CSS has its own escape syntax: `content: "\2014"` renders an em dash with no
// `u` and an optional single trailing space that terminates the hex run. It is
// applied to .css only, because the same characters in TypeScript are not an em
// dash (`"\2014"` there is a legacy octal escape, and a syntax error in a module).
const CSS_EMDASH = /\\0*2014[ ]?/g;

/**
 * Count em dashes a reader or model would actually see in this text, counting
 * escaped and entity-encoded forms as the character they render to. Pass the
 * filename so language-specific escapes are only applied to the language that
 * actually has them.
 */
export function countRenderedEmDashes(text, fileName = "") {
  let normalized = String(text);
  for (const re of EMDASH_ESCAPES) normalized = normalized.replace(re, EMDASH);
  if (fileName.endsWith(".css")) normalized = normalized.replace(CSS_EMDASH, EMDASH);
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
    const m = line.match(/^ {0,3}(`{3,}|~{3,})(.*)$/);
    if (fence) {
      // A closing fence uses the same character, is at least as long, and carries
      // no info string. Without that last rule ```` ```not-a-close ```` ended the
      // block early and the sample headings after it counted as article structure.
      const closes = m && m[1][0] === fence[0] && m[1].length >= fence.length && m[2].trim() === "";
      if (closes) fence = null;
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
  // CommonMark allows up to three leading spaces on an ATX heading.
  const h2s = prose.match(/^ {0,3}##\s+.+$/gm) || [];
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

// ─── Metadata resolution via the TypeScript AST ─────────────────────────────
// Parsed, not scanned. A hand-rolled scanner kept leaving fail-open holes that
// each looked like an edge case and were all the same bug: it could not tell a
// description it had MEASURED from one it had never seen. A round-1 adversarial
// review found four in one pass, every one of which let an over-length or
// unknown description through as "absent":
//
//   export const metadata = { ...shared }                  // spread, never seen
//   export const metadata = { description: "s", ...shared } // spread can overwrite
//   export const generateMetadata = async () => ({ ... })   // arrow form, never seen
//   export const metadata = { "description": "..." }        // quoted key, never seen
//
// plus two false positives that would have blocked a push over compliant code:
// a commented-out `// export function generateMetadata()`, and a trailing
// `/* comment */` after an otherwise static value.
//
// The compiler already answers all of this correctly, and `typescript` is
// already a devDependency here. Escape decoding comes free too: `node.text` on a
// string literal is the RENDERED value, which is exactly what a search engine
// measures. This is the same move as parsing front matter with gray-matter
// rather than regexing it.

/** Property name as written, for Identifier and quoted-string keys alike. */
function propertyNameOf(node) {
  const name = node.name;
  if (!name) return null;
  if (ts.isIdentifier(name)) return name.text;
  if (ts.isStringLiteral(name) || ts.isNoSubstitutionTemplateLiteral(name)) return name.text;
  return null; // computed key; deliberately unmatchable so it reads as unresolved
}

/** The rendered string a literal produces, or null if it is not a static string. */
function staticStringOf(node) {
  if (!node) return null;
  if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) return node.text;
  return null;
}

function parseSource(src, fileName) {
  const kind = fileName.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS;
  return ts.createSourceFile(fileName, src, ts.ScriptTarget.Latest, true, kind);
}

const isExported = (node) =>
  (ts.getCombinedModifierFlags(node) & ts.ModifierFlags.Export) !== 0 ||
  (node.parent?.parent && (ts.getCombinedModifierFlags(node.parent.parent) & ts.ModifierFlags.Export) !== 0);

/** The initializer of an exported `const <name>`, plus whether the name is exported at all. */
function findExportedBinding(sourceFile, wanted) {
  let found = null;
  for (const stmt of sourceFile.statements) {
    if (ts.isVariableStatement(stmt)) {
      const exported = (ts.getCombinedModifierFlags(stmt.declarationList.declarations[0] ?? stmt) & ts.ModifierFlags.Export) !== 0;
      for (const decl of stmt.declarationList.declarations) {
        if (ts.isIdentifier(decl.name) && decl.name.text === wanted && exported) {
          found = { kind: "variable", initializer: decl.initializer };
        }
      }
    } else if ((ts.isFunctionDeclaration(stmt) || ts.isClassDeclaration(stmt)) && stmt.name?.text === wanted) {
      if (isExported(stmt)) found = { kind: "function", initializer: null };
    } else if (ts.isExportDeclaration(stmt) && stmt.exportClause && ts.isNamedExports(stmt.exportClause)) {
      // `export { metadata }` / `export { x as metadata }`: the value lives
      // elsewhere in the module or in another file, so it cannot be measured here.
      for (const spec of stmt.exportClause.elements) {
        if (spec.name.text === wanted) found = { kind: "reexport", initializer: null };
      }
    }
  }
  return found;
}

/**
 * Classify a route module's meta description into resolved / unresolved / absent.
 *
 * absent      no metadata export at all (admin pages), or metadata that declares
 *             no description. Not a violation: the route inherits the layout default.
 * unresolved  a description exists, or could exist, but cannot be measured
 *             statically. FAILS unless the file carries a DESC_DYNAMIC_ALLOW note.
 * resolved    a static literal; its rendered length is measured.
 */
export function classifyMetaDescription(src, fileName = "route.tsx") {
  const acknowledged = hasDynamicWaiver(src);
  const sourceFile = parseSource(src, fileName);

  // generateMetadata in any exported form: function declaration, arrow, or
  // re-export. Matching source text instead used to fire on a commented-out one.
  if (findExportedBinding(sourceFile, "generateMetadata")) {
    return { state: "unresolved", reason: "generateMetadata computes it at request time", acknowledged };
  }

  const metadata = findExportedBinding(sourceFile, "metadata");
  if (!metadata) return { state: "absent", acknowledged };

  const init = metadata.initializer;
  if (!init || !ts.isObjectLiteralExpression(init)) {
    return { state: "unresolved", reason: "metadata is not an object literal", acknowledged };
  }

  // A spread can supply a description, or silently overwrite one declared before
  // it. Either way the object's real description is not knowable from this file.
  if (init.properties.some((p) => ts.isSpreadAssignment(p))) {
    return { state: "unresolved", reason: "metadata spreads another object", acknowledged };
  }

  // `{ description }` is a real description whose value lives in a variable, and
  // `{ ["desc" + x]: v }` might be one. Both used to read as "absent", which
  // exempted the whole route. Anything we cannot rule out has to be unresolved.
  if (init.properties.some((p) => ts.isShorthandPropertyAssignment(p) && p.name.text === "description")) {
    return { state: "unresolved", reason: "description is shorthand for a variable", acknowledged };
  }
  if (init.properties.some((p) => p.name && ts.isComputedPropertyName(p.name))) {
    return { state: "unresolved", reason: "metadata has a computed property name", acknowledged };
  }

  const prop = init.properties.find(
    (p) => ts.isPropertyAssignment(p) && propertyNameOf(p) === "description",
  );
  if (!prop) return { state: "absent", acknowledged };

  const value = staticStringOf(prop.initializer);
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
// Next.js accepts .js/.jsx/.ts/.tsx (and .mjs) for a route module, so matching
// only .tsx would let a page.jsx carrying a 200-character description through
// while every anti-vacuity count stayed healthy from the .tsx routes around it.
const ROUTE_FILE = /(?:^|[\\/])(page|layout)\.(tsx|ts|jsx|js|mjs)$/;

export function collectRouteDescriptions(dir) {
  return walk(dir)
    .filter((f) => ROUTE_FILE.test(f))
    .sort()
    .map((f) => ({ f, ...classifyMetaDescription(fs.readFileSync(f, "utf8"), f) }));
}

/**
 * Top-level `title` values in route metadata that are plain strings.
 *
 * Only strings are returned, which is exactly the Section 14 scope: a `title`
 * written as an object is the `default` / `template` / `absolute` form, and
 * CONTENT-STANDARDS explicitly allows the brand there. openGraph and twitter
 * titles are nested, so the top-level walk never reaches them.
 */
export function collectRouteTitles(dir) {
  const out = [];
  for (const f of walk(dir).filter((n) => ROUTE_FILE.test(n)).sort()) {
    const src = fs.readFileSync(f, "utf8");
    const sourceFile = parseSource(src, f);
    const metadata = findExportedBinding(sourceFile, "metadata");
    const init = metadata?.initializer;
    if (!init || !ts.isObjectLiteralExpression(init)) continue;
    for (const p of init.properties) {
      if (!ts.isPropertyAssignment(p) || propertyNameOf(p) !== "title") continue;
      const value = staticStringOf(p.initializer);
      if (value === null) continue; // object form: default/template/absolute
      const { line } = sourceFile.getLineAndCharacterOfPosition(p.getStart(sourceFile));
      out.push({ f, line: line + 1, value });
    }
  }
  return out;
}

/**
 * Collect every value assigned to `key` across the data layer, with its line.
 * Walking the AST means a TypeScript shape declaration (`metaDescription: string;`
 * in a type alias) is a PropertySignature, not a PropertyAssignment, and is
 * skipped by construction rather than by blanking type bodies first.
 * `value` is null when the assignment is not a static string, which the callers
 * treat as a failure rather than as a pass.
 */
export function collectDataValues(dir, key) {
  if (!fs.existsSync(dir)) return [];
  const out = [];
  for (const name of fs.readdirSync(dir).filter((n) => n.endsWith(".ts")).sort()) {
    const full = path.join(dir, name);
    const src = fs.readFileSync(full, "utf8");
    const sourceFile = parseSource(src, full);
    const visit = (node) => {
      // Shorthand (`{ metaDescription }`) is a real assignment whose value lives
      // in a variable. It is recorded with a null value so it reads as unreadable
      // and fails, rather than being skipped as if the key were not there.
      const isMatch =
        (ts.isPropertyAssignment(node) && propertyNameOf(node) === key) ||
        (ts.isShorthandPropertyAssignment(node) && node.name.text === key);
      if (isMatch) {
        const { line } = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile));
        out.push({
          f: path.join(path.basename(dir), name),
          line: line + 1,
          value: ts.isPropertyAssignment(node) ? staticStringOf(node.initializer) : null,
        });
      }
      ts.forEachChild(node, visit);
    };
    ts.forEachChild(sourceFile, visit);
  }
  return out;
}

/** metaDescription values in the data layer, which feed the dynamic route metadata. */
export function collectDataDescriptions(dir) {
  return collectDataValues(dir, "metaDescription").map((d) => ({
    ...d,
    len: d.value === null ? null : d.value.length,
  }));
}

/** metaTitle values in the data layer, for the brand gate. */
export function collectDataTitles(dir) {
  return collectDataValues(dir, "metaTitle");
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
        .reduce((s, line) => s + countRenderedEmDashes(line, f), 0);
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
  const failures = [];

  // Anti-vacuity, the lesson verify-links.mjs paid for: an input path that has
  // moved makes every check below scan nothing and report clean. collectDataDescriptions
  // and the walkers all guard with existsSync, so a renamed src/app would turn the
  // description gate into a no-op that still printed PASS. A missing input is a
  // failure, never an empty result.
  const missingInputs = [
    ["content/articles", articlesDir],
    ["src/app", appDir],
    ["src/data", dataDir],
    ...codeDirs.map((d) => ["code dir", d]),
  ].filter(([, p]) => !fs.existsSync(p));

  const { files, rows } = fs.existsSync(articlesDir) ? auditArticles(articlesDir) : { files: [], rows: [] };

  if (missingInputs.length) {
    failures.push(`${missingInputs.length} audit input path(s) missing: ${missingInputs.map(([l]) => l).join(", ")}`);
  }
  if (fs.existsSync(articlesDir) && files.length === 0) {
    failures.push(`found 0 articles in ${articlesDir}; extraction is broken, not the content`);
  }

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
  const brandUnreadable = [];
  for (const r of rows) {
    if (r.title === null) continue;
    if (hardCodesBrand(r.title)) brandDupes.push(`content/articles/${r.f}.md (frontmatter title)`);
    const rendered = r.title.length + SUFFIX.length;
    if (rendered > TITLE_BUDGET) longTitles.push({ file: `content/articles/${r.f}.md`, rendered, bare: r.title });
  }
  for (const t of collectDataTitles(dataDir)) {
    // A metaTitle that is not a static string cannot be brand-checked. Skipping
    // it silently is how a computed title would evade Section 14 entirely.
    if (t.value === null) brandUnreadable.push(`${t.f}:${t.line} (metaTitle)`);
    else if (hardCodesBrand(t.value)) brandDupes.push(`${t.f}:${t.line} (metaTitle)`);
  }
  // Page-level metadata titles feed the same template. The original scope note
  // argued they are caught in review because they show up in a page diff; that
  // is a weaker guarantee than a check, and the AST can now tell a plain string
  // title (in scope) from the default/template/absolute object form (allowed).
  for (const t of collectRouteTitles(appDir)) {
    if (hardCodesBrand(t.value)) brandDupes.push(`${path.relative(REPO_ROOT, t.f)}:${t.line} (metadata title)`);
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
  if (brandUnreadable.length) failures.push(`${brandUnreadable.length} metaTitle(s) not statically readable`);

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
    brandUnreadable,
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
  if (a.brandUnreadable.length) {
    console.log(`  metaTitle(s) not statically readable, so not brand-checkable: ${a.brandUnreadable.length}`);
    for (const d of a.brandUnreadable) console.log(`    ${d}`);
  }

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
