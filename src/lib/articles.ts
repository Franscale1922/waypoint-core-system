import fs from "fs";
import nodePath from "path";
import matter from "gray-matter";
import { articleDateSortKey } from "./articleDate";

export type Article = {
  slug: string;
  title: string;
  date: string;
  updatedAt?: string;  // Optional: set in frontmatter when article is meaningfully revised
  category: string;
  tier: number;
  excerpt: string;
  checklistSlug?: string;
  escapeKit?: boolean;
};

// Optional, opt-in per-article video. When present in frontmatter, the article
// page emits VideoObject JSON-LD via videoObjectSchema(). Never required.
export type ArticleVideo = {
  name: string;
  description: string;
  thumbnailUrl: string;
  uploadDate: string;       // timezone-qualified ISO 8601
  duration?: string;        // ISO 8601 duration, e.g. "PT3M30S"
  embedUrl?: string;
  contentUrl?: string;
  transcript?: string;      // only when a real, verified transcript exists
};

const articlesDir = nodePath.join(process.cwd(), "content", "articles");

/**
 * Resolves a requested slug to a real path under content/articles, or null.
 *
 * Two independent checks, because either one alone would be the wrong layer:
 *
 * 1. A format allowlist (real article slugs are lowercase, digits, hyphens),
 *    rejected BEFORE anything touches the filesystem. This is what actually
 *    stops a traversal payload like "../CONTENT-CALENDAR": that string simply
 *    is not a slug shape, so it never reaches nodePath.join.
 * 2. A resolved-path containment assertion as defense in depth, in case the
 *    format check is ever loosened without this being revisited.
 *
 * This is the one place both getArticleBySlug and getRelatedArticles route
 * through. articleMarkdown() in markdown-views.ts calls getArticleBySlug from
 * a catch-all ROUTE HANDLER (src/app/api/md/[...path]/route.ts), which ignores
 * `dynamicParams` entirely, so containment has to live here rather than in
 * page-level config.
 *
 * Probed against production (10+ encodings: raw, single- and double-encoded
 * ../, backslash, ....//) before this change: none reached the filesystem:
 * Next.js normalizes the slug segment before either route sees it. This is
 * therefore defense in depth and an inconsistency closed to match
 * glossary/[slug]/page.tsx, not a fix for a reachable hole.
 */
function resolveArticlePath(slug: string): string | null {
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug)) return null;
  const resolved = nodePath.resolve(articlesDir, `${slug}.md`);
  const root = nodePath.resolve(articlesDir) + nodePath.sep;
  if (!resolved.startsWith(root)) return null;
  return resolved;
}

export function getAllArticles(): Article[] {
  const filenames = fs.readdirSync(articlesDir).filter((f) => f.endsWith(".md"));
  return filenames
    .map((filename) => {
      const slug = filename.replace(/\.md$/, "");
      const { data } = matter(fs.readFileSync(nodePath.join(articlesDir, filename), "utf8"));
      return {
        slug,
        title: data.title as string,
        date: data.date as string,
        updatedAt: (data.updatedAt as string | undefined) ?? undefined,
        category: data.category as string,
        tier: data.tier as number,
        excerpt: data.excerpt as string,
        checklistSlug: (data.checklistSlug as string | undefined) ?? undefined,
        escapeKit: (data.escapeKit as boolean | undefined) ?? undefined,
      };
    })
    // Newest first. articleDateSortKey pushes an unvalidatable date to the end
    // instead of returning NaN: every comparison against NaN is false, so one
    // bad date used to make the surrounding order arbitrary rather than just
    // misplacing that single article.
    .sort((a, b) => articleDateSortKey(b.date) - articleDateSortKey(a.date));
}

export function getArticleBySlug(slug: string): { meta: Article; content: string; relatedSlugs: string[]; faqs?: { q: string; a: string }[]; video?: ArticleVideo } | null {
  const fullPath = resolveArticlePath(slug);
  if (fullPath === null || !fs.existsSync(fullPath)) return null;
  const { data, content } = matter(fs.readFileSync(fullPath, "utf8"));
  return {
    meta: { slug, title: data.title, date: data.date, updatedAt: data.updatedAt ?? undefined, category: data.category, tier: data.tier, excerpt: data.excerpt, checklistSlug: data.checklistSlug ?? undefined, escapeKit: data.escapeKit ?? undefined },
    content,
    relatedSlugs: (data.relatedSlugs as string[]) ?? [],
    // Same kind of assertion as `video` below, and not a validation boundary
    // either: a list item written as a bare string, or a stray "-" that YAML
    // parses as null, survives this cast. validFaqEntries() in
    // app/lib/structured-data.ts filters the entries at the point of use, and
    // the article route renders the visible FAQ from that same filtered set, so
    // do not add a second, drifting validator here.
    faqs: (data.faqs as { q: string; a: string }[] | undefined) ?? undefined,
    // This `as` is an assertion, NOT a validation boundary: js-yaml will hand
    // back whatever the frontmatter says, including a Date for an unquoted
    // uploadDate. videoObjectSchema() in app/lib/structured-data.ts re-checks
    // every field at runtime and drops the node (or the property) on a bad
    // value, so do not add a second, drifting validator here.
    video: (data.video as ArticleVideo | undefined) ?? undefined,
  };
}

export function getRelatedArticles(relatedSlugs: string[]): Article[] {
  return relatedSlugs
    .map((slug) => {
      const fullPath = resolveArticlePath(slug);
      if (fullPath === null || !fs.existsSync(fullPath)) return null;
      const { data } = matter(fs.readFileSync(fullPath, "utf8"));
      return {
        slug,
        title: data.title as string,
        date: data.date as string,
        category: data.category as string,
        tier: data.tier as number,
        excerpt: data.excerpt as string,
      };
    })
    .filter((a): a is Article => a !== null);
}

export function getArticlesByCategory(): Record<string, Article[]> {
  const articles = getAllArticles();
  const ORDER = ["Getting Started", "Going Deeper", "Industry Spotlights"];
  const grouped: Record<string, Article[]> = {};
  for (const cat of ORDER) grouped[cat] = [];
  for (const article of articles) {
    if (!grouped[article.category]) grouped[article.category] = [];
    grouped[article.category].push(article);
  }
  for (const key of Object.keys(grouped)) {
    if (grouped[key].length === 0) delete grouped[key];
  }
  return grouped;
}

export function getArticlesByCategoryName(category: string): Article[] {
  return getAllArticles().filter((a) => a.category === category);
}
