import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Franchise Insights | Waypoint Franchise Advisors",
  description:
    "Practical writing on franchising, business ownership, and the questions first-time buyers should be asking. No sales pitch. Just honest perspective.",
  openGraph: {
    title: "Franchise Insights by Kelsey Stuart",
    description: "Honest writing on franchising from someone who has been a franchisor, a franchisee, and an advisor.",
    url: "https://waypointfranchise.com/blog",
    images: [{ url: "/og_default_1773343895292.png", width: 1200, height: 630, alt: "Waypoint Franchise Insights" }],
  },
  alternates: { canonical: "https://waypointfranchise.com/blog" },
};

// This will be replaced by a CMS or MDX fetch
const posts: {
  slug: string;
  title: string;
  date: string;
  category: string;
  excerpt: string;
}[] = [];

export default function BlogPage() {
  return (
    <main className="bg-[#FAF8F4] text-[#0c1929]">

      {/* ── Hero ────────────────────────────────────────── */}
      <section className="relative pt-24 pb-20 px-6 overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: "url('/images/blog-hero.png')", backgroundPosition: "center 35%" }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-[#0c1929]/65 via-[#0c1929]/45 to-[#0c1929]/25" />
        <div className="relative z-10 max-w-4xl mx-auto">
          <p className="text-[#d4a55a] text-xs tracking-[0.2em] uppercase font-medium mb-4">
            Franchise Insights
          </p>
          <h1 className="font-playfair text-4xl sm:text-6xl text-white mb-6">
            What you should know<br className="hidden sm:block" /> before you start looking.
          </h1>
          <p className="text-white/80 text-lg max-w-xl leading-relaxed">
            Practical writing from someone who has been a franchisor, a franchisee, and now an advisor. No pitch, no agenda.
          </p>
        </div>
      </section>

      {/* ── Posts grid ──────────────────────────────────── */}
      <section className="max-w-4xl mx-auto px-6 py-16 sm:py-24">
        {posts.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-12 h-[2px] bg-[#d4a55a] mx-auto mb-8" />
            <p className="font-playfair text-2xl text-[#0c1929] mb-4">
              First posts coming soon.
            </p>
            <p className="text-[#5a5a4a] max-w-md mx-auto leading-relaxed mb-10">
              Writing is underway. In the meantime, the best way to get honest answers is a real conversation.
            </p>
            <Link
              href="/book"
              className="inline-block bg-[#d4a55a] text-white px-8 py-4 text-sm tracking-widest uppercase hover:bg-[#c4953a] transition-colors"
            >
              Book a Free Call
            </Link>
          </div>
        ) : (
          <div className="grid gap-8 sm:grid-cols-2">
            {posts.map((post) => (
              <article
                key={post.slug}
                className="bg-white border border-[#e8e0d0] rounded-lg overflow-hidden hover:shadow-md transition-shadow"
              >
                <Link href={`/blog/${post.slug}`} className="block p-8">
                  <div className="flex items-center gap-3 mb-4">
                    <span className="text-[10px] tracking-[0.2em] uppercase text-[#d4a55a] font-medium">
                      {post.category}
                    </span>
                    <span className="text-[#c8c0b0] text-xs">{post.date}</span>
                  </div>
                  <div className="w-8 h-[2px] bg-[#d4a55a] mb-4" />
                  <h2 className="font-playfair text-xl mb-3 leading-snug hover:text-[#d4a55a] transition-colors">
                    {post.title}
                  </h2>
                  <p className="text-sm text-[#5a5a4a] leading-relaxed">
                    {post.excerpt}
                  </p>
                </Link>
              </article>
            ))}
          </div>
        )}
      </section>

    </main>
  );
}
