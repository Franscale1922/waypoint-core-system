/**
 * The rules for a validly-dated article, in one place.
 *
 * TWO CALLERS, AND THAT IS THE WHOLE POINT
 * ----------------------------------------
 * `scripts/verify-dates.mjs` walks `content/articles/` and gates the pre-push hook, `npm test`
 * and CI. `src/lib/githubArticleCommit.ts` validates the bytes the automated content refresh is
 * about to commit, before it creates a blob or advances the branch ref. Those are the two ways an
 * article reaches production, and they were never both covered: the refresh writes through the
 * GitHub API against `main`, touching no local git, so the hook never runs and CI only ever
 * reports after the fact.
 *
 * Two copies of these rules would drift, and the copy that drifts is the one nobody is looking at.
 * Hence one module, imported by both.
 *
 * PLAIN ESM JS, NOT TYPESCRIPT, ON PURPOSE
 * ----------------------------------------
 * The script side runs under bare `node` in a git hook and in CI, with no build step, so this file
 * has to be directly runnable. `src/lib/match-workspace/brand-name-key.mjs` is the same pattern for
 * the same reason and is already proven through the Next build.
 *
 * KEEP THIS MODULE FILESYSTEM-FREE. It is imported into the Next server bundle. Every `fs`, `path`
 * and `url` use belongs in the script, and adding one here would drag Node built-ins into the app.
 *
 * WHY THESE CHECKS READ RAW TEXT AND NOT PARSED VALUES
 * ----------------------------------------------------
 * gray-matter runs js-yaml, and js-yaml resolves an UNQUOTED YYYY-MM-DD into a JavaScript Date
 * before any of our code is reached, applying its own silent rollover on the way. Verified against
 * this repo's gray-matter:
 *
 *     date: 2026-02-30   ->  Date 2026-03-02   (impossible day, rolled forward)
 *     date: 2026-13-01   ->  Date 2027-01-01   (13th month, rolled into next year)
 *     date: "2026-02-30" ->  string "2026-02-30" (quoted: preserved verbatim)
 *
 * By the time a parsed value is in hand the authored text is unrecoverable and the corruption is
 * undetectable, because a rolled-over date is indistinguishable from one somebody meant to write.
 * So every check below reads the RAW frontmatter text. Parsing first would destroy the evidence
 * this module is looking for.
 *
 * If you ever "simplify" this to read date VALUES through gray-matter, you will have reintroduced
 * the exact bug it was written to catch, and the tests will still pass, because the fixtures would
 * be laundered on the way in too.
 *
 * `crossCheckAgainstParser` is the one function that does call gray-matter, and the ordering is the
 * whole point: raw checks run FIRST and are the only thing that ever produces a date value, then
 * the parser is consulted purely to confirm it agrees. That catches frontmatter which is malformed
 * in ways raw scanning cannot see, both of them verified against this repo's gray-matter:
 *
 *   date:"2026-08-04"     no space after the colon, so YAML reads the WHOLE block as one plain
 *                         scalar and data.date is undefined.
 *   "date": 2026-02-30    a quoted duplicate key, which js-yaml rejects outright with "duplicated
 *                         mapping key" and the article then fails to load at all.
 *
 * In both cases the raw text looks reasonable while production gets nothing, so a guard that never
 * consults the parser would report green on an article that is broken. Consulting it second, and
 * only to disagree, keeps the evidence.
 *
 * QUOTE STYLE: BOTH ' AND " ARE VALID
 * -----------------------------------
 * Every hand-written article uses double quotes, so it is tempting to require them. Do not. Articles
 * are also written by machine, and `matter.stringify()` emits SINGLE quotes (`date: '2026-08-04'`).
 * Requiring double quotes would pass all 45 hand-written articles and then reject the first
 * automated content refresh.
 */
// Used ONLY by crossCheckAgainstParser, never to read a date value. See above before touching this.
import matter from "gray-matter";

/**
 * The frontmatter keys carrying dates, and whether absence is a defect.
 *
 * `date` is required: src/lib/articles.ts types it as a non-optional string and feeds it to the
 * Article node's datePublished. `updatedAt` is genuinely optional (only meaningfully-revised
 * articles carry one) but is validated the same way when present, because it feeds dateModified
 * through the same path and is laundered by js-yaml identically.
 */
export const DATE_FIELDS = [
  { key: "date", required: true },
  { key: "updatedAt", required: false },
];

