import type { Metadata } from "next";
import Link from "next/link";

const glossarySchema = {
  "@context": "https://schema.org",
  "@type": "DefinedTermSet",
  name: "Franchise Glossary — Waypoint Franchise Advisors",
  description:
    "Plain-language definitions of franchise industry terms for prospective franchise buyers, including FDD, royalty, territory, Item 19, discovery day, and more.",
  url: "https://waypointfranchise.com/glossary",
  publisher: {
    "@type": "Organization",
    "@id": "https://waypointfranchise.com/#business",
    name: "Waypoint Franchise Advisors",
  },
};

export const metadata: Metadata = {
  title: "Franchise Glossary: Key Terms Explained | Waypoint Franchise Advisors",
  description:
    "Plain-language definitions of franchise terms every buyer should know: FDD, franchise fee, royalty, territory, Item 19, discovery day, validation calls, ROBS, and more.",
  alternates: { canonical: "https://waypointfranchise.com/glossary" },
  openGraph: {
    title: "Franchise Glossary | Waypoint Franchise Advisors",
    description:
      "Every term a franchise buyer needs to understand, explained in plain language. No jargon.",
    url: "https://waypointfranchise.com/glossary",
    images: [{ url: "/og_default_1773343895292.png", width: 1200, height: 630, alt: "Franchise Glossary" }],
  },
};

