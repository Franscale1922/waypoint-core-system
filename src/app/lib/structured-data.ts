export const SITE_URL = "https://www.waypointfranchise.com";

/**
 * Normalize any same-site URL to the canonical www host. The bare apex
 * (waypointfranchise.com) 301-redirects to www, so JSON-LD must always use www;
 * otherwise @id references and `url`/`item` values point at a redirecting host
 * and don't deduplicate against the rest of the entity graph.
 */
export function toWww(url: string): string {
  return url.replace(/^https?:\/\/(www\.)?waypointfranchise\.com/i, SITE_URL);
}

export const localBusinessSchema = {
  "@context": "https://schema.org",
  "@type": "LocalBusiness",
  "@id": `${SITE_URL}/#business`,
  name: "Waypoint Franchise Advisors",
  description:
    "Free franchise consulting from Kelsey Stuart, former Bloomin' Blinds franchisor. We match burned-out professionals to franchise opportunities that fit their life, capital, and goals.",
  url: SITE_URL,
  // Real brand/portrait assets in /public: gives Google and AI a visual entity
  // anchor and clears the "Missing field image" rich-results notice. (No
  // dedicated logo file exists yet; the header is a text wordmark.)
  image: [
    `${SITE_URL}/og_default_1773343895292.png`,
    `${SITE_URL}/images/kelsey-honest-portrait.jpg`,
  ],
  email: "kelsey@waypointfranchise.com",
  telephone: "+1-214-995-1062",
  founder: {
    "@type": "Person",
    name: "Kelsey Stuart",
    jobTitle: "Franchise Advisor",
    url: `${SITE_URL}/about`,
  },
  address: {
    "@type": "PostalAddress",
    addressLocality: "Whitefish",
    addressRegion: "MT",
    addressCountry: "US",
  },
  areaServed: {
    "@type": "Country",
    name: "United States",
  },
  memberOf: [
    { "@type": "Organization", name: "FranChoice" },
    { "@type": "Organization", name: "International Franchise Association (IFA)" }
  ],
  knowsAbout: [
    "franchise consulting",
    "franchise ownership",
    "franchise due diligence",
    "Franchise Disclosure Document (FDD)",
    "franchise territory selection",
    "franchise investment evaluation",
    "franchise category analysis",
    "home services franchises",
    "restoration franchises",
    "semi-absentee franchise ownership",
    "SBA franchise financing",
    "franchisee validation calls",
  ],
  priceRange: "Free",
  // NOTE: aggregateRating / review markup intentionally omitted. Google does not
  // permit self-serving review markup on a business's own LocalBusiness/Organization
  // entity (it is ignored for rich results and can trigger a Search Console flag).
  // Testimonials live as on-page content instead.
  sameAs: [
    "https://www.linkedin.com/in/kelsey-stuart-014b7b50/",
    "https://www.franchoice.com/kelsey-stuart",
    "https://www.facebook.com/kelsey.stuart.94",
    "https://www.instagram.com/franchise_match_maker/",
    "https://x.com/__Waypoint",
    "https://www.youtube.com/@Waypoint-Franchise",
    "https://www.tiktok.com/@waypoint007",
    "https://www.pinterest.com/waypointfranchise/",
    "https://www.crunchbase.com/organization/waypoint-franchise-advisors",
    "https://www.wikidata.org/wiki/Q140285847",
  ],
};