/**
 * How far ahead of today a date may be dated before it is rejected, in days.
 *
 * This was originally justified as covering the UTC/Mountain gap, and that reasoning was BACKWARDS.
 * Mountain is UTC-6/-7, so a local date always lags UTC or equals it, never leads it: an evening
 * edit on the 4th Mountain time is already the 5th in UTC, which makes the author's "today" of the
 * 4th a PAST date, needing no tolerance at all. A Mountain author cannot produce a legitimately
 * future date by timezone alone. (Codex round-1 review caught the error.)
 *
 * What the day actually buys is slack between the machine that stamps a date and the machine that
 * later checks it, which need not agree on the current day. That is a real if small concern, and it
 * is the honest reason this is 1 rather than 0.
 *
 * The cost is equally honest: one day of genuinely future metadata is permitted. Setting this to 0
 * is a one-line change and would be strictly tighter, at the price of failing any push whose
 * checking clock happens to sit a day behind the writing one.
 */
export const FUTURE_TOLERANCE_DAYS = 1;

/** Today as YYYY-MM-DD, in UTC: the same basis every writer in this repo stamps dates on. */
export function utcDayString(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

/** Shift a YYYY-MM-DD day by whole days, in UTC. Input must already be a real calendar day. */
export function addUtcDays(day, days) {
  const [year, month, date] = day.split("-").map(Number);
  return utcDayString(new Date(Date.UTC(year, month - 1, date + days)));
}

/**
 * Return the frontmatter block's lines, or null when the file has no block.
 *
 * Takes the FIRST closing delimiter, never the last: `---` is also markdown for a horizontal rule,
 * and several articles use one in the body. Scanning to the last delimiter would swallow the whole
 * article and treat body prose as frontmatter keys.
 */
export function extractFrontmatterBlock(raw) {
  // A UTF-8 BOM would make the opening delimiter "﻿---" and silently fail the match below,
  // reporting "no frontmatter" for a file that plainly has it.
  const text = raw.charCodeAt(0) === 0xfeff ? raw.slice(1) : raw;
  // Split on both line endings: a CRLF file leaves a trailing \r on every line, so "---\r" would
  // not equal "---" and no delimiter would ever match.
  const lines = text.split(/\r?\n/);
  if (lines[0] !== "---") return null;
  const close = lines.indexOf("---", 1);
  if (close === -1) return null;
  return lines.slice(1, close);
}

/**
 * Collect the raw, unparsed text to the right of `key:` for every TOP-LEVEL occurrence of that key
 * in a frontmatter block.
 *
 * "Top-level" is enforced by the `^` anchor alone, and that anchor is the only thing enforcing it:
 * a line beginning with whitespace can never match, so an indented `date:` under some other mapping
 * is correctly invisible here. An explicit leading-whitespace skip used to sit alongside this and
 * was removed as dead code once mutation testing showed deleting it changed no behaviour. If you
 * unanchor this pattern you also silently start matching `publishDate:`.
 *
 * Returns an array so the caller can catch DUPLICATE keys. A file with two top-level `date:` lines
 * parses without complaint under js-yaml's default schema and the LAST one silently wins, so
 * validating the first would bless a value the site never uses.
 */
export function topLevelValues(blockLines, key) {
  const out = [];
  // The colon must be followed by whitespace or end-of-line, because that is what YAML actually
  // requires to read a line as a mapping. `date:"2026-08-04"` is NOT a key: js-yaml parses the
  // entire frontmatter block as one plain scalar string and `data.date` comes back undefined.
  // Matching it here would report a valid date for an article that reaches production with none.
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
 *   { kind: "unquoted", text }         bare scalar, which js-yaml would coerce
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
  // Catches a mismatched pair such as `"2026-01-01'`, which is not two quotes around a value but
  // one unterminated string.
  if (close === -1) return { kind: "unterminated", text };

  const rest = text.slice(close + 1).trim();
  // A trailing `# comment` is legal YAML and common; anything else after the closing quote means
  // the line is not the simple quoted scalar it looks like.
  if (rest !== "" && !rest.startsWith("#")) return { kind: "trailing", text };

  return { kind: "quoted", value: text.slice(1, close) };
}

/**
 * True only for a real day on the calendar, written as YYYY-MM-DD.
 *
 * The round-trip through Date.UTC is load-bearing and an isNaN check is NOT a substitute:
 * `new Date("2026-02-30")` is a perfectly valid Date object for March 2, so isNaN returns false and
 * the impossible day sails through. Building the date and asserting all three components survive is
 * what detects rollover.
 *
 * Reconstruction also rejects a year below 1000 written with leading zeroes: Date.UTC maps years
 * 0-99 into the 1900s, so "0026-01-01" comes back as 1926 and fails the year comparison.
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
 * Validate one date field within one frontmatter block.
 * Returns { errors, checked } where `checked` counts date VALUES actually examined: the tripwire
 * against a checker that quietly stops finding anything.
 *
 * @param {{ block: string[], key: string, required: boolean, label: string }} args
 * @returns {{ errors: string[], checked: number, value?: string }}
 */
export function checkDateField({ block, key, required, label }) {
  const errors = [];
  const values = topLevelValues(block, key);

  if (values.length === 0) {
    if (required) {
      errors.push(
        `${label}: missing REQUIRED "${key}" in frontmatter. The article would ship with no ` +
          `publication date, losing rich-result eligibility and sorting as NaN in the ` +
          `resources list. Add ${key}: "YYYY-MM-DD".`,
      );
    }
    return { errors, checked: 0 };
  }

  if (values.length > 1) {
    errors.push(
      `${label}: ${values.length} top-level "${key}" keys in frontmatter. YAML silently keeps ` +
        `the LAST one, so the value you are looking at may not be the value the site uses. ` +
        `Delete the duplicates.`,
    );
    return { errors, checked: 0 };
  }

  const scalar = parseScalar(values[0]);

  if (scalar.kind === "empty") {
    errors.push(`${label}: "${key}" is present but has no value. Give it a date or remove the key.`);
    return { errors, checked: 0 };
  }

  if (scalar.kind === "unquoted") {
    errors.push(
      `${label}: "${key}" is UNQUOTED (${key}: ${scalar.text}). YAML parses a bare date into a ` +
        `Date object and has already rolled over any impossible day before the app sees it ` +
        `(2026-02-30 becomes March 2), so the authored value cannot be recovered or checked. ` +
        QUOTE_FIX,
    );
    return { errors, checked: 1 };
  }

  if (scalar.kind === "unterminated") {
    errors.push(
      `${label}: "${key}" has an unterminated or mismatched quote (${key}: ${scalar.text}). ` +
        QUOTE_FIX,
    );
    return { errors, checked: 1 };
  }

  if (scalar.kind === "trailing") {
    errors.push(
      `${label}: "${key}" has unexpected text after the closing quote (${key}: ${scalar.text}). ` +
        `Expected a single quoted date, optionally followed by a # comment.`,
    );
    return { errors, checked: 1 };
  }

  if (!isRealCalendarDay(scalar.value)) {
    errors.push(
      `${label}: "${key}" is not a real calendar day (${key}: "${scalar.value}"). Expected ` +
        `YYYY-MM-DD naming a day that exists. Note that 2026-02-30 and 2026-13-01 are both ` +
        `accepted by new Date() and silently rolled forward, which is why this is checked here.`,
    );
    return { errors, checked: 1 };
  }

  return { errors, checked: 1, value: scalar.value };
}

/**
 * Second stage: having established the dates by reading raw text, ask the real parser whether it
 * agrees. Runs only when the raw checks were clean, so the specific, actionable error always comes
 * from the raw stage and this one reports the residue: frontmatter that raw scanning reads one way
 * and js-yaml reads another, or refuses entirely.
 *
 * This never SUPPLIES a value, only contradicts one. That distinction is what keeps the
 * unquoted-date detection intact.
 *
 * Worth knowing where this is and is not protection. Over a file on disk it is a real check. Over
 * content that `matter.stringify()` just produced it is close to vacuous, because gray-matter will
 * agree with itself; it runs there for uniformity and because it costs nothing, not because it is
 * catching anything.
 *
 * @param {{ raw: string, label: string, validated: Record<string, string> }} args
 * @returns {string[]}
 */
export function crossCheckAgainstParser({ raw, label, validated }) {
  const errors = [];
  let data;
  try {
    data = matter(raw).data;
  } catch (error) {
    errors.push(
      `${label}: the frontmatter passes a raw read but js-yaml REFUSES to parse it ` +
        `(${String(error.message).split("\n")[0]}). The article would fail to load entirely. ` +
        `A duplicate key written two ways, such as date: and "date":, does this.`,
    );
    return errors;
  }

  for (const { key } of DATE_FIELDS) {
    const expected = validated[key];
    const actual = data?.[key];

    // The raw stage saw no such key, but the parser did. Skipping this case was a real hole, found
    // by a Codex round-1 review and reproduced: `"updatedAt": "9999-12-31"` with a QUOTED key is
    // invisible to the `^key:` scan, so an optional field read as absent raised nothing, the future
    // and ordering rules had no value to test, and this loop then declined to look because there
    // was nothing to compare against. The guard reported clean while production received
    // 9999-12-31.
    //
    // An optional field is the whole exposure: `date` is required, so raw scanning failing to see
    // it already fails the file before this runs. Anything js-yaml resolves that `^key:` cannot
    // match is caught here generically, rather than by teaching the raw scanner every YAML spelling
    // of a key, which is the game this module is deliberately not playing.
    if (expected === undefined) {
      if (actual !== undefined) {
        errors.push(
          `${label}: the YAML parser produces a "${key}" of ` +
            `${JSON.stringify(String(actual))} that the raw frontmatter scan never saw, so none ` +
            `of the date rules were applied to it and the value reaches production unchecked. ` +
            `Write it as a plain top-level key, ${key}: "YYYY-MM-DD", not as a quoted key or a ` +
            `merge.`,
        );
      }
      continue;
    }

    if (actual !== expected) {
      errors.push(
        `${label}: the raw frontmatter reads "${key}" as "${expected}", but the YAML parser ` +
          `produces ${actual === undefined ? "no such key" : JSON.stringify(String(actual))}. ` +
          `The line is not the mapping it looks like: YAML needs whitespace after the colon, ` +
          `so ${key}:"value" is a plain string, not a key.`,
      );
    }
  }

  return errors;
}

/**
 * Every date rule, applied to one article's RAW markdown text.
 *
 * `label` names the article in the error messages: a filename for the CLI, or a filename plus
 * provenance for the automated refresh, since the same messages then land in an Inngest failure and
 * a summary email rather than in front of somebody editing the file.
 *
 * `today` is injected so the future-date rule is deterministic and testable, defaulting to the
 * current UTC day.
 *
 * Returns { errors, checked }, where `checked` counts date values actually examined. Callers use it
 * as a tripwire: a run that examined nothing has not passed, it has failed to look.
 *
 * The JSDoc types are load-bearing, not decoration: this module is consumed from TypeScript
 * (src/lib/githubArticleCommit.ts) and without them TS infers an options type with `label` missing
 * and rejects the call.
 *
 * @param {string} raw
 * @param {{ label: string, today?: string }} options
 * @returns {{ errors: string[], checked: number }}
 */
export function validateFrontmatterDates(raw, { label, today = utcDayString() }) {
  // A caller-supplied `today` is a programming error when malformed, not a content defect, so it
  // throws rather than joining the returned errors. The lexical comparison below would otherwise
  // misbehave silently.
  if (!isRealCalendarDay(today)) {
    throw new TypeError(`validateFrontmatterDates: \`today\` must be YYYY-MM-DD, got ${today}`);
  }

  const errors = [];
  let checked = 0;

  const block = extractFrontmatterBlock(raw);
  if (block === null) {
    errors.push(
      `${label}: no YAML frontmatter block. Every article must open with --- on the first ` +
        `line and close with --- before the body.`,
    );
    return { errors, checked };
  }

  const validated = {};
  for (const { key, required } of DATE_FIELDS) {
    const result = checkDateField({ block, key, required, label });
    errors.push(...result.errors);
    checked += result.checked;
    if (result.value !== undefined) validated[key] = result.value;
  }

  // An updatedAt EARLIER than date is two individually-valid days in an impossible order. Nothing
  // downstream notices: the Article node emits dateModified: (updatedAt ?? date) and the sitemap
  // takes the same value as lastModified, so the page claims it was revised before it was published
  // and reports its freshness as older than it is.
  if (validated.date && validated.updatedAt && validated.updatedAt < validated.date) {
    errors.push(
      `${label}: "updatedAt" (${validated.updatedAt}) is EARLIER than "date" ` +
        `(${validated.date}). Both are real days, but an article cannot be revised before ` +
        `it was published: this ships a dateModified preceding datePublished and backdates ` +
        `the page in the sitemap. Fix whichever one is wrong.`,
    );
  }

  // A future date is individually valid and structurally fine, and still wrong: the sitemap reads
  // (updatedAt ?? date) straight into lastModified, so an article can claim it was revised on a day
  // that has not happened. This repo does no scheduled or future-dated publishing, so there is no
  // legitimate case to carve out. Runs AFTER the per-field checks because it compares YYYY-MM-DD
  // strings lexically, which is only sound once isRealCalendarDay has forced a four-digit year and
  // a real day.
  const latestAllowed = addUtcDays(today, FUTURE_TOLERANCE_DAYS);
  for (const { key } of DATE_FIELDS) {
    const value = validated[key];
    if (value !== undefined && value > latestAllowed) {
      errors.push(
        `${label}: "${key}" is in the FUTURE (${key}: "${value}", today is ${today} UTC). ` +
          `It would ship as a dateModified and a sitemap lastModified for a day that has not ` +
          `happened yet. Dates may run at most ${FUTURE_TOLERANCE_DAYS} day ahead, which is slack ` +
          `for clock disagreement between machines and nothing else. This site does not schedule ` +
          `or future-date publishing.`,
      );
    }
  }

  // Only consult the parser about frontmatter the raw stage found clean, so the actionable error is
  // always the specific one.
  if (errors.length === 0) {
    errors.push(...crossCheckAgainstParser({ raw, label, validated }));
  }

  return { errors, checked };
}
