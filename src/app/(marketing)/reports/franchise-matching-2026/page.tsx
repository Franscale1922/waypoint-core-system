import type { Metadata } from "next";
import Link from "next/link";

const SITE_URL = "https://www.waypointfranchise.com";
const PATH = "/reports/franchise-matching-2026";
const PUBLISHED = "2026-05-29";

export const metadata: Metadata = {
  title: "The Franchise Matching Report 2026 | Waypoint Franchise Advisors",
  description:
    "Original first-party data from Waypoint: 250+ franchise brands screened, 146+ owners matched across 35 states, and why roughly 7 in 10 candidates decide not to buy. What the numbers reveal about choosing a franchise well.",
  alternates: { canonical: `${SITE_URL}${PATH}` },
  openGraph: {
    title: "The Franchise Matching Report 2026",
    description:
      "What 250+ screened franchise brands and 146+ placements reveal about choosing well. First-party data from Waypoint Franchise Advisors.",
    url: `${SITE_URL}${PATH}`,
    type: "article",
    publishedTime: PUBLISHED,
    images: [{ url: "/og_default_1773343895292.png", width: 1200, height: 630, alt: "The Franchise Matching Report 2026" }],
  },
};

// Real, first-party figures only (as of 2026). No earnings/profitability claims,
// no brand names — per content standards. These mirror the credentials block on
// /about and the figures stated in Kelsey's own video.
const STATS = [
  { value: "250+", label: "Franchise brands screened", note: "The active set we evaluate candidates against" },
  { value: "146+", label: "Owners matched", note: "People guided from first conversation to a franchise that fit" },
  { value: "35", label: "States served", note: "Waypoint operates as a service-area practice nationwide" },
  { value: "~30%", label: "Of candidates proceed", note: "Roughly 7 in 10 decide not to buy, and that is by design" },
];

