import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { MDXRemote } from "next-mdx-remote/rsc";
import { getAllArticles, getArticleBySlug, getRelatedArticles } from "../../../../lib/articles";
import RelatedArticles from "../../../../components/RelatedArticles";

type Props = { params: Promise<{ slug: string }> };

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
    alternates: { canonical: `https://waypointfranchise.com/resources/${slug}` },
    openGraph: {
      title: article.meta.title,
      description: article.meta.excerpt,
      url: `https://waypointfranchise.com/resources/${slug}`,
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
            "@type": "BlogPosting",
            "@id": `https://waypointfranchise.com/resources/${slug}`,
            url: `https://waypointfranchise.com/resources/${slug}`,
            headline: meta.title,
            description: meta.excerpt,
            datePublished: meta.date,
            dateModified: meta.date,
            image: "https://waypointfranchise.com/og_default_1773343895292.png",
            author: {
              "@type": "Person",
              "@id": "https://waypointfranchise.com/about#kelsey",
              name: "Kelsey Stuart",
              url: "https://waypointfranchise.com/about",
            },
            publisher: {
              "@type": "Organization",
              "@id": "https://waypointfranchise.com/#business",
              name: "Waypoint Franchise Advisors",
              url: "https://waypointfranchise.com",
            },
            mainEntityOfPage: {
              "@type": "WebPage",
              "@id": `https://waypointfranchise.com/resources/${slug}`,
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
      <section className="max-w-3xl mx-auto px-6 pt-16 sm:pt-24 pb-10">
        <Link href="/resources" className="inline-flex items-center text-xs text-[#c08b3e] tracking-wide uppercase font-medium hover:text-[#d4a55a] transition-colors mb-8">
          ← Resources
        </Link>
        <p className="text-xs text-[#c08b3e] tracking-[0.18em] uppercase font-medium mb-4">{meta.category}</p>
        <h1 className="font-playfair text-3xl sm:text-4xl md:text-5xl leading-tight mb-6">{meta.title}</h1>
        <div className="flex items-center gap-4 text-xs text-[#7a7a7a]">
          <span>Kelsey Stuart</span>
          <span>·</span>
          <time dateTime={meta.date}>{new Date(meta.date + "T12:00:00").toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}</time>
        </div>
        <div className="w-full h-px bg-[#e8e0d0] mt-8" />
      </section>
      <article className="max-w-3xl mx-auto px-6 pb-12 sm:pb-16 prose prose-slate prose-headings:font-playfair prose-headings:text-[#0c1929] prose-a:text-[#c08b3e] prose-a:no-underline hover:prose-a:underline prose-hr:border-[#e8e0d0] max-w-none">
        <MDXRemote source={content} />
      </article>
      <RelatedArticles articles={related} />
      <section className="bg-[#0c1929] py-14 px-6 text-center">
        <p className="font-playfair text-xl sm:text-2xl text-white mb-4">Ready to talk through your situation?</p>
        <p className="text-white/70 mb-8 max-w-sm mx-auto text-sm leading-relaxed">30 minutes. No pitch. Just an honest conversation about where you stand.</p>
        <Link href="/book" className="inline-block bg-[#d4a55a] text-white px-8 py-4 text-sm tracking-widest uppercase hover:bg-[#c4953a] transition-colors">Book a Free Call</Link>
      </section>
    </main>
  );
}

