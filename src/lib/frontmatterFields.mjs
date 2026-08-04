/**
 * The rules for the required NON-DATE frontmatter fields, in one place.
 *
 * TWO CALLERS, AND THAT IS THE WHOLE POINT
 * ----------------------------------------
 * Same structure, and the same reason, as src/lib/frontmatterDates.mjs. `scripts/aeo-audit.mjs`
 * walks `content/articles/` and gates the pre-push hook and CI. `src/lib/githubArticleCommit.ts`
 * validates the bytes the automated content refresh is about to commit, before it creates a blob or
 * advances the branch ref. Those are the two ways an article reaches production, and until this
 * module existed only the first one checked these fields: the refresh writes through the GitHub API
 * against `main`, touching no local git, so the hook never runs and CI only ever reports after the
 * commit already exists.
 *
 * The exposure was not theoretical. src/inngest/functions.ts pins `slug`, `category`, `tier` and
 * `relatedSlugs` back to the original article but takes `title`, `excerpt` and `faqs` from model
 * output as-is, and src/lib/articles.ts types the first two as required with a CAST, which is a
 * compile-time claim over unvalidated markdown and not a runtime check. An article committed
 * without a `title` reaches src/app/components/ResourcesGrid.tsx, which calls
 * `a.title.toLowerCase()` on every article with no guard, and throws.
 *
 * WHY THIS MODULE PARSES AND ITS SIBLING REFUSES TO
 * -------------------------------------------------
 * frontmatterDates.mjs reads RAW frontmatter text and says, at length, that parsing first destroys
 * the evidence it is looking for. That is true and it is specific to dates: js-yaml resolves an
 * unquoted YYYY-MM-DD into a Date and silently rolls over an impossible day before any of our code
 * runs, so the authored text is unrecoverable.
 *
 * No such laundering happens to these three fields. A string stays a string, a list stays a list,
 * and the failure being guarded against here is the value production actually receives, not the
 * text somebody typed. ResourcesGrid crashes on what `matter()` hands back, so that is what gets
 * checked. Reading raw text here would validate something other than the thing that breaks.
 *
 * Do not "make this consistent" with its sibling in either direction. The two modules disagree on
 * purpose and each is right for its own field set.
 *
 * CLASSIFY HERE, DECIDE AT THE CALLER
 * -----------------------------------
 * The classifiers below are shared so the two callers cannot drift on what a bad value IS. What to
 * DO about one is deliberately not shared, because the callers face different situations and the
 * repo already worked this way before this module: aeo-audit hard-fails an excerpt over 160 while
 * merely reporting one under 150, on the stated grounds that short is wasted space and long is
 * damage.
 *
 * `validateRequiredFields` encodes the WRITE-PATH policy only. It is stricter than aeo-audit in two
 * places, both because its input is model output arriving unattended at 08:00 on the 1st rather
 * than a human's diff:
 *
 *   - an empty-string excerpt is fatal here, where aeo-audit counts it as merely too short
 *   - an empty or absent `faqs` list is fatal here, where aeo-audit reports the count and moves on
 *
 * A human writing either of those gets caught in review. A model writing one at 08:00 does not.
 *
 * WHAT THIS MODULE DELIBERATELY DOES NOT CHECK
 * --------------------------------------------
 * The SHAPE OF INDIVIDUAL FAQ ENTRIES. `validFaqEntries` in src/app/lib/structured-data.ts already
 * filters entries at the point of use, and src/lib/articles.ts carries an explicit note not to add
 * a second, drifting validator. That note is right, so the rule here answers a different question:
 * `validFaqEntries` decides WHICH entries are valid, and this decides only WHETHER A BLOCK EXISTS
 * at all, which nothing else on the write path asks. The two do not overlap.
 *
 * The `video` block, for the same reason: `videoObjectSchema` re-checks every field at runtime and
 * drops the node or the property on a bad value.
 *
 * THE 60-CHARACTER TITLE BUDGET, which is an ADVISORY and must stay one. CONTENT-STANDARDS Section
 * 14 says not to promote it to a gate, and tests/unit/aeo-audit.test.ts asserts that an over-budget
 * title still exits 0. `classifyTitle` reports the rendered length so callers can advise on it.
 * Nothing here fails on it, and nothing here should start.
 *
 * PLAIN ESM JS, NOT TYPESCRIPT, ON PURPOSE
 * ----------------------------------------
 * aeo-audit.mjs runs under bare `node` in a git hook and in CI with no build step, so this file has
 * to be directly runnable. frontmatterDates.mjs and src/lib/match-workspace/brand-name-key.mjs are
 * the same pattern for the same reason.
 *
 * KEEP THIS MODULE FILESYSTEM-FREE. It is imported into the Next server bundle. Every `fs`, `path`
 * and `url` use belongs in the script.
 *
 * NO EM DASHES ANYWHERE IN THIS FILE. It lives under src/, which aeo-audit scans, and one here
 * would fail the very push that adds it (CONTENT-STANDARDS Section 11).
 */
