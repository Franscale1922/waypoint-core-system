import type { Metadata } from "next";
import Link from "next/link";
import EscapeKitCaptureForm from "../../components/EscapeKitCaptureForm";

export const metadata: Metadata = {
  title: "The Corporate Escape Kit | Waypoint Franchise Advisors",
  description:
    "A free guide to the financial safety nets of franchising vs. W2 employment. For corporate professionals evaluating ownership as a next chapter.",
  openGraph: {
    title: "The Corporate Escape Kit | Waypoint Franchise Advisors",
    description:
      "Free guide: financial safety nets of franchising vs. W2. Five sections on the realities most people don't think through before making any decision about business ownership.",
    url: "https://www.waypointfranchise.com/escape-kit",
    images: [{ url: "/og/og-escape-kit.png", width: 1200, height: 630, alt: "The Corporate Escape Kit" }],
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
      name: "The Corporate Escape Kit | Waypoint Franchise Advisors",
      description:
        "A free guide to the financial safety nets of franchising vs. W2 employment.",
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
    desc: "Why the stability most corporate professionals feel is more conditional than they think.",
  },
  {
    number: "02",
    title: "How Franchise Economics Reduce Risk",
    desc: "Known model, disclosed unit economics, and why transparency is a legal requirement — not a pitch.",
  },
  {
    number: "03",
    title: "The Capital Deployment Framework",
    desc: "What you actually need, what's at risk, and the severance calculation most people miss.",
  },
  {
    number: "04",
    title: "Three Questions for Year Five",
    desc: "The questions every senior executive should answer before their window narrows.",
  },
  {
    number: "05",
    title: "What a Good Advisor Actually Does",
    desc: "What the first conversation looks like with someone who doesn't earn more based on what you buy.",
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
            Free Guide
          </p>
          <h1 className="font-playfair text-4xl sm:text-5xl text-white mb-5 leading-tight">
            The Corporate Escape Kit
          </h1>
          <p className="text-white/65 text-lg max-w-2xl leading-relaxed">
            Financial Safety Nets of Franchising vs. W2 — a five-section guide for
            corporate professionals who are thinking seriously about what comes next.
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
          {/* Sixth tile: the CTA note */}
          <div className="bg-[#0c1929] border border-[#0c1929] rounded-xl p-6 flex flex-col gap-3 justify-center">
            <p className="text-sm text-white/70 leading-relaxed">
              Delivered to your inbox in minutes. No spam. Unsubscribe anytime.
            </p>
          </div>
        </div>
      </section>

      {/* ── Capture form ── */}
      <section className="max-w-2xl mx-auto px-5 sm:px-10 pb-20">
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

      {/* ── Trust / credibility strip ── */}
      <section className="border-t border-[#e2ddd2] py-12 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <p className="text-sm text-[#5a5a4a] leading-relaxed max-w-xl mx-auto mb-6">
            Waypoint works with corporate professionals at VP, Director, and C-suite level who are
            evaluating franchise ownership as a next chapter. The advisory is free to candidates.
            Franchise brands compensate Kelsey only after a match is made.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Link
              href="/scorecard"
              className="inline-flex items-center justify-center px-7 py-3 text-sm font-semibold tracking-wide text-[#0c1929] bg-[#CC6535] hover:bg-[#D4724A] rounded-lg transition-all min-h-[44px]"
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
