#!/usr/bin/env node
/**
 * Ingestion guard for article frontmatter dates.
 *
 * ON THIS BRANCH THERE IS NO SECOND LINE OF DEFENCE. The resources page emits
 * `datePublished: meta.date` and `dateModified: meta.updatedAt ?? meta.date`
 * straight from frontmatter, unvalidated, and src/app/sitemap.ts takes the same
 * value as lastModified. A render-time validator (`schemaDate`) exists only on
 * the unmerged seo/structured-data-entity-graph branch, and even there it can
 * only console.warn. So this script is not a redundant early check: until that
 * branch lands, it is the ONLY thing standing between a corrupted date and
 * production.
 *
 * KNOWN GAP, deliberately not closed here: src/lib/githubArticleCommit.ts
 * commits AI-refreshed articles by PATCHing the branch ref through the GitHub
 * API, against `main` by default. That path touches no local git, so
 * .githooks/pre-push never runs, and the CI workflow cannot be made blocking on
 * this plan. It overwrites `date` with today (always valid) but passes
 * `updatedAt` through from model output untouched, so that field can still reach
 * main unchecked. Closing it means validating inside the Inngest write path,
 * which is a change to the content pipeline rather than to this guard.
 *
 * WHY THIS FILE DOES NOT USE gray-matter
 * --------------------------------------
 * Its sibling scripts/verify-links.mjs parses front matter with gray-matter, on
 * purpose, so it sees exactly what production sees. This script must NOT, and
 * the difference is the entire reason it exists.
 *
 * gray-matter runs js-yaml, and js-yaml resolves an UNQUOTED YYYY-MM-DD into a
 * JavaScript Date before any of our code is reached — applying its own silent
 * rollover on the way. Verified against this repo's gray-matter:
 *
 *     date: 2026-02-30   ->  Date 2026-03-02   (impossible day, rolled forward)
 *     date: 2026-13-01   ->  Date 2027-01-01   (13th month, rolled into next year)
 *     date: "2026-02-30" ->  string "2026-02-30" (quoted: preserved verbatim)
 *
 * By the time a parsed value is in hand, the authored text is unrecoverable and
 * the corruption is undetectable — a rolled-over date is indistinguishable from
 * one somebody meant to write. So every check below reads the RAW frontmatter
 * text. Parsing first would destroy the evidence this script is looking for.
 *
 * If you ever "simplify" this to read date VALUES through gray-matter, you will
 * have reintroduced the exact bug it was written to catch, and the tests will
 * still pass, because the fixtures would be laundered on the way in too.
 *
 * There is a SECOND stage that does call gray-matter, and the ordering is the
 * whole point: raw checks run FIRST and are the only thing that ever produces a
 * date value, then the parser is consulted purely to confirm it agrees. That
 * catches frontmatter which is malformed in ways raw scanning cannot see, both
 * of them verified against this repo's gray-matter:
 *
 *   date:"2026-08-04"     no space after the colon, so YAML reads the WHOLE
 *                         block as one plain scalar and data.date is undefined.
 *   "date": 2026-02-30    a quoted duplicate key, which js-yaml rejects outright
 *                         with "duplicated mapping key" and the article then
 *                         fails to load at all.
 *
 * In both cases the raw text looks reasonable while production gets nothing, so
 * a guard that never consults the parser would report green on an article that
 * is broken. Consulting it second, and only to disagree, keeps the evidence.
 *
 * QUOTE STYLE: BOTH ' AND " ARE VALID
 * -----------------------------------
 * Every article on disk today uses double quotes, so it is tempting to require
 * them. Do not. Articles are also written by machine — src/lib/contentRefresh.ts
 * writeArticle() and src/lib/githubArticleCommit.ts both re-serialize front
 * matter with matter.stringify(), which emits SINGLE quotes (`date: '2026-08-04'`).
 * Requiring double quotes would pass all 45 hand-written articles and then reject
 * the first automated content refresh.
 *
 * Run: node scripts/verify-dates.mjs   (wired into the `test` npm script,
 *      .githooks/pre-push, and .github/workflows/verify-links.yml)
 * Unit tests: tests/unit/verify-dates.test.ts
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
// Used ONLY for the second-stage cross-check below, never to read a date value.
// See "WHY THIS FILE DOES NOT USE gray-matter" above before touching this.
import matter from "gray-matter";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const DEFAULT_ARTICLES_DIR = path.join(__dirname, "..", "content", "articles");

/**
 * The frontmatter keys carrying dates, and whether absence is a defect.
 *
 * `date` is required: src/lib/articles.ts types it as a non-optional string and
 * feeds it to the Article node's datePublished. `updatedAt` is genuinely
 * optional (only meaningfully-revised articles carry one) but is validated the
 * same way when present, because it feeds dateModified through the same path and
 * is laundered by js-yaml identically.
 */
