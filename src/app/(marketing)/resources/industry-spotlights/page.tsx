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

      {/* Related pages */}
      <section className="max-w-4xl mx-auto px-6 pb-10 border-t border-[#e8e0d0] pt-8">
        <p className="text-xs text-[#7a7a7a] uppercase tracking-widest mb-4">Before diving into a category</p>
        <div className="flex flex-wrap gap-6">
          <Link href="/resources/getting-started" className="text-sm text-[#c08b3e] font-medium hover:text-[#d4a55a] transition-colors">
            ← Getting Started articles
          </Link>
          <Link href="/investment" className="text-sm text-[#c08b3e] font-medium hover:text-[#d4a55a] transition-colors">
            Investment guide →
          </Link>
          <Link href="/glossary" className="text-sm text-[#c08b3e] font-medium hover:text-[#d4a55a] transition-colors">
            Franchise glossary →
          </Link>
          <Link href="/resources/going-deeper" className="text-sm text-[#c08b3e] font-medium hover:text-[#d4a55a] transition-colors">
            Going Deeper →
          </Link>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-[#0c1929] py-14 px-6 text-center">
        <p className="font-playfair text-2xl text-white mb-4">Want a read on a specific category?</p>
        <p className="text-white/70 mb-8 max-w-sm mx-auto text-sm leading-relaxed">
          30 minutes. If the category makes sense for your market and profile, I will tell you. If it does not, I will tell you that too.
        </p>
        <Link
          href="/book"
          className="inline-block bg-[#d4a55a] text-white px-8 py-4 text-sm tracking-widest uppercase hover:bg-[#c4953a] transition-colors"
        >
          Book a Free Call
        </Link>
      </section>
    </main>
  );
}
