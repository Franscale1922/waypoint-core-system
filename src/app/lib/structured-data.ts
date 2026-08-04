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
 * The calendar round-trip applies to BOTH forms. An earlier version checked only
 * the date-only form on the theory that an offset datetime legitimately lands on
 * another UTC day. That reasoning was wrong: the offset shifts the INSTANT, not
 * the day named in the string, and "2026-02-30T12:00:00Z" rolls over to March 2
 * exactly as the bare date does. Validating the named Y-M-D separately from the
 * time keeps both correct.
 */
const ISO_DATE_ONLY = /^(\d{4})-(\d{2})-(\d{2})$/;

/**
 * Build the datetime pattern once, with the trailing timezone designator either
 * optional or required. Two callers need the identical Y-M-D capture shape and
 * differ ONLY in whether that offset may be omitted:
 *
 *   isValidSchemaDate   optional, because a schema.org Date/DateTime accepts both
 *   isVideoUploadDate   required, because Google reads VideoObject.uploadDate as
 *                       an instant and flags a value with no timezone
 *
 * Written as one source rather than two literals differing by a single "?": a
 * later fix applied to one copy and not the other is exactly the drift this
 * avoids, and it would be invisible until a date shipped wrong.
 */
function isoDateTimePattern(timezone: "required" | "optional"): RegExp {
  const tz = `(?:Z|[+-]\\d{2}:\\d{2})${timezone === "optional" ? "?" : ""}`;
  return new RegExp(`^(\\d{4})-(\\d{2})-(\\d{2})T\\d{2}:\\d{2}(?::\\d{2}(?:\\.\\d+)?)?${tz}$`);
}

const ISO_DATE_TIME = isoDateTimePattern("optional");
const ISO_DATE_TIME_TZ = isoDateTimePattern("required");

