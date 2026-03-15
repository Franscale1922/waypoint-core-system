import type { Metadata } from "next";
import Link from "next/link";
import { getArticlesByCategoryName } from "../../../../lib/articles";

export const metadata: Metadata = {
  title: "Franchise Industry Spotlights | Waypoint Franchise Advisors",
  description:
    "Category-specific analysis for people evaluating specific types of franchises: home services, senior care, fitness, B2B, restoration, junk removal, and car wash concepts.",
  alternates: { canonical: "https://waypointfranchise.com/resources/industry-spotlights" },
  openGraph: {
    title: "Franchise Industry Spotlights | Waypoint",
    description:
      "Category-specific analysis covering home services, senior care, fitness, B2B, restoration, and more — with honest reads on the economics and operator fit for each.",
    url: "https://waypointfranchise.com/resources/industry-spotlights",
    images: [{ url: "/og_default_1773343895292.png", width: 1200, height: 630, alt: "Franchise Industry Spotlights" }],
  },
};

export default function IndustrySpotlightsPage() {
  const articles = getArticlesByCategoryName("Industry Spotlights");
  return (
    <main className="bg-[#FAF8F4] text-[#0c1929]">
      {/* Hero */}
      <section className="pt-20 sm:pt-28 pb-12 sm:pb-16 px-6 border-b border-[#e8e0d0]">
        <div className="max-w-4xl mx-auto">
          <Link
            href="/resources"
            className="inline-flex items-center text-xs text-[#c08b3e] tracking-wide uppercase font-medium hover:text-[#d4a55a] transition-colors mb-8"
          >
            ← All Resources
          </Link>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#c08b3e] mb-4">
            Industry Spotlights
          </p>
          <h1 className="font-playfair text-4xl sm:text-5xl text-[#0c1929] leading-tight mb-6 max-w-3xl">
            Specific categories. Honest reads.
          </h1>
          <p className="text-base sm:text-lg text-[#4a4a3e] leading-relaxed max-w-2xl">
            These guides look at specific franchise verticals: what the economics look like, what kind of operator typically succeeds, and where the real risks are. Not marketing copy for the categories — an honest look at how each one actually works.
          </p>
        </div>
      </section>

      {/* Articles grid */}
      <section className="max-w-5xl mx-auto px-6 py-14 sm:py-20">
        <div className="grid gap-6 sm:grid-cols-2">
          {articles.map((article) => (
            <Link
              key={article.slug}
              href={`/resources/${article.slug}`}
              className="group bg-white border border-[#e8e0d0] rounded-lg p-6 hover:shadow-md hover:border-[#d4a55a]/40 transition-all"
            >
              <div className="w-6 h-[2px] bg-[#d4a55a] mb-4 group-hover:w-10 transition-all duration-300" />
              <h2 className="font-playfair text-lg leading-snug text-[#0c1929] group-hover:text-[#d4a55a] transition-colors mb-3">
                {article.title}
              </h2>
              <p className="text-sm text-[#5a5a4a] leading-relaxed">{article.excerpt}</p>
              <p className="mt-4 text-xs text-[#c08b3e] font-medium tracking-wide">Read →</p>
            </Link>
          ))}
        </div>
      </section>

      {/* Related pages — card format */}
      <section className="max-w-4xl mx-auto px-6 pb-10 border-t border-[#e8e0d0] pt-12">
        <div className="flex items-center gap-4 mb-8">
          <div className="w-8 h-[2px] bg-[#d4a55a]" />
          <p className="text-xs font-medium text-[#d4a55a] uppercase tracking-[0.2em]">Before Diving Into a Category</p>
        </div>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <Link href="/resources/getting-started" className="group block bg-white border border-[#e8e0d0] rounded-lg p-5 hover:shadow-md hover:border-[#d4a55a]/40 transition-all">
            <p className="text-[0.65rem] font-medium text-[#c08b3e] tracking-[0.15em] uppercase mb-3">Getting Started</p>
            <div className="w-5 h-[2px] bg-[#d4a55a] mb-3 group-hover:w-8 transition-all duration-300" />
            <h3 className="font-playfair text-[0.95rem] leading-snug text-[#0c1929] group-hover:text-[#c08b3e] transition-colors mb-3">Getting Started articles</h3>
            <p className="text-xs text-[#7a7a6a] leading-relaxed">Start here if you are new — readiness, costs, FDD basics, consultant vs. broker, and finding the right fit.</p>
            <p className="mt-4 text-xs text-[#c08b3e] font-medium tracking-wide">Browse →</p>
          </Link>
          <Link href="/investment" className="group block bg-white border border-[#e8e0d0] rounded-lg p-5 hover:shadow-md hover:border-[#d4a55a]/40 transition-all">
            <p className="text-[0.65rem] font-medium text-[#c08b3e] tracking-[0.15em] uppercase mb-3">Guide</p>
            <div className="w-5 h-[2px] bg-[#d4a55a] mb-3 group-hover:w-8 transition-all duration-300" />
            <h3 className="font-playfair text-[0.95rem] leading-snug text-[#0c1929] group-hover:text-[#c08b3e] transition-colors mb-3">Investment guide</h3>
            <p className="text-xs text-[#7a7a6a] leading-relaxed">Total capital ranges by category, how funding works, and what to budget before your first dollar goes in.</p>
            <p className="mt-4 text-xs text-[#c08b3e] font-medium tracking-wide">Read →</p>
          </Link>
          <Link href="/glossary" className="group block bg-white border border-[#e8e0d0] rounded-lg p-5 hover:shadow-md hover:border-[#d4a55a]/40 transition-all">
            <p className="text-[0.65rem] font-medium text-[#c08b3e] tracking-[0.15em] uppercase mb-3">Reference</p>
            <div className="w-5 h-[2px] bg-[#d4a55a] mb-3 group-hover:w-8 transition-all duration-300" />
            <h3 className="font-playfair text-[0.95rem] leading-snug text-[#0c1929] group-hover:text-[#c08b3e] transition-colors mb-3">Franchise glossary</h3>
            <p className="text-xs text-[#7a7a6a] leading-relaxed">Every term you will encounter when evaluating a franchise — defined in plain language without jargon.</p>
            <p className="mt-4 text-xs text-[#c08b3e] font-medium tracking-wide">Browse →</p>
          </Link>
          <Link href="/resources/going-deeper" className="group block bg-white border border-[#e8e0d0] rounded-lg p-5 hover:shadow-md hover:border-[#d4a55a]/40 transition-all">
            <p className="text-[0.65rem] font-medium text-[#c08b3e] tracking-[0.15em] uppercase mb-3">Going Deeper</p>
            <div className="w-5 h-[2px] bg-[#d4a55a] mb-3 group-hover:w-8 transition-all duration-300" />
            <h3 className="font-playfair text-[0.95rem] leading-snug text-[#0c1929] group-hover:text-[#c08b3e] transition-colors mb-3">Going Deeper articles</h3>
            <p className="text-xs text-[#7a7a6a] leading-relaxed">Beyond the basics — funding paths, territory math, agreement negotiation, and what the first year looks like.</p>
            <p className="mt-4 text-xs text-[#c08b3e] font-medium tracking-wide">Explore →</p>
          </Link>
        </div>
      </section>

      {/* Quiz CTA banner */}
      <section className="bg-[#f5ebd1] border-y border-[#e8d8b0] py-10 px-6">
        <div className="max-w-2xl mx-auto text-center">
          <p className="text-xs font-semibold tracking-widest text-[#c08b3e] uppercase mb-2">Before You Go Deeper on a Category</p>
          <p className="font-playfair text-2xl text-[#0c1929] mb-3">Know your owner type first.</p>
          <p className="text-sm text-[#5a5a4a] leading-relaxed mb-6 max-w-lg mx-auto">
            Which categories align with your personality depends on how you naturally work. 8 questions. Takes 3 minutes. Tells you which industries are built for someone like you.
          </p>
          <Link
            href="/archetype"
            className="inline-flex items-center justify-center px-8 py-3.5 text-sm font-semibold tracking-wide text-[#0c1929] bg-[#d4a55a] hover:bg-[#e2be80] rounded-lg transition-all min-h-[48px]"
          >
            Find Your Owner Type →
          </Link>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-[#0c1929] py-14 px-6 text-center">
        <p className="font-playfair text-2xl text-white mb-4">Want a read on a specific category?</p>
        <p className="text-white/70 mb-8 max-w-sm mx-auto text-sm leading-relaxed">
          30 minutes. If the category makes sense for your market and profile, I will tell you. If it does not, I will tell you that too.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/book"
            className="inline-flex items-center justify-center px-8 py-4 text-sm font-semibold tracking-wide text-[#0c1929] bg-[#d4a55a] hover:bg-[#e2be80] rounded-lg transition-all min-h-[48px]"
          >
            Book a Free Call
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
