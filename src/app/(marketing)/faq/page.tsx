import { faqs } from "@/data/faq";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { FAQItem } from "./FAQItem";
import { SITE_URL, jsonLdGraph, webPageSchema, breadcrumbSchema, faqPageSchema } from "../../lib/structured-data";
import JsonLd from "../../components/JsonLd";

export const metadata: Metadata = {
  title: "FAQ",
  description:
    "Honest answers to common questions about franchise consulting, cost, capital requirements, funding paths, territory, semi-absentee ownership, the FDD, and how the process works.",
  alternates: {
    canonical: "https://www.waypointfranchise.com/faq",
    types: { "text/markdown": "https://www.waypointfranchise.com/faq.md" },
  },
  openGraph: {
    title: "Frequently Asked Questions | Waypoint Franchise Advisors",
    description:
      "No jargon, no pitch. Straight answers about what franchise consulting costs, how the process works, and what it takes to get started.",
    url: "https://www.waypointfranchise.com/faq",
    images: [{ url: "/og/og-faq.png", width: 1200, height: 630, alt: "Waypoint FAQ: Honest Answers" }],
  },
};



// Build FAQPage schema from the categorized faqs (flattened to {q,a}[]).
const faqPageNode = faqPageSchema(
  faqs.flatMap(({ questions }) => questions.map(({ q, a }) => ({ q, a }))),
  `${SITE_URL}/faq`,
);

export default function FAQPage() {
  return (
    <main className="bg-[#FAF8F4] text-[#0c1929]">
      <JsonLd
        data={jsonLdGraph(
          webPageSchema({
            url: `${SITE_URL}/faq`,
            name: "Frequently Asked Questions | Waypoint Franchise Advisors",
            description:
              "Honest answers to common questions about franchise consulting, cost, capital requirements, funding paths, territory, semi-absentee ownership, the FDD, and how the process works.",
            breadcrumb: breadcrumbSchema([
              { name: "Home", url: SITE_URL },
              { name: "FAQ", url: `${SITE_URL}/faq` },
            ]),
          }),
          faqPageNode,
        )}
      />

      {/* Hero */}
      <section className="relative pt-24 pb-16 px-6 overflow-hidden">
        <Image
          src="/images/faq-hero.jpg"
          alt="Montana highland scenery"
          fill
          priority
          sizes="100vw"
          className="object-cover"
          style={{ objectPosition: "center 40%" }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-[#0c1929]/60 via-[#0c1929]/35 to-[#0c1929]/15" />
        <div className="relative z-10 max-w-4xl mx-auto text-center">

          <h1 className="font-playfair text-4xl sm:text-6xl text-white mb-6">
            Honest answers
          </h1>
          <p className="text-white/80 text-lg max-w-xl mx-auto leading-relaxed">
            If something is not covered here, just ask. There are no questions that are too basic.
          </p>
        </div>
      </section>

      {/* G.1: Category anchor nav */}
      <div className="sticky top-0 z-10 bg-[#FAF8F4] border-b border-[#e2ddd2] overflow-x-auto">
        <div className="flex gap-2 px-6 py-3 no-scrollbar">
          {[
            { label: "Getting Started", id: "getting-started" },
            { label: "The Process", id: "the-process" },
            { label: "Funding & Capital", id: "funding-capital" },
            { label: "Territory & Unit Count", id: "territory-unit-count" },
            { label: "Understanding Franchises", id: "understanding-franchises" },
            { label: "Ownership Models", id: "ownership-models" },
            { label: "Agreement & Legal", id: "agreement-legal" },
            { label: "Making the Decision", id: "making-the-decision" },
          ].map(({ label, id }) => (
            <a
              key={id}
              href={`#${id}`}
              className="flex-shrink-0 text-xs font-semibold px-4 py-2 rounded-full border border-[#0c1929]/20 text-[#0c1929] hover:bg-[#0c1929] hover:text-white hover:border-[#0c1929] transition-all whitespace-nowrap"
            >
              {label}
            </a>
          ))}
        </div>
      </div>

      {/* FAQ body */}
      <section className="max-w-3xl mx-auto px-6 py-16 sm:py-24 space-y-16">
        {faqs.map(({ category, questions }) => {
          const id = category
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/(^-|-$)/g, "");
          return (
          <div key={category} id={id} style={{ scrollMarginTop: "120px" }}>
            <h2 className="font-playfair text-xl text-[#CC6535] mb-6 pb-3 border-b border-[#e8e0d0]">
              {category}
            </h2>
            <div>
              {questions.map(({ q, a, link, defaultOpen, cta }) => (
                <FAQItem key={q} q={q} a={a} link={link} defaultOpen={defaultOpen} cta={cta} />
              ))}
            </div>
          </div>
        )})}
      </section>

      {/* Still have questions */}
      <section className="bg-[#0c1929] py-16 px-6 text-center">
        <p className="font-playfair text-2xl text-white mb-4">
          Still have a question?
        </p>
        <p className="text-white/70 mb-8 max-w-md mx-auto">
          The fastest way to get a real answer is a real conversation.{" "}
          Or <a href="/process" className="text-[#CC6535] hover:underline">see exactly how the process works →</a>
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
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