import matter from "gray-matter";

/**
 * CONTENT-STANDARDS Section 4 requires a search-snippet-ready excerpt, and the seo-review
 * workflow's Step 3 puts the target at 150-160 characters.
 *
 * Over 160 is a hard failure because it does real damage: the description is truncated mid-sentence
 * in the SERP, in social previews, and in the JSON-LD that answer engines read. Under 150 is only
 * wasted space, so it is reported and not enforced.
 *
 * These moved here from scripts/aeo-audit.mjs, which now imports them, so the number exists once.
 * A second copy was exactly how the write path and the disk corpus would have come to disagree
 * about what a valid excerpt is.
 */
export const EXCERPT_MAX = 160;
export const EXCERPT_MIN = 150;

/**
 * Google renders roughly 60 characters of a title. Anything past that is truncated, so the budget
 * is the suffix plus the page's own words. ADVISORY ONLY: see the header.
 */
export const TITLE_BUDGET = 60;
export const BRAND_SHORT = "Waypoint";
export const SUFFIX = ` | ${BRAND_SHORT}`;

/**
 * Whole word, any case. A plain `includes("Waypoint")` was wrong in both directions: `WHY WAYPOINT
 * WORKS` sailed through and got the brand appended a second time, while `Waypointing` was blocked
 * despite not naming the brand.
 */
const BRAND_RE = new RegExp(`\\b${BRAND_SHORT}\\b`, "i");
export const hardCodesBrand = (text) => BRAND_RE.test(text);

/**
 * Characters that occupy no visual space, stripped before any emptiness test.
 *
 * `String.prototype.trim` removes whitespace and nothing else, so a title of one zero-width space
 * is not empty to trim and is completely blank on the page. Covers the soft hyphen, the zero-width
 * and bidi range, line and paragraph separators, the bidi overrides, the word joiner range, and the
 * BOM, plus ordinary whitespace via \s.
 *
 * Deliberately used for EMPTINESS ONLY, never for the excerpt length measurement. Length is
 * measured on the raw string because the raw string is what ships and what a SERP truncates.
 *
 * Written with \u escapes on purpose: these characters are invisible in an editor by definition,
 * so a literal one in this pattern would be unreviewable and would not survive a copy-paste. A
 * literal U+2028 is worse than unreviewable: it is a line terminator to the JS parser and breaks
 * the file outright.
 *
 * Three entries are REDUNDANT and kept for documentation: JS `\s` already matches U+2028, U+2029
 * and U+FEFF (verified, along with U+00A0 and U+3000). Mutation testing cannot kill them for that
 * reason, so do not read a surviving mutant there as a missing test. Every other entry is
 * load-bearing: `\s` matches none of the soft hyphen, the zero-width range, the bidi marks or the
 * word joiners.
 */
const INVISIBLE_RE =
  /[\s\u00ad\u061c\u180e\u200b-\u200f\u2028\u2029\u202a-\u202e\u2060-\u2064\u206a-\u206f\ufeff]/g;

/** True when a string carries no visible glyphs at all, however it is padded. */
function isBlank(value) {
  return value.replace(INVISIBLE_RE, "") === "";
}

/** Name a value's type for an error message. `typeof null` is "object", which helps nobody. */
function describeType(value) {
  if (value === null) return "null";
  if (Array.isArray(value)) return "array";
  return typeof value;
}

