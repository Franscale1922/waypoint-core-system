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

      {/* Related pages */}
      <section className="max-w-4xl mx-auto px-6 pb-10 border-t border-[#e8e0d0] pt-8">
        <p className="text-xs text-[#7a7a7a] uppercase tracking-widest mb-4">Once you have the basics</p>
        <div className="flex flex-wrap gap-6">
          <Link href="/investment" className="text-sm text-[#c08b3e] font-medium hover:text-[#d4a55a] transition-colors">
            Full investment guide →
          </Link>
          <Link href="/glossary" className="text-sm text-[#c08b3e] font-medium hover:text-[#d4a55a] transition-colors">
            Franchise glossary →
          </Link>
          <Link href="/resources/going-deeper" className="text-sm text-[#c08b3e] font-medium hover:text-[#d4a55a] transition-colors">
            Going Deeper articles →
          </Link>
          <Link href="/faq" className="text-sm text-[#c08b3e] font-medium hover:text-[#d4a55a] transition-colors">
            FAQ →
          </Link>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-[#0c1929] py-14 px-6 text-center">
        <p className="font-playfair text-2xl text-white mb-4">Ready to talk through your situation?</p>
        <p className="text-white/70 mb-8 max-w-sm mx-auto text-sm leading-relaxed">
          30 minutes. No pitch. Just an honest read on where you stand.
        </p>
        <Link
          href="/book"
          className="inline-block bg-[#d4a55a] text-white px-8 py-4 text-sm tracking-widest uppercase hover:bg-[#c4953a] transition-colors"
        >
          Book a Free Call
        </Link>
        <a
          href="sms:+12149951062"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-white/70 hover:text-[#d4a55a] transition-colors mt-4"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>
          Or text me — (214) 995-1062
        </a>
      </section>
    </main>
  );
}
