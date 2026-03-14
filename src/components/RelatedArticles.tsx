import Link from "next/link";
import type { Article } from "../lib/articles";

export default function RelatedArticles({ articles }: { articles: Article[] }) {
  if (!articles || articles.length === 0) return null;

  return (
    <section className="max-w-3xl mx-auto px-6 pb-16 sm:pb-20">
      <div className="border-t border-[#e8e0d0] pt-12">
        <div className="flex items-center gap-4 mb-8">
          <div className="w-8 h-[2px] bg-[#d4a55a]" />
          <p className="text-xs font-medium text-[#d4a55a] uppercase tracking-[0.2em]">Keep Reading</p>
        </div>
        <div className="grid gap-5 sm:grid-cols-3">
          {articles.map((article) => (
            <Link
              key={article.slug}
              href={`/resources/${article.slug}`}
              className="group block bg-white border border-[#e8e0d0] rounded-lg p-5 hover:shadow-md hover:border-[#d4a55a]/40 transition-all"
            >
              <p className="text-[0.65rem] font-medium text-[#c08b3e] tracking-[0.15em] uppercase mb-3">
                {article.category}
              </p>
              <div className="w-5 h-[2px] bg-[#d4a55a] mb-3 group-hover:w-8 transition-all duration-300" />
              <h3 className="font-playfair text-[0.95rem] leading-snug text-[#0c1929] group-hover:text-[#c08b3e] transition-colors mb-3">
                {article.title}
              </h3>
              <p className="text-xs text-[#7a7a6a] leading-relaxed line-clamp-3">{article.excerpt}</p>
              <p className="mt-4 text-xs text-[#c08b3e] font-medium tracking-wide">Read →</p>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