/**
 * Render a value compactly inside an error message, without dumping an entire article body.
 *
 * Defensive on purpose. This runs inside a fail-closed validator whose whole job is to turn bad
 * input into a skipped article, so it must not be the thing that throws: JSON.stringify raises on a
 * circular structure, and YAML anchors can produce one. A validator that crashes on the malformed
 * input it was written to reject would take out the Inngest step and the summary email with it.
 */
function preview(value) {
  let text;
  if (typeof value === "string") {
    text = value;
  } else {
    try {
      text = JSON.stringify(value);
    } catch {
      text = null;
    }
  }
  if (typeof text !== "string") return `[unprintable ${describeType(value)}]`;
  return text.length > 60 ? `${text.slice(0, 57)}...` : text;
}

/**
 * Classify a parsed `title`.
 *
 * Returns { kind, rendered? } where kind is one of:
 *   "missing" | "not-a-string" | "empty" | "brand" | "ok"
 *
 * `rendered` is the length the title occupies once layout.tsx appends the brand suffix, present on
 * "brand" and "ok". It exists for the advisory report and is not a failure condition.
 */
export function classifyTitle(value) {
  if (value === undefined) return { kind: "missing" };
  if (typeof value !== "string") return { kind: "not-a-string" };
  if (isBlank(value)) return { kind: "empty" };
  const rendered = value.length + SUFFIX.length;
  if (hardCodesBrand(value)) return { kind: "brand", rendered };
  return { kind: "ok", rendered };
}

/**
 * Classify a parsed `excerpt`.
 *
 * Returns { kind, length } where kind is one of:
 *   "missing" | "not-a-string" | "empty" | "short" | "long" | "ok"
 *
 * `length` is null whenever no string was available to measure, which is the shape aeo-audit's
 * report already expected of a missing excerpt.
 */
export function classifyExcerpt(value) {
  if (value === undefined) return { kind: "missing", length: null };
  if (typeof value !== "string") return { kind: "not-a-string", length: null };
  // Blank BEFORE long: 200 zero-width spaces are both, and "you wrote nothing" is the useful
  // message, not "your excerpt is too long".
  if (isBlank(value)) return { kind: "empty", length: value.length };
  if (value.length > EXCERPT_MAX) return { kind: "long", length: value.length };
  if (value.length < EXCERPT_MIN) return { kind: "short", length: value.length };
  return { kind: "ok", length: value.length };
}

/**
 * Classify a parsed `faqs` block.
 *
 * Returns { kind, count } where kind is one of:
 *   "missing" | "not-a-list" | "empty" | "ok"
 *
 * Only `undefined` counts as "missing". A `faqs:` line with no value parses to null, and null is
 * reported as "not-a-list" rather than as absence, because that is what aeo-audit has always
 * treated it as and because the two cases deserve different advice: one forgot the block, the other
 * wrote a broken one.
 *
 * Entry shape is NOT examined here. See the header: that belongs to `validFaqEntries`.
 */
export function classifyFaqs(value) {
  if (value === undefined) return { kind: "missing", count: 0 };
  if (!Array.isArray(value)) return { kind: "not-a-list", count: 0 };
  if (value.length === 0) return { kind: "empty", count: 0 };
  return { kind: "ok", count: value.length };
}

/** The fields this module requires, in the order their errors are reported. */
export const REQUIRED_FIELDS = ["title", "excerpt", "faqs"];

