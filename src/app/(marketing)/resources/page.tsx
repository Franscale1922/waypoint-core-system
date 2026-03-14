import type { Metadata } from "next";
import Link from "next/link";
import { getArticlesByCategory } from "../../../lib/articles";

export const metadata: Metadata = {
  title: "Franchise Resources | Waypoint Franchise Advisors",
  description: "Guides, articles, and tools for anyone seriously exploring franchise ownership. No pitch, no agenda.",
  openGraph: {
    title: "Franchise Resources | Waypoint Franchise Advisors",
    description: "Guides, articles, and tools for anyone seriously exploring franchise ownership.",
    url: "https://waypointfranchise.com/resources",
    images: [{ url: "/og_default_1773343895292.png", width: 1200, height: 630, alt: "Waypoint Franchise Resources" }],
  },
  alternates: { canonical: "https://waypointfranchise.com/resources" },
};

export default function ResourcesPage() {
  const grouped = getArticlesByCategory();
  return (
    <main className="bg-[#FAF8F4] text-[#0c1929]">
      <section className="relative pt-24 pb-20 px-6 overflow-hidden">
        <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: "url('/images/resources-hero-waterfall.png')", backgroundPosition: "center 40%" }} />
        <div className="absolute inset-0 bg-gradient-to-b from-[#0c1929]/55 via-[#0c1929]/35 to-[#0c1929]/15" />
        <div className="relative z-10 max-w-4xl mx-auto">
          <p className="text-[#d4a55a] text-xs tracking-[0.2em] uppercase font-medium mb-4">Franchise Resources</p>
          <h1 className="font-playfair text-4xl sm:text-6xl text-white mb-6">What you should know<br className="hidden sm:block" /> before you start looking.</h1>
          <p className="text-white/80 text-lg max-w-xl leading-relaxed">Practical writing from someone who has been a franchisor, a franchisee, and now an advisor. No pitch, no agenda.</p>
        </div>
      </section>
      <section className="max-w-5xl mx-auto px-6 py-16 sm:py-24 space-y-20">
        {Object.entries(grouped).map(([category, articles]) => (
          <div key={category}>
            <div className="flex items-center gap-4 mb-8">
              <div className="w-8 h-[2px] bg-[#d4a55a]" />
              <h2 className="text-sm font-medium text-[#d4a55a] uppercase tracking-[0.18em]">{category}</h2>
            </div>
            <div className="grid gap-6 sm:grid-cols-2">
              {articles.map((article) => (
                <Link key={article.slug} href={`/resources/${article.slug}`} className="group bg-white border border-[#e8e0d0] rounded-lg p-6 hover:shadow-md hover:border-[#d4a55a]/40 transition-all">
                  <div className="w-6 h-[2px] bg-[#d4a55a] mb-4 group-hover:w-10 transition-all duration-300" />
                  <h3 className="font-playfair text-lg leading-snug text-[#0c1929] group-hover:text-[#d4a55a] transition-colors mb-3">{article.title}</h3>
                  <p className="text-sm text-[#5a5a4a] leading-relaxed">{article.excerpt}</p>
                  <p className="mt-4 text-xs text-[#c08b3e] font-medium tracking-wide">Read →</p>
                </Link>
              ))}
            </div>
          </div>
        ))}
      </section>
      <section className="bg-[#0c1929] py-16 px-6 text-center">
        <p className="font-playfair text-2xl text-white mb-4">Rather talk it through?</p>
        <p className="text-white/70 mb-8 max-w-md mx-auto">The fastest way to get a real answer is a real conversation.</p>
        <Link href="/book" className="inline-block bg-[#d4a55a] text-white px-8 py-4 text-sm tracking-widest uppercase hover:bg-[#c4953a] transition-colors">Book a Free Call</Link>
      </section>
    </main>
  );
}
