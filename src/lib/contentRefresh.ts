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
import { daysSinceArticleDate, revisionUpdatedAt } from "./articleDate";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface ArticleFrontmatter {
  title: string;
  slug: string;
  date: string; // YYYY-MM-DD, the ORIGINAL publication date. Never rewritten.
  // Set when the article is meaningfully revised, including by the automated
  // refresh. Declared explicitly rather than left to the index signature below,
  // because the refresh writes it and isStale reads it: an untyped field that
  // load-bearing is a rename away from silently becoming undefined.
  updatedAt?: string; // YYYY-MM-DD
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

  // Age is measured from the last REVISION, falling back to publication.
  //
  // This pairing with serializeArticle is the whole staleness clock, and getting
  // it wrong in either direction is silent. The refresh used to reset the clock
  // by overwriting `date` with the run date, which destroyed the real
  // publication date on every run. Now it writes `updatedAt` instead, so this
  // read has to prefer `updatedAt` or a refreshed article would stay
  // permanently stale and be rewritten on every single monthly run.
  //
  // daysSinceArticleDate compares UTC calendar dates, not elapsed
  // milliseconds from a local-noon anchor: a millisecond comparison made an
  // article's eligibility depend on both the server's ambient TZ and what
  // time of day the monthly cron happened to fire, so a real 365-day-old
  // article could read as 364 days and change and get silently deferred to
  // the NEXT month's run. Calendar-day arithmetic removes both variables.
  const ageInDays = daysSinceArticleDate(
    article.frontmatter.updatedAt ?? article.frontmatter.date,
    new Date(),
  );

  // An unvalidatable date cannot be aged. Treat it as NOT stale so the refresh
  // never rewrites an article whose frontmatter is already broken: that is a
  // job for verify-dates, which fails the build on exactly this.
  if (ageInDays === null) return false;

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
 * Writes a refreshed article to disk, stamping `updatedAt` and leaving the
 * publication `date` intact.
 *
 * Currently unreferenced: the live refresh commits through the GitHub API via
 * githubArticleCommit.ts rather than writing to disk. It is kept because
 * verify-dates.mjs names both as the repo's machine writers, and it is fixed
 * rather than left alone because it previously did `{ ...frontmatter, date:
 * today }` under a comment describing that as intended. Whoever wires this up
 * next would have reintroduced the exact bug this change removes, with the
 * documentation telling them it was correct.
 */
export function writeArticle(
  filePath: string,
  frontmatter: ArticleFrontmatter,
  body: string
): void {
  const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD
  const updatedFrontmatter = {
    ...frontmatter,
    updatedAt: revisionUpdatedAt(frontmatter.date, today),
  };

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
