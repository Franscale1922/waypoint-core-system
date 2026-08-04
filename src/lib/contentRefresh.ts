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

const escapeRegExp = (value: string) =>
  value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

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

// A figure, or an order-of-magnitude stand-in for one.
const MONEY = String.raw`(?:\$\s?\d[\d,]*(?:\.\d+)?\s*(?:k\b|m\b|mm\b|million|thousand)?|\b(?:six|seven|eight)[-\s]?figures?\b)`;
// Deliberately excludes "revenue" and "margin". Section 1 permits revenue ranges outright,
// and its own approved example pairs "margin" with a royalty percentage.
const EARNINGS_NOUN = String.raw`(?:earnings|income|profits?|take[-\s]?home(?:\s+pay)?|owner(?:'s|s')?\s+(?:draw|compensation|pay|salary)|payouts?)`;
// "nets" excludes "net worth", which Section 1 permits as an investment input.
const EARNINGS_VERB = String.raw`(?:earns?|earned|earning|nets(?!\s+worth)|netted|takes?\s+home|taking\s+home|brings?\s+home|pulls?\s+in|pulling\s+in|makes?|made|making)`;
const PERCENT = String.raw`\d{1,3}(?:\.\d+)?\s?(?:%|percent\b)`;
const RETURN_NOUN = String.raw`\b(?:returns?|profits?|profitable|profitability|yields?)\b`;
// Sentence scope. Crude, and that is the point: it must not let a figure in one sentence
// pair with an earnings word in the next.
const SAME_SENTENCE = String.raw`[^.!?\n]*`;

/**
 * Earnings claims that name a figure. Section 1 bans these even when no phrase from the
 * list above appears: "Typical owners can expect annual earnings of $150,000" contains
 * none of them.
 */
const EARNINGS_CLAIM_PATTERNS = [
  {
    label: "earnings figure",
    re: new RegExp(
      `${SAME_SENTENCE}${EARNINGS_NOUN}${SAME_SENTENCE}${MONEY}|${SAME_SENTENCE}${MONEY}${SAME_SENTENCE}${EARNINGS_NOUN}`,
      "i"
    ),
  },
  {
    // A tight window, not sentence scope: at 25 characters this matched "ROBS makes
    // financial sense with $50,000 or more" and the "$250,000 net worth and $100,000 in
    // liquid capital" line, both compliant and both on main.
    label: "earnings claim",
    re: new RegExp(`\\b${EARNINGS_VERB}\\b[^.!?\\n]{0,15}${MONEY}`, "i"),
  },
  {
    label: "percentage return claim",
    re: new RegExp(
      `${SAME_SENTENCE}${RETURN_NOUN}${SAME_SENTENCE}${PERCENT}|${SAME_SENTENCE}${PERCENT}${SAME_SENTENCE}${RETURN_NOUN}`,
      "i"
    ),
  },
];

export function findProfitabilityViolations(text: string): string[] {
  const found = PROFITABILITY_PATTERNS.filter((p) => p.re.test(text)).map((p) => p.label);
  for (const pattern of EARNINGS_CLAIM_PATTERNS) {
    const match = pattern.re.exec(text);
    // The tail, not the head: these patterns match from the start of the sentence, so the
    // token that actually tripped the rule is at the end of the match.
    if (match) {
      const span = match[0].trim();
      found.push(`${pattern.label}: "${span.length > 80 ? `…${span.slice(-80)}` : span}"`);
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
export function findBrandNameViolations(text: string): string[] {
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
