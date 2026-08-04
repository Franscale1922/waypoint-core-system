import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { allGlossaryEntries, getGlossaryEntry } from "@/data/glossary";
import {
  SITE_URL,
  jsonLdGraph,
  webPageSchema,
  breadcrumbSchema,
  faqPageSchema,
} from "../../../lib/structured-data";
import JsonLd from "../../../components/JsonLd";

// Only the terms we generate are valid; any other slug 404s.
export const dynamicParams = false;

export function generateStaticParams() {
  return allGlossaryEntries.map((e) => ({ slug: e.slug }));
}

// aeo-desc-dynamic: bounded by construction. This truncates at 155 characters,
// inside the 160 the audit enforces everywhere else.
function metaDesc(def: string): string {
  const clean = def.replace(/\s+/g, " ").trim();
  if (clean.length <= 155) return clean;
  const cut = clean.slice(0, 155);
  return cut.slice(0, cut.lastIndexOf(" ")).trim() + "...";
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const entry = getGlossaryEntry(slug);
  if (!entry) return {};
  const url = `${SITE_URL}/glossary/${entry.slug}`;
  // Root layout applies title.template "%s | Waypoint"; do NOT repeat the brand here.
  const title = `${entry.term}: Meaning in Franchising`;
  const description = metaDesc(entry.definition);
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title: `${entry.term}: What It Means in Franchising`,
      description,
      url,
      images: [{ url: "/og/og-glossary.png", width: 1200, height: 630, alt: `${entry.term} defined | Waypoint Franchise Glossary` }],
    },
  };
}

export default async function GlossaryTermPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const entry = getGlossaryEntry(slug);
  if (!entry) notFound();

  const url = `${SITE_URL}/glossary/${entry.slug}`;

  // ONE list, rendered on the page AND fed to the FAQ schema.
  //
  // The definition is restated as the first question because "what is <term>"
  // is the query this page ranks for. It used to be typed twice: once inline in
  // the faqPageSchema() call and once as a hand-written heading below, which is
  // the parallel-construction pattern that let /investment drift into shipping
  // four Q&As that rendered nowhere. Keeping it in this array is what makes the
  // two provably identical, and it is what scripts/verify-schema.mjs checks.
  const faqItems = [
    { q: `What is ${entry.term} in franchising?`, a: entry.definition },
    ...(entry.faqs ?? []),
  ];

  const graph = jsonLdGraph(
    webPageSchema({
      url,
      name: `${entry.term}: Meaning in Franchising`,
      description: metaDesc(entry.definition),
      breadcrumb: breadcrumbSchema([
        { name: "Home", url: SITE_URL },
        { name: "Glossary", url: `${SITE_URL}/glossary` },
        { name: entry.term, url },
      ]),
    }),
    {
      "@type": "DefinedTerm",
      "@id": `${url}#term`,
      name: entry.term,
      description: entry.definition,
      url,
      inDefinedTermSet: { "@id": `${SITE_URL}/glossary#glossary` },
    },
    faqPageSchema(faqItems, url),
  );

  return (
    <main className="bg-[#FAF8F4] text-[#0c1929]">
      <JsonLd data={graph} />

      <article className="max-w-3xl mx-auto px-6 pt-20 sm:pt-28 pb-16">
        {/* Breadcrumb */}
        <nav aria-label="Breadcrumb" className="text-xs text-[#6a6a5e] mb-8">
          <Link href="/" className="hover:text-[#8E3012]">Home</Link>
          <span className="mx-2">/</span>
          <Link href="/glossary" className="hover:text-[#8E3012]">Glossary</Link>
          <span className="mx-2">/</span>
          <span className="text-[#0c1929]">{entry.term}</span>
        </nav>

        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#8E3012] mb-4">
          Franchise Glossary
        </p>
        <h1 className="font-playfair text-4xl sm:text-5xl text-[#0c1929] leading-tight mb-8">
          {entry.term}
        </h1>

        {/* Direct-answer block (AEO): the first item answers "what is <term>" up
            top, and the rest are the extra question-format answers for terms
            people search more than one way. Headings stay questions so answer
            engines can extract them. Same faqItems array as the FAQPage JSON-LD
            above, so the two cannot drift. */}
        {faqItems.map((faq, i) => (
          <div key={faq.q} className={i === 0 ? undefined : "mt-8"}>
            <h2 className="font-playfair text-xl text-[#0c1929] mb-3">{faq.q}</h2>
            <p className="text-base text-[#3a3a2e] leading-relaxed">{faq.a}</p>
          </div>
        ))}

        {entry.related && entry.relatedLabel && (
          <p className="mt-8">
            <Link href={entry.related} className="text-sm text-[#8E3012] font-medium hover:text-[#CC6535] transition-colors">
              {entry.relatedLabel} &rarr;
            </Link>
          </p>
        )}

        <p className="mt-10 pt-8 border-t border-[#e8e0d0]">
          <Link href="/glossary" className="text-sm text-[#8E3012] font-medium hover:text-[#CC6535] transition-colors">
            &larr; Back to the full franchise glossary
          </Link>
        </p>
      </article>

      {/* CTA */}
      <section className="bg-[#0c1929] py-14 px-6 text-center">
        <p className="font-playfair text-2xl text-white mb-4">
          Know the terms. Now let&apos;s find the right fit.
        </p>
        <Link
          href="/book"
          className="inline-block bg-[#CC6535] text-white text-sm font-semibold px-6 py-3 rounded hover:bg-[#8E3012] transition-colors"
        >
          Book an intro call
        </Link>
      </section>
    </main>
  );
}