export const DATE_FIELDS = [
  { key: "date", required: true },
  { key: "updatedAt", required: false },
];

/**
 * Return the frontmatter block's lines, or null when the file has no block.
 *
 * Takes the FIRST closing delimiter, never the last: `---` is also markdown for
 * a horizontal rule, and several articles use one in the body. Scanning to the
 * last delimiter would swallow the whole article and treat body prose as
 * frontmatter keys.
 */
export function extractFrontmatterBlock(raw) {
  // A UTF-8 BOM would make the opening delimiter "﻿---" and silently fail
  // the match below, reporting "no frontmatter" for a file that plainly has it.
  const text = raw.charCodeAt(0) === 0xfeff ? raw.slice(1) : raw;
  // Split on both line endings: a CRLF file leaves a trailing \r on every line,
  // so "---\r" would not equal "---" and no delimiter would ever match.
  const lines = text.split(/\r?\n/);
  if (lines[0] !== "---") return null;
  const close = lines.indexOf("---", 1);
  if (close === -1) return null;
  return lines.slice(1, close);
}

/**
 * Collect the raw, unparsed text to the right of `key:` for every TOP-LEVEL
 * occurrence of that key in a frontmatter block.
 *
 * "Top-level" is enforced by the `^` anchor alone, and that anchor is the only
 * thing enforcing it: a line beginning with whitespace can never match, so an
 * indented `date:` under some other mapping is correctly invisible here. An
 * explicit leading-whitespace skip used to sit alongside this and was removed as
 * dead code once mutation testing showed deleting it changed no behaviour. If
 * you unanchor this pattern you also silently start matching `publishDate:`.
 *
 * Returns an array so the caller can catch DUPLICATE keys. A file with two
 * top-level `date:` lines parses without complaint under js-yaml's default
 * schema and the LAST one silently wins, so validating the first would bless a
 * value the site never uses.
 */
export function topLevelValues(blockLines, key) {
  const out = [];
  // The colon must be followed by whitespace or end-of-line, because that is
  // what YAML actually requires to read a line as a mapping. `date:"2026-08-04"`
  // is NOT a key: js-yaml parses the entire frontmatter block as one plain
  // scalar string and `data.date` comes back undefined. Matching it here would
  // report a valid date for an article that reaches production with none at all.
  for (const line of blockLines) {
    const match = new RegExp(`^${key}[ \\t]*:([ \\t].*|)$`).exec(line);
    if (match) out.push(match[1]);
  }
  return out;
}

/**
 * Classify the raw scalar to the right of a `key:`.
 *
 * Returns one of:
 *   { kind: "empty" }                  the key is present with no value
 *   { kind: "unquoted", text }         bare scalar — js-yaml would coerce this
 *   { kind: "unterminated", text }     opening quote with no matching close
 *   { kind: "trailing", text }         junk after the closing quote
 *   { kind: "quoted", value }          value is the text INSIDE the quotes
 */
export function parseScalar(rawValue) {
  const text = rawValue.trim();
  if (text === "") return { kind: "empty" };

  const quote = text[0];
  if (quote !== '"' && quote !== "'") return { kind: "unquoted", text };

  const close = text.indexOf(quote, 1);
  // Catches a mismatched pair such as `"2026-01-01'`, which is not two quotes
  // around a value but one unterminated string.
  if (close === -1) return { kind: "unterminated", text };

  const rest = text.slice(close + 1).trim();
  // A trailing `# comment` is legal YAML and common; anything else after the
  // closing quote means the line is not the simple quoted scalar it looks like.
  if (rest !== "" && !rest.startsWith("#")) return { kind: "trailing", text };

  return { kind: "quoted", value: text.slice(1, close) };
}

