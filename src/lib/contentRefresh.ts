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

export function getAllArticles(): Article[] {
  const files = fs
    .readdirSync(ARTICLES_DIR)
    .filter((f) => f.endsWith(".md"));

  return files.map((file) => {
    const filePath = path.join(ARTICLES_DIR, file);
    const raw = fs.readFileSync(filePath, "utf-8");
    const { data, content } = matter(raw);

    return {
      slug: data.slug ?? file.replace(/\.md$/, ""),
      frontmatter: data as ArticleFrontmatter,
      body: content,
      filePath,
    };
  });
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
 */
export function getRefreshCadenceDays(article: Article): number | null {
  const { slug, frontmatter } = article;
  const { category, tier } = frontmatter;

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

  // Financing / investment / cost → 12 months
  const FINANCING_KEYWORDS = ["funding", "cost", "fee", "sba", "robs", "financing", "investment"];
  if (FINANCING_KEYWORDS.some((kw) => slug.includes(kw))) return 365;

  // Industry Spotlights category → 18 months
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
