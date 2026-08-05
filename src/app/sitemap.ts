import type { MetadataRoute } from "next";
import { getAllArticles } from "../lib/articles";
import { articleDateObject } from "../lib/articleDate";
import { industries, getIndustryCost } from "../data/industries";
import { financingGuides } from "../data/financing";
import { allGlossaryEntries } from "../data/glossary";

const SITE_URL = "https://www.waypointfranchise.com";

export default function sitemap(): MetadataRoute.Sitemap {
  const articles = getAllArticles();

  // NOTE: Update these dates when you make meaningful content changes to a page.
  // Using real dates (not new Date()) gives Googlebot reliable crawl signals.
  const corePages: MetadataRoute.Sitemap = [
    {
      url: SITE_URL,
      lastModified: new Date("2026-04-13"),
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
      url: `${SITE_URL}/franchise-financing`,
      lastModified: new Date("2026-06-13"),
      changeFrequency: "monthly",
      priority: 0.85,
    },
    {
      url: `${SITE_URL}/industries`,
      lastModified: new Date("2026-06-13"),
      changeFrequency: "monthly",
      priority: 0.85,
    },
    {
      url: `${SITE_URL}/franchise-vs-starting-a-business`,
      lastModified: new Date("2026-06-13"),
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${SITE_URL}/is-a-franchise-worth-it`,
      lastModified: new Date("2026-06-13"),
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
      url: `${SITE_URL}/tools`,
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
      lastModified: new Date("2026-04-13"),
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: `${SITE_URL}/reports/franchise-matching-2026`,
      lastModified: new Date("2026-05-29"),
      changeFrequency: "yearly",
      priority: 0.85,
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

  // An unvalidatable date omits lastModified rather than emitting an Invalid
  // Date, which Next serializes as an empty <lastmod> and Search Console reads
  // as a malformed sitemap entry.
  const articlePages: MetadataRoute.Sitemap = articles.map((article) => {
    const lastModified = articleDateObject(article.updatedAt ?? article.date);
    return {
      url: `${SITE_URL}/resources/${article.slug}`,
      ...(lastModified ? { lastModified } : {}),
      changeFrequency: "monthly" as const,
      priority: 0.75,
    };
  });

  const industryPages: MetadataRoute.Sitemap = industries.map((i) => ({
    url: `${SITE_URL}/industries/${i.slug}`,
    lastModified: new Date("2026-06-13"),
    changeFrequency: "monthly" as const,
    priority: 0.8,
  }));

  const financingGuidePages: MetadataRoute.Sitemap = financingGuides.map((g) => ({
    url: `${SITE_URL}/franchise-financing/${g.slug}`,
    lastModified: new Date("2026-06-13"),
    changeFrequency: "monthly" as const,
    priority: 0.75,
  }));

  const industryCostPages: MetadataRoute.Sitemap = industries
    .filter((i) => getIndustryCost(i.slug))
    .map((i) => ({
      url: `${SITE_URL}/industries/${i.slug}/cost`,
      lastModified: new Date("2026-06-13"),
      changeFrequency: "monthly" as const,
      priority: 0.75,
    }));

  const glossaryTermPages: MetadataRoute.Sitemap = allGlossaryEntries.map((e) => ({
    url: `${SITE_URL}/glossary/${e.slug}`,
    lastModified: new Date("2026-03-15"),
    changeFrequency: "monthly" as const,
    priority: 0.6,
  }));

  return [
    ...corePages,
    ...articlePages,
    ...industryPages,
    ...financingGuidePages,
    ...industryCostPages,
    ...glossaryTermPages,
  ];
}