export const personSchema = {
  "@context": "https://schema.org",
  "@type": "Person",
  "@id": `${SITE_URL}/about#kelsey`,
  name: "Kelsey Stuart",
  jobTitle: "Franchise Advisor",
  description:
    "Former Bloomin' Blinds franchisor who helped grow a $40M franchise system with 200+ locations, and former franchisee who learned from failure firsthand. Based in Whitefish, Montana. Now helping corporate professionals and career changers find the right franchise through Waypoint Franchise Advisors, a free consulting service.",
  url: `${SITE_URL}/about`,
  email: "kelsey@waypointfranchise.com",
  telephone: "+1-214-995-1062",
  address: {
    "@type": "PostalAddress",
    addressLocality: "Whitefish",
    addressRegion: "MT",
    addressCountry: "US",
  },
  worksFor: { "@id": `${SITE_URL}/#business` },
  memberOf: [
    { "@type": "Organization", name: "FranChoice" },
    { "@type": "Organization", name: "International Franchise Association (IFA)" }
  ],
  sameAs: [
    "https://www.linkedin.com/in/kelsey-stuart-014b7b50/",
    "https://www.franchoice.com/kelsey-stuart",
    "https://www.facebook.com/kelsey.stuart.94",
    "https://www.instagram.com/franchise_match_maker/",
    "https://x.com/__Waypoint",
    "https://www.youtube.com/@Waypoint-Franchise",
    "https://www.tiktok.com/@waypoint007",
    "https://www.pinterest.com/waypointfranchise/",
    "https://www.crunchbase.com/person/kelsey-stuart-7ebb",
  ],
  knowsAbout: [
    "franchise consulting",
    "franchise ownership",
    "franchise due diligence",
    "Franchise Disclosure Document (FDD)",
    "franchise investment evaluation",
    "home services franchises",
    "restoration franchises",
    "semi-absentee franchise ownership",
  ],
};

// Scorecard FAQ: flat source array; the visible accordion on /scorecard and the
// FAQPage JSON-LD are both built from this (the page maps scorecardFaqs; the schema
// is faqPageSchema(scorecardFaqs)).
export const scorecardFaqs = [
  {
    q: "How much capital do I need to buy a franchise?",
    a: "It depends on the franchise. Many solid concepts start under $150K in liquid capital. The quiz helps identify which investment ranges match your profile.",
  },
  {
    q: "Is the franchise readiness quiz free?",
    a: "Yes, the quiz and all consulting services through Waypoint are 100% free to candidates. Franchise brands pay the referral fee, not you.",
  },
  {
    q: "What happens after I complete the quiz?",
    a: "You get a personalized readiness score. From there you can book a free 30-minute call with Kelsey to discuss your results and explore franchise concepts that match your profile.",
  },
  {
    q: "Do I need prior business experience to buy a franchise?",
    a: "No. Many of the best franchise owners come from corporate backgrounds with no prior business ownership. The quiz accounts for your experience level when generating your score.",
  },
];

export const scorecardFaqSchema = faqPageSchema(scorecardFaqs, `${SITE_URL}/scorecard`);

export const franchiseConsultingServiceSchema = {
  "@context": "https://schema.org",
  "@type": "Service",
  "@id": `${SITE_URL}/#service`,
  name: "Franchise Consulting",
  alternateName: "Free Franchise Advisory",
  description:
    "Free, personalized franchise consulting for corporate professionals and career changers. Kelsey Stuart evaluates your capital, goals, and life situation, then curates 3–4 franchise concepts that fit. No pitch, no pressure. Brands pay the referral fee; candidates pay nothing.",
  url: `${SITE_URL}/process`,
  serviceType: "Franchise Consulting",
  provider: {
    "@type": "Person",
    "@id": `${SITE_URL}/about#kelsey`,
    name: "Kelsey Stuart",
  },
  // Reference the business by @id only (no explicit @type). The `brand` property
  // accepts an Organization, and #business is a LocalBusiness (⊂ Organization), so
  // this stays valid WITHOUT re-typing #business as a Brand, which would otherwise
  // collapse the merged #business node into a cross-branch LocalBusiness+Brand type.
  brand: { "@id": `${SITE_URL}/#business` },
  areaServed: {
    "@type": "Country",
    name: "United States",
  },
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "USD",
    description:
      "Franchise consulting is 100% free to candidates. Franchise brands pay the referral fee at purchase. Your cost does not change whether you come through Waypoint or go direct.",
  },
  hasOfferCatalog: {
    "@type": "OfferCatalog",
    name: "Franchise Categories",
    itemListElement: [
      { "@type": "Offer", itemOffered: { "@type": "Service", name: "Home Services Franchises" } },
      { "@type": "Offer", itemOffered: { "@type": "Service", name: "Restoration Franchises" } },
      { "@type": "Offer", itemOffered: { "@type": "Service", name: "B2B Service Franchises" } },
      { "@type": "Offer", itemOffered: { "@type": "Service", name: "Fitness and Wellness Franchises" } },
      { "@type": "Offer", itemOffered: { "@type": "Service", name: "Senior Care Franchises" } },
      { "@type": "Offer", itemOffered: { "@type": "Service", name: "Pet Care Franchises" } },
      { "@type": "Offer", itemOffered: { "@type": "Service", name: "Express Car Wash Franchises" } },
      { "@type": "Offer", itemOffered: { "@type": "Service", name: "Food and Beverage Franchises" } },
    ],
  },
  // ReserveAction makes the primary conversion (booking a free discovery call)
  // explicit and machine-actionable for agentic browsers (Project Mariner / UCP)
  // and AI assistants, which navigate by the accessibility/action graph.
  potentialAction: {
    "@type": "ReserveAction",
    name: "Book a free franchise discovery call",
    target: {
      "@type": "EntryPoint",
      urlTemplate: `${SITE_URL}/book`,
      actionPlatform: [
        "http://schema.org/DesktopWebPlatform",
        "http://schema.org/MobileWebPlatform",
      ],
    },
    result: {
      "@type": "Reservation",
      name: "Free 30-minute franchise discovery call",
    },
  },
};