/** True when Y-M-D name a real calendar day, catching the silent rollover. */
function isRealCalendarDay(year: string, month: string, day: string): boolean {
  const parsed = new Date(`${year}-${month}-${day}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime())) return false;
  return (
    parsed.getUTCFullYear() === Number(year) &&
    parsed.getUTCMonth() + 1 === Number(month) &&
    parsed.getUTCDate() === Number(day)
  );
}

/**
 * Both gates a matched datetime still has to clear. `new Date()` DOES reject an
 * out-of-range time (25:00, 12:60) but silently rolls over an out-of-range DAY,
 * so neither check alone is sufficient.
 */
function isRealDateTime(match: RegExpExecArray, value: string): boolean {
  return (
    !Number.isNaN(new Date(value).getTime()) &&
    isRealCalendarDay(match[1], match[2], match[3])
  );
}

function isValidSchemaDate(value: string): boolean {
  const dateOnly = ISO_DATE_ONLY.exec(value);
  if (dateOnly) return isRealCalendarDay(dateOnly[1], dateOnly[2], dateOnly[3]);
  const dateTime = ISO_DATE_TIME.exec(value);
  if (dateTime) return isRealDateTime(dateTime, value);
  return false;
}

/**
 * Validate a date destined for JSON-LD. Returns the value to emit, or undefined
 * to omit the property.
 *
 * Exported because most date-bearing nodes are hand-rolled at the page rather
 * than built by the factories here: resources/[slug] and the 2026 report both
 * assemble their own Article node. The article path is also the ONLY one fed by
 * unvalidated input (markdown frontmatter), so a validator the factories keep to
 * themselves would miss the single case that actually matters.
 *
 * Omit-and-warn rather than throw ON PURPOSE: that same article path is rendered
 * per-request, so throwing would take a live page down over one frontmatter typo.
 * Dropping the property keeps the markup valid and the page up, and the warning
 * makes the bad value loud in the build log.
 */
export function schemaDate(
  value: unknown,
  context: string,
  { required = false }: { required?: boolean } = {},
): string | undefined {
  if (value === undefined || value === null) {
    // Absence is normal for an OPTIONAL date (most pages are evergreen and carry
    // no dateModified), so staying silent there keeps the build log usable. A
    // required date is a different event and must not be silent: an Article
    // missing datePublished loses rich-result eligibility with no other signal.
    if (required) {
      console.warn(
        `[structured-data] Missing REQUIRED date for ${context}. The node ships without it, ` +
          `which costs rich-result eligibility. Add the date to the source frontmatter.`,
      );
    }
    return undefined;
  }
  if (typeof value === "string" && isValidSchemaDate(value)) return value;

  // A Date here means the YAML frontmatter date was UNQUOTED, and it is
  // deliberately REJECTED rather than normalized. js-yaml has already applied
  // its own rollover by this point: unquoted 2026-02-30 arrives as March 2 and
  // 2026-13-01 as January 2027, with the authored value unrecoverable. Accepting
  // it would launder a corrupted date into published metadata, silently and with
  // no way to detect it downstream. Rejecting costs nothing today (every article
  // quotes its dates) and the fix is one keystroke.
  if (value instanceof Date) {
    console.warn(
      `[structured-data] Dropped an UNQUOTED frontmatter date for ${context}. YAML parsed it ` +
        `into a Date and already rolled over any impossible day (2026-02-30 becomes March 2), ` +
        `so the authored value cannot be recovered or checked. Quote the date in frontmatter, ` +
        `e.g. date: "2026-02-28".`,
    );
    return undefined;
  }

  console.warn(
    `[structured-data] Dropped invalid date ${JSON.stringify(String(value))} for ` +
      `${context}. Expected ISO 8601 (YYYY-MM-DD or a full datetime). Emitting it would ` +
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
 * Accept ONLY a timezone-qualified ISO 8601 datetime, for VideoObject.uploadDate.
 *
 * schemaDate is deliberately NOT reused here even though it validates dates: it
 * also accepts a bare YYYY-MM-DD, which is a perfectly good schema.org Date but
 * the wrong thing for a video. Google reads uploadDate as an instant and flags a
 * value carrying no time and no timezone, so a date-only value silently costs
 * the rich result the property was added to earn. Otherwise the gates are the
 * same two isValidSchemaDate applies.
 */
function isVideoUploadDate(value: unknown): value is string {
  if (typeof value !== "string") return false;
  const match = ISO_DATE_TIME_TZ.exec(value);
  return match !== null && isRealDateTime(match, value);
}

/**
 * Return an absolute http(s) URL in its normalized form, or undefined.
 *
 * Parsed with the WHATWG URL parser rather than pattern-matched, for two
 * reasons. A regex tight enough to be meaningful rejects legitimate URLs: the
 * live Vimeo thumbnail this site depends on carries a "?region=us" query string,
 * and refusing it would take the only VideoObject on the site off the page. And
 * the parser is what actually settles the scheme, so a "javascript:" URL and a
 * bare relative path are both refused by the same gate rather than by extra
 * special cases.
 *
 * It returns the parsed `href` rather than a boolean because the parser is
 * LENIENT about things it then fixes: it strips surrounding whitespace and
 * percent-encodes a literal space, so `" https://cdn.example/thumb 1.jpg "`
 * validates as a URL whose href is clean. Answering only yes/no and then
 * emitting the caller's original string would ship exactly the raw, unencoded
 * value the check just approved. Emit what was validated, not what was passed.
 * The three live URLs round-trip through this byte-identically.
 */
function absoluteHttpUrl(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  try {
    const parsed = new URL(value);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return undefined;
    return parsed.href;
  } catch {
    return undefined;
  }
}

/**
 * True for an ISO 8601 duration, the form schema.org expects for
 * VideoObject.duration (e.g. PT3M30S).
 *
 * The two (?!$) lookaheads carry the whole weight of this pattern. Every
 * component group is optional, so without them a bare "P" or "PT" matches and
 * ships as a duration with no duration in it.
 *
 * The week form is a separate ALTERNATIVE, not another optional group. ISO 8601
 * does not allow PnW to combine with calendar or time components, so folding it
 * into the sequence accepts "P1W1D", which no consumer is obliged to parse.
 *
 * Minutes are deliberately NOT capped at 59: a 90-minute video is legitimately
 * PT90M0S, which is exactly what the about page's own secondsToISO8601 emits.
 * Lowercase is rejected rather than upcased, matching how schemaDate treats an
 * unquoted date. Normalizing input here would hide the authoring mistake instead
 * of reporting it.
 */
const ISO_DURATION =
  /^P(?:\d+W|(?!$)(?:\d+Y)?(?:\d+M)?(?:\d+D)?(?:T(?!$)(?:\d+H)?(?:\d+M)?(?:\d+(?:[.,]\d+)?S)?)?)$/;

function iso8601Duration(value: unknown): string | undefined {
  return typeof value === "string" && ISO_DURATION.test(value) ? value : undefined;
}

/** A required string property is only satisfied by actual, non-blank text. */
function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

/** The normalizer form of isNonEmptyString, for the optional-property table. */
function nonEmptyText(value: unknown): string | undefined {
  return isNonEmptyString(value) ? value : undefined;
}

/**
 * Describe a bad value in a warning without dumping a whole transcript into the
 * build log. A Date is called out by name because it means something specific:
 * the YAML frontmatter was UNQUOTED, so js-yaml already rolled over any
 * impossible day and the authored value is unrecoverable, exactly as in
 * schemaDate.
 */
function describeBadValue(value: unknown): string {
  if (value === undefined) return "missing";
  if (value instanceof Date) return "an UNQUOTED frontmatter date (quote it, e.g. uploadDate: \"2026-03-17T01:57:41Z\")";
  const asText = typeof value === "string" ? value : String(value);
  return JSON.stringify(asText.length > 80 ? `${asText.slice(0, 80)}...` : asText);
}

/**
 * VideoObject schema factory. Returns the node, or undefined when the video
 * cannot be described validly.
 *
 * Google requires `name`, `description`, `thumbnailUrl`, and `uploadDate` for a
 * video to be eligible for video rich results and AI/Ask-YouTube surfacing. Any
 * one of those being invalid drops the WHOLE node: a VideoObject missing a
 * required field earns no rich result anyway, so emitting a partial one adds
 * invalid markup to the page and buys nothing. An invalid OPTIONAL field drops
 * only that property, because the rest of the node is still eligible.
 *
 * Every field is re-checked at runtime despite the types below, because the
 * article path reaches here through an `as ArticleVideo` cast over markdown
 * frontmatter (src/lib/articles.ts). The declared types are a compile-time
 * convenience for well-typed callers, not a guarantee about what arrives.
 *
 * Omit-and-warn rather than throw, for the same reason as schemaDate. The
 * article route is statically generated, so a warning lands in the build log
 * where it is seen; the about page revalidates hourly against the Vimeo API, so
 * throwing would break an ISR revalidation over a third-party hiccup.
 *
 * IMPORTANT: pass `transcript` ONLY when a real, verified transcript of the
 * spoken content is available. Never fabricate spoken words; an inaccurate
 * transcript misrepresents what was said and breaks trust/E-E-A-T.
 */
export function videoObjectSchema(
  {
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
  },
  context = "an unnamed page",
) {
  // Collect every required failure before warning, so one bad frontmatter block
  // produces one actionable warning naming all of them rather than a drip of
  // four that each look like a separate problem.
  const required: string[] = [];
  const normalizedThumbnail = absoluteHttpUrl(thumbnailUrl);
  if (!isNonEmptyString(name)) required.push(`name: ${describeBadValue(name)}`);
  if (!isNonEmptyString(description)) required.push(`description: ${describeBadValue(description)}`);
  if (normalizedThumbnail === undefined) {
    required.push(`thumbnailUrl: ${describeBadValue(thumbnailUrl)} (need an absolute http(s) URL)`);
  }
  if (!isVideoUploadDate(uploadDate)) {
    required.push(
      `uploadDate: ${describeBadValue(uploadDate)} (need a timezone-qualified ISO 8601 ` +
        `datetime, e.g. 2026-03-17T01:57:41Z; a bare date is not enough)`,
    );
  }
  if (required.length > 0) {
    console.warn(
      `[structured-data] Dropped the entire VideoObject for ${context}. Google requires name, ` +
        `description, thumbnailUrl and uploadDate, and these are invalid: ${required.join("; ")}. ` +
        `A partial VideoObject earns no rich result, so the node was omitted rather than ` +
        `shipped invalid.`,
    );
    return undefined;
  }
  // Unreachable: an undefined thumbnail always populates `required` above. It is
  // restated because TypeScript cannot infer that from the length check, and the
  // emitted node must use the NORMALIZED url rather than the raw argument.
  if (normalizedThumbnail === undefined) return undefined;

  // Optional properties degrade one at a time: an unusable duration should not
  // cost the video its eligibility, but it should not ship as garbage either.
  // Typed with explicit optional keys rather than Record<string, string>: an
  // index signature would spread into the returned literal and collide with
  // `thumbnailUrl`, which is a string ARRAY.
  const optional: {
    duration?: string;
    embedUrl?: string;
    contentUrl?: string;
    transcript?: string;
  } = {};
  // Every checker is a NORMALIZER rather than a predicate, so what gets emitted
  // is always the value that was validated. See absoluteHttpUrl: answering
  // yes/no and then emitting the caller's original string would ship raw,
  // unencoded input that the check had silently cleaned up before approving.
  const addOptional = (
    key: "duration" | "embedUrl" | "contentUrl" | "transcript",
    value: unknown,
    normalize: (candidate: unknown) => string | undefined,
    expectation: string,
  ) => {
    if (value === undefined || value === null) return;
    const normalized = normalize(value);
    if (normalized !== undefined) {
      optional[key] = normalized;
      return;
    }
    console.warn(
      `[structured-data] Dropped the optional VideoObject property "${key}" for ${context}: ` +
        `${describeBadValue(value)} is not ${expectation}. The rest of the node still ships.`,
    );
  };
  addOptional("duration", duration, iso8601Duration, "an ISO 8601 duration (e.g. PT3M30S)");
  addOptional("embedUrl", embedUrl, absoluteHttpUrl, "an absolute http(s) URL");
  addOptional("contentUrl", contentUrl, absoluteHttpUrl, "an absolute http(s) URL");
  addOptional("transcript", transcript, nonEmptyText, "non-empty text");

  return {
    "@context": "https://schema.org",
    "@type": "VideoObject",
    name,
    description,
    thumbnailUrl: [normalizedThumbnail],
    uploadDate,
    ...optional,
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
 *
 * Nullish nodes are ACCEPTED and filtered out. Node factories that validate
 * their input return undefined when the input cannot be described validly
 * (videoObjectSchema does), and destructuring that undefined here would turn one
 * bad optional field into a page or build failure. Callers used to guard at
 * every call site instead, which works only for as long as every future caller
 * remembers to. Dropping silently is right because the factory has already
 * warned about the specific field it rejected.
 */
export function jsonLdGraph(...nodes: (JsonLdNode | null | undefined)[]) {
  return {
    "@context": "https://schema.org",
    "@graph": nodes.filter((node): node is JsonLdNode => node != null).map((node) => {
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
  const validDateModified = schemaDate(dateModified, canonical);
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
 * Filter a raw FAQ list down to the entries that can be described validly,
 * warning about each one dropped.
 *
 * EXPORTED because the article route needs the same surviving set for its
 * VISIBLE FAQ as for its markup. Google only honours FAQPage markup whose Q&A is
 * present on the page, so filtering the schema alone would emit questions the
 * reader cannot see; and the visible render destructures these entries too, so
 * filtering the schema alone would still crash the page on a null entry. One
 * filter, both consumers.
 *
 * Article FAQs arrive from markdown frontmatter through an `as` cast
 * (src/lib/articles.ts), so the declared type is a compile-time convenience, not
 * a guarantee. A list item written as a bare string instead of a `{q, a}`
 * mapping, or a stray `-` that YAML parses as null, reaches here as data.
 *
 * Drops the ENTRY, not the whole node: one malformed Q&A should not cost a page
 * the rest of its valid ones. Contrast videoObjectSchema, where a missing
 * required field drops everything, because a partial VideoObject earns no rich
 * result at all whereas a shorter FAQ list is still perfectly eligible.
 */
export function validFaqEntries(
  items: { q: string; a: string }[] | null | undefined,
  context = "an unnamed page",
): { q: string; a: string }[] {
  if (!Array.isArray(items)) {
    // undefined/null is how callers say "no FAQs here", which is not a defect.
    // Anything else is a frontmatter shape mistake worth naming.
    if (items != null) {
      console.warn(
        `[structured-data] Ignored a non-array FAQ list for ${context}: ${describeBadValue(items)}. ` +
          `Expected a YAML list of {q, a} mappings.`,
      );
    }
    return [];
  }

  const valid: { q: string; a: string }[] = [];
  items.forEach((entry, index) => {
    // Position is included in every warning because a frontmatter FAQ list has
    // no other stable identifier, and a dropped entry with an unusable `q` has
    // nothing quotable to point the author at.
    if (entry == null || typeof entry !== "object" || Array.isArray(entry)) {
      console.warn(
        `[structured-data] Dropped FAQ entry ${index} for ${context}: ${describeBadValue(entry)} is not ` +
          `a {q, a} mapping. A list item written as a bare string (- "Can I finance this?") or a ` +
          `stray "-" parses this way. The other entries still ship.`,
      );
      return;
    }

    const { q, a } = entry as { q?: unknown; a?: unknown };
    // Collect both failures before warning, so an entry missing everything
    // produces one actionable warning rather than two that look unrelated.
    const bad: string[] = [];
    if (!isNonEmptyString(q)) bad.push(`q: ${describeBadValue(q)}`);
    if (!isNonEmptyString(a)) bad.push(`a: ${describeBadValue(a)}`);
    if (bad.length > 0) {
      console.warn(
        `[structured-data] Dropped FAQ entry ${index} for ${context}. A Question needs non-empty ` +
          `q and a, and these are invalid: ${bad.join("; ")}. Emitting it would put a Question with ` +
          `no name, or an Answer with no text, into the markup. The other entries still ship.`,
      );
      return;
    }
    // Unreachable: both pushes above already guarantee these are strings. It is
    // restated because TypeScript cannot infer that from the length check.
    if (!isNonEmptyString(q) || !isNonEmptyString(a)) return;
    valid.push({ q, a });
  });
  return valid;
}

/**
 * FAQPage node built from a flat {q,a}[] array: the one shape used everywhere FAQ
 * content appears (articles, the FAQ page, scorecard, comparison, financing, and
 * the industry/category pages). Returns a node WITHOUT `@context` so it composes
 * inside `jsonLdGraph(...)`, or undefined when no valid entry survives.
 *
 * Pass `url` (the page's canonical) to anchor the node in the graph with a stable
 * `@id` + `isPartOf #website` + `inLanguage`. Always pass it for page-level FAQs so
 * the FAQPage isn't a floating, unlinked node. The visible on-page FAQ MUST be
 * rendered from the same array (Google requires the Q&A to be present on the page);
 * where that array is untrusted, render it from validFaqEntries so the two agree.
 *
 * `context` names the page in warnings. It defaults to `url`, which is already a
 * precise locator for the eleven callers that pass one; the article route passes
 * its slug because its FAQs come from frontmatter and the author needs naming.
 */
export function faqPageSchema(
  items: { q: string; a: string }[],
  url?: string,
  context?: string,
) {
  const where = context ?? url ?? "an unnamed page";
  const entries = validFaqEntries(items, where);
  if (entries.length === 0) {
    const received = Array.isArray(items) ? items.length : 0;
    console.warn(
      `[structured-data] Dropped the entire FAQPage for ${where}: no valid {q, a} entries survived ` +
        `(received ${received}). An FAQPage whose mainEntity is empty is itself invalid markup, so ` +
        `the node was omitted rather than shipped hollow.`,
    );
    return undefined;
  }
  const node: Record<string, unknown> = {
    "@type": "FAQPage",
    mainEntity: entries.map(({ q, a }) => ({
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
