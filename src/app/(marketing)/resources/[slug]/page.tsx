import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { MDXRemote } from "next-mdx-remote/rsc";
import remarkGfm from "remark-gfm";
import { getAllArticles, getArticleBySlug, getRelatedArticles } from "../../../../lib/articles";
import RelatedArticles from "../../../../components/RelatedArticles";
import EmailCapture from "../../../components/EmailCapture";
import NewsletterForm from "../../../components/NewsletterForm";

type Props = { params: Promise<{ slug: string }> };

import InlineCapture from "../../../components/InlineCapture";

export async function generateStaticParams() {
  return getAllArticles().map((a) => ({ slug: a.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const article = getArticleBySlug(slug);
  if (!article) return {};
  return {
    title: `${article.meta.title} | Waypoint Franchise Advisors`,
    description: article.meta.excerpt,
    alternates: { canonical: `https://www.waypointfranchise.com/resources/${slug}` },
    openGraph: {
      title: article.meta.title,
      description: article.meta.excerpt,
      url: `https://www.waypointfranchise.com/resources/${slug}`,
      images: [{ url: "/og_default_1773343895292.png", width: 1200, height: 630, alt: article.meta.title }],
      type: "article",
      publishedTime: article.meta.date,
    },
  };
}

export default async function ArticlePage({ params }: Props) {
  const { slug } = await params;
  const article = getArticleBySlug(slug);
  if (!article) notFound();
  const { meta, content, relatedSlugs, faqs } = article;
  const related = getRelatedArticles(relatedSlugs);
  return (
    <main className="bg-[#FAF8F4] text-[#0c1929]">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Article",
            "@id": `https://www.waypointfranchise.com/resources/${slug}`,
            url: `https://www.waypointfranchise.com/resources/${slug}`,
            headline: meta.title,
            description: meta.excerpt,
            datePublished: meta.date,
            dateModified: meta.date,
            image: "https://www.waypointfranchise.com/og/og-resources.png",
            author: {
              "@type": "Person",
              "@id": "https://www.waypointfranchise.com/about#kelsey",
              name: "Kelsey Stuart",
              url: "https://www.waypointfranchise.com/about",
            },
            publisher: {
              "@type": "Organization",
              "@id": "https://www.waypointfranchise.com/#business",
              name: "Waypoint Franchise Advisors",
              url: "https://waypointfranchise.com",
            },
            mainEntityOfPage: {
              "@type": "WebPage",
              "@id": `https://www.waypointfranchise.com/resources/${slug}`,
            },
          }),
        }}
      />
      {faqs && faqs.length > 0 && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "FAQPage",
              mainEntity: faqs.map(({ q, a }) => ({
                "@type": "Question",
                name: q,
                acceptedAnswer: { "@type": "Answer", text: a },
              })),
            }),
          }}
        />
      )}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            itemListElement: [
              {
                "@type": "ListItem",
                position: 1,
                name: "Home",
                item: "https://waypointfranchise.com",
              },
              {
                "@type": "ListItem",
                position: 2,
                name: "Resources",
                item: "https://www.waypointfranchise.com/resources",
              },
              {
                "@type": "ListItem",
                position: 3,
                name: meta.title,
                item: `https://www.waypointfranchise.com/resources/${slug}`,
              },
            ],
          }),
        }}
      />
      <section className="max-w-3xl mx-auto px-6 pt-16 sm:pt-24 pb-10">
        <Link href="/resources" className="inline-flex items-center text-xs text-[#8E3012] tracking-wide uppercase font-medium hover:text-[#CC6535] transition-colors mb-8">
          ← Resources
        </Link>
        <p className="text-xs text-[#8E3012] tracking-[0.18em] uppercase font-medium mb-4">{meta.category}</p>
        <h1 className="font-playfair text-3xl sm:text-4xl md:text-5xl leading-tight mb-6">{meta.title}</h1>
        <div className="flex items-center gap-4 text-xs text-[#7a7a7a]">
          <span>Kelsey Stuart</span>
          <span>·</span>
          <span>Published <time dateTime={meta.date}>{new Date(meta.date + "T12:00:00").toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}</time></span>
        </div>
        <div className="w-full h-px bg-[#e8e0d0] mt-8" />
      </section>
      <article className="max-w-3xl mx-auto px-6 pb-12 sm:pb-16 prose prose-slate prose-headings:font-playfair prose-headings:text-[#0c1929] prose-a:text-[#8E3012] prose-a:no-underline hover:prose-a:underline prose-hr:border-[#e8e0d0] max-w-none">
        <MDXRemote source={content} options={{ mdxOptions: { remarkPlugins: [remarkGfm] } }} />
      </article>
      <section className="max-w-3xl mx-auto px-6">
        <InlineCapture />
      </section>
      <RelatedArticles articles={related} />
      {/* Newsletter subscribe callout — appears on every article */}
      <section className="border-t border-[#e8e0d0] bg-white py-10 px-6">
        <div className="max-w-3xl mx-auto">
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-5">
            <p className="text-xs font-semibold tracking-widest text-[#8E3012] uppercase">Free Newsletter</p>
            <span className="hidden sm:inline text-[#d0c8b8] text-xs">·</span>
            <p className="text-xs text-[#9a9a8a] tracking-wide">The Franchise Dispatch — honest takes, no pitch</p>
          </div>
          <p className="font-playfair text-lg sm:text-xl text-[#0c1929] mb-4 leading-snug">
            Want the real numbers, not the brochure?
          </p>
          <NewsletterForm variant="inline" />
        </div>
      </section>
      {/* Before You Go: only shown on articles with checklistSlug in frontmatter */}
      {meta.checklistSlug && (
        <section className="border-t border-[#e8e0d0] bg-[#FAF8F4] py-10 px-6">
          <div className="max-w-3xl mx-auto">
            <EmailCapture variant="article" checklistSlug={meta.checklistSlug} articleSlug={slug} />
          </div>
        </section>
      )}
      {/* Archetype quiz callout */}
      <section className="border-t border-[#e8e0d0] bg-[#FAF8F4] py-10 px-6">
        <div className="max-w-3xl mx-auto flex flex-col sm:flex-row items-start sm:items-center gap-6">
          <div className="flex-1">
            <p className="text-xs font-semibold tracking-widest text-[#8E3012] uppercase mb-1">Not Sure Which Category Fits You?</p>
            <p className="font-playfair text-xl text-[#0c1929] mb-1">Find your owner type.</p>
            <p className="text-sm text-[#5a5a4a] leading-relaxed">8 questions. Tells you which industry categories match your working style and which to avoid.</p>
          </div>
          <Link
            href="/archetype"
            className="shrink-0 inline-flex items-center justify-center px-6 py-3 text-sm font-semibold text-[#0c1929] bg-[#CC6535] hover:bg-[#D4724A] rounded-lg transition-all min-h-[44px] whitespace-nowrap"
          >
            Take the Quiz →
          </Link>
        </div>
      </section>
      {/* Corporate Escape Kit callout — targeted early-journey articles only */}
      {meta.escapeKit && (
        <section className="border-t border-[#e8e0d0] bg-[#f2ede3] py-10 px-6">
          <div className="max-w-3xl mx-auto flex flex-col sm:flex-row items-start sm:items-center gap-6">
            <div className="flex-1">
              <p className="text-xs font-semibold tracking-widest text-[#8E3012] uppercase mb-1">Free Guide</p>
              <p className="font-playfair text-xl text-[#0c1929] mb-1">The Corporate Escape Kit</p>
              <p className="text-sm text-[#5a5a4a] leading-relaxed">
                The financial mechanics of franchising vs. W2 in five sections. What it actually costs,
                how SBA financing works, and the severance calculation most people miss.
              </p>
            </div>
            <Link
              href="/escape-kit"
              className="shrink-0 inline-flex items-center justify-center px-6 py-3 text-sm font-semibold text-white bg-[#0c1929] hover:bg-[#122640] rounded-lg transition-all min-h-[44px] whitespace-nowrap"
            >
              Get the Guide →
            </Link>
          </div>
        </section>
      )}
      <section className="bg-[#0c1929] py-14 px-6 text-center">
        <p className="font-playfair text-xl sm:text-2xl text-white mb-4">Ready to talk through your situation?</p>
        <p className="text-white/70 mb-8 max-w-sm mx-auto text-sm leading-relaxed">30 minutes. No pitch. Just an honest conversation about where you stand.</p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link href="/book" className="inline-flex items-center justify-center px-8 py-4 text-sm font-semibold tracking-wide text-[#0c1929] bg-[#CC6535] hover:bg-[#D4724A] rounded-lg transition-all min-h-[48px]">Book a Free Call</Link>
          <Link href="/scorecard" className="inline-flex items-center justify-center px-8 py-4 text-sm font-semibold tracking-wide text-white border border-white/25 hover:bg-white/10 rounded-lg transition-all min-h-[48px]">Take the Readiness Quiz</Link>
        </div>
        <p className="mt-5 text-sm text-white/50">
          Prefer to text?{" "}
          <a href="sms:+12149951062" className="text-white/70 hover:text-white transition-colors underline">Text Kelsey directly →</a>
        </p>
        <p className="mt-6 text-sm text-white/40">
          Want to see how the process works first?{" "}
          <Link href="/process" className="text-white/60 hover:text-white/80 underline transition-colors">See the full process →</Link>
        </p>
      </section>
    </main>
  );
}