/**
 * True only for a real day on the calendar, written as YYYY-MM-DD.
 *
 * The round-trip through Date.UTC is load-bearing and an isNaN check is NOT a
 * substitute: `new Date("2026-02-30")` is a perfectly valid Date object for
 * March 2, so isNaN returns false and the impossible day sails through. Building
 * the date and asserting all three components survive is what detects rollover.
 *
 * Reconstruction also rejects a year below 1000 written with leading zeroes:
 * Date.UTC maps years 0-99 into the 1900s, so "0026-01-01" comes back as 1926
 * and fails the year comparison.
 */
export function isRealCalendarDay(value) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return false;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

const QUOTE_FIX =
  'Quote the value in frontmatter, e.g. date: "2026-02-28". Single quotes are fine too.';

/**
 * Validate one date field within one file's frontmatter block.
 * Returns { errors, checked } where `checked` counts date VALUES actually
 * examined — the tripwire against a checker that quietly stops finding anything.
 */
export function checkDateField({ block, key, required, file }) {
  const errors = [];
  const values = topLevelValues(block, key);

  if (values.length === 0) {
    if (required) {
      errors.push(
        `${file}: missing REQUIRED "${key}" in frontmatter. The article would ship with no ` +
          `publication date, losing rich-result eligibility and sorting as NaN in the ` +
          `resources list. Add ${key}: "YYYY-MM-DD".`,
      );
    }
    return { errors, checked: 0 };
  }

  if (values.length > 1) {
    errors.push(
      `${file}: ${values.length} top-level "${key}" keys in frontmatter. YAML silently keeps ` +
        `the LAST one, so the value you are looking at may not be the value the site uses. ` +
        `Delete the duplicates.`,
    );
    return { errors, checked: 0 };
  }

  const scalar = parseScalar(values[0]);

  if (scalar.kind === "empty") {
    errors.push(`${file}: "${key}" is present but has no value. Give it a date or remove the key.`);
    return { errors, checked: 0 };
  }

  if (scalar.kind === "unquoted") {
    errors.push(
      `${file}: "${key}" is UNQUOTED (${key}: ${scalar.text}). YAML parses a bare date into a ` +
        `Date object and has already rolled over any impossible day before the app sees it ` +
        `(2026-02-30 becomes March 2), so the authored value cannot be recovered or checked. ` +
        QUOTE_FIX,
    );
    return { errors, checked: 1 };
  }

  if (scalar.kind === "unterminated") {
    errors.push(
      `${file}: "${key}" has an unterminated or mismatched quote (${key}: ${scalar.text}). ` +
        QUOTE_FIX,
    );
    return { errors, checked: 1 };
  }

  if (scalar.kind === "trailing") {
    errors.push(
      `${file}: "${key}" has unexpected text after the closing quote (${key}: ${scalar.text}). ` +
        `Expected a single quoted date, optionally followed by a # comment.`,
    );
    return { errors, checked: 1 };
  }

  if (!isRealCalendarDay(scalar.value)) {
    errors.push(
      `${file}: "${key}" is not a real calendar day (${key}: "${scalar.value}"). Expected ` +
        `YYYY-MM-DD naming a day that exists — note that 2026-02-30 and 2026-13-01 are both ` +
        `accepted by new Date() and silently rolled forward, which is why this is checked here.`,
    );
    return { errors, checked: 1 };
  }

  return { errors, checked: 1, value: scalar.value };
}

/**
 * Second stage: having established the dates by reading raw text, ask the real
 * parser whether it agrees. Runs only for a file whose raw checks were clean, so
 * the specific, actionable error always comes from the raw stage and this one
 * reports the residue: frontmatter that raw scanning reads one way and js-yaml
 * reads another, or refuses entirely.
 *
 * This never SUPPLIES a value, only contradicts one. That distinction is what
 * keeps the unquoted-date detection intact.
 */
export function crossCheckAgainstParser({ raw, file, validated }) {
  const errors = [];
  let data;
  try {
    data = matter(raw).data;
  } catch (error) {
    errors.push(
      `${file}: the frontmatter passes a raw read but js-yaml REFUSES to parse it ` +
        `(${String(error.message).split("\n")[0]}). The article would fail to load entirely. ` +
        `A duplicate key written two ways, such as date: and "date":, does this.`,
    );
    return errors;
  }

  for (const { key } of DATE_FIELDS) {
    const expected = validated[key];
    if (expected === undefined) continue;
    const actual = data?.[key];
    if (actual !== expected) {
      errors.push(
        `${file}: the raw frontmatter reads "${key}" as "${expected}", but the YAML parser ` +
          `produces ${actual === undefined ? "no such key" : JSON.stringify(String(actual))}. ` +
          `The line is not the mapping it looks like — YAML needs whitespace after the colon, ` +
          `so ${key}:"value" is a plain string, not a key.`,
      );
    }
  }

  return errors;
}