/**
 * Every required-field rule, applied to one article's RAW markdown text, under the WRITE-PATH
 * policy described in the header.
 *
 * `label` names the article in the error messages. For the automated refresh that means a filename
 * plus provenance, since these messages land in an Inngest failure and a summary email rather than
 * in front of somebody editing the file.
 *
 * Returns { errors, checked }, where `checked` counts fields actually classified. Callers use it as
 * a tripwire, the same way verify-dates.mjs does: a run that examined nothing has not passed, it
 * has failed to look. A guard in this repo has already printed a green pass for months while
 * checking zero things (scripts/verify-links.mjs), which is why every guard added since counts its
 * own work.
 *
 * The JSDoc types are load-bearing, not decoration: this module is consumed from TypeScript
 * (src/lib/githubArticleCommit.ts) and without them TS infers an options type with `label` missing
 * and rejects the call.
 *
 * `faqEntryFilter` is OPTIONAL dependency injection, and the injection is the point. A present,
 * non-empty `faqs` list can still publish nothing: `faqs: [{}]` is a list with one entry, and
 * `validFaqEntries` drops that entry at render time, so the article ships with no visible FAQ and
 * no FAQPage markup while satisfying every structural rule above. Checking that here would mean
 * reimplementing entry shape, which is exactly the drifting second validator the header refuses to
 * write.
 *
 * So the caller supplies the REAL predicate instead. src/lib/githubArticleCommit.ts passes
 * `validFaqEntries` itself, which cannot drift from production because it IS production. It is
 * injected rather than imported because that function is TypeScript and this module has to stay
 * runnable by bare `node` for scripts/aeo-audit.mjs. Callers that pass nothing get the structural
 * checks only, which is the correct behaviour for the CLI: the disk corpus is already covered by
 * tests/unit/structured-data.test.ts asserting validFaqEntries is a no-op on all 45 articles.
 *
 * @param {string} raw
 * @param {{ label: string, faqEntryFilter?: (entries: unknown[]) => unknown[] }} options
 * @returns {{ errors: string[], checked: number }}
 */
