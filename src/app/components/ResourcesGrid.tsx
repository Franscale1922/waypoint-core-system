"use client";

import Link from "next/link";
import { useState, useMemo } from "react";
import type { Article } from "@/lib/articles";

const START_HERE_SLUGS = [
  "do-you-need-a-franchise-consultant",
  "how-franchise-funding-actually-works",
  "fdd-decoded-what-actually-matters",
];

function ArticleCard({ article }: { article: Article }) {
  return (
    <Link
      href={`/resources/${article.slug}`}
      className="group bg-white border border-[#e8e0d0] rounded-lg p-6 hover:shadow-md hover:border-[#d4a55a]/40 transition-all"
    >
      <div className="w-6 h-[2px] bg-[#d4a55a] mb-4 group-hover:w-10 transition-all duration-300" />
      <h3 className="font-playfair text-lg leading-snug text-[#0c1929] group-hover:text-[#d4a55a] transition-colors mb-3">
        {article.title}
      </h3>
      <p className="text-sm text-[#5a5a4a] leading-relaxed">{article.excerpt}</p>
      <p className="mt-4 text-xs text-[#c08b3e] font-medium tracking-wide">Read &rarr;</p>
    </Link>
  );
}

export default function ResourcesGrid({
  grouped,
  allArticles,
}: {
  grouped: Record<string, Article[]>;
  allArticles: Article[];
}) {
  const [query, setQuery] = useState("");

  const startHere = useMemo(
    () =>
      START_HERE_SLUGS.map((slug) => allArticles.find((a) => a.slug === slug)).filter(
        (a): a is Article => !!a
      ),
    [allArticles]
  );

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    if (!q) return null;
    return allArticles.filter(
      (a) =>
        a.title.toLowerCase().includes(q) || a.excerpt.toLowerCase().includes(q)
    );
  }, [query, allArticles]);

  return (
    <section className="max-w-5xl mx-auto px-6 py-16 sm:py-24 space-y-20">
      {/* Search — E.3 */}
      <div>
        <label htmlFor="resources-search" className="sr-only">
          Search articles
        </label>
        <div className="relative max-w-xl">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#7a7a7a]" aria-hidden="true">
            <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
            </svg>
          </span>
          <input
            id="resources-search"
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search articles…"
            className="w-full pl-11 pr-4 py-3 bg-white border border-[#e2ddd2] rounded-lg text-sm text-[#0c1929] placeholder:text-[#aaa] focus:outline-none focus:ring-2 focus:ring-[#d4a55a]/50 focus:border-[#d4a55a] transition-all"
          />
        </div>
      </div>

      {/* Search results */}
      {filtered !== null ? (
        <div>
          <p className="text-xs text-[#7a7a7a] uppercase tracking-widest mb-6">
            {filtered.length} result{filtered.length !== 1 ? "s" : ""} for &ldquo;{query}&rdquo;
          </p>
          {filtered.length > 0 ? (
            <div className="grid gap-6 sm:grid-cols-2">
              {filtered.map((article) => (
                <ArticleCard key={article.slug} article={article} />
              ))}
            </div>
          ) : (
            <p className="text-sm text-[#5a5a4a]">No articles matched your search.</p>
          )}
        </div>
      ) : (
        <>
          {/* Start Here — E.2 */}
          <div className="bg-[#0c1929] rounded-xl p-6 sm:p-8">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#d4a55a] mb-2">
              New to franchising?
            </p>
            <h2 className="font-playfair text-2xl sm:text-3xl text-white mb-6 leading-snug">
              Start here.
            </h2>
            <div className="grid gap-4 sm:grid-cols-3">
              {startHere.map((article) => (
                <Link
                  key={article.slug}
                  href={`/resources/${article.slug}`}
                  className="group bg-white/10 hover:bg-white/15 border border-white/15 hover:border-[#d4a55a]/60 rounded-lg p-5 transition-all"
                >
                  <div className="w-5 h-[2px] bg-[#d4a55a] mb-3 group-hover:w-8 transition-all duration-300" />
                  <h3 className="text-sm font-semibold text-white leading-snug mb-1 group-hover:text-[#d4a55a] transition-colors">
                    {article.title}
                  </h3>
                  <p className="text-xs text-white/60 leading-relaxed">{article.excerpt}</p>
                </Link>
              ))}
            </div>
          </div>

          {/* Category hub links */}
          <div>
            <p className="text-xs text-[#7a7a7a] uppercase tracking-widest mb-4">Browse by category</p>
            <div className="flex flex-wrap gap-3">
              {[
                { label: "Getting Started", href: "/resources/getting-started" },
                { label: "Going Deeper", href: "/resources/going-deeper" },
                { label: "Industry Spotlights", href: "/resources/industry-spotlights" },
              ].map(({ label, href }) => (
                <Link
                  key={href}
                  href={href}
                  className="text-xs font-semibold uppercase tracking-[0.15em] px-4 py-2 border border-[#d4a55a] text-[#c08b3e] hover:bg-[#d4a55a] hover:text-white transition-all rounded"
                >
                  {label}
                </Link>
              ))}
            </div>
          </div>

          {/* Articles grouped by category */}
          {Object.entries(grouped).map(([category, articles]) => (
            <div key={category}>
              <div className="flex items-center gap-4 mb-8">
                <div className="w-8 h-[2px] bg-[#d4a55a]" />
                <h2 className="text-sm font-medium text-[#d4a55a] uppercase tracking-[0.18em]">{category}</h2>
              </div>
              <div className="grid gap-6 sm:grid-cols-2">
                {articles.map((article) => (
                  <ArticleCard key={article.slug} article={article} />
                ))}
              </div>
            </div>
          ))}
        </>
      )}
    </section>
  );
}