/**
 * VideoObject schema factory.
 *
 * Google requires `name`, `description`, `thumbnailUrl`, and `uploadDate` for a
 * video to be eligible for video rich results and AI/Ask-YouTube surfacing.
 *
 * IMPORTANT: pass `transcript` ONLY when a real, verified transcript of the
 * spoken content is available. Never fabricate spoken words; an inaccurate
 * transcript misrepresents what was said and breaks trust/E-E-A-T.
 */
export function videoObjectSchema({
  name,
  description,
  thumbnailUrl,
  uploadDate,
  duration,
  embedUrl,
  contentUrl,
  transcript,
}: {
  name: string;
  description: string;
  thumbnailUrl: string;
  uploadDate: string;
  duration?: string;
  embedUrl?: string;
  contentUrl?: string;
  transcript?: string;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "VideoObject",
    name,
    description,
    thumbnailUrl: [thumbnailUrl],
    uploadDate,
    ...(duration ? { duration } : {}),
    ...(embedUrl ? { embedUrl } : {}),
    ...(contentUrl ? { contentUrl } : {}),
    ...(transcript ? { transcript } : {}),
    publisher: {
      "@type": "Organization",
      "@id": `${SITE_URL}/#business`,
      name: "Waypoint Franchise Advisors",
      url: SITE_URL,
    },
  };
}

/**
 * WebSite node: the top of the entity graph. Declares the site as a distinct
 * entity published by the business, so search and AI crawlers can resolve
 * "what site is this" separately from "what business runs it".
 *
 * No `potentialAction`/SearchAction: the site has no search-results endpoint, so
 * advertising a sitelinks searchbox would be invalid markup.
 */
export const webSiteSchema = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  "@id": `${SITE_URL}/#website`,
  url: SITE_URL,
  name: "Waypoint Franchise Advisors",
  description:
    "Free franchise consulting from Kelsey Stuart, former Bloomin' Blinds franchisor, matching corporate professionals and career changers to franchise opportunities that fit their life, capital, and goals.",
  publisher: { "@id": `${SITE_URL}/#business` },
  inLanguage: "en-US",
};

type JsonLdNode = Record<string, unknown>;

/**
 * Wrap one or more schema nodes into a single `@graph` document. Strips any
 * per-node `@context` (the wrapper carries the one authoritative context), so
 * existing schemas that include `@context` and new builder nodes that don't can
 * be mixed freely. Emit the result in a single <script type="application/ld+json">.
 */
export function jsonLdGraph(...nodes: JsonLdNode[]) {
  return {
    "@context": "https://schema.org",
    "@graph": nodes.map((node) => {
      const { "@context": _ctx, ...rest } = node as JsonLdNode & { "@context"?: unknown };
      return rest;
    }),
  };
}

