import type { Metadata } from "next";
import Link from "next/link";
import { getArticlesByCategoryName } from "../../../../lib/articles";

export const metadata: Metadata = {
  title: "Getting Started with Franchising | Waypoint Franchise Advisors",
  description:
    "If you are new to franchising, start here. Practical guides covering readiness, costs, how consultants work, FDD review, and what type of franchise fits your situation.",
  alternates: { canonical: "https://waypointfranchise.com/resources/getting-started" },
  openGraph: {
    title: "Getting Started with Franchising | Waypoint",
    description:
      "Practical guides for anyone who is new to franchising. Readiness, costs, FDD review, and how to find the right type of franchise.",
    url: "https://waypointfranchise.com/resources/getting-started",
    images: [{ url: "/og_default_1773343895292.png", width: 1200, height: 630, alt: "Getting Started with Franchising" }],
  },
};

export default function GettingStartedPage() {
  const articles = getArticlesByCategoryName("Getting Started");
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
            Getting Started
          </p>
          <h1 className="font-playfair text-4xl sm:text-5xl text-[#0c1929] leading-tight mb-6 max-w-3xl">
            New to franchising? Start here.
          </h1>
          <p className="text-base sm:text-lg text-[#4a4a3e] leading-relaxed max-w-2xl">
            These guides cover the foundations: how to know if you are ready, what a franchise actually costs, how the FDD works, what type of business fits your skills, and how to use a consultant without getting played by one. Read them in any order.
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
          <p className="text-xs font-medium text-[#d4a55a] uppercase tracking-[0.2em]">Once You Have the Basics</p>
        </div>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          <Link href="/archetype" className="group block bg-[#f5ebd1] border border-[#e8d8b0] rounded-lg p-5 hover:shadow-md hover:border-[#d4a55a]/60 transition-all">
            <p className="text-[0.65rem] font-medium text-[#c08b3e] tracking-[0.15em] uppercase mb-3">Tool</p>
            <div className="w-5 h-[2px] bg-[#d4a55a] mb-3 group-hover:w-8 transition-all duration-300" />
            <h3 className="font-playfair text-[0.95rem] leading-snug text-[#0c1929] group-hover:text-[#c08b3e] transition-colors mb-3">Owner Type Quiz</h3>
            <p className="text-xs text-[#7a7a6a] leading-relaxed">8 questions that identify what type of franchise owner you are and which categories fit your natural working style.</p>
            <p className="mt-4 text-xs text-[#c08b3e] font-medium tracking-wide">Take the Quiz →</p>
          </Link>
          <Link href="/investment" className="group block bg-white border border-[#e8e0d0] rounded-lg p-5 hover:shadow-md hover:border-[#d4a55a]/40 transition-all">
            <p className="text-[0.65rem] font-medium text-[#c08b3e] tracking-[0.15em] uppercase mb-3">Guide</p>
            <div className="w-5 h-[2px] bg-[#d4a55a] mb-3 group-hover:w-8 transition-all duration-300" />
            <h3 className="font-playfair text-[0.95rem] leading-snug text-[#0c1929] group-hover:text-[#c08b3e] transition-colors mb-3">Full investment guide</h3>
            <p className="text-xs text-[#7a7a6a] leading-relaxed">Total capital required, how it breaks down, and what to budget beyond the franchise fee.</p>
            <p className="mt-4 text-xs text-[#c08b3e] font-medium tracking-wide">Read →</p>
          </Link>
          <Link href="/glossary" className="group block bg-white border border-[#e8e0d0] rounded-lg p-5 hover:shadow-md hover:border-[#d4a55a]/40 transition-all">
            <p className="text-[0.65rem] font-medium text-[#c08b3e] tracking-[0.15em] uppercase mb-3">Reference</p>
            <div className="w-5 h-[2px] bg-[#d4a55a] mb-3 group-hover:w-8 transition-all duration-300" />
            <h3 className="font-playfair text-[0.95rem] leading-snug text-[#0c1929] group-hover:text-[#c08b3e] transition-colors mb-3">Franchise glossary</h3>
            <p className="text-xs text-[#7a7a6a] leading-relaxed">Plain-language definitions of every term you will encounter: FDD, royalty, territory, Item 19, and more.</p>
            <p className="mt-4 text-xs text-[#c08b3e] font-medium tracking-wide">Browse →</p>
          </Link>
          <Link href="/resources/going-deeper" className="group block bg-white border border-[#e8e0d0] rounded-lg p-5 hover:shadow-md hover:border-[#d4a55a]/40 transition-all">
            <p className="text-[0.65rem] font-medium text-[#c08b3e] tracking-[0.15em] uppercase mb-3">Going Deeper</p>
            <div className="w-5 h-[2px] bg-[#d4a55a] mb-3 group-hover:w-8 transition-all duration-300" />
            <h3 className="font-playfair text-[0.95rem] leading-snug text-[#0c1929] group-hover:text-[#c08b3e] transition-colors mb-3">Going Deeper articles</h3>
            <p className="text-xs text-[#7a7a6a] leading-relaxed">Funding, territory selection, multi-unit strategy, franchise agreements, and validation calls.</p>
            <p className="mt-4 text-xs text-[#c08b3e] font-medium tracking-wide">Explore →</p>
          </Link>
          <Link href="/faq" className="group block bg-white border border-[#e8e0d0] rounded-lg p-5 hover:shadow-md hover:border-[#d4a55a]/40 transition-all">
            <p className="text-[0.65rem] font-medium text-[#c08b3e] tracking-[0.15em] uppercase mb-3">Common Questions</p>
            <div className="w-5 h-[2px] bg-[#d4a55a] mb-3 group-hover:w-8 transition-all duration-300" />
            <h3 className="font-playfair text-[0.95rem] leading-snug text-[#0c1929] group-hover:text-[#c08b3e] transition-colors mb-3">Frequently asked questions</h3>
            <p className="text-xs text-[#7a7a6a] leading-relaxed">Answers to the most common questions about cost, process, working with a consultant, and timing.</p>
            <p className="mt-4 text-xs text-[#c08b3e] font-medium tracking-wide">Read →</p>
          </Link>
        </div>
      </section>


      {/* CTA */}
      <section className="bg-[#0c1929] py-14 px-6 text-center">
        <p className="font-playfair text-2xl text-white mb-4">Ready to talk through your situation?</p>
        <p className="text-white/70 mb-8 max-w-sm mx-auto text-sm leading-relaxed">
          30 minutes. No pitch. Just an honest read on where you stand.
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
