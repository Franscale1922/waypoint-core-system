// Pillar ↔ cluster mapping. The new pillar pages (/franchise-financing and the
// /industries/[slug] hubs) link DOWN to their supporting articles. This module
// provides the reverse direction (given an article slug, which pillar it belongs
// to) so the article template can render an "up-link" back to its pillar. The
// topic-cluster model only consolidates authority if the cluster links up, not
// just down.
//
// Industry membership is derived from the SAME industries[].relatedArticles data
// the pillar pages use to link down, so the two directions can never disagree.

import { industries } from "@/data/industries";

export type PillarRef = { href: string; label: string };

// Articles whose pillar is the financing guide (the financing page links down to
// these; this is the reverse map). Kept here rather than in financing.ts because
// it is a routing/linking concern, not page content.
const FINANCING_ARTICLE_SLUGS = [
  "how-franchise-funding-actually-works",
  "sba-loan-vs-robs-franchise-funding-comparison",
  "the-true-cost-of-buying-a-franchise",
];

/**
 * Return the pillar page an article belongs to, or null. An industry pillar takes
 * precedence over the financing pillar (an article is at most assigned to one).
 */
export function pillarForArticle(slug: string): PillarRef | null {
  for (const industry of industries) {
    if (industry.relatedArticles.some((a) => a.slug === slug)) {
      return { href: `/industries/${industry.slug}`, label: `${industry.name} Franchises` };
    }
  }
  if (FINANCING_ARTICLE_SLUGS.includes(slug)) {
    return { href: "/franchise-financing", label: "How to Finance a Franchise" };
  }
  return null;
}
