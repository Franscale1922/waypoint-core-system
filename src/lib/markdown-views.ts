// Markdown views: renders site content as clean markdown for agents.
//
// Every public, content-rich surface (articles, the resources index, glossary,
// FAQ) has a markdown representation here. Route handlers and llms-full.txt call
// these; the React pages render the same underlying data as HTML. One source of
// truth, two representations.

import {
  getAllArticles,
  getArticleBySlug,
  getArticlesByCategory,
  getArticlesByCategoryName,
  type Article,
} from "@/lib/articles";
import { articleDateISO } from "@/lib/articleDate";
import { terms } from "@/data/glossary";
import { faqs } from "@/data/faq";
import { industries, getIndustry, getIndustryCost } from "@/data/industries";
import { financingMethods, financingFaqs, financingGuides, getFinancingGuide } from "@/data/financing";

// Trailing slashes are stripped because NEXT_PUBLIC_SITE_URL is an unvalidated
// string: with "https://www.waypointfranchise.com/" set, every URL built here
// became ".com//<path>". Normalising at the source rather than at each consumer
// is deliberate - a consumer-side fix left the 45 article links (built through
// articleBullet, below) still doubled, and covers /llms-full.txt, the [Source]
// links and the glossary related-links in one place.
export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL || "https://www.waypointfranchise.com"
).replace(/\/+$/, "");

// Category slugs are derived from article frontmatter, not hardcoded, so a new
// category (e.g. a new `category:` value on an article) is picked up with no
// code change. "Going Deeper" → "going-deeper", matching the React page routes.
export function categorySlug(name: string): string {
  return name.toLowerCase().replace(/\s+/g, "-");
}

/** Resolve a /resources/<slug> category segment to its display name, or null. */
export function categoryNameFromSlug(slug: string): string | null {
  for (const name of Object.keys(getArticlesByCategory())) {
    if (categorySlug(name) === slug) return name;
  }
  return null;
}

// Rough token estimate (~4 chars/token) so agents can budget context.
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

// Links point at the .md variant so an agent following a link stays in markdown.
// Exported because /llms.txt lists the same articles: one bullet shape, defined
// once, so the index and the markdown views can never drift apart.
export function articleBullet(a: Article): string {
  return `- [${a.title}](${SITE_URL}/resources/${a.slug}.md): ${a.excerpt}`;
}

/** Markdown for a single article, or null if the slug doesn't exist. */
export function articleMarkdown(slug: string): string | null {
  const article = getArticleBySlug(slug);
  if (!article) return null;
  const { meta, content } = article;

  // Validated before it reaches the byline. This view is what agents and answer
  // engines read, so an unusable date is dropped rather than quoted back to
  // them as fact.
  const published = articleDateISO(meta.date);
  const updated = articleDateISO(meta.updatedAt);
  const byline = [
    meta.category,
    published ? `Published ${published}` : null,
    updated ? `Updated ${updated}` : null,
    "By Kelsey Stuart, Waypoint Franchise Advisors",
  ]
    .filter(Boolean)
    .join(" · ");

  return [
    `# ${meta.title}`,
    "",
    meta.excerpt ? `> ${meta.excerpt}` : null,
    meta.excerpt ? "" : null,
    `*${byline}*`,
    "",
    `[Source](${SITE_URL}/resources/${slug})`,
    "",
    "---",
    "",
    content.trim(),
    "",
  ]
    .filter((line) => line !== null)
    .join("\n");
}

/** Markdown index of the article library. With a category name, scopes to it. */
export function resourcesIndexMarkdown(categoryName?: string): string {
  const lines: string[] = [];

  if (categoryName) {
    lines.push(`# ${categoryName}`, "");
    for (const a of getArticlesByCategoryName(categoryName)) lines.push(articleBullet(a));
    lines.push("");
    return lines.join("\n").trim() + "\n";
  }

  lines.push(
    "# Franchise Resources",
    "",
    "Educational articles on franchise buying from Waypoint Franchise Advisors. " +
      "Append `.md` to any article URL, or send `Accept: text/markdown`, to read it as markdown.",
    "",
  );
  for (const [category, articles] of Object.entries(getArticlesByCategory())) {
    lines.push(`## ${category}`, "");
    for (const a of articles) lines.push(articleBullet(a));
    lines.push("");
  }
  return lines.join("\n").trim() + "\n";
}

/** Markdown of the full franchise glossary. */
export function glossaryMarkdown(): string {
  const lines = [
    "# Franchise Glossary",
    "",
    "Plain-language definitions of franchise terms for prospective buyers, from Waypoint Franchise Advisors.",
    "",
  ];
  for (const group of terms) {
    lines.push(`## ${group.letter}`, "");
    for (const e of group.entries) {
      lines.push(`### ${e.term}`, "", e.definition, "");
      if (e.related && e.relatedLabel) {
        lines.push(`Related: [${e.relatedLabel}](${SITE_URL}${e.related})`, "");
      }
    }
  }
  return lines.join("\n").trim() + "\n";
}

/** Markdown of the FAQ. */
export function faqMarkdown(): string {
  const lines = [
    "# Frequently Asked Questions",
    "",
    "Honest answers about franchise consulting from Waypoint Franchise Advisors.",
    "",
  ];
  for (const section of faqs) {
    lines.push(`## ${section.category}`, "");
    for (const item of section.questions) {
      lines.push(`### ${item.q}`, "", item.a, "");
      if (item.link) lines.push(`See: [${item.link.label}](${SITE_URL}${item.link.url})`, "");
    }
  }
  return lines.join("\n").trim() + "\n";
}

