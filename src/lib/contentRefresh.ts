/**
 * contentRefresh.ts
 *
 * Utilities for the automated content refresh Inngest function.
 * Handles: article discovery, staleness detection, cadence mapping,
 * profitability/brand-name validation, and disk write-back.
 */

import fs from "fs";
import path from "path";
import matter from "gray-matter";
import identityMap from "./match-workspace/brand-identity-map.json";
import {
  REVIEW_CADENCES,
  REVIEW_CADENCE_FIELD,
  isReviewCadence,
  validateReviewCadence,
} from "./reviewCadence.mjs";

/**
 * Typed view of the shared table. reviewCadence.mjs is plain JS so that the audit script can
 * import it too, which means TypeScript sees an object literal with five specific keys and
 * refuses to index it with an arbitrary string. The membership test is isReviewCadence, which
 * runs first; this only gives the lookup a type.
 */
const CADENCE_DAYS: Record<string, number | null> = REVIEW_CADENCES;

// ─── Types ───────────────────────────────────────────────────────────────────

export interface ArticleFrontmatter {
  title: string;
  slug: string;
  date: string; // YYYY-MM-DD
  category: string;
  tier: number;
  excerpt: string;
  relatedSlugs: string[];
  faqs?: { q: string; a: string }[];
  // Optional, and the only cadence signal anybody actually authored. Declared
  // explicitly rather than left to the index signature below because
  // getRefreshCadenceDays reads it to override every other rule: a field that
  // load-bearing is a rename away from silently becoming undefined.
  reviewCadence?: string;
  // The revision date, stamped by serializeArticle on every refresh. Declared here for the same
  // reason as reviewCadence, and it earned it in the same way: isStale now schedules from
  // `updatedAt ?? date`, so this field decides WHICH articles the monthly run rewrites. Left in the
  // index signature it would type as `unknown`, and a rename or a typo would read as undefined --
  // which does not fail, it just silently falls back to `date` and reinstates the runaway loop the
  // isStale docblock describes.
  updatedAt?: string;
  [key: string]: unknown;
}

export interface Article {
  slug: string;
  frontmatter: ArticleFrontmatter;
  body: string;
  filePath: string;
}

// ─── Frontmatter Ownership ───────────────────────────────────────────────────

/**
 * The ONLY frontmatter fields the refresh takes from model output.
 *
 * These three are the content the refresh exists to rewrite. Everything else in an article's
 * frontmatter is either identity (`slug`), taxonomy (`category`, `tier`), editorial wiring
 * (`relatedSlugs`, `checklistSlug`, `escapeKit`) or provenance (`date`, `updatedAt`), and a language
 * model has no standing to author any of it.
 *
 * NOT on this list, deliberately:
 *
 *   `date` and `updatedAt`, because `serializeArticle` in src/lib/githubArticleCommit.ts stamps
 *   both at the moment of the commit and ignores whatever it was handed. Pinning them here as well
 *   would imply the value flowing through this function matters, and it does not.
 */
export const MODEL_OWNED_FIELDS = ["title", "excerpt", "faqs"] as const;

