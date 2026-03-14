export const SITE_URL = "https://waypointfranchise.com";

export const localBusinessSchema = {
  "@context": "https://schema.org",
  "@type": "LocalBusiness",
  "@id": `${SITE_URL}/#business`,
  name: "Waypoint Franchise Advisors",
  description:
    "Free franchise consulting from Kelsey Stuart, former Bloomin' Blinds franchisor. We match burned-out professionals to franchise opportunities that fit their life, capital, and goals.",
  url: SITE_URL,
  email: "kelsey@waypointfranchise.com",
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
  sameAs: [
    "https://www.linkedin.com/in/kelseystuart/",
    "https://www.franchoice.com/kelsey-stuart",
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
  address: {
    "@type": "PostalAddress",
    addressLocality: "Whitefish",
    addressRegion: "MT",
    addressCountry: "US",
  },
  worksFor: { "@id": `${SITE_URL}/#business` },
  sameAs: [
    "https://www.linkedin.com/in/kelseystuart/",
    "https://www.franchoice.com/kelsey-stuart",
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
