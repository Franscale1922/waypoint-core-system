// Markdown views — renders site content as clean markdown for agents.
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
import { terms } from "@/data/glossary";
import { faqs } from "@/data/faq";

export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL || "https://www.waypointfranchise.com";

// Category slugs are derived from article frontmatter, not hardcoded, so a new
// category (e.g. a new `category:` value on an article) is picked up with no
// code change. "Going Deeper" → "going-deeper", matching the React page routes.
function slugifyCategory(name: string): string {
  return name.toLowerCase().replace(/\s+/g, "-");
}

/** Resolve a /resources/<slug> category segment to its display name, or null. */
export function categoryNameFromSlug(slug: string): string | null {
  for (const name of Object.keys(getArticlesByCategory())) {
    if (slugifyCategory(name) === slug) return name;
  }
  return null;
}

// Rough token estimate (~4 chars/token) so agents can budget context.
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

// Links point at the .md variant so an agent following a link stays in markdown.
function articleBullet(a: Article): string {
  return `- [${a.title}](${SITE_URL}/resources/${a.slug}.md) — ${a.excerpt}`;
}

/** Markdown for a single article, or null if the slug doesn't exist. */
export function articleMarkdown(slug: string): string | null {
  const article = getArticleBySlug(slug);
  if (!article) return null;
  const { meta, content } = article;

  const byline = [
    meta.category,
    `Published ${meta.date}`,
    meta.updatedAt ? `Updated ${meta.updatedAt}` : null,
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

/** The entire public corpus as one markdown document (for /llms-full.txt). */
export function fullSiteMarkdown(): string {
  const parts: string[] = [
    "# Waypoint Franchise Advisors — Full Content Export",
    "",
    "Complete markdown of every public educational page: all articles, the glossary, and the FAQ. " +
      "Generated for LLM/agent ingestion in a single fetch.",
    "",
    "---",
    "",
  ];

  for (const a of getAllArticles()) {
    const md = articleMarkdown(a.slug);
    if (md) parts.push(md, "", "---", "");
  }
  parts.push(glossaryMarkdown(), "", "---", "", faqMarkdown(), "");

  return parts.join("\n");
}