/**
 * Build the frontmatter for a refreshed article: start from the ORIGINAL and overwrite only the
 * fields the model legitimately owns.
 *
 * THE DIRECTION IS THE WHOLE POINT, AND IT USED TO RUN THE OTHER WAY
 * ------------------------------------------------------------------
 * This previously took the model's frontmatter wholesale and pinned four fields back onto it
 * (`relatedSlugs`, `slug`, `category`, `tier`). That construction is subtractive: a field survives a
 * refresh only if somebody remembered to name it, so every field nobody named was silently deleted
 * from the committed file.
 *
 * Two were, and it was not theoretical. `checklistSlug` (on 42 of 45 articles) and `escapeKit` (on
 * 12) appear nowhere in src/lib/contentRefreshPrompt.ts, so the model had no reason to emit them and
 * they were simply lost. src/app/(marketing)/resources/[slug]/page.tsx gates two CTAs on exactly
 * those keys, so a refreshed article quietly stopped rendering its email capture and its escape kit.
 * Nothing failed: every required field was still present, so the commit passed every gate in front
 * of it and the monthly summary email reported the article as refreshed.
 *
 * Inverting it makes preservation the DEFAULT. A field added to an article next year survives a
 * refresh without anyone touching this file, which is the actual root cause fixed rather than the
 * two symptoms.
 *
 * It also closes a second hole in the same stroke. A field the model INVENTS is no longer copied
 * through: only the three names above are read from its output, so a hallucinated `author` or
 * `noindex` cannot reach `main`. The doc comment on `serializeArticle` describes that passthrough as
 * a live problem, and this is where it stops.
 *
 * ABSENCE IS PROPAGATED, NEVER BACKFILLED
 * ---------------------------------------
 * When the model omits one of the three, the field is DELETED from the result rather than left at
 * its original value. That looks wrong at a glance and is load-bearing.
 *
 * The original article always has a valid `title`, so inheriting it would produce frontmatter that
 * passes `validateRequiredFields` cleanly and commits a suspect new body under the old title. The
 * caller in src/inngest/functions.ts is explicit that this is the worse outcome: a response missing
 * one of these is malformed, which makes its body suspect too, so the article is skipped and keeps
 * the good version already on disk. Deleting the key is what lets the validator SEE the absence and
 * report it as a specific missing-field error instead of a generic one.
 *
 * Assigning `undefined` would not do the same job. js-yaml refuses to dump a key whose value is
 * explicitly undefined, so the article would still be skipped, but via a serialization failure whose
 * message says nothing about which field the model dropped.
 *
 * `modelData` is a plain `Record` rather than a Partial<ArticleFrontmatter> because it is unvalidated
 * model output: typing it as the target shape would be a claim about bytes nobody has checked yet.
 * Validation happens downstream, against the serialized file, in `validateArticlePayload`.
 *
 * WHAT THIS DOES NOT FIX: PRESERVATION IS OF THE PARSED VALUE, NOT THE AUTHORED TEXT
 * ---------------------------------------------------------------------------------
 * `original` reaches this function through an Inngest `step.run`, whose return value is memoized as
 * JSON. js-yaml has already resolved an unquoted YAML timestamp into a Date, and JSON turns that
 * Date into a string, so a preserved field carries what the parser produced rather than what the
 * author typed. For an impossible date such as 2026-02-30 the rollover to March 2 happened before
 * any of our code ran, and the refresh would commit that valid-looking but false value.
 *
 * That is a limitation of the load path, not of this merge, and it is not a regression: before the
 * inversion an unpinned field was deleted from the article outright, so nothing survived to be
 * normalized. No article on disk carries such a field today. Fixing it properly means carrying RAW
 * frontmatter across the step boundary. tests/unit/write-path-fields.test.ts pins the current
 * behaviour so a change to the load path shows up in a diff.
 *
 * NO EM DASHES IN THIS FILE. It lives under src/, which scripts/aeo-audit.mjs scans, and one here
 * would fail the very push that adds it (CONTENT-STANDARDS Section 11).
 */
export function mergeRefreshedFrontmatter(
  original: ArticleFrontmatter,
  modelData: Record<string, unknown>,
): ArticleFrontmatter {
  const merged: Record<string, unknown> = { ...original };

  for (const field of MODEL_OWNED_FIELDS) {
    if (Object.hasOwn(modelData, field)) {
      merged[field] = modelData[field];
    } else {
      // See the header: delete rather than inherit, so the absence reaches the validator.
      delete merged[field];
    }
  }

  return merged as ArticleFrontmatter;
}

// ─── Article Discovery ────────────────────────────────────────────────────────

const ARTICLES_DIR = path.join(
  process.cwd(),
  "content",
  "articles"
);

/** An article discovery refused to return, and why, so a run can report it. */
export interface SkippedArticle {
  file: string;
  reason: string;
}

export interface ArticleDiscovery {
  articles: Article[];
  skipped: SkippedArticle[];
}

/**
 * True when an article's identity still matches the file it was read from.
 *
 * Exported because the write path re-checks it rather than trusting discovery.
 * src/inngest/functions.ts loads articles inside `step.run("load-all-articles")`,
 * which Inngest MEMOIZES: a run that started before this code deployed replays
 * that step's cached result verbatim, so it can hand back an article carrying the
 * old frontmatter-derived slug against the original filePath, and every check
 * inside discovery is bypassed because discovery never runs again. Re-asserting
 * the invariant downstream is what makes the fix hold across a deploy boundary.
 */