export function validateRequiredFields(raw, { label, faqEntryFilter }) {
  const errors = [];

  let data;
  try {
    data = matter(raw).data || {};
  } catch (error) {
    // frontmatterDates.mjs reports this too, from crossCheckAgainstParser, so a broken-YAML article
    // draws one complaint from each module. That is noise on an article which is being rejected
    // either way, and the alternative is one module silently trusting the other to have looked.
    return {
      errors: [
        `${label}: js-yaml REFUSES to parse the frontmatter ` +
          `(${String(error.message).split("\n")[0]}), so none of the required fields could be ` +
          `read and the article would fail to load entirely.`,
      ],
      checked: 0,
    };
  }

  let checked = 0;

  // ── title ────────────────────────────────────────────────────────────────
  const title = classifyTitle(data.title);
  checked += 1;
  if (title.kind === "missing") {
    errors.push(
      `${label}: missing REQUIRED "title" in frontmatter. src/lib/articles.ts types it as a ` +
        `non-optional string, but that is a cast over unvalidated markdown rather than a check, ` +
        `so the article commits and then src/app/components/ResourcesGrid.tsx throws on ` +
        `title.toLowerCase(), taking down the resources search for every article and not just ` +
        `this one. Add title: "...".`,
    );
  } else if (title.kind === "not-a-string") {
    errors.push(
      `${label}: "title" is a ${describeType(data.title)} (${preview(data.title)}), not a ` +
        `string. YAML reads a bare 2026 as a number and a bare date as a Date, and ` +
        `ResourcesGrid calls title.toLowerCase(), which only a string has. Quote the value.`,
    );
  } else if (title.kind === "empty") {
    errors.push(
      `${label}: "title" is present but empty. The article would ship with a blank <title>, a ` +
        `blank H1 and a blank entry in the resources list. Give it a title or the article is ` +
        `not publishable.`,
    );
  } else if (title.kind === "brand") {
    errors.push(
      `${label}: "title" hard-codes the brand (title: ${preview(data.title)}). ` +
        `src/app/layout.tsx templates "${SUFFIX}" onto every title, so this ships as ` +
        `"...${SUFFIX}${SUFFIX}" and spends the rendered title budget twice over on the brand. ` +
        `CONTENT-STANDARDS Section 14. Committing it would also fail scripts/aeo-audit.mjs on ` +
        `the next push anybody makes, which is somebody else's problem to discover.`,
    );
  }

  // ── excerpt ──────────────────────────────────────────────────────────────
  const excerpt = classifyExcerpt(data.excerpt);
  checked += 1;
  if (excerpt.kind === "missing") {
    errors.push(
      `${label}: missing REQUIRED "excerpt" in frontmatter. It feeds the meta description, the ` +
        `OpenGraph description and the Article JSON-LD description, and ` +
        `src/app/components/ResourcesGrid.tsx calls excerpt.toLowerCase() unguarded, so the ` +
        `article commits and the resources search then throws. Add excerpt: "...".`,
    );
  } else if (excerpt.kind === "not-a-string") {
    errors.push(
      `${label}: "excerpt" is a ${describeType(data.excerpt)} (${preview(data.excerpt)}), not a ` +
        `string. ResourcesGrid calls excerpt.toLowerCase(), which only a string has. Quote the ` +
        `value.`,
    );
  } else if (excerpt.kind === "empty") {
    errors.push(
      `${label}: "excerpt" is present but empty. The page would ship with an empty meta ` +
        `description and an empty JSON-LD description, which is worse than a short one: search ` +
        `engines fall back to scraping whatever text they find.`,
    );
  } else if (excerpt.kind === "long") {
    errors.push(
      `${label}: "excerpt" is ${excerpt.length} characters, over the ${EXCERPT_MAX} limit. It ` +
        `would be truncated mid-sentence in the SERP, in social previews and in the JSON-LD ` +
        `answer engines read. scripts/aeo-audit.mjs fails a push over this, so committing it ` +
        `also breaks the next push anybody makes. Tighten it to ${EXCERPT_MIN}-${EXCERPT_MAX}.`,
    );
  }
  // "short" is deliberately not an error here, matching aeo-audit: under 150 wastes snippet space
  // and damages nothing.

  // ── faqs ─────────────────────────────────────────────────────────────────
  const faqs = classifyFaqs(data.faqs);
  checked += 1;
  if (faqs.kind === "missing") {
    errors.push(
      `${label}: missing REQUIRED "faqs" block in frontmatter. All 45 published articles carry ` +
        `one and tests/unit/structured-data.test.ts asserts it, so an article refreshed without ` +
        `one silently drops its FAQPage markup and the visible FAQ section the page renders from ` +
        `the same source. Nothing would fail until CI ran, after the commit was already on main.`,
    );
  } else if (faqs.kind === "not-a-list") {
    errors.push(
      `${label}: "faqs" is a ${describeType(data.faqs)} (${preview(data.faqs)}), not a list. ` +
        `A bare "faqs:" with no value parses to null and lands here too. The article would ship ` +
        `no FAQ markup at all, and scripts/aeo-audit.mjs fails a push over a non-list faqs.`,
    );
  } else if (faqs.kind === "empty") {
    errors.push(
      `${label}: "faqs" is an empty list. The block is present but publishes nothing, so the ` +
        `article loses its FAQPage markup exactly as if the block were missing, while looking ` +
        `correct to anything that only checks the key exists.`,
    );
  } else if (faqEntryFilter) {
    // Entry SHAPE is never judged here, only the count that survives production's own filter. See
    // the header: reimplementing the shape rules is the drifting second validator this module
    // refuses to become.
    const surviving = faqEntryFilter(data.faqs);
    if (surviving.length < faqs.count) {
      const lost = faqs.count - surviving.length;
      errors.push(
        `${label}: ${lost} of ${faqs.count} "faqs" entr${lost === 1 ? "y is" : "ies are"} ` +
          `dropped by validFaqEntries, so the article would publish ${surviving.length} FAQ` +
          `${surviving.length === 1 ? "" : "s"} while appearing to carry ${faqs.count}. An entry ` +
          `written as a bare string, or a stray "-" that YAML parses as null, does this. Each ` +
          `entry needs a q and an a.`,
      );
    }
    // ANY dropped entry fails, not just all of them. Partial loss is the worse case precisely
    // because it looks like success: the article commits, the summary email reports it refreshed,
    // and the page quietly ships fewer FAQs than it claims. Safe to be this strict because the
    // filter is only ever injected on the bot path, and every one of the 45 articles on disk
    // already survives it untouched (tests/unit/structured-data.test.ts asserts exactly that).
    //
    // NOT enforced here: the prompt's four-FAQ instruction. scripts/aeo-audit.mjs reports "fewer
    // than 4 Q" without failing a push, so gating on a count would make bot commits stricter than
    // every human one. That is a content-policy change and belongs to a human, not to this guard.
  }

  return { errors, checked };
}