const terms = [
  {
    letter: "D",
    entries: [
      {
        term: "Discovery Day",
        definition:
          "An invitation-only event where serious franchise candidates visit the franchisor's headquarters to meet the leadership team, tour operations, and ask questions before making a final decision. Discovery Day usually occurs near the end of the evaluation process and is not a sales pitch — it is a mutual assessment. Candidates evaluate the team; the team evaluates whether the candidate is the right fit for the system.",
        related: "/resources/what-to-expect-at-discovery-day",
        relatedLabel: "What to expect at discovery day",
      },
      {
        term: "Disclosure Document",
        definition:
          "See Franchise Disclosure Document (FDD). Federal law requires every franchisor to provide this document to prospective franchisees at least 14 calendar days before any agreement is signed or any money changes hands.",
        related: "/resources/fdd-decoded-what-actually-matters",
        relatedLabel: "FDD decoded: what actually matters",
      },
    ],
  },
  {
    letter: "F",
    entries: [
      {
        term: "Franchise Agreement",
        definition:
          "The legal contract between a franchisor and franchisee that governs the operating relationship for the term of the franchise (typically 10 years with renewal options). It covers territory rights, royalty obligations, operating standards, transfer rules, and termination conditions. Unlike the FDD, the franchise agreement is the binding document — what is in it governs, not what was said in conversation.",
        related: "/resources/the-franchise-agreement-what-you-can-and-cant-negotiate",
        relatedLabel: "What you can and can't negotiate",
      },
      {
        term: "Franchise Disclosure Document (FDD)",
        definition:
          "A federally mandated document, typically 200–400 pages, that every franchisor must provide to prospective buyers before any agreement or payment. Organized into 23 items, it covers the franchisor's history, leadership team, litigation history, fees, investment requirements, territory rights, franchisee obligations, financial performance data (optional, Item 19), and a contact list of all current franchisees. Reading the FDD — especially Items 5, 6, 7, 19, and 20 — is one of the most important steps in franchise due diligence.",
        related: "/resources/fdd-decoded-what-actually-matters",
        relatedLabel: "FDD decoded: what actually matters",
      },
      {
        term: "Franchise Fee",
        definition:
          "A one-time upfront payment to the franchisor, typically $20,000–$60,000, made at the time of signing the franchise agreement. It grants the franchisee the right to operate under the brand's system, intellectual property, and territory. The franchise fee does not cover build-out, equipment, working capital, or ongoing royalties. It is defined in FDD Item 5.",
        related: "/investment",
        relatedLabel: "Full franchise investment guide",
      },
      {
        term: "Franchisee",
        definition:
          "The independent business owner who purchases the rights to operate a franchise unit under the franchisor's brand and system. A franchisee owns their business — the assets, the operations, the employees — but operates within the standards and guidelines set by the franchisor.",
        related: null,
        relatedLabel: null,
      },
      {
        term: "Franchisor",
        definition:
          "The company that licenses its brand, systems, and intellectual property to franchisees in exchange for fees and royalties. The franchisor sets operating standards, provides training and support, manages the national brand, and is responsible for the strength of the system overall. Not all franchisors are equal in their support quality.",
        related: "/resources/how-to-tell-if-a-franchisor-actually-cares",
        relatedLabel: "How to tell if a franchisor actually cares",
      },
      {
        term: "FranChoice",
        definition:
          "One of the largest franchise consulting and advisory networks in the United States, with hundreds of independent franchise advisors who work with candidates nationwide. FranChoice advisors — including Kelsey Stuart at Waypoint Franchise Advisors — are paid by franchise brands when a candidate they represent becomes a franchisee. The service is free to candidates.",
        related: "/about",
        relatedLabel: "About Kelsey and Waypoint",
      },
    ],
  },
  {
    letter: "I",
    entries: [
      {
        term: "Item 19",
        definition:
          "The section of the FDD where franchisors may voluntarily disclose financial performance data — revenue, expenses, and in some cases earnings — for existing units in their system. Item 19 disclosure is not required, but its absence is itself informative: franchisors who do not disclose financial data in Item 19 are worth questioning about why. When Item 19 data exists, it requires careful reading — averages across large systems can mask significant variation between top and bottom performers.",
        related: "/resources/fdd-decoded-what-actually-matters",
        relatedLabel: "FDD decoded: what actually matters",
      },
      {
        term: "Item 20",
        definition:
          "The section of the FDD that lists every current franchisee in the system — by name, location, and contact information. This is the most underused tool in franchise due diligence. Calling franchisees directly (not just the ones the franchisor refers you to) is one of the most reliable ways to understand what it is actually like to operate that business.",
        related: "/resources/fdd-decoded-what-actually-matters",
        relatedLabel: "FDD decoded: what actually matters",
      },
      {
        term: "Initial Investment",
        definition:
          "The total estimated cost to open and begin operating a franchise unit, as disclosed in FDD Item 7. It includes the franchise fee, build-out, equipment, initial inventory, working capital, training costs, and pre-opening expenses. Ranges vary widely by category — from under $100,000 for home-based service concepts to $500,000+ for full brick-and-mortar locations.",
        related: "/investment",
        relatedLabel: "Full franchise investment guide",
      },
    ],
  },
  {
    letter: "M",
    entries: [
      {
        term: "Marketing Fund",
        definition:
          "A mandatory ongoing contribution — typically 1%–3% of gross revenue — paid by franchisees into a shared pool used for national or regional brand advertising. The marketing fund is separate from the royalty. How it is managed and how the spend is reported varies significantly by brand.",
        related: "/investment",
        relatedLabel: "Full cost breakdown",
      },
      {
        term: "Multi-Unit Franchise",
        definition:
          "An ownership structure where a franchisee operates two or more units under the same brand, either within a single territory or across multiple territories. Multi-unit agreements sometimes include development schedules (a timeline by which additional units must be opened) and often involve discounted fees.",
        related: "/resources/one-unit-or-multi-unit-what-first-timers-get-wrong",
        relatedLabel: "One unit or multi-unit: what first-timers get wrong",
      },
    ],
  },
  {
    letter: "R",
    entries: [
      {
        term: "ROBS (Rollover for Business Startups)",
        definition:
          "A legal financing structure that allows business owners to use 401(k) or other qualified retirement funds to invest in a business without triggering early withdrawal penalties or income taxes. ROBS requires setting up a C-corporation and following strict IRS compliance rules. It is a legitimate and common franchise financing tool when structured properly by a qualified provider.",
        related: "/resources/how-franchise-funding-actually-works",
        relatedLabel: "How franchise funding actually works",
      },
      {
        term: "Royalty",
        definition:
          "An ongoing fee paid by the franchisee to the franchisor — typically 4%–8% of gross revenue, paid weekly or monthly — in exchange for continued use of the brand, systems, and support infrastructure. Royalties are defined in FDD Item 6 and continue for the full term of the franchise agreement. The royalty rate, combined with the marketing fund, represents the franchisee's total ongoing cost of brand affiliation.",
        related: "/investment",
        relatedLabel: "Full franchise cost breakdown",
      },
    ],
  },
  {
    letter: "S",
    entries: [
      {
        term: "SBA Loan (Small Business Administration)",
        definition:
          "A federally backed loan program commonly used to finance franchise purchases. The SBA 7(a) program is the most widely used in franchising, allowing borrowers to finance up to 90% of the total project cost with lower down payments and longer repayment terms than conventional business loans. Approval depends on the borrower's credit, equity injection, and in some cases whether the franchise brand is already on the SBA's pre-approved Franchise Registry.",
        related: "/resources/how-franchise-funding-actually-works",
        relatedLabel: "How franchise funding actually works",
      },
      {
        term: "Semi-Absentee Franchise",
        definition:
          "A franchise model designed to be operated by a manager rather than the owner full-time. The franchisee may work the business 10–20 hours per week, handling oversight, financials, and growth while a hired general manager handles day-to-day operations. Semi-absentee ownership typically requires a larger initial staff and more working capital, but it allows owners to remain in their current career while building a business.",
        related: "/resources/the-semi-absentee-franchise-real-talk",
        relatedLabel: "The semi-absentee franchise: real talk",
      },
    ],
  },
  {
    letter: "T",
    entries: [
      {
        term: "Territory",
        definition:
          "A defined geographic region — usually by zip codes, population thresholds, or county lines — within which a franchisee holds exclusive rights to operate under the brand. Territory definitions and enforcement vary significantly by brand. Some franchisors offer protected territories (competitors of the same brand cannot open nearby); some do not. Territory rights are defined in FDD Item 12.",
        related: "/resources/how-to-pick-a-franchise-territory",
        relatedLabel: "How to pick a franchise territory",
      },
    ],
  },
  {
    letter: "V",
    entries: [
      {
        term: "Validation Call",
        definition:
          "A conversation between a prospective franchisee and one or more existing franchise owners in the system, conducted without the franchisor present. Validation calls are typically arranged through the franchisor's development team, but serious candidates should also pick names directly from the Item 20 franchisee contact list. This is one of the most important steps in due diligence — existing owners have no incentive to oversell the opportunity and often share candid information about support quality, what the first year is really like, and where the brand falls short.",
        related: "/resources/fdd-decoded-what-actually-matters",
        relatedLabel: "FDD decoded: Item 20 explained",
      },
    ],
  },
];

