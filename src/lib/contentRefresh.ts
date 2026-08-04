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
  [key: string]: unknown;
}

export interface Article {
  slug: string;
  frontmatter: ArticleFrontmatter;
  body: string;
  filePath: string;
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
 */
export function isStale(article: Article, force = false): boolean {
  const cadenceDays = getRefreshCadenceDays(article);

  // Strategic articles are never stale
  if (cadenceDays === null) return false;

  if (force) return true;

  const articleDate = new Date(article.frontmatter.date);
  const now = new Date();
  const ageInDays = (now.getTime() - articleDate.getTime()) / (1000 * 60 * 60 * 24);

  return ageInDays >= cadenceDays;
}

// ─── Compliance Validation ───────────────────────────────────────────────────

/**
 * Profitability phrases banned in all forms per CONTENT-STANDARDS.md Section 1.
 * Returns any found violations.
 */
const PROFITABILITY_PHRASES = [
  "break even",
  "break-even",
  "roi",
  "return on investment",
  "net profit",
  "gross profit",
  "ebitda",
  "payback period",
  "highly profitable",
  "strong returns",
  "lucrative",
  "financially rewarding",
  "earns a",
  "makes a",
  "income of",
];

export function findProfitabilityViolations(text: string): string[] {
  const lower = text.toLowerCase();
  return PROFITABILITY_PHRASES.filter((phrase) => lower.includes(phrase));
}

/**
 * Returns true if the article body passes both hard rules.
 */
export function passesComplianceCheck(body: string): {
  passes: boolean;
  violations: string[];
} {
  const violations = findProfitabilityViolations(body);
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
