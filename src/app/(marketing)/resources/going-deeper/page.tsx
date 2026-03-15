import type { Metadata } from "next";
import Link from "next/link";
import { getArticlesByCategoryName } from "../../../../lib/articles";

export const metadata: Metadata = {
  title: "Going Deeper: Advanced Franchise Guides | Waypoint Franchise Advisors",
  description:
    "You know the basics. Now go deeper. Guides covering funding, territory selection, multi-unit strategy, the franchise agreement, what to look for at Discovery Day, and how to read an FDD.",
  alternates: { canonical: "https://waypointfranchise.com/resources/going-deeper" },
  openGraph: {
    title: "Going Deeper: Advanced Franchise Guides | Waypoint",
    description:
      "Beyond the basics. Funding paths, territory math, multi-unit strategy, franchisee validation, and what to look for in the franchise agreement.",
    url: "https://waypointfranchise.com/resources/going-deeper",
    images: [{ url: "/og_default_1773343895292.png", width: 1200, height: 630, alt: "Advanced Franchise Guides" }],
  },
};

export default function GoingDeeperPage() {
  const articles = getArticlesByCategoryName("Going Deeper");
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
            Going Deeper
          </p>
          <h1 className="font-playfair text-4xl sm:text-5xl text-[#0c1929] leading-tight mb-6 max-w-3xl">
            You know the basics. Here&rsquo;s what comes next.
          </h1>
          <p className="text-base sm:text-lg text-[#4a4a3e] leading-relaxed max-w-2xl">
            These guides cover the parts of franchise evaluation that most blogs skip: how to actually fund the deal, how to read your territory map, what validation calls are really for, what a franchisor can and cannot do in the agreement, and what the first year looks like.
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
          <p className="text-xs font-medium text-[#d4a55a] uppercase tracking-[0.2em]">Useful Alongside These Articles</p>
        </div>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <Link href="/investment" className="group block bg-white border border-[#e8e0d0] rounded-lg p-5 hover:shadow-md hover:border-[#d4a55a]/40 transition-all">
            <p className="text-[0.65rem] font-medium text-[#c08b3e] tracking-[0.15em] uppercase mb-3">Guide</p>
            <div className="w-5 h-[2px] bg-[#d4a55a] mb-3 group-hover:w-8 transition-all duration-300" />
            <h3 className="font-playfair text-[0.95rem] leading-snug text-[#0c1929] group-hover:text-[#c08b3e] transition-colors mb-3">Full investment guide</h3>
            <p className="text-xs text-[#7a7a6a] leading-relaxed">The full capital picture — franchise fee, build-out, working capital, and ongoing fees explained.</p>
            <p className="mt-4 text-xs text-[#c08b3e] font-medium tracking-wide">Read →</p>
          </Link>
          <Link href="/franchise-consultant-vs-broker" className="group block bg-white border border-[#e8e0d0] rounded-lg p-5 hover:shadow-md hover:border-[#d4a55a]/40 transition-all">
            <p className="text-[0.65rem] font-medium text-[#c08b3e] tracking-[0.15em] uppercase mb-3">Reference</p>
            <div className="w-5 h-[2px] bg-[#d4a55a] mb-3 group-hover:w-8 transition-all duration-300" />
            <h3 className="font-playfair text-[0.95rem] leading-snug text-[#0c1929] group-hover:text-[#c08b3e] transition-colors mb-3">Consultant vs. broker</h3>
            <p className="text-xs text-[#7a7a6a] leading-relaxed">What distinguishes an independent franchise advisor from a broker — and why it matters for your search.</p>
            <p className="mt-4 text-xs text-[#c08b3e] font-medium tracking-wide">Read →</p>
          </Link>
          <Link href="/resources/getting-started" className="group block bg-white border border-[#e8e0d0] rounded-lg p-5 hover:shadow-md hover:border-[#d4a55a]/40 transition-all">
            <p className="text-[0.65rem] font-medium text-[#c08b3e] tracking-[0.15em] uppercase mb-3">Getting Started</p>
            <div className="w-5 h-[2px] bg-[#d4a55a] mb-3 group-hover:w-8 transition-all duration-300" />
            <h3 className="font-playfair text-[0.95rem] leading-snug text-[#0c1929] group-hover:text-[#c08b3e] transition-colors mb-3">Getting Started articles</h3>
            <p className="text-xs text-[#7a7a6a] leading-relaxed">Foundational guides on readiness, costs, the FDD, how consultants work, and finding the right fit.</p>
            <p className="mt-4 text-xs text-[#c08b3e] font-medium tracking-wide">Browse →</p>
          </Link>
          <Link href="/resources/industry-spotlights" className="group block bg-white border border-[#e8e0d0] rounded-lg p-5 hover:shadow-md hover:border-[#d4a55a]/40 transition-all">
            <p className="text-[0.65rem] font-medium text-[#c08b3e] tracking-[0.15em] uppercase mb-3">Industry Spotlights</p>
            <div className="w-5 h-[2px] bg-[#d4a55a] mb-3 group-hover:w-8 transition-all duration-300" />
            <h3 className="font-playfair text-[0.95rem] leading-snug text-[#0c1929] group-hover:text-[#c08b3e] transition-colors mb-3">Industry Spotlights</h3>
            <p className="text-xs text-[#7a7a6a] leading-relaxed">Category-specific reads on home services, senior care, B2B, fitness, and more — with honest economics.</p>
            <p className="mt-4 text-xs text-[#c08b3e] font-medium tracking-wide">Explore →</p>
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
        <p className="mt-6 text-xs text-white/40">
          Not sure which categories fit your profile?{" "}
          <Link href="/archetype" className="text-white/60 underline hover:text-white/80 transition-colors">
            Find your owner type first →
          </Link>
        </p>
      </section>
    </main>
  );
}
