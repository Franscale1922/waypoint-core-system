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

  return files.flatMap((file) => {
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
    if (data.slug !== undefined && data.slug !== slug) {
      console.warn(
        `[contentRefresh] Skipping "${file}": frontmatter slug ` +
          `"${String(data.slug)}" does not match the filename. The filename is ` +
          `authoritative. Fix the frontmatter, or rename the file.`,
      );
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

  // Industry Spotlights category → 18 months.
  //
  // Checked BEFORE the financing keywords below, because a curated frontmatter
  // field must beat a guess made from the slug string. Those keywords match a
  // substring ANYWHERE in the slug, so a spotlight on a cost-sensitive segment
  // (`...-cost-...`, `...-fees-...`) would otherwise be pulled onto the 365-day
  // financing cadence and refreshed 183 days early on every cycle, purely
  // because of how its title happens to read. No article on disk hits this
  // today. The ordering is here so content authoring cannot create it.
  if (category === "Industry Spotlights" || tier === 3) return 548;

  // Financing / investment / cost → 12 months.
  //
  // Still a slug heuristic, and still ahead of the Going Deeper branch on
  // purpose. Financing material (SBA terms, ROBS rules, fee structures) goes
  // stale materially faster than the 730-day process cadence, and three current
  // Going Deeper articles rely on this ordering to stay on 365. This is
  // deliberately NOT the wholesale reorder of putting every category branch
  // first: that would push those three to 730 and let real rate and rule
  // changes sit unreviewed for two years, trading a latent bug for a live one.
  const FINANCING_KEYWORDS = ["funding", "cost", "fee", "sba", "robs", "financing", "investment"];
  if (FINANCING_KEYWORDS.some((kw) => slug.includes(kw))) return 365;

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