export function articleIdentityMatchesFile(article: Article): boolean {
  return path.basename(article.filePath, ".md") === article.slug;
}

/**
 * Discover every article on disk, plus the ones deliberately not returned.
 *
 * Named `discoverArticles` rather than `getAllArticles` because src/lib/articles.ts
 * exports a DIFFERENT function under that name, serving the live site from the same
 * directory with a different shape. Two same-named functions over one corpus is how
 * a reader concludes the site and the refresh agree about identity when the whole
 * point of this module is that they once did not.
 */
export function discoverArticles(): ArticleDiscovery {
  const files = fs
    .readdirSync(ARTICLES_DIR)
    .filter((f) => f.endsWith(".md"));

  const skipped: SkippedArticle[] = [];

  const articles = files.flatMap((file) => {
    const filePath = path.join(ARTICLES_DIR, file);
    const raw = fs.readFileSync(filePath, "utf-8");
    const { data, content } = matter(raw);

    // Identity comes from the FILENAME, never from frontmatter.
    //
    // This value is not a label: githubArticleCommit.ts interpolates it into
    // `content/articles/${slug}.md` and PATCHes the branch ref with the result,
    // so it IS the write path. Preferring `data.slug` meant a file whose
    // frontmatter disagreed with its own name would be refreshed into a
    // DIFFERENT path than the one it was read from: a new file appears, the
    // original is left untouched and stale, the site serves the same article
    // under two URLs, and because the original never changes, every later run
    // re-processes it and re-writes the duplicate forever.
    //
    // The filename is also what the live site already treats as authoritative.
    // src/lib/articles.ts derives every slug it serves with this same
    // expression and ignores frontmatter.slug entirely, so a divergent
    // frontmatter slug was never any article's real URL. It could only ever
    // misdirect this pipeline.
    const slug = file.replace(/\.md$/, "");

    // A frontmatter slug that disagrees with the filename is a content bug, and
    // the refresh declines to touch the article rather than propagating it.
    //
    // Skipping rather than throwing is deliberate and matches how a compliance
    // violation and an invalid field already behave here: one malformed file
    // must not take the month's entire batch down and suppress the summary
    // email. The article keeps the good version already on disk and retries next
    // cadence. scripts/aeo-audit.mjs fails the push on exactly this divergence,
    // so it should never reach this far; this is the backstop for content that
    // predates that gate.
    //
    // The skip is RECORDED, not just logged. An article dropped here never
    // reaches `staleArticles`, so it cannot appear in the run's failure list the
    // way a compliance violation does, and a console warning inside an Inngest
    // step is not something anyone reads. Left invisible, the one article that
    // most needs a human would go unrefreshed every month in silence, and a
    // corpus where it was the ONLY stale article would report "No articles due
    // for refresh" and send no summary at all.
    if (data.slug !== undefined && data.slug !== slug) {
      const reason =
        `frontmatter slug "${String(data.slug)}" does not match the filename. ` +
        `The filename is authoritative. Fix the frontmatter, or rename the file.`;
      console.warn(`[contentRefresh] Skipping "${file}": ${reason}`);
      skipped.push({ file, reason });
      return [];
    }

    // An unusable reviewCadence is refused here for the same reason, and it is the more
    // dangerous of the two because it fails QUIETLY. getRefreshCadenceDays falls back to the
    // slug guess on a value it does not recognise, and the refresh then pins the typo back
    // into the committed file: the article silently keeps the cadence the author wrote the
    // field to change, reports a clean refresh, and re-commits the broken value so the next
    // run does it again. Skipping turns that into one visible line in the summary email.
    //
    // scripts/aeo-audit.mjs fails the push on the same rule, and the model cannot author this
    // field at all, so reaching here means the gate was bypassed.
    const cadenceError = validateReviewCadence(data[REVIEW_CADENCE_FIELD], { label: file });
    if (cadenceError) {
      console.warn(`[contentRefresh] Skipping "${file}": ${cadenceError}`);
      skipped.push({ file, reason: cadenceError });
      return [];
    }

    return [
      {
        slug,
        frontmatter: data as ArticleFrontmatter,
        body: content,
        filePath,
      },
    ];
  });

  return { articles, skipped };
}

// ─── Cadence Mapping ─────────────────────────────────────────────────────────

