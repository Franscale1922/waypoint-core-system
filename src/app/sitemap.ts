import type { MetadataRoute } from "next";
import { getAllArticles } from "../lib/articles";

const SITE_URL = "https://www.waypointfranchise.com";

export default function sitemap(): MetadataRoute.Sitemap {
  const articles = getAllArticles();

  // NOTE: Update these dates when you make meaningful content changes to a page.
  // Using real dates (not new Date()) gives Googlebot reliable crawl signals.
  const corePages: MetadataRoute.Sitemap = [
    {
      url: SITE_URL,
      lastModified: new Date("2026-03-31"),
      changeFrequency: "weekly",
      priority: 1.0,
    },
    {
      url: `${SITE_URL}/about`,
      lastModified: new Date("2026-03-15"),
      changeFrequency: "monthly",
      priority: 0.9,
    },
    {
      url: `${SITE_URL}/investment`,
      lastModified: new Date("2026-03-15"),
      changeFrequency: "monthly",
      priority: 0.9,
    },
    {
      url: `${SITE_URL}/glossary`,
      lastModified: new Date("2026-03-15"),
      changeFrequency: "monthly",
      priority: 0.85,
    },
    {
      url: `${SITE_URL}/franchise-consultant-vs-broker`,
      lastModified: new Date("2026-03-15"),
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${SITE_URL}/process`,
      lastModified: new Date("2026-03-15"),
      changeFrequency: "monthly",
      priority: 0.9,
    },
    {
      url: `${SITE_URL}/scorecard`,
      lastModified: new Date("2026-03-15"),
      changeFrequency: "monthly",
      priority: 0.85,
    },
    {
      url: `${SITE_URL}/escape-kit`,
      lastModified: new Date("2026-03-15"),
      changeFrequency: "monthly",
      priority: 0.85,
    },
    {
      url: `${SITE_URL}/newsletter`,
      lastModified: new Date("2026-03-15"),
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${SITE_URL}/checklists`,
      lastModified: new Date("2026-03-15"),
      changeFrequency: "monthly",
      priority: 0.85,
    },
    {
      url: `${SITE_URL}/book`,
      lastModified: new Date("2026-03-15"),
      changeFrequency: "monthly",
      priority: 0.85,
    },
    {
      url: `${SITE_URL}/contact`,
      lastModified: new Date("2026-03-15"),
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${SITE_URL}/quizzes`,
      lastModified: new Date("2026-03-15"),
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${SITE_URL}/refer`,
      lastModified: new Date("2026-03-15"),
      changeFrequency: "monthly",
      priority: 0.75,
    },
    {
      url: `${SITE_URL}/archetype`,
      lastModified: new Date("2026-03-15"),
      changeFrequency: "monthly",
      priority: 0.85,
    },
    {
      url: `${SITE_URL}/faq`,
      lastModified: new Date("2026-03-15"),
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: `${SITE_URL}/privacy`,
      lastModified: new Date("2026-03-15"),
      changeFrequency: "yearly",
      priority: 0.3,
    },
    {
      url: `${SITE_URL}/terms`,
      lastModified: new Date("2026-03-15"),
      changeFrequency: "yearly",
      priority: 0.3,
    },
    {
      url: `${SITE_URL}/resources`,
      lastModified: new Date("2026-03-31"),
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: `${SITE_URL}/resources/getting-started`,
      lastModified: new Date("2026-03-15"),
      changeFrequency: "monthly",
      priority: 0.75,
    },
    {
      url: `${SITE_URL}/resources/going-deeper`,
      lastModified: new Date("2026-03-15"),
      changeFrequency: "monthly",
      priority: 0.75,
    },
    {
      url: `${SITE_URL}/resources/industry-spotlights`,
      lastModified: new Date("2026-03-15"),
      changeFrequency: "monthly",
      priority: 0.75,
    },
  ];

  const articlePages: MetadataRoute.Sitemap = articles.map((article) => ({
    url: `${SITE_URL}/resources/${article.slug}`,
    lastModified: new Date((article.updatedAt ?? article.date) + "T12:00:00"),
    changeFrequency: "monthly" as const,
    priority: 0.75,
  }));

  return [...corePages, ...articlePages];
}
