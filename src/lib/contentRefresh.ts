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

/**
 * The only frontmatter the refresh model is allowed to rewrite.
 *
 * Taking its object wholesale was wrong in both directions. It DROPPED every key the
 * prompt never sends back: `checklistSlug` drives the email-capture CTA on 42 of the 45
 * articles, `escapeKit` on 12, and `updatedAt` feeds dateModified in the article schema.
 * And it ADMITTED any key the model invented, which is then serialized to disk and can
 * reach the rendered page without ever passing the compliance check.
 */
export const MODEL_WRITABLE_FRONTMATTER = ["title", "excerpt", "faqs"] as const;

export interface ArticleFaq {
  q: string;
  a: string;
}

const isFaq = (value: unknown): value is ArticleFaq =>
  !!value &&
  typeof value === "object" &&
  typeof (value as ArticleFaq).q === "string" &&
  typeof (value as ArticleFaq).a === "string";

/**
 * Merges a model response onto the original frontmatter, taking only the writable fields
 * and only when they arrive in the right shape. A missing or malformed field keeps the
 * original value rather than destroying it.
 */
export function mergeRefreshedFrontmatter(
  original: ArticleFrontmatter,
  fromModel: unknown
): ArticleFrontmatter {
  const merged: ArticleFrontmatter = { ...original };
  if (!fromModel || typeof fromModel !== "object") return merged;
  const candidate = fromModel as Record<string, unknown>;

  if (typeof candidate.title === "string" && candidate.title.trim()) {
    merged.title = candidate.title.trim();
  }
  if (typeof candidate.excerpt === "string" && candidate.excerpt.trim()) {
    merged.excerpt = candidate.excerpt.trim();
  }
  if (Array.isArray(candidate.faqs)) {
    const faqs = candidate.faqs.filter(isFaq);
    if (faqs.length > 0) merged.faqs = faqs;
  }
  return merged;
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