/**
 * Returns number of days between refreshes for a given article,
 * or null if the article should never be auto-refreshed.
 *
 * Cadence rules per CONTENT-STANDARDS.md Section 6:
 *   - Investment / cost / financing articles → 365 days (12 months)
 *   - Category analysis / Industry Spotlights → 548 days (18 months)
 *   - Process / structural articles → 730 days (24 months)
 *   - Strategic / mindset articles → null (never)
 *
 * An article may declare its own `reviewCadence` in frontmatter, which wins over
 * everything below. See src/lib/reviewCadence.mjs for why that exists: the rules
 * below infer cadence from the slug string, and two articles already queued in
 * CONTENT-CALENDAR.md are ones no ordering of them can classify correctly.
 */
export function getRefreshCadenceDays(article: Article): number | null {
  const { slug, frontmatter } = article;
  const { category, tier } = frontmatter;

  // An authored cadence beats every inference below, including the strategic
  // slug list: it is the one signal here that someone actually decided, rather
  // than something derived from how a title happens to read.
  // Read through the declared `reviewCadence?: string` field rather than the index signature:
  // reviewCadence.mjs is plain JS, so `isReviewCadence` reaches TypeScript as a plain boolean
  // rather than a type predicate and narrows nothing on its own.
  const declared: string | undefined = frontmatter.reviewCadence;
  if (declared !== undefined) {
    if (isReviewCadence(declared)) return CADENCE_DAYS[declared];
    // Unreachable through a pushed article: scripts/aeo-audit.mjs fails the push
    // on an unknown value. Falling back to the heuristic rather than throwing
    // keeps a single bad field from taking down the monthly batch, matching how
    // every other malformed input on this path behaves.
    console.warn(
      `[contentRefresh] ${slug}: ignoring unknown ${REVIEW_CADENCE_FIELD} ` +
        `"${String(declared)}"; falling back to the inferred cadence.`,
    );
  }

  // Strategic / mindset slugs: never auto-refresh
  const STRATEGIC_SLUGS = new Set([
    "you-dont-need-to-love-your-franchise",
    "are-you-ready-to-own-a-franchise",
    "w2-to-franchise-owner-when-youre-actually-ready",
    "what-is-your-time-worth-the-roi-math-of-franchise-ownership",
    "the-semi-absentee-franchise-real-talk",
    "one-unit-or-multi-unit-what-first-timers-get-wrong",
  ]);

  if (STRATEGIC_SLUGS.has(slug)) return null;

  // Financing / investment / cost → 12 months.
  //
  // Kept AHEAD of the category branches, which is where it has always been. An
  // earlier revision of this change moved Industry Spotlights above it, on the
  // review's premise that a spotlight whose slug contains "cost" ought to take
  // its category's 548. The one real article that hits this, "Cost and
  // Operational Efficiency Franchises" (queued in CONTENT-CALENDAR.md), is
  // wanted on 365: it is a cost article that happens to be a spotlight, and
  // CONTENT-STANDARDS lists investment and cost at 12 months. The reorder would
  // have delayed exactly the article it was written for by 183 days.
  //
  // Where the slug genuinely cannot carry the answer, the reviewCadence field
  // handled above is the way out, not a different ordering of these guesses.
  //
  // Matched on TOKENS, not on substrings. `slug.includes("fee")` fires inside
  // "coffee", so `coffee-franchise-due-diligence` took the 365-day financing
  // cadence instead of its 730-day process one. On a franchise site that is not
  // a hypothetical: coffee is a real category. No article on disk hits it today,
  // and every one of the six that DO match still matches as a whole word, so
  // this narrowing changes nothing now. Plurals are matched explicitly because
  // the corpus uses both ("fee", "fees", "costs").
  //
  // Split on every non-alphanumeric run, and lowercased, rather than on "-"
  // alone. Nothing in this repo enforces kebab-case FILENAMES (the shape check
  // in src/lib/articles.ts is discovery-side and does not exist on this path),
  // so `franchise_cost_guide.md` is authorable today. Splitting on hyphens only
  // would hand back a single token, match nothing, and quietly give genuinely
  // cost-focused copy the 730-day process cadence: a narrowing that is stricter
  // than the substring check it replaced, in the one direction that matters.
  // All 45 filenames are kebab-case today, so this changes nothing now either.
  //
  // Still ahead of the Going Deeper branch on purpose. Financing material (SBA
  // terms, ROBS rules, fee structures) goes stale materially faster than the
  // 730-day process cadence, and three current articles rely on that ordering to
  // stay on 365. This is deliberately NOT the wholesale reorder of putting every
  // category branch first: that would demote those three to 730 and let real
  // rate and rule changes sit unreviewed for two years, trading a latent bug for
  // a live one.
  const FINANCING_KEYWORDS = ["funding", "cost", "fee", "sba", "robs", "financing", "investment"];
  const slugTokens = new Set(slug.toLowerCase().split(/[^a-z0-9]+/));
  if (FINANCING_KEYWORDS.some((kw) => slugTokens.has(kw) || slugTokens.has(`${kw}s`))) return 365;

  // Industry Spotlights category → 18 months.
  //
  // BOTH halves, as it has always been. An intermediate revision of this change
  // split them to promote the category above the financing keywords; reverting
  // that promotion left the `tier === 3` half behind on its own, which silently
  // dropped every Industry Spotlight whose tier is not 3 down to the Going
  // Deeper or default cadence. Category and tier are 1:1 across all 45 articles,
  // so a whole-corpus comparison cannot see that regression: it is exactly the
  // kind a "nothing changed" check passes.
  if (category === "Industry Spotlights" || tier === 3) return 548;

  // Remaining Going Deeper process articles → 24 months
  if (category === "Going Deeper" || tier === 2) return 730;

  // Remaining Getting Started articles → 12 months (investment-adjacent)
  return 365;
}

