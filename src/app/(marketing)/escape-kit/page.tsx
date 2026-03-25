import type { Metadata } from "next";
import Link from "next/link";
import EscapeKitCaptureForm from "../../components/EscapeKitCaptureForm";

export const metadata: Metadata = {
  title: "The Financial Safety Nets of Franchising vs. W2 | Waypoint Franchise Advisors",
  description:
    "A free guide for corporate professionals: what franchising actually costs, how SBA financing works, and what most W2 employees don't understand about their financial position.",
  openGraph: {
    title: "The Financial Safety Nets of Franchising vs. W2 | Waypoint Franchise Advisors",
    description:
      "Free guide: five sections on franchise economics, capital deployment, and the W2 safety net myth — for corporate professionals evaluating ownership as a next chapter.",
    url: "https://www.waypointfranchise.com/escape-kit",
    images: [{ url: "/og/og-escape-kit.png", width: 1200, height: 630, alt: "The Financial Safety Nets of Franchising vs. W2 — Waypoint Franchise Advisors" }],
  },
  alternates: { canonical: "https://www.waypointfranchise.com/escape-kit" },
};

const escapeKitSchema = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebPage",
      "@id": "https://www.waypointfranchise.com/escape-kit",
      url: "https://www.waypointfranchise.com/escape-kit",
      name: "The Financial Safety Nets of Franchising vs. W2 | Waypoint Franchise Advisors",
      description:
        "A free guide for corporate professionals evaluating franchise ownership — covering franchise economics, capital deployment, and the W2 safety net myth.",
      inLanguage: "en-US",
      isPartOf: { "@id": "https://www.waypointfranchise.com/#website" },
    },
    {
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: "https://www.waypointfranchise.com" },
        { "@type": "ListItem", position: 2, name: "The Corporate Escape Kit", item: "https://www.waypointfranchise.com/escape-kit" },
      ],
    },
  ],
};

const SECTIONS = [
  {
    number: "01",
    title: "The W2 Safety Net Myth",
    desc: "Why the stability most corporate professionals feel is more conditional than they think. What a W2 actually guarantees.",
  },
  {
    number: "02",
    title: "How Franchise Economics Reduce Risk",
    desc: "The asset-vs-faucet distinction, FDD transparency requirements, and why a $90k franchise compounds differently than a $180k salary.",
  },
  {
    number: "03",
    title: "The Capital Deployment Framework",
    desc: "What a $200k franchise actually costs out-of-pocket with SBA financing, the severance calculation most people miss, and the four questions to answer first.",
  },
  {
    number: "04",
    title: "Three Questions for Year Five",
    desc: "The questions every senior executive should answer before their runway narrows. Why the best candidates aren't people in crisis.",
  },
  {
    number: "05",
    title: "What a Good Advisor Actually Does",
    desc: "What the first conversation looks like with someone who earns nothing based on which franchise you choose.",
  },
];

export default function EscapeKitPage() {
  return (
    <main className="bg-[#FAF8F4] text-[#0c1929]">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(escapeKitSchema) }}
      />

      {/* ── Hero ── */}
      <section className="bg-[#0c1929] pt-20 pb-16 px-6">
        <div className="max-w-4xl mx-auto">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#CC6535] mb-4">
            The Corporate Escape Kit — Free Guide
          </p>
          <h1 className="font-playfair text-4xl sm:text-5xl text-white mb-5 leading-tight">
            The Financial Safety Nets<br className="hidden sm:block" /> of Franchising vs. W2
          </h1>
          <p className="text-white/65 text-lg max-w-2xl leading-relaxed">
            Five sections on franchise economics, capital deployment, and what most corporate
            professionals don&rsquo;t understand about their financial position until they do the math.
          </p>
        </div>
      </section>

      {/* ── What's inside ── */}
      <section className="max-w-5xl mx-auto px-5 sm:px-10 py-16">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#8E3012] mb-8">
          What&rsquo;s Inside
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {SECTIONS.map((s) => (
            <div
              key={s.number}
              className="bg-white border border-[#e2ddd2] rounded-xl p-6 flex flex-col gap-3"
            >
              <span className="text-xs font-bold tracking-widest text-[#CC6535]">{s.number}</span>
              <h2 className="font-playfair text-base text-[#0c1929] leading-snug">{s.title}</h2>
              <p className="text-sm text-[#5a5a4a] leading-relaxed">{s.desc}</p>
            </div>
          ))}
          {/* Sixth tile */}
          <div className="bg-[#0c1929] rounded-xl p-6 flex flex-col gap-3 justify-center">
            <p className="text-sm text-white/70 leading-relaxed">
              Delivered to your inbox in minutes. No pitch inside. Unsubscribe anytime.
            </p>
          </div>
        </div>
      </section>

      {/* ── Capture form — trust signals ABOVE the submit button ── */}
      <section className="max-w-2xl mx-auto px-5 sm:px-10 pb-20">
        {/* Trust strip — above the form */}
        <div className="bg-[#0c1929]/5 border border-[#e2ddd2] rounded-xl px-6 py-5 mb-6 flex flex-col sm:flex-row gap-4 sm:gap-6 items-start sm:items-center">
          <div className="flex-shrink-0">
            <div className="w-10 h-10 rounded-full bg-[#CC6535]/15 flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#CC6535" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
              </svg>
            </div>
          </div>
          <p className="text-sm text-[#3a3a3a] leading-relaxed">
            Waypoint advises VP, Director, and C-suite professionals exploring franchise ownership.
            The advisory is <strong>free to candidates</strong>. Kelsey is compensated by franchise brands
            only after a match is made, and only when she believes it&rsquo;s the right fit.
          </p>
        </div>

        <div className="bg-white border border-[#e2ddd2] rounded-2xl p-8 sm:p-10">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#8E3012] mb-3">
            Get the Guide
          </p>
          <h2 className="font-playfair text-2xl sm:text-3xl text-[#0c1929] mb-2 leading-snug">
            Send me the Corporate Escape Kit
          </h2>
          <p className="text-sm text-[#5a5a4a] mb-8 leading-relaxed">
            Enter your name and email. The guide arrives in your inbox within a few minutes.
            No pitch inside. No obligation attached.
          </p>
          <EscapeKitCaptureForm />
          <p className="mt-5 text-xs text-[#9a9a8a] leading-relaxed">
            By submitting, you&rsquo;ll receive the guide and a short follow-up sequence.
            You can unsubscribe from any email with one click.
          </p>
        </div>
      </section>

      {/* ── Bottom CTA ── */}
      <section className="border-t border-[#e2ddd2] py-12 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <p className="text-sm text-[#5a5a4a] leading-relaxed max-w-xl mx-auto mb-6">
            Not ready to download yet? The Readiness Scorecard takes four minutes and gives you a
            score that tells you something concrete about where you stand before any conversation.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Link
              href="/scorecard"
              className="inline-flex items-center justify-center px-7 py-3 text-sm font-semibold tracking-wide text-white bg-[#CC6535] hover:bg-[#D4724A] rounded-lg transition-all min-h-[44px]"
            >
              Take the Readiness Scorecard
            </Link>
            <Link
              href="/book"
              className="inline-flex items-center justify-center px-7 py-3 text-sm font-semibold tracking-wide text-[#0c1929] border border-[#0c1929]/20 hover:bg-[#0c1929]/5 rounded-lg transition-all min-h-[44px]"
            >
              Book a Free Call
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
