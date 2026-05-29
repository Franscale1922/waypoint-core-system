export const SITE_URL = "https://www.waypointfranchise.com";

export const localBusinessSchema = {
  "@context": "https://schema.org",
  "@type": "LocalBusiness",
  "@id": `${SITE_URL}/#business`,
  name: "Waypoint Franchise Advisors",
  description:
    "Free franchise consulting from Kelsey Stuart, former Bloomin' Blinds franchisor. We match burned-out professionals to franchise opportunities that fit their life, capital, and goals.",
  url: SITE_URL,
  // Real brand/portrait assets in /public — gives Google and AI a visual entity
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
  aggregateRating: {
    "@type": "AggregateRating",
    ratingValue: "5.0",
    reviewCount: "47",
    bestRating: "5",
    worstRating: "1",
  },
  review: [
    {
      "@type": "Review",
      author: { "@type": "Person", name: "Marcus T." },
      reviewRating: { "@type": "Rating", ratingValue: "5", bestRating: "5" },
      reviewBody:
        "He didn't show me a single franchise until he had spent two hours understanding what I actually wanted.",
    },
    {
      "@type": "Review",
      author: { "@type": "Person", name: "James P." },
      reviewRating: { "@type": "Rating", ratingValue: "5", bestRating: "5" },
      reviewBody:
        "Kelsey never pushed me toward anything. He helped me put together a plan so that by the time I leave corporate, the business will already be running.",
    },
    {
      "@type": "Review",
      author: { "@type": "Person", name: "Tom W." },
      reviewRating: { "@type": "Rating", ratingValue: "5", bestRating: "5" },
      reviewBody:
        "I came in with a list of brands I'd already researched. Kelsey set the list aside and showed me something I'd never considered. Six months after that call I opened my doors.",
    },
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

export const scorecardFaqSchema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "How much capital do I need to buy a franchise?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "It depends on the franchise. Many solid concepts start under $150K in liquid capital. The quiz helps identify which investment ranges match your profile.",
      },
    },
    {
      "@type": "Question",
      name: "Is the franchise readiness quiz free?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Yes, the quiz and all consulting services through Waypoint are 100% free to candidates. Franchise brands pay the referral fee, not you.",
      },
    },
    {
      "@type": "Question",
      name: "What happens after I complete the quiz?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "You get a personalized readiness score. From there you can book a free 30-minute call with Kelsey to discuss your results and explore franchise concepts that match your profile.",
      },
    },
    {
      "@type": "Question",
      name: "Do I need prior business experience to buy a franchise?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "No. Many of the best franchise owners come from corporate backgrounds with no prior business ownership. The quiz accounts for your experience level when generating your score.",
      },
    },
  ],
};

export const franchiseConsultingServiceSchema = {
  "@context": "https://schema.org",
  "@type": "Service",
  "@id": `${SITE_URL}/#service`,
  name: "Franchise Consulting",
  alternateName: "Free Franchise Advisory",
  description:
    "Free, personalized franchise consulting for corporate professionals and career changers. Kelsey Stuart evaluates your capital, goals, and life situation, then curates 3–4 franchise concepts that fit. No pitch, no pressure. Brands pay the referral fee — candidates pay nothing.",
  url: `${SITE_URL}/process`,
  serviceType: "Franchise Consulting",
  provider: {
    "@type": "Person",
    "@id": `${SITE_URL}/about#kelsey`,
    name: "Kelsey Stuart",
  },
  brand: {
    "@type": "Brand",
    "@id": `${SITE_URL}/#business`,
    name: "Waypoint Franchise Advisors",
  },
  areaServed: {
    "@type": "Country",
    name: "United States",
  },
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "USD",
    description:
      "Franchise consulting is 100% free to candidates. Franchise brands pay the referral fee at purchase — your cost does not change whether you come through Waypoint or go direct.",
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
 * spoken content is available. Never fabricate spoken words — an inaccurate
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
