import fs from "fs";
import nodePath from "path";
import matter from "gray-matter";

export type Article = {
  slug: string;
  title: string;
  date: string;
  category: string;
  tier: number;
  excerpt: string;
  checklistSlug?: string;
};

const articlesDir = nodePath.join(process.cwd(), "content", "articles");

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
        category: data.category as string,
        tier: data.tier as number,
        excerpt: data.excerpt as string,
        checklistSlug: (data.checklistSlug as string | undefined) ?? undefined,
      };
    })
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

export function getArticleBySlug(slug: string): { meta: Article; content: string; relatedSlugs: string[]; faqs?: { q: string; a: string }[] } | null {
  const fullPath = nodePath.join(articlesDir, `${slug}.md`);
  if (!fs.existsSync(fullPath)) return null;
  const { data, content } = matter(fs.readFileSync(fullPath, "utf8"));
  return {
    meta: { slug, title: data.title, date: data.date, category: data.category, tier: data.tier, excerpt: data.excerpt, checklistSlug: data.checklistSlug ?? undefined },
    content,
    relatedSlugs: (data.relatedSlugs as string[]) ?? [],
    faqs: (data.faqs as { q: string; a: string }[] | undefined) ?? undefined,
  };
}

export function getRelatedArticles(relatedSlugs: string[]): Article[] {
  return relatedSlugs
    .map((slug) => {
      const fullPath = nodePath.join(articlesDir, `${slug}.md`);
      if (!fs.existsSync(fullPath)) return null;
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
