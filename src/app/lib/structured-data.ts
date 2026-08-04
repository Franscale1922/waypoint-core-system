export const SITE_URL = "https://www.waypointfranchise.com";

/**
 * Match our scheme + host at the START of a URL, and ONLY when the authority
 * ends right there: the lookahead requires the next character to be a path,
 * query or fragment delimiter, or end-of-string.
 *
 * That bound is the whole point. Without it the pattern matches any host merely
 * PREFIXED by ours, so three classes of lookalike were rewritten into something
 * that reads like the canonical site (schemes omitted below on purpose, see the
 * note after the list):
 *
 *   waypointfranchise.com.evil.example/a  ->  www.waypointfranchise.com.evil.example/a
 *   waypointfranchise.com@evil.example/a  ->  www.waypointfranchise.com@evil.example/a  (host is STILL evil.example)
 *   waypointfranchise.competitor.com/x    ->  www.waypointfranchise.competitor.com/x
 *
 * Excluding ":" also declines a port, which is not the canonical host either.
 *
 * Those examples carry no "https://" prefix because the non-www guard in
 * scripts/verify-schema.mjs scans source TEXT and cannot tell an illustration
 * from a real URL, so spelling them out in full would fail the build. The live
 * cases are covered properly in tests/unit/structured-data.test.ts, which the
 * guard does not scan.
 */
