// /llms.txt: the machine-readable index of this site, for LLMs and agents.
//
// WHY THIS IS GENERATED, NOT WRITTEN
// ----------------------------------
// The previous version was hand-typed. Its page list fell 13 routes behind the
// real site, it linked to none of the 45 articles, and it carried a non-www URL
// that cost a 301 hop. Everything derivable is therefore derived here: article
// links and category groupings come from the content modules, and every count
// is computed. No count is ever written as a literal. While planning this
// change, a hand-written `sed` and a second agent independently produced the
// same WRONG number of industry cost guides, which is exactly the failure a
// derived count makes impossible.
//
// The curated editorial prose below is the opposite case: it is the source of
// truth for everything NOT derivable from content, and is preserved verbatim.
//
// `staticPages` is the one hand-maintained list that remains, because a page's
// one-line description is editorial and cannot be derived. It is held honest by
// tests/unit/llms-index.test.ts, which walks the real route tree and fails when
// a page exists without an entry here (or an entry here has no page).

import type { Article } from "@/lib/articles";
import { getArticlesByCategory } from "@/lib/articles";
import { SITE_URL, articleBullet, categorySlug } from "@/lib/markdown-views";


import { allGlossaryEntries } from "@/data/glossary";
import { industries, getIndustryCost } from "@/data/industries";
import { financingGuides } from "@/data/financing";

export type LlmsSection =
  | "start-here"
  | "tools"
  | "guides"
  | "reference"
  | "category-index"
  | "legal";

export type StaticPage = {
  /** Site path. Leading slash, no trailing slash, no origin, no ".md". */
  path: string;
  /** Link text. */
  title: string;
  /** One line after the colon. Editorial, so it cannot be derived. */
  blurb: string;
  section: LlmsSection;
  /**
   * Only on "category-index" pages: the article category this page indexes.
   * Matched against the keys of getArticlesByCategory(), which come from
   * article front matter, so a new category with no index page is caught.
   */
  categoryFor?: string;
};

/**
 * Every static public page, with the description an agent sees.
 *
 * Dynamic families (articles, glossary terms, industry and financing guides)
 * are deliberately absent: those come from the content modules so they cannot
 * drift. Only pages that exist as their own `page.tsx` belong here.
 */