/** Validate every article in `dir`. Returns { fileCount, checkedDates, errors }. */
export function verifyArticleDates(dir = DEFAULT_ARTICLES_DIR) {
  const files = fs
    .readdirSync(dir)
    .filter((name) => name.endsWith(".md"))
    .sort();

  const errors = [];
  let checkedDates = 0;

  for (const file of files) {
    const raw = fs.readFileSync(path.join(dir, file), "utf8");
    const block = extractFrontmatterBlock(raw);

    if (block === null) {
      errors.push(
        `${file}: no YAML frontmatter block. Every article must open with --- on the first ` +
          `line and close with --- before the body.`,
      );
      continue;
    }

    const errorsBefore = errors.length;
    const validated = {};
    for (const { key, required } of DATE_FIELDS) {
      const result = checkDateField({ block, key, required, file });
      errors.push(...result.errors);
      checkedDates += result.checked;
      if (result.value !== undefined) validated[key] = result.value;
    }

    // An updatedAt EARLIER than date is two individually-valid days in an
    // impossible order. Nothing downstream notices: the Article node emits
    // dateModified: (updatedAt ?? date) and the sitemap takes the same value as
    // lastModified, so the page claims it was revised before it was published
    // and reports its freshness as older than it is.
    if (
      validated.date &&
      validated.updatedAt &&
      validated.updatedAt < validated.date
    ) {
      errors.push(
        `${file}: "updatedAt" (${validated.updatedAt}) is EARLIER than "date" ` +
          `(${validated.date}). Both are real days, but an article cannot be revised before ` +
          `it was published: this ships a dateModified preceding datePublished and backdates ` +
          `the page in the sitemap. Fix whichever one is wrong.`,
      );
    }

    if (errors.length === errorsBefore) {
      errors.push(...crossCheckAgainstParser({ raw, file, validated }));
    }
  }

  // Zero coverage is the failure this repo has already been burned by once: a
  // checker that quietly stopped finding anything and printed a green pass for
  // months (see scripts/verify-links.mjs). An empty corpus, a mistyped CLI
  // directory, or a move away from .md would otherwise all report success here
  // while validating nothing, so the absence of work is itself an error.
  //
  // Per-FILE coverage needs no separate assertion. `date` is required and that
  // requirement is enforced above, so every file either raises an error or
  // contributes a validated date: a clean run cannot examine fewer dates than
  // files. An explicit `checkedDates < files.length` invariant was written here
  // and removed once mutation testing showed it unreachable, and therefore
  // untestable. If `date` ever becomes optional, it stops being unreachable and
  // should come back with a test.
  if (files.length === 0) {
    errors.push(
      `${dir}: no .md articles found. A guard that checks nothing must not report success — ` +
        `if the content directory moved, point this script at the new one.`,
    );
  }

  return { fileCount: files.length, checkedDates, errors };
}

function main() {
  const dir = process.argv[2] ? path.resolve(process.argv[2]) : DEFAULT_ARTICLES_DIR;
  const { fileCount, checkedDates, errors } = verifyArticleDates(dir);

  if (errors.length) {
    for (const err of errors) console.error(`❌ ${err}`);
    console.error(
      `\n❌ verify-dates FAILED: ${errors.length} problem(s) across ${fileCount} article(s).`,
    );
    process.exit(1);
  }

  console.log(
    `✅ verify-dates passed (${checkedDates} date(s) validated across ${fileCount} articles).`,
  );
}

// Run only when invoked directly, not when imported by the tests. `realpathSync` is
// load-bearing: Node resolves symlinks for the ESM main module but `path.resolve` does
// not, so comparing the raw argv path would silently fail whenever the script is reached
// through a symlinked directory — and main() never running means this exits 0 having
// printed nothing, which is the same silent-green failure the rest of this file exists to
// prevent. Falls back to the unresolved path if argv[1] no longer exists on disk.
function invokedDirectly() {
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