const SAME_SITE_PREFIX = /^https?:\/\/(?:www\.)?waypointfranchise\.com(?=[/?#]|$)/i;
const CANONICAL_HOSTS = ["waypointfranchise.com", "www.waypointfranchise.com"];

/**
 * Normalize any same-site URL to the canonical www host. The bare apex
 * (waypointfranchise.com) 301-redirects to www, so JSON-LD must always use www;
 * otherwise @id references and `url`/`item` values point at a redirecting host
 * and don't deduplicate against the rest of the entity graph.
 *
 * Fail-closed: anything that is not unambiguously ours is returned untouched.
 * Callers currently pass internal constants only, so this is hardening rather
 * than a reachable bug, but a rewritten lookalike would be emitted as a
 * first-party URL in JSON-LD, which is worth making structurally impossible.
 */
export function toWww(url: string): string {
  const match = SAME_SITE_PREFIX.exec(url);
  if (!match) return url;
  // Second gate: make the WHATWG parser agree the host is ours, so a string the
  // regex reads one way and a browser or crawler reads another cannot slip
  // through. Belt and braces against exotic Unicode/IDN forms.
  try {
    if (!CANONICAL_HOSTS.includes(new URL(url).hostname.toLowerCase())) return url;
  } catch {
    return url;
  }
  // Rewrite ONLY the matched scheme+host prefix, leaving the remainder of the
  // string byte-identical. Rebuilding from the parsed URL would append a
  // trailing slash to the bare origin, which would change the homepage node's
  // `url` and break the `canonical === SITE_URL` test in fragmentId() below.
  return SITE_URL + url.slice(match[0].length);
}

/**
 * Accept a schema.org Date/DateTime, rejecting anything that would ship as
 * invalid structured data. Two gates, because neither alone is enough:
 *
 *  - Shape, because Date.parse is far more permissive than ISO 8601:
 *    "2026-8-3", "August 3, 2026" and even "2026" all parse happily.
 *  - Calendar round-trip for the date-only form, because JS does NOT reject an
 *    out-of-range day. `new Date("2026-02-30")` silently becomes March 2, and
 *    "2026-02-29" in a non-leap year becomes March 1.
 *
 * The round-trip is applied only to the date-only form: a datetime carrying a
 * UTC offset legitimately lands on a different UTC calendar day.
 */
const ISO_DATE_ONLY = /^(\d{4})-(\d{2})-(\d{2})$/;
const ISO_DATE_TIME = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?(?:Z|[+-]\d{2}:\d{2})?$/;

function isValidSchemaDate(value: string): boolean {
  const dateOnly = ISO_DATE_ONLY.exec(value);
  if (dateOnly) {
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return false;
    // A bare YYYY-MM-DD parses as UTC midnight, so the UTC components must
    // round-trip exactly. They do not when the day rolled over.
    return (
      parsed.getUTCFullYear() === Number(dateOnly[1]) &&
      parsed.getUTCMonth() + 1 === Number(dateOnly[2]) &&
      parsed.getUTCDate() === Number(dateOnly[3])
    );
  }
  if (ISO_DATE_TIME.test(value)) return !Number.isNaN(new Date(value).getTime());
  return false;
}

/**
 * Validate a date destined for JSON-LD. Returns the value to emit, or undefined
 * to omit the property.
 *
 * Omit-and-warn rather than throw ON PURPOSE: one caller feeds this straight
 * from markdown frontmatter (resources/[slug] passes `meta.updatedAt`, which
 * nothing validates), so throwing would take a live article page down over a
 * typo. Dropping the property keeps the markup valid and the page up, and the
 * warning makes the bad value loud in the build log.
 */
function validSchemaDate(value: unknown, pageUrl: string): string | undefined {
  if (value === undefined || value === null) return undefined;
  // gray-matter turns an UNQUOTED frontmatter date into a Date object, so this
  // can arrive as a Date despite the declared string type (articles.ts casts
  // with `as string`). Normalize it rather than dropping a legitimate date.
  if (value instanceof Date) {
    if (!Number.isNaN(value.getTime())) return value.toISOString();
  } else if (typeof value === "string" && isValidSchemaDate(value)) {
    return value;
  }
  console.warn(
    `[structured-data] Dropped invalid dateModified ${JSON.stringify(String(value))} for ` +
      `${pageUrl}. Expected ISO 8601 (YYYY-MM-DD or a full datetime). Emitting it would ` +
      `ship invalid structured data, so the property was omitted.`,
  );
  return undefined;
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
  // Reference the Person node by @id instead of inlining a second Kelsey. A `url`
  // does NOT establish node identity, so an inline Person is an anonymous node:
  // the founder relationship would never resolve to the authoritative
  // /about#kelsey Person that carries worksFor, sameAs and knowsAbout. Same
  // reference-by-@id idiom as worksFor, brand and publisher below.
  founder: { "@id": `${SITE_URL}/about#kelsey` },
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
  // sameAs is IDENTITY EVIDENCE, so #business and #kelsey carry DISJOINT sets.
  // These lists were previously identical, which told crawlers that two
  // deliberately distinct @id nodes were the same entity. Waypoint-branded
  // channels belong here; Kelsey's personal profiles belong on the Person.
  // Do not re-merge them.
  //
  // Note: there is no Waypoint-branded Facebook page, so the business
  // intentionally carries no Facebook signal. facebook.com/kelsey.stuart.94 is a
  // personal profile and is not identity evidence for the business.
  sameAs: [
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
  // Portrait: gives the Person node a visual entity anchor. Folded in from the
  // duplicate Person that /about used to hand-roll under this same @id.
  image: `${SITE_URL}/images/kelsey-trail-selfie.jpg`,
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
  // Kelsey's PERSONAL profiles only. The Waypoint-branded channels live on
  // #business. See the note on localBusinessSchema.sameAs: these two lists are
  // deliberately disjoint and must not be re-merged.
  sameAs: [
    "https://www.linkedin.com/in/kelsey-stuart-014b7b50/",
    "https://www.franchoice.com/kelsey-stuart",
    "https://www.facebook.com/kelsey.stuart.94",
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
    "SBA franchise financing",
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
  // Reference-by-@id only, matching `brand` below and `founder` on #business.
  // Re-stating @type/name here was harmless (it merged cleanly) but it is one
  // more place a future edit could let the Person's details drift.
  provider: { "@id": `${SITE_URL}/about#kelsey` },
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
  dateModified,
}: {
  url: string;
  name: string;
  description: string;
  breadcrumb?: ReturnType<typeof breadcrumbSchema>;
  mainEntityId?: string;
  primaryImage?: string;
  /**
   * ISO date this page's substance was last reviewed. Optional because most
   * pages are evergreen, but a page whose value IS its currency (cost figures,
   * loan terms) should emit it: articles carry dateModified and these landing
   * pages did not, so nothing told a crawler the numbers were still current.
   */
  dateModified?: string;
}) {
  const canonical = toWww(url);
  const validDateModified = validSchemaDate(dateModified, canonical);
  return {
    "@type": "WebPage",
    "@id": fragmentId(canonical, "#webpage"),
    url: canonical,
    name,
    description,
    isPartOf: { "@id": `${SITE_URL}/#website` },
    inLanguage: "en-US",
    ...(validDateModified ? { dateModified: validDateModified } : {}),
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