export const staticPages: readonly StaticPage[] = [
  // --- Start here ---------------------------------------------------------
  { path: "/", title: "Home", section: "start-here",
    blurb: "Overview of Kelsey's background and the Waypoint approach." },
  { path: "/about", title: "About Kelsey Stuart", section: "start-here",
    blurb: "Former Bloomin' Blinds franchisor, former franchisee, and what he learned from both sides." },
  { path: "/process", title: "The Process", section: "start-here",
    blurb: "Step-by-step walkthrough of how Waypoint works, from discovery call to final decision. 5 steps." },
  { path: "/book", title: "Book a Call", section: "start-here",
    blurb: "Free 30-minute discovery call booking via TidyCal. No pitch, no agenda." },
  { path: "/contact", title: "Contact", section: "start-here",
    blurb: "Reach Kelsey directly with a question that does not need a call." },
  { path: "/refer", title: "Refer Someone", section: "start-here",
    blurb: "Send a candidate to Kelsey." },
  { path: "/newsletter", title: "The Franchise Dispatch", section: "start-here",
    blurb: "Kelsey's newsletter: honest takes on franchise trends, FDD red flags, and ownership economics." },

  // --- Free tools and assessments -----------------------------------------
  { path: "/tools", title: "Tools", section: "tools",
    blurb: "Hub for every free Waypoint tool, assessment, and download." },
  { path: "/scorecard", title: "Franchise Readiness Scorecard", section: "tools",
    blurb: "10-question quiz producing a personalized readiness score and category breakdown." },
  { path: "/archetype", title: "Franchise Owner Archetype Quiz", section: "tools",
    blurb: "8 questions identifying which industry categories match a candidate's working style." },
  { path: "/quizzes", title: "Quizzes", section: "tools",
    blurb: "Hub page for all Waypoint quizzes and assessment tools." },
  { path: "/checklists", title: "Evaluation Checklists", section: "tools",
    blurb: "Free download hub. Six franchise evaluation checklists (universal plus five industry-specific: food and beverage, home services, fitness and wellness, senior care, B2B). Email capture delivers the checklist directly to the candidate." },
  { path: "/escape-kit", title: "Corporate Escape Kit", section: "tools",
    blurb: "Free guide: the financial mechanics of franchising vs. W2 employment. Covers true costs, SBA financing, and the severance calculation most corporate professionals miss. No email required." },
  { path: "/guide", title: "Franchise Buyer's Guide", section: "tools",
    blurb: "Long-form guide to the whole franchise evaluation process." },
  { path: "/ai-fdd-reader", title: "AI FDD Reader", section: "tools",
    blurb: "Prompts and method for reading a Franchise Disclosure Document with an AI assistant." },
  { path: "/pitch-decoder", title: "Franchise Pitch Decoder", section: "tools",
    blurb: "How to hear what a franchisor's sales presentation is actually claiming." },

  // --- Key guides ----------------------------------------------------------
  { path: "/investment", title: "Franchise Investment Levels", section: "guides",
    blurb: "Capital requirements for franchise ownership: liquid capital ranges, total investment categories, and SBA financing basics." },
  { path: "/franchise-consultant-vs-broker", title: "Franchise Consultant vs Broker", section: "guides",
    blurb: "The difference between franchise consultants and brokers, and how to evaluate them." },
  { path: "/is-a-franchise-worth-it", title: "Is a Franchise Worth It?", section: "guides",
    blurb: "An honest answer, including the cases where it is not." },
  { path: "/franchise-vs-starting-a-business", title: "Franchise vs Starting a Business", section: "guides",
    blurb: "What you trade away, and what you get, versus building independently." },
  { path: "/reports/franchise-matching-2026", title: "Franchise Matching Report 2026", section: "guides",
    blurb: "Waypoint's data on how candidates and brands actually get matched." },

  // --- Reference indexes (counts appended at build time) -------------------
  { path: "/resources", title: "Article Library", section: "reference",
    blurb: "Every educational article, organized by category." },
  { path: "/glossary", title: "Franchise Glossary", section: "reference",
    blurb: "Plain-English definitions of franchise industry terms (FDD, royalty, territory, Item 19, validation calls, discovery day)." },
  { path: "/faq", title: "FAQ", section: "reference",
    blurb: "Plain-language answers on cost, capital requirements, timeline, and how franchises work." },
  { path: "/industries", title: "Franchise Industries", section: "reference",
    blurb: "Honest guides to the main types of franchise." },
  { path: "/franchise-financing", title: "Franchise Financing", section: "reference",
    blurb: "The main ways people fund a franchise. Educational only, not financial advice." },

  // --- Article category indexes (emitted inside their article section) -----
  { path: "/resources/getting-started", title: "Getting Started", section: "category-index",
    categoryFor: "Getting Started", blurb: "Category index." },
  { path: "/resources/going-deeper", title: "Going Deeper", section: "category-index",
    categoryFor: "Going Deeper", blurb: "Category index." },
  { path: "/resources/industry-spotlights", title: "Industry Spotlights", section: "category-index",
    categoryFor: "Industry Spotlights", blurb: "Category index." },

  // --- Legal ---------------------------------------------------------------
  { path: "/privacy", title: "Privacy Policy", section: "legal", blurb: "Privacy policy." },
  { path: "/terms", title: "Terms of Service", section: "legal", blurb: "Terms of service." },
];

/**
 * Everything buildLlmsIndex reads. Injectable so a test can hand the builder
 * content the real corpus does not contain and prove the output actually
 * derives from it. A hardcoded list cannot pass that test.
 */
/** The shape this index needs from a guide record: enough to build one bullet. */
export type LinkableGuide = { slug: string; name: string; tagline: string };

export type LlmsContent = {
  articlesByCategory: Record<string, Article[]>;
  glossaryCount: number;
  /**
   * Real records rather than counts. Counts alone made "derived" weaker than it
   * looked: adding a financing guide moved a number and linked nothing, so the
   * page stayed undiscoverable from the index while every test passed.
   */
  industries: readonly LinkableGuide[];
  industryCostSlugs: readonly string[];
  /** slug -> the investment-range sentence shown on that cost guide. */
  industryCostBands: Record<string, string>;
  financingGuides: readonly LinkableGuide[];
  staticPages: readonly StaticPage[];
};