/** Markdown of the franchise financing guide. */
export function financingMarkdown(): string {
  const lines = [
    "# How to Finance a Franchise",
    "",
    "The main ways people fund a franchise, from Waypoint Franchise Advisors. " +
      "Educational only: not financial advice or a promise of approval.",
    "",
    "## Five ways franchises get funded",
    "",
  ];
  for (const m of financingMethods) {
    lines.push(
      `### ${m.method}`,
      "",
      `- **How it works:** ${m.how}`,
      `- **Best for:** ${m.bestFor}`,
      `- **Watch for:** ${m.watch}`,
      "",
    );
  }
  lines.push("## Common questions", "");
  for (const f of financingFaqs) {
    lines.push(`### ${f.q}`, "", f.a, "");
  }
  return lines.join("\n").trim() + "\n";
}

/** Markdown of a single financing method deep-dive, or null if the slug is unknown. */
export function financingGuideMarkdown(slug: string): string | null {
  const g = getFinancingGuide(slug);
  if (!g) return null;
  const lines = [
    `# ${g.name} for Franchises`,
    "",
    g.heroTagline,
    "",
    g.intro,
    "",
    "## How it works",
    "",
    g.howItWorks,
    "",
    "## Who it tends to fit",
    "",
    g.whoItFits,
    "",
    "## What to watch for",
    "",
    g.watchFor,
    "",
    "## Common questions",
    "",
  ];
  for (const f of g.faqs) {
    lines.push(`### ${f.q}`, "", f.a, "");
  }
  lines.push(`[Part of: How to Finance a Franchise](${SITE_URL}/franchise-financing.md)`, "");
  return lines.join("\n").trim() + "\n";
}

/** Markdown index of all franchise industry/category guides. */
export function industriesIndexMarkdown(): string {
  const lines = [
    "# Franchise Industries & Categories",
    "",
    "Honest, category-by-category guides to the main types of franchise, from Waypoint Franchise Advisors. " +
      "Append `.md` to any category URL, or send `Accept: text/markdown`, to read it as markdown.",
    "",
  ];
  for (const i of industries) {
    lines.push(`- [${i.name}](${SITE_URL}/industries/${i.slug}.md): ${i.heroTagline}`);
  }
  lines.push("");
  return lines.join("\n").trim() + "\n";
}

/** Markdown of a single industry/category guide, or null if the slug doesn't exist. */
export function industryMarkdown(slug: string): string | null {
  const i = getIndustry(slug);
  if (!i) return null;
  const lines = [
    `# ${i.name} Franchises`,
    "",
    i.heroTagline,
    "",
    i.intro,
    "",
    "## What it actually is",
    "",
    i.whatItIs,
    "",
    "## Who it tends to fit",
    "",
    i.whoItFits,
    "",
    "## What to watch for",
    "",
    i.watchFor,
    "",
    "## Common questions",
    "",
  ];
  for (const f of i.faqs) {
    lines.push(`### ${f.q}`, "", f.a, "");
  }
  if (i.relatedArticles.length > 0) {
    lines.push("## Go deeper", "");
    for (const a of i.relatedArticles) {
      lines.push(`- [${a.title}](${SITE_URL}/resources/${a.slug}.md)`);
    }
    lines.push("");
  }
  lines.push(`[Source](${SITE_URL}/industries/${i.slug})`, "");
  return lines.join("\n").trim() + "\n";
}

/** Markdown of a single category cost guide, or null if the slug has no cost data. */
export function industryCostMarkdown(slug: string): string | null {
  const industry = getIndustry(slug);
  const cost = getIndustryCost(slug);
  if (!industry || !cost) return null;
  const lower = industry.name.toLowerCase();
  const lines = [
    `# How Much Does a ${industry.name} Franchise Cost?`,
    "",
    cost.band,
    "",
    "## What drives the cost",
    "",
    cost.drivers,
    "",
    "## What you are budgeting for",
    "",
    cost.components,
    "",
    "> These ranges are general and educational, not a quote. Every franchisor's exact estimated initial investment is in Item 7 of its Franchise Disclosure Document.",
    "",
    "## Common questions",
    "",
  ];
  for (const f of cost.faqs) {
    lines.push(`### ${f.q}`, "", f.a, "");
  }
  lines.push(`[${industry.name} franchises](${SITE_URL}/industries/${slug}.md)`, "");
  return lines.join("\n").trim() + "\n";
}

/** The entire public corpus as one markdown document (for /llms-full.txt). */
export function fullSiteMarkdown(): string {
  const parts: string[] = [
    "# Waypoint Franchise Advisors: Full Content Export",
    "",
    "Complete markdown of every public educational page: all articles, the industry " +
      "category guides, the financing guide, the glossary, and the FAQ. " +
      "Generated for LLM/agent ingestion in a single fetch.",
    "",
    "---",
    "",
  ];

  for (const a of getAllArticles()) {
    const md = articleMarkdown(a.slug);
    if (md) parts.push(md, "", "---", "");
  }

  parts.push(financingMarkdown(), "", "---", "");
  for (const g of financingGuides) {
    const md = financingGuideMarkdown(g.slug);
    if (md) parts.push(md, "", "---", "");
  }
  for (const i of industries) {
    const md = industryMarkdown(i.slug);
    if (md) parts.push(md, "", "---", "");
    const costMd = industryCostMarkdown(i.slug);
    if (costMd) parts.push(costMd, "", "---", "");
  }

  parts.push(glossaryMarkdown(), "", "---", "", faqMarkdown(), "");

  return parts.join("\n");
}
