#!/usr/bin/env node
/**
 * Ingestion guard for article frontmatter dates.
 *
 * Dates are also validated at RENDER time by `schemaDate` in
 * src/app/lib/structured-data.ts, but that validator can only warn: it drops the
 * bad value so invalid structured data never ships, then emits a console.warn
 * that surfaces as a build-log line nobody necessarily reads. This script is the
 * gate. It fails, so a bad date cannot reach main in the first place.
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
 * If you ever "simplify" this to use gray-matter, you will have reintroduced the
 * exact bug it was written to catch, and the tests will still pass, because the
 * fixtures would be laundered on the way in too.
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
  for (const line of blockLines) {
    const match = new RegExp(`^${key}\\s*:(.*)$`).exec(line);
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

  return { errors, checked: 1 };
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

    for (const { key, required } of DATE_FIELDS) {
      const result = checkDateField({ block, key, required, file });
      errors.push(...result.errors);
      checkedDates += result.checked;
    }
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