export function defaultLlmsContent(): LlmsContent {
  return {
    articlesByCategory: getArticlesByCategory(),
    glossaryCount: allGlossaryEntries.length,
    industries: industries.map((i) => ({ slug: i.slug, name: i.name, tagline: i.heroTagline })),
    // Mirrors the filter in sitemap.ts and the /cost page's generateStaticParams:
    // only categories that actually have cost content get a page.
    industryCostSlugs: industries.filter((i) => getIndustryCost(i.slug)).map((i) => i.slug),
    industryCostBands: Object.fromEntries(
      industries
        .map((i) => [i.slug, getIndustryCost(i.slug)?.band])
        .filter((e): e is [string, string] => typeof e[1] === "string"),
    ),
    financingGuides: financingGuides.map((g) => ({
      slug: g.slug,
      name: g.name,
      tagline: g.heroTagline,
    })),
    staticPages,
  };
}

/**
 * The exact set of paths that /api/md will RENDER as markdown.
 *
 * Deliberately not isMarkdownNegotiable(), and this distinction is the whole
 * point. That predicate answers the middleware's question - "should I rewrite
 * this to /api/md?" - and is a PREFIX test, so it says yes to every path under
 * /resources/. The renderer is a CLOSED SET: for /resources/<seg> it resolves a
 * category slug or an article and returns null otherwise. Using the prefix test
 * to decide where to advertise ".md" published links that 404.
 *
 * That was not hypothetical. A static page at /resources/archive (with the
 * staticPages entry the route-inventory gate demands) produced an advertised
 * /resources/archive.md that /api/md answered with 404, while the whole suite
 * stayed green. Building the set from the same data the renderer resolves
 * against is what makes "every advertised .md link resolves" actually true.
 */
function markdownRenderablePaths(c: LlmsContent): Set<string> {
  const paths = new Set<string>([
    "/resources",
    "/glossary",
    "/faq",
    "/industries",
    "/franchise-financing",
  ]);
  for (const [name, list] of Object.entries(c.articlesByCategory)) {
    // categorySlug is what categoryNameFromSlug reverses, so a category index
    // is renderable only at the slug the renderer will actually resolve.
    paths.add(`/resources/${categorySlug(name)}`);
    for (const a of list) paths.add(`/resources/${a.slug}`);
  }
  for (const i of c.industries) paths.add(`/industries/${i.slug}`);
  for (const slug of c.industryCostSlugs) paths.add(`/industries/${slug}/cost`);
  for (const g of c.financingGuides) paths.add(`/franchise-financing/${g.slug}`);
  return paths;
}

/** Absolute URL, with .md appended only where the renderer really serves it. */
function linkTo(renderable: Set<string>, path: string): string {
  return `${SITE_URL}${path}${renderable.has(path) ? ".md" : ""}`;
}

/** "a Home Services" but "an Express Car Wash". */
function indefiniteArticleFor(name: string): string {
  return /^[aeiou]/i.test(name) ? "an" : "a";
}

function pageBullet(renderable: Set<string>, p: StaticPage, extra?: string): string {
  const blurb = extra ? `${p.blurb} ${extra}` : p.blurb;
  return `- [${p.title}](${linkTo(renderable, p.path)}): ${blurb}`;
}

/** Derived count clauses for the reference indexes. Never literals. */
function referenceExtras(c: LlmsContent): Record<string, string> {
  const articleTotal = Object.values(c.articlesByCategory).reduce((n, a) => n + a.length, 0);
  return {
    "/resources": `${articleTotal} articles.`,
    "/glossary": `${c.glossaryCount} terms.`,
    // Phrased off the comparison rather than stating both numbers, so the common
    // case reads naturally and a gap becomes conspicuous instead of redundant.
    "/industries":
      c.industryCostSlugs.length === c.industries.length
        ? `${c.industries.length} categories, each with a cost guide.`
        : `${c.industries.length} categories, ${c.industryCostSlugs.length} with a cost guide.`,
    "/franchise-financing": `${c.financingGuides.length} in-depth method guides.`,
  };
}