// ─── Staleness Check ─────────────────────────────────────────────────────────

/**
 * Returns true if the article is due for a refresh.
 * Force = true bypasses the cadence check (useful for an initial pass).
 *
 * MEASURED FROM THE LAST REVISION, NOT FROM PUBLICATION
 * -----------------------------------------------------
 * This reads `updatedAt ?? date`, and the fallback is the whole subtlety. It used to read `date`
 * alone, which worked only because `serializeArticle` overwrote `date` on every refresh: the clock
 * an article was scheduled by was reset by the very run that refreshed it. That overwrite was a bug
 * -- it destroyed the publication date -- but it was load-bearing here, so the two had to be fixed
 * together.
 *
 * Fixing the date alone would have inverted this into a worse failure. With `date` frozen at
 * publication, age measured from `date` only ever grows, so every article would become permanently
 * stale one cadence after it was published and the refresh would rewrite the entire corpus every
 * month, forever, with each run leaving it exactly as due as before. Nothing would have failed
 * loudly; the batch would simply never shrink. Do not revert this line without also restoring the
 * `date` overwrite, and prefer not to do either.
 *
 * `updatedAt ?? date` rather than the later of the two: an article that has never been refreshed
 * has no `updatedAt` and is correctly measured from publication, and for one that has,
 * src/lib/frontmatterDates.mjs already refuses an `updatedAt` earlier than `date` in both the
 * pre-push hook and CI, so the fallback cannot be used to schedule an article more often than its
 * cadence. This also matches how sitemap.ts reads the same pair for `lastModified`.
 */
export function isStale(article: Article, force = false): boolean {
  const cadenceDays = getRefreshCadenceDays(article);

  // Strategic articles are never stale
  if (cadenceDays === null) return false;

  if (force) return true;

  const { date, updatedAt } = article.frontmatter;

  // `updatedAt ?? date` is not enough on its own: `??` falls back on null and undefined, NOT on a
  // string that is present and unreadable. An article carrying `updatedAt: "not-a-date"` beside a
  // perfectly good `date` would then measure from the unreadable value, come out NaN, and be
  // classified as not-due forever -- silently, since a run finding nothing reports "No articles due
  // for refresh" rather than naming the article it could not read. A bad revision date must not be
  // able to mask a good publication date, so this falls through to the next readable value.
  const reference = [updatedAt, date]
    .map((value) => (value === undefined ? NaN : new Date(value).getTime()))
    .find((time) => !Number.isNaN(time));

  // Neither is readable. Not a reason to rewrite the article: refreshing it would commit the same
  // unreadable date straight back, and validateArticlePayload would refuse the whole batch over it.
  // The pre-push hook and CI already reject both fields, so reaching this means something bypassed
  // them, and the loud failure belongs there rather than in a silent monthly rewrite.
  if (reference === undefined) return false;

  const ageInDays = (Date.now() - reference) / (1000 * 60 * 60 * 24);

  return ageInDays >= cadenceDays;
}

