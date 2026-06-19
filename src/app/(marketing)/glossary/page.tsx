import { terms } from "@/data/glossary";
import type { Metadata } from "next";
import Link from "next/link";
import { SITE_URL, jsonLdGraph, webPageSchema, breadcrumbSchema } from "../../lib/structured-data";
import JsonLd from "../../components/JsonLd";

const glossarySchema = {
  "@context": "https://schema.org",
  "@type": "DefinedTermSet",
  "@id": "https://www.waypointfranchise.com/glossary#glossary",
  name: "Franchise Glossary | Waypoint Franchise Advisors",
  description:
    "Plain-language definitions of franchise industry terms for prospective franchise buyers, including FDD items, royalty, territory, discovery day, ROBS, unit economics, semi-absentee, SBA loans, and more.",
  url: "https://www.waypointfranchise.com/glossary",
  publisher: {
    "@type": "Organization",
    "@id": "https://www.waypointfranchise.com/#business",
    name: "Waypoint Franchise Advisors",
  },
};

export const metadata: Metadata = {
  title: "Franchise Glossary: 90+ Key Terms Explained | Waypoint Franchise Advisors",
  description:
    "The most complete plain-language franchise glossary for buyers: FDD items 5–21, royalty, territory, Item 19, discovery day, ROBS, SBA loans, unit economics, semi-absentee, non-compete, transfer fee, and more.",
  alternates: {
    canonical: "https://www.waypointfranchise.com/glossary",
    types: { "text/markdown": "https://www.waypointfranchise.com/glossary.md" },
  },
  openGraph: {
    title: "Franchise Glossary | Waypoint Franchise Advisors",
    description:
      "Every term a franchise buyer needs to understand, explained in plain language. 90+ definitions from FDD to unit economics.",
    url: "https://www.waypointfranchise.com/glossary",
    images: [{ url: "/og/og-glossary.png", width: 1200, height: 630, alt: "Franchise Glossary: Plain-English Definitions | Waypoint" }],
  },
};



export default function GlossaryPage() {
  // Populate the DefinedTermSet with every term as a DefinedTerm entity, so each
  // definition is individually machine-readable (not just the container).
  const glossarySchemaWithTerms = {
    ...glossarySchema,
    hasDefinedTerm: terms.flatMap((group) =>
      group.entries.map((entry) => ({
        "@type": "DefinedTerm",
        name: entry.term,
        description: entry.definition,
        inDefinedTermSet: { "@id": "https://www.waypointfranchise.com/glossary#glossary" },
      })),
    ),
  };
  // Join the glossary into the site graph: a WebPage node (isPartOf #website) +
  // breadcrumb alongside the DefinedTermSet, all escaped via <JsonLd>.
  const glossaryGraph = jsonLdGraph(
    webPageSchema({
      url: `${SITE_URL}/glossary`,
      name: "Franchise Glossary | Waypoint Franchise Advisors",
      description:
        "Plain-language definitions of franchise industry terms for prospective franchise buyers.",
      breadcrumb: breadcrumbSchema([
        { name: "Home", url: SITE_URL },
        { name: "Glossary", url: `${SITE_URL}/glossary` },
      ]),
    }),
    glossarySchemaWithTerms,
  );
  return (
    <main className="bg-[#FAF8F4] text-[#0c1929]">
      <JsonLd data={glossaryGraph} />

      {/* Hero */}
      <section className="pt-20 sm:pt-28 pb-12 sm:pb-16 px-6 border-b border-[#e8e0d0]">
        <div className="max-w-4xl mx-auto">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#8E3012] mb-4">
            Franchise Glossary
          </p>
          <h1 className="font-playfair text-4xl sm:text-5xl text-[#0c1929] leading-tight mb-6 max-w-2xl">
            Franchise terms, explained plainly
          </h1>
          <p className="text-base text-[#4a4a3e] leading-relaxed max-w-xl">
            Every term you will encounter when evaluating a franchise: FDD items, royalty, territory, discovery day, ROBS, unit economics, non-compete clauses, and more, all defined in plain language without jargon. 90+ entries. Last updated: March 2026.
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
              className="text-xs font-semibold text-[#8E3012] hover:text-[#0c1929] transition-colors tracking-wider"
            >
              {letter}
            </a>
          ))}
        </div>
      </section>

      {/* Terms */}
      <section className="max-w-4xl mx-auto px-6 py-12 sm:py-16 space-y-14">
        {terms.map(({ letter, entries }) => (
          <div key={letter} id={`letter-${letter}`} style={{ scrollMarginTop: "100px" }}>
            <div className="flex items-center gap-4 mb-8">
              <span className="font-playfair text-4xl text-[#CC6535]/40 leading-none">{letter}</span>
              <div className="flex-1 h-px bg-[#e8e0d0]" />
            </div>
            <div className="space-y-8">
              {entries.map(({ term, definition, related, relatedLabel }) => (
                <div key={term} className="grid sm:grid-cols-[200px_1fr] gap-4 sm:gap-8 pl-4">
                  <div>
                    <h2 className="font-playfair text-lg text-[#0c1929] leading-snug">{term}</h2>
                  </div>
                  <div>
                    <p className="text-sm text-[#3a3a2e] leading-relaxed mb-3">{definition}</p>
                    {related && relatedLabel && (
                      <Link
                        href={related}
                        className="text-xs text-[#8E3012] font-medium hover:text-[#CC6535] transition-colors"
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
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
          <Link
            href="/book"
            className="inline-flex items-center justify-center px-8 py-4 text-sm font-semibold tracking-wide text-[#0c1929] bg-[#CC6535] hover:bg-[#D4724A] rounded-lg transition-all min-h-[48px]"
          >
            Book a Free Call
          </Link>
          <Link
            href="/scorecard"
            className="inline-flex items-center justify-center px-8 py-4 text-sm font-semibold tracking-wide text-white border border-white/40 hover:bg-white/10 rounded-lg transition-all min-h-[48px]"
          >
            Take the Readiness Quiz
          </Link>
          <a
            href="sms:+12149951062"
            className="inline-flex items-center justify-center text-sm font-medium text-white/60 hover:text-white transition-colors min-h-[48px] px-2"
          >
            Or text me &rarr;
          </a>
        </div>
      </section>
    </main>
  );
}