function section(c: LlmsContent, name: LlmsSection): StaticPage[] {
  return c.staticPages.filter((p) => p.section === name);
}

/**
 * Build the whole file. Pure: same content in, same bytes out.
 */
export function buildLlmsIndex(c: LlmsContent): string {
  const out: string[] = [];
  const renderable = markdownRenderablePaths(c);
  const extras = referenceExtras(c);
  const articleTotal = Object.values(c.articlesByCategory).reduce((n, a) => n + a.length, 0);
  const categoryNames = Object.keys(c.articlesByCategory);

  out.push(
    "# Waypoint Franchise Advisors",
    "",
    "> Free franchise consulting from Kelsey Stuart, a former franchisor and former",
    "> franchisee, based in Whitefish, Montana. Advisory, not sales: this site exists to",
    "> help people work out whether franchise ownership fits their life, not to sell it.",
    "",
    "## About this site",
    "",
    "Waypoint Franchise Advisors is a free franchise consulting practice run by Kelsey Stuart, based in Whitefish, Montana. Kelsey is a former franchisor (Bloomin' Blinds) and former franchisee who has guided 146+ professionals through the franchise evaluation process.",
    "",
    "This site exists to help people understand whether franchise ownership is the right choice for their life, not to sell them on it. Approximately 30% of Kelsey's candidates end up buying a franchise. That number is not optimized upward.",
    "",
    "Consulting services are 100% free to candidates. Franchise brands pay a referral fee; that fee does not affect what candidates pay to buy the franchise.",
    "",
    "## Key Facts",
    "",
    "- Founder: Kelsey Stuart",
    "- Location: Whitefish, Montana, United States",
    "- Service cost to candidates: Free (franchise brands pay referral fee at purchase)",
    "- Consulting network: FranChoice affiliate",
    "- Franchise concepts in inventory: 250+",
    "- Brands presented per candidate: 3–4 maximum",
    "- Candidate conversion rate: approximately 30%",
    "- States served: All US states",
    "- Founder background: Former Bloomin' Blinds franchisor; helped grow system to $40M and 200+ locations; also a former franchisee who lost money and learned from it",
    "",
    "## Start here",
    "",
  );
  for (const p of section(c, "start-here")) out.push(pageBullet(renderable, p));

  out.push("", "## Free tools and assessments", "");
  for (const p of section(c, "tools")) out.push(pageBullet(renderable, p));

  out.push("", "## Key guides", "");
  for (const p of section(c, "guides")) out.push(pageBullet(renderable, p));

  out.push("", "## Reference", "");
  for (const p of section(c, "reference")) out.push(pageBullet(renderable, p, extras[p.path]));

  // Industry, cost and financing guides are listed individually rather than left
  // to the section indexes above. Not a style choice: /franchise-financing.md
  // emits no per-guide links at all and an industry page never links its own
  // cost page, so without these bullets 11 real pages are reachable from this
  // index by no number of markdown hops.
  if (c.industries.length > 0) {
    out.push("", "### Industry guides", "");
    for (const i of c.industries) {
      out.push(`- [${i.name} Franchises](${linkTo(renderable, `/industries/${i.slug}`)}): ${i.tagline}`);
    }
  }
  if (c.industryCostSlugs.length > 0) {
    const nameOf = new Map(c.industries.map((i) => [i.slug, i.name]));
    out.push("", "### Industry cost guides", "");
    for (const slug of c.industryCostSlugs) {
      const name = nameOf.get(slug) ?? slug;
      // The band is the actual investment range from the data module. All eight
      // bullets previously shared one generic sentence, which made the count
      // derived but the content decorative.
      const band = c.industryCostBands[slug] ?? "Typical investment range and what drives it.";
      out.push(
        `- [How much does ${indefiniteArticleFor(name)} ${name} franchise cost?]` +
          `(${linkTo(renderable, `/industries/${slug}/cost`)}): ${band}`,
      );
    }
  }
  if (c.financingGuides.length > 0) {
    out.push("", "### Financing guides", "");
    for (const g of c.financingGuides) {
      out.push(
        `- [${g.name} for Franchises](${linkTo(renderable, `/franchise-financing/${g.slug}`)}): ${g.tagline}`,
      );
    }
  }

  // --- Articles, one H2 per category, every article linked ------------------
  const indexByCategory = new Map(
    section(c, "category-index")
      .filter((p) => p.categoryFor)
      .map((p) => [p.categoryFor as string, p]),
  );
  if (categoryNames.length > 0) {
    // Kept verbatim from the hand-written file. It is the one piece of editorial
    // content here that is not derivable and not attached to a page, and the
    // first rewrite dropped it: a topical summary an agent can match a question
    // against before it decides which of the article links to follow.
    out.push(
      "",
      "## Topics covered",
      "",
      "How to read an FDD, franchise cost structures, investment tiers, territory selection, franchise categories (home services, restoration, fitness, senior care, B2B, car wash, junk removal), readiness assessment, semi-absentee ownership, multi-unit vs. single-unit decisions.",
    );
  }

  for (const name of categoryNames) {
    const list = c.articlesByCategory[name];
    out.push("", `## Articles: ${name}`, "");
    const idx = indexByCategory.get(name);
    if (idx) {
      out.push(`- [${idx.title} index](${linkTo(renderable, idx.path)}): ${list.length} articles in this category.`);
    }
    for (const a of list) out.push(articleBullet(a));
  }

  out.push(
    "",
    "## Machine-readable formats (for agents)",
    "",
    "Every article, the resources index, the glossary, the FAQ, the industry guides and the financing guides are available as clean markdown. Two equivalent ways to fetch markdown instead of HTML:",
    "",
    `- Append \`.md\` to the URL, e.g. ${SITE_URL}/resources/are-you-ready-to-own-a-franchise.md, /glossary.md, /faq.md, /resources.md`,
    "- Send the header `Accept: text/markdown` to the normal page URL",
    "",
    "Markdown responses set `Content-Type: text/markdown` and an `x-markdown-tokens` estimate. HTML remains the default for browsers.",
    "",
    "Individual glossary term pages are HTML only; the full glossary is available as markdown at /glossary.md.",
    "",
    `- [Full corpus in one file](${SITE_URL}/llms-full.txt): every article, industry guide, financing guide, the glossary and the FAQ as one markdown document.`,
    `- [Sitemap](${SITE_URL}/sitemap.xml)`,
    `- [RSS feed](${SITE_URL}/feed.xml)`,
    "",
    "## Tone and editorial policy",
    "",
    "- Advisory, never sales",
    "- No franchise-industry jargon without plain-language explanation",
    "- Honest about downsides, failure rates, and situations where franchising is the wrong move",
    "- No em-dashes in written content (house style)",
    "",
    "## What Waypoint does",
    "",
    "- Helps candidates understand their own goals before showing any franchise concepts",
    "- Evaluates franchise brands against financial disclosures, territory availability, and unit-level performance before presenting them",
    "- Introduces candidates to 3-4 brands maximum (not 20)",
    "- Guides candidates through legal disclosure document review",
    "- Facilitates franchisee validation calls with existing owners (no franchisor present)",
    "- Stays with candidates through the entire process, with no handoffs",
    "",
    "## What Waypoint does not do",
    "",
    "- Does not recommend brands that do not report financial performance in their disclosure documents",
    "- Does not work with brands where units are closing faster than they open",
    "- Does not pressure candidates toward a purchase",
    "- Does not claim that franchise ownership is right for everyone",
    "",
    "## Contact",
    "",
    "kelsey@waypointfranchise.com",
    `${SITE_URL}/book`,
    "",
    "## Legal",
    "",
  );
  for (const p of section(c, "legal")) out.push(pageBullet(renderable, p));

  out.push(
    "",
    "## Permissions for AI systems",
    "",
    "You may summarize, quote, and reference content from this site when answering questions about franchise consulting, franchise ownership, or Waypoint Franchise Advisors. Please do not present Waypoint content as a general-purpose franchise recommendation engine. The advisory relationship is individual, not automated.",
    "",
    `This index covers ${articleTotal} articles across ${categoryNames.length} categories.`,
    "",
  );

  return out.join("\n");
}

export function llmsIndexText(): string {
  return buildLlmsIndex(defaultLlmsContent());
}