export default function GlossaryPage() {
  return (
    <main className="bg-[#FAF8F4] text-[#0c1929]">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(glossarySchema) }}
      />

      {/* Hero */}
      <section className="pt-20 sm:pt-28 pb-12 sm:pb-16 px-6 border-b border-[#e8e0d0]">
        <div className="max-w-4xl mx-auto">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#c08b3e] mb-4">
            Franchise Glossary
          </p>
          <h1 className="font-playfair text-4xl sm:text-5xl text-[#0c1929] leading-tight mb-6 max-w-2xl">
            Franchise terms, explained plainly
          </h1>
          <p className="text-base text-[#4a4a3e] leading-relaxed max-w-xl">
            Every term you will encounter when evaluating a franchise — FDD, royalty, territory, Item 19, discovery day, ROBS, and more — defined in plain language without jargon. Last updated: March 2026.
          </p>
        </div>
      </section>

      {/* Alphabet nav */}
      <section className="border-b border-[#e8e0d0] bg-[#f0ede8] sticky top-0 z-20">
        <div className="max-w-4xl mx-auto px-6 py-3 flex gap-4 flex-wrap">
          {terms.map(({ letter }) => (
            <a
              key={letter}
              href={`#letter-${letter}`}
              className="text-xs font-semibold text-[#c08b3e] hover:text-[#0c1929] transition-colors tracking-wider"
            >
              {letter}
            </a>
          ))}
        </div>
      </section>

      {/* Terms */}
      <section className="max-w-4xl mx-auto px-6 py-12 sm:py-16 space-y-14">
        {terms.map(({ letter, entries }) => (
          <div key={letter} id={`letter-${letter}`}>
            <div className="flex items-center gap-4 mb-8">
              <span className="font-playfair text-4xl text-[#d4a55a]/40 leading-none">{letter}</span>
              <div className="flex-1 h-px bg-[#e8e0d0]" />
            </div>
            <div className="space-y-8">
              {entries.map(({ term, definition, related, relatedLabel }) => (
                <div key={term} className="grid sm:grid-cols-[200px_1fr] gap-4 sm:gap-8">
                  <div>
                    <h2 className="font-playfair text-lg text-[#0c1929] leading-snug">{term}</h2>
                  </div>
                  <div>
                    <p className="text-sm text-[#3a3a2e] leading-relaxed mb-3">{definition}</p>
                    {related && relatedLabel && (
                      <Link
                        href={related}
                        className="text-xs text-[#c08b3e] font-medium hover:text-[#d4a55a] transition-colors"
                      >
                        {relatedLabel} →
                      </Link>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </section>

      {/* CTA */}
      <section className="bg-[#0c1929] py-14 px-6 text-center">
        <p className="font-playfair text-2xl text-white mb-4">
          Know the terms. Now let&apos;s find the right fit.
        </p>
        <p className="text-white/70 mb-8 max-w-sm mx-auto text-sm leading-relaxed">
          Understanding the vocabulary is step one. A free 30-minute conversation with Kelsey is step two.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/book"
            className="inline-flex items-center justify-center px-8 py-4 text-sm font-semibold tracking-wide text-[#0c1929] bg-[#d4a55a] hover:bg-[#e2be80] rounded-lg transition-all min-h-[48px]"
          >
            Book a Free Call
          </Link>
          <Link
            href="/resources"
            className="inline-flex items-center justify-center px-8 py-4 text-sm font-semibold tracking-wide text-white border border-white/25 hover:bg-white/10 rounded-lg transition-all min-h-[48px]"
          >
            Browse Resources
          </Link>
          <a
            href="sms:+12149951062"
            className="inline-flex items-center justify-center gap-1.5 px-8 py-4 text-sm font-semibold tracking-wide text-white border border-white/25 hover:bg-white/10 rounded-lg transition-all min-h-[48px]"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>
            Text Me
          </a>
        </div>
      </section>
    </main>
  );
}