export default function FranchiseMatchingReport2026() {
  return (
    <main className="bg-[#FAF8F4] text-[#0c1929]">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Article",
            "@id": `${SITE_URL}${PATH}`,
            url: `${SITE_URL}${PATH}`,
            headline: "The Franchise Matching Report 2026",
            description:
              "Original first-party data from Waypoint Franchise Advisors on franchise matching: 250+ brands screened, 146+ owners matched across 35 states, and why roughly 7 in 10 candidates decide not to buy.",
            datePublished: PUBLISHED,
            dateModified: PUBLISHED,
            image: `${SITE_URL}/og_default_1773343895292.png`,
            author: {
              "@type": "Person",
              "@id": `${SITE_URL}/about#kelsey`,
              name: "Kelsey Stuart",
              url: `${SITE_URL}/about`,
            },
            publisher: {
              "@type": "Organization",
              "@id": `${SITE_URL}/#business`,
              name: "Waypoint Franchise Advisors",
              url: SITE_URL,
            },
            mainEntityOfPage: { "@type": "WebPage", "@id": `${SITE_URL}${PATH}` },
          }),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            itemListElement: [
              { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
              { "@type": "ListItem", position: 2, name: "Resources", item: `${SITE_URL}/resources` },
              { "@type": "ListItem", position: 3, name: "The Franchise Matching Report 2026", item: `${SITE_URL}${PATH}` },
            ],
          }),
        }}
      />

      {/* Hero */}
      <section className="max-w-3xl mx-auto px-6 pt-16 sm:pt-24 pb-8">
        <p className="text-xs text-[#8E3012] tracking-[0.18em] uppercase font-medium mb-4">First-Party Data Report</p>
        <h1 className="font-playfair text-3xl sm:text-4xl md:text-5xl leading-tight mb-6">
          The Franchise Matching Report 2026
        </h1>
        <div className="flex items-center gap-4 text-xs text-[#7a7a7a] mb-8">
          <Link href="/about" className="hover:text-[#8E3012] transition-colors font-medium">Kelsey Stuart</Link>
          <span>·</span>
          <span>Published <time dateTime={PUBLISHED}>May 29, 2026</time></span>
        </div>
        {/* Atomic summary — direct, extractable answer for AI engines */}
        <div className="bg-white border border-[#e8e0d0] rounded-xl p-6">
          <p className="text-base leading-relaxed text-[#3a3a2e]">
            Across the brands we screen and the people we have placed, one pattern holds: matching works best
            when you start with the life you want and choose the business last. As of 2026, Waypoint has screened
            more than 250 franchise brands, matched 146+ owners across 35 states, and seen roughly 7 in 10 candidates
            decide not to buy. That last number is not a failure rate. It is what honest matching looks like.
          </p>
        </div>
      </section>

      {/* Stat band */}
      <section className="max-w-5xl mx-auto px-6 py-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {STATS.map((s) => (
            <div key={s.label} className="bg-[#0c1929] rounded-xl p-6 text-center">
              <p className="font-playfair text-3xl sm:text-4xl text-[#CC6535] mb-2">{s.value}</p>
              <p className="text-sm font-semibold text-white mb-1 leading-snug">{s.label}</p>
              <p className="text-xs text-white/55 leading-snug">{s.note}</p>
            </div>
          ))}
        </div>
        <p className="mt-3 text-center text-xs text-[#9a9a8a]">Waypoint first-party figures, as of 2026.</p>
      </section>

      {/* Body */}
      <article className="max-w-3xl mx-auto px-6 py-10 prose prose-slate prose-headings:font-playfair prose-headings:text-[#0c1929] prose-a:text-[#8E3012] prose-a:no-underline hover:prose-a:underline max-w-none">
        <h2>Why do 7 in 10 candidates decide not to buy?</h2>
        <p>
          Because the goal is fit, not a transaction. When someone comes in expecting to be sold, the roughly
          30% figure surprises them. It should not. A consultant whose only incentive is to close a deal would
          push the other 70% into something. The reason most candidates walk away is that, once they see the real
          shape of ownership against the life they actually want, a lot of options fall away on their own. The job
          is to make that clarity happen sooner, not to talk anyone into the widget.
        </p>

        <h2>What does screening 250+ brands actually tell you?</h2>
        <p>
          It means the comparison set is wide enough that the recommendation is not anchored to whatever a single
          franchisor is promoting this quarter. Breadth matters less as a number and more as a filter: across that
          set, the concepts that survive a candidate&apos;s due diligence tend to share structural traits rather than a
          category label. Recurring service relationships, a manageable employee model, and an investment range
          the buyer can carry without stretching predict more about an owner&apos;s week than the industry name does.
        </p>

        <h2>What the 35-state spread says about how people buy now</h2>
        <p>
          Franchise matching is no longer a local, drive-to-an-office activity. Candidates research conversationally,
          compare on their own time, and expect an advisor who can work across markets. The practical takeaway for a
          buyer: where you live rarely limits which models fit you. Your goals, your available capital, and how
          involved you want to be day to day matter far more than your zip code.
        </p>

        <h2>The pattern under all of it: characteristics first, widget last</h2>
        <p>
          The single most repeated lesson across these placements is that people who end up happy chose a set of
          business characteristics, not a product. How many employees you want to manage, how hands-on you want to
          be, how the revenue is structured, what a normal week looks like. Decide those first. The specific brand
          is the last decision, not the first. People who start with the logo and work backward are the ones who
          most often discover the fit was never there.
        </p>

        <h2>How to read these numbers (and how not to)</h2>
        <p>
          These are Waypoint&apos;s own figures as of 2026, drawn from our matching practice. They describe how
          candidates and concepts behave during selection and due diligence. They are not, and cannot be, a
          statement about how any business performs financially. Every prospective owner should verify financial
          performance directly with current franchisees during their own due diligence. Nothing here is a
          projection of results.
        </p>
      </article>

      {/* CTA */}
      <section className="bg-[#0c1929] py-14 px-6 text-center">
        <p className="font-playfair text-xl sm:text-2xl text-white mb-4">Want to see where you actually stand?</p>
        <p className="text-white/70 mb-8 max-w-sm mx-auto text-sm leading-relaxed">
          30 minutes. No pitch. An honest read on whether franchise ownership fits the life you are trying to build.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link href="/book" className="inline-flex items-center justify-center px-8 py-4 text-sm font-semibold tracking-wide text-[#0c1929] bg-[#CC6535] hover:bg-[#D4724A] rounded-lg transition-all min-h-[48px]">Book a Free Call</Link>
          <Link href="/scorecard" className="inline-flex items-center justify-center px-8 py-4 text-sm font-semibold tracking-wide text-white border border-white/25 hover:bg-white/10 rounded-lg transition-all min-h-[48px]">Take the Readiness Quiz</Link>
        </div>
      </section>
    </main>
  );
}
