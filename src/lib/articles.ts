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
 * Real article slugs are lowercase, digits, and single hyphens between segments.
 *
 * Same grammar as SLUG_PATTERN in src/lib/githubArticleCommit.ts, which guards
 * the WRITE path (what the AI refresh commits). This is the READ side: the two
 * are deliberately separate because they answer different questions at
 * different times, and this one must not import that module (it reaches for
 * gray-matter and the GitHub API). tests/unit/article-slug-containment.test.ts
 * asserts the two patterns agree so they cannot drift.
 */
export function isArticleSlug(slug: string): boolean {
  return /^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug);
}

/**
 * Resolves a requested slug to a real path under content/articles, or null.
 *
 * Three independent checks, because any one alone would be the wrong layer:
 *
 * 1. isArticleSlug(), rejected BEFORE anything touches the filesystem. This is
 *    what actually stops a traversal payload like "../CONTENT-CALENDAR": that
 *    string simply is not a slug shape, so it never reaches nodePath.join.
 * 2. A resolved-path containment assertion as defense in depth, in case the
 *    format check is ever loosened without this being revisited.
 * 3. A regular-file check once something exists at the resolved path. A symlink
 *    literally named `content/articles/<real slug>.md` passes both checks above
 *    (its own name and location are exactly right) while pointing anywhere else
 *    on disk, and readFileSync follows it silently. No article is symlinked
 *    today, so this covers a supply-chain path (a malicious or mistaken
 *    commit), not a request-reachable hole.
 *
 * This is the one place getArticleBySlug and getRelatedArticles both route
 * through. articleMarkdown() in markdown-views.ts calls getArticleBySlug from a
 * catch-all ROUTE HANDLER (src/app/api/md/[...path]/route.ts), which ignores
 * `dynamicParams` entirely, so containment has to live here rather than in
 * page-level config.
 *
 * Probed against production (17 encodings: raw, single- and double-encoded ../,
 * backslash, ....//, across both the HTML route and its .md variant) before this
 * was added: none reached the filesystem, because Next.js normalizes the slug
 * segment before either route sees it. Defense in depth and an inconsistency
 * closed to match glossary/[slug]/page.tsx, not a fix for a reachable hole.
 */
function resolveArticlePath(slug: string): string | null {
  if (!isArticleSlug(slug)) return null;
  const resolved = nodePath.resolve(articlesDir, `${slug}.md`);
  const root = nodePath.resolve(articlesDir) + nodePath.sep;
  if (!resolved.startsWith(root)) return null;
  if (!fs.existsSync(resolved)) return null;
  if (fs.lstatSync(resolved).isSymbolicLink()) return null;
  return resolved;
}

export function getAllArticles(): Article[] {
  const filenames = fs.readdirSync(articlesDir).filter((f) => {
    if (!f.endsWith(".md")) return false;
    const slug = f.replace(/\.md$/, "");
    if (!isArticleSlug(slug)) {
      // Discovery must never advertise a link resolution will refuse. Before
      // this filter, a file named `new_guide.md` was indexed into every list,
      // feed and sitemap while getArticleBySlug("new_guide") returned null, so
      // every advertised link 404'd. Rename the file to fix.
      console.warn(
        `[articles] Skipping "${f}": filename is not a valid article slug ` +
          `(lowercase letters, digits, and single hyphens only). Rename the ` +
          `file, or this article will never appear anywhere on the site.`,
      );
      return false;
    }
    return true;
  });
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
  if (fullPath === null) return null;
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
      if (fullPath === null) return null;
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
    // Object.hasOwn, not a truthy check: a category value of "constructor" or
    // "toString" resolves the truthy check to an INHERITED function from
    // Object.prototype rather than undefined, and .push() on it throws, taking
    // down every category index for one bad frontmatter value. (Object.create(null)
    // would also fix it but is NOT usable here: this result crosses a Server to
    // Client Component boundary and Next's RSC serialization rejects a null
    // prototype outright.)
    if (!Object.hasOwn(grouped, article.category)) grouped[article.category] = [];
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