// ─── Compliance Validation ───────────────────────────────────────────────────

const escapeRegExp = (value: string) =>
  value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * What the matchers see. GPT-4o writes curly apostrophes and non-breaking spaces as a
 * matter of course (the personalizer carries its own normalizer for the same reason), and
 * every one of those is a hole: "Bishop’s" missed the registry's "bishop's", and a
 * non-breaking space inside "Molly Maid" missed it too. Newlines survive, because the
 * profitability rules split on them.
 */
function normalizeForScan(text: string): string {
  return text
    .normalize("NFC")
    .replace(/[‘’‚‛]/g, "'")
    .replace(/[“”„‟]/g, '"')
    .replace(/[‐-―]/g, "-")
    .replace(/[^\S\n]+/g, " ");
}

/**
 * Additionally flattens what Markdown can insert *inside* a name: "Molly **Maid**" and a
 * name broken across a line wrap both read as clean prose once rendered, and both missed
 * the registry before this.
 */
function flattenForBrandScan(text: string): string {
  return normalizeForScan(text)
    .replace(/[*_`~]/g, "")
    .replace(/\s+/g, " ");
}

// `\b` is unusable here: registry brand names begin and end with non-word characters
// ("junkco+", "blingle!", "360°", "1-800-striper"), where a word boundary inverts its
// meaning. Alphanumeric look-arounds behave the same for both shapes.
const bounded = (phrase: string) =>
  new RegExp(`(?<![a-z0-9])${escapeRegExp(phrase)}(?![a-z0-9])`, "i");

/**
 * Terms that are a profitability claim wherever they appear, per CONTENT-STANDARDS.md
 * Section 1.
 *
 * "earns a", "makes a" and "income of" used to live here and were removed: as unbounded
 * substrings they matched ordinary prose, including the FAQ question "What makes a
 * franchise harder to sell?" that ships on main today. Real claims of that shape are now
 * caught by EARNINGS_CLAIM_PATTERNS, which requires an actual figure.
 */
const PROFITABILITY_PHRASES = [
  "break even",
  "break-even",
  "roi",
  "return on investment",
  "return on invested capital",
  "net profit",
  "gross profit",
  "profit margin",
  "ebitda",
  "payback period",
  "highly profitable",
  "strong returns",
  "lucrative",
  "financially rewarding",
];

const PROFITABILITY_PATTERNS = PROFITABILITY_PHRASES.map((phrase) => ({
  label: phrase,
  re: bounded(phrase),
}));

// A figure, or an order-of-magnitude stand-in for one. The currency sign is optional:
// "Owners typically earn 150K per year" and "earn 150,000 per year" name a figure just as
// plainly as "$150,000" does, and a $-only pattern let both through. 401k/403b/457 are
// excluded from the suffix form, since they are all over the funding articles.
const MONEY = String.raw`(?:\$\s?\d[\d,]*(?:\.\d+)?\s*(?:k\b|m\b|mm\b|million|thousand)?|\b\d{1,3}(?:,\d{3})+\b|\b(?!(?:40[13]|457)[kb]?\b)\d{2,4}\s?[km]\b|\b(?:six|seven|eight)[-\s]?figures?\b)`;
// Deliberately excludes "revenue" and "margin". Section 1 permits revenue ranges outright,
// and its own approved example pairs "margin" with a royalty percentage. The trailing
// boundary keeps "profit" from matching inside "profitability".
const EARNINGS_NOUN = String.raw`\b(?:earnings|income|profits?|take[-\s]?home(?:\s+pay)?|owner(?:'s|s')?\s+(?:draw|compensation|pay|salary)|payouts?)\b`;
// "nets" excludes "net worth", which Section 1 permits as an investment input.
const EARNINGS_VERB = String.raw`(?:earns?|earned|earning|nets(?!\s+worth)|netted|takes?\s+home|taking\s+home|brings?\s+home|pulls?\s+in|pulling\s+in|clears?|cleared|pockets?|pocketed|makes?|made|making)`;
const PERCENT = String.raw`\d{1,3}(?:\.\d+)?\s?(?:%|percent\b)`;
const RETURN_NOUN = String.raw`\b(?:returns?|profits?|profitable|profitability|yields?)\b`;
// Section 1 bans "any comparison of franchise income to prior W-2 income as a projection".
// No figure appears in "this can replace your salary within two years", so none of the
// figure rules see it.
const W2_REPLACEMENT = String.raw`\b(?:replac(?:e|es|ed|ing|ement)|match(?:es|ed|ing)?|beats?)\b[^\n]{0,40}\b(?:salary|paycheck|w-?2\s*income|corporate\s+income|day\s*job\s+income)\b`;
// The ban is on the PROJECTION, not the subject. "How long until a franchise replaces a
// W-2 income?" is a published FAQ question and a legitimate thing to write about; "can
// replace your salary within two years" is the claim. Requiring an expectation word or a
// timeframe alongside is what separates them.
const W2_PROJECTION = String.raw`\b(?:can|could|will|should|expects?|expected|typically|usually|on average|most owners|within|by year|in (?:two|three|four|five|\d+) (?:months?|years?))\b`;

const EARNINGS_NOUN_RE = new RegExp(EARNINGS_NOUN, "i");
const MONEY_RE = new RegExp(MONEY, "i");
const PERCENT_RE = new RegExp(PERCENT, "i");
const W2_REPLACEMENT_RE = new RegExp(W2_REPLACEMENT, "i");
const W2_PROJECTION_RE = new RegExp(W2_PROJECTION, "i");
// A tight window rather than the whole sentence: at 25 characters this matched "ROBS makes
// financial sense with $50,000 or more" and the "$250,000 net worth and $100,000 in liquid
// capital" line, both compliant and both published on main.
const EARNINGS_VERB_RE = new RegExp(`\\b${EARNINGS_VERB}\\b.{0,15}${MONEY}`, "i");
// Adjacency, not sentence scope: "Return the signed acknowledgment before paying the 6%
// royalty" is an ordinary imperative and Section 1 permits the royalty percentage, but at
// sentence scope the verb "Return" and the "6%" paired and blocked it.
const PERCENT_RETURN_RE = new RegExp(
  `${RETURN_NOUN}.{0,20}${PERCENT}|${PERCENT}.{0,20}${RETURN_NOUN}`,
  "i"
);

// The lookahead is what keeps "$1.5 million" whole: splitting on a bare /[.!?]/ would cut
// it into "$1" and "5 million" and lose the figure entirely.
const SENTENCE_SPLIT = /[.!?]+(?=\s|$)|\n+/;

/**
 * Earnings claims that name a figure. Section 1 bans these even when no phrase from the
 * list above appears: "Typical owners can expect annual earnings of $150,000" contains
 * none of them.
 *
 * Applied per sentence rather than as one regex spanning a sentence, which is both the
 * scope we want (a figure must not pair with an earnings word in the *next* sentence) and
 * the only tractable shape. Expressed as `[^.!?\n]*NOUN[^.!?\n]*MONEY`, the engine retries
 * from every start position and the scan goes quadratic: 46 seconds on 200k characters
 * without a sentence terminator, which is a plausible shape for an unvalidated model
 * response and would burn the function's whole 10-minute budget.
 */
const EARNINGS_CLAIM_RULES = [
  {
    label: "earnings figure",
    test: (s: string) => EARNINGS_NOUN_RE.test(s) && MONEY_RE.test(s),
  },
  {
    label: "earnings claim",
    test: (s: string) => EARNINGS_VERB_RE.test(s),
  },
  {
    label: "percentage return claim",
    test: (s: string) => PERCENT_RE.test(s) && PERCENT_RETURN_RE.test(s),
  },
  {
    label: "W-2 replacement claim",
    test: (s: string) => W2_REPLACEMENT_RE.test(s) && W2_PROJECTION_RE.test(s),
  },
];

export function findProfitabilityViolations(rawText: string): string[] {
  const text = normalizeForScan(rawText);
  const found = PROFITABILITY_PATTERNS.filter((p) => p.re.test(text)).map((p) => p.label);
  const reported = new Set<string>();
  for (const sentence of text.split(SENTENCE_SPLIT)) {
    for (const rule of EARNINGS_CLAIM_RULES) {
      if (reported.has(rule.label) || !rule.test(sentence)) continue;
      reported.add(rule.label);
      const span = sentence.trim().replace(/\s+/g, " ");
      found.push(`${rule.label}: "${span.length > 80 ? `${span.slice(0, 79)}…` : span}"`);
    }
  }
  return found;
}

/**
 * Registry names that are also ordinary English, and so cannot be treated as evidence a
 * brand was named. "squeeze" is the one measured collision across the 45 articles on main
 * ("you cannot simply squeeze two more people into the room"); the rest are held out
 * because they are common words or phrases a compliant article can reach for. Each one is
 * a deliberate blind spot in the gate, so the list stays short.
 */
const AMBIGUOUS_BRAND_NAMES = new Set([
  "squeeze",
  "serf",
  "surv",
  "tga",
  "ulc",
  "all dry",
  "assisted living locators",
  "building kids",
  "exercise coach",
  "first light",
  "gone for good",
  "gotcha covered",
  "home aides",
  "home aids",
  "next day access",
  "real property management",
  "right at home",
  "senior care authority",
  "senior helpers",
  "service experts",
  "tee box",
  "the maids",
  "the seals",
  "training franchisor",
]);

const BRAND_NAME_PATTERNS = Object.keys(identityMap.nameKeys)
  .filter((name) => !AMBIGUOUS_BRAND_NAMES.has(name))
  .map((name) => ({ label: name, re: bounded(name) }));

/**
 * Section 2 bans named franchise brands in body copy, headings, excerpts and metadata.
 * The names come from the committed brand identity map, the same artifact the match
 * workspace resolves against, so the gate tracks the registry instead of a second list
 * that would drift away from it.
 */
export function findBrandNameViolations(rawText: string): string[] {
  const text = flattenForBrandScan(rawText);
  return BRAND_NAME_PATTERNS.filter((p) => p.re.test(text)).map((p) => p.label);
}

export interface ComplianceFields {
  title?: unknown;
  excerpt?: unknown;
  faqs?: unknown;
  body: string;
}

/**
 * Checks every field the refresh model writes, not just the body: an excerpt reading
 * "a lucrative category", or an FAQ answer naming a brand, is published exactly as
 * prominently as the body is.
 */
export function passesComplianceCheck(fields: ComplianceFields): {
  passes: boolean;
  violations: string[];
} {
  const parts: { field: string; text: string }[] = [];
  if (typeof fields.title === "string") parts.push({ field: "title", text: fields.title });
  if (typeof fields.excerpt === "string") parts.push({ field: "excerpt", text: fields.excerpt });
  parts.push({ field: "body", text: fields.body });

  if (Array.isArray(fields.faqs)) {
    fields.faqs.forEach((faq, i) => {
      const entry = faq as { q?: unknown; a?: unknown } | null;
      if (typeof entry?.q === "string") parts.push({ field: `faq[${i}].q`, text: entry.q });
      if (typeof entry?.a === "string") parts.push({ field: `faq[${i}].a`, text: entry.a });
    });
  }

  const violations: string[] = [];
  for (const { field, text } of parts) {
    for (const hit of findProfitabilityViolations(text)) {
      violations.push(`${field}: profitability ${hit}`);
    }
    for (const hit of findBrandNameViolations(text)) {
      violations.push(`${field}: brand name "${hit}"`);
    }
  }

  return { passes: violations.length === 0, violations };
}

// ─── Disk Write-Back ─────────────────────────────────────────────────────────

/**
 * Writes a refreshed article to disk.
 * Updates the `date` field in frontmatter to today.
 */
export function writeArticle(
  filePath: string,
  frontmatter: ArticleFrontmatter,
  body: string
): void {
  const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD
  const updatedFrontmatter = { ...frontmatter, date: today };

  // gray-matter stringify preserves all frontmatter fields cleanly
  const output = matter.stringify(body, updatedFrontmatter);
  fs.writeFileSync(filePath, output, "utf-8");
}

// ─── Year Updater ─────────────────────────────────────────────────────────────

/**
 * Replaces "as of 20XX" patterns in text with the current year.
 * This is a pre-pass before sending to GPT-4o so the model
 * sees current context and doesn't hallucinate old year references.
 */
export function updateYearReferences(text: string): string {
  const currentYear = new Date().getFullYear().toString();
  return text.replace(/as of 20\d{2}/gi, `as of ${currentYear}`);
}