/**
 * Build a fragment @id from a canonical URL. The apex/root has no path, so we
 * insert a "/" before the fragment to match the site-level @ids
 * (`${SITE_URL}/#business`, `/#website`). Pathed URLs (e.g. `/resources`) keep
 * their path and append the fragment directly. Keeps every node's @id uniform.
 */
export function fragmentId(canonical: string, fragment: string): string {
  const base = canonical === SITE_URL ? `${SITE_URL}/` : canonical;
  return `${base}${fragment}`;
}

/**
 * BreadcrumbList node (no `@context`; meant to nest in a `@graph` or a WebPage).
 * URLs are normalized to the canonical www host.
 */
export function breadcrumbSchema(items: { name: string; url: string }[]) {
  return {
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.name,
      item: toWww(item.url),
    })),
  };
}

/**
 * WebPage node tied into the site graph (`isPartOf` → #website). Pass a
 * `breadcrumb` (from breadcrumbSchema) and/or a `mainEntityId` to link the page
 * to its primary entity (e.g. the homepage → #business).
 */
export function webPageSchema({
  url,
  name,
  description,
  breadcrumb,
  mainEntityId,
  primaryImage,
}: {
  url: string;
  name: string;
  description: string;
  breadcrumb?: ReturnType<typeof breadcrumbSchema>;
  mainEntityId?: string;
  primaryImage?: string;
}) {
  const canonical = toWww(url);
  return {
    "@type": "WebPage",
    "@id": fragmentId(canonical, "#webpage"),
    url: canonical,
    name,
    description,
    isPartOf: { "@id": `${SITE_URL}/#website` },
    inLanguage: "en-US",
    ...(primaryImage ? { primaryImageOfPage: toWww(primaryImage) } : {}),
    ...(mainEntityId ? { mainEntity: { "@id": mainEntityId } } : {}),
    ...(breadcrumb ? { breadcrumb } : {}),
  };
}

/**
 * CollectionPage node with an embedded ItemList, for listing pages (the
 * resources hub and the three category pages). `items` are the listed articles.
 */
export function collectionPageSchema({
  url,
  name,
  description,
  items,
  breadcrumb,
}: {
  url: string;
  name: string;
  description: string;
  items: { name: string; url: string }[];
  breadcrumb?: ReturnType<typeof breadcrumbSchema>;
}) {
  const canonical = toWww(url);
  return {
    "@type": "CollectionPage",
    "@id": fragmentId(canonical, "#webpage"),
    url: canonical,
    name,
    description,
    isPartOf: { "@id": `${SITE_URL}/#website` },
    inLanguage: "en-US",
    ...(breadcrumb ? { breadcrumb } : {}),
    mainEntity: {
      "@type": "ItemList",
      numberOfItems: items.length,
      itemListElement: items.map((item, i) => ({
        "@type": "ListItem",
        position: i + 1,
        url: toWww(item.url),
        name: item.name,
      })),
    },
  };
}

/**
 * FAQPage node built from a flat {q,a}[] array: the one shape used everywhere FAQ
 * content appears (articles, the FAQ page, scorecard, comparison, financing, and
 * the industry/category pages). Returns a node WITHOUT `@context` so it composes
 * inside `jsonLdGraph(...)`.
 *
 * Pass `url` (the page's canonical) to anchor the node in the graph with a stable
 * `@id` + `isPartOf #website` + `inLanguage`. Always pass it for page-level FAQs so
 * the FAQPage isn't a floating, unlinked node. The visible on-page FAQ MUST be
 * rendered from the same array (Google requires the Q&A to be present on the page).
 */
export function faqPageSchema(items: { q: string; a: string }[], url?: string) {
  const node: Record<string, unknown> = {
    "@type": "FAQPage",
    mainEntity: items.map(({ q, a }) => ({
      "@type": "Question",
      name: q,
      acceptedAnswer: { "@type": "Answer", text: a },
    })),
  };
  if (url) {
    const canonical = toWww(url);
    node["@id"] = fragmentId(canonical, "#faq");
    node["isPartOf"] = { "@id": `${SITE_URL}/#website` };
    node["inLanguage"] = "en-US";
  }
  return node;
}
