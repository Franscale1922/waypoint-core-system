import type { Metadata } from "next";
import Link from "next/link";
import NewsletterForm from "../../components/NewsletterForm";

export const metadata: Metadata = {
  title: "The Franchise Dispatch Newsletter | Free Weekly Insights",
  description:
    "A no-hype newsletter on franchise ownership, financial independence, and the honest math of leaving corporate. From Kelsey Stuart, former Bloomin' Blinds franchisor.",
  alternates: { canonical: "https://www.waypointfranchise.com/newsletter" },
  openGraph: {
    title: "The Franchise Dispatch | Waypoint Franchise Advisors",
    description:
      "Real talk on franchise ownership, FDD analysis, and the financial mechanics of leaving corporate. Free weekly newsletter from Kelsey Stuart.",
    url: "https://www.waypointfranchise.com/newsletter",
    images: [{ url: "/og_default_1773343895292.png", width: 1200, height: 630, alt: "The Franchise Dispatch Newsletter" }],
  },
};

const WHAT_YOU_GET = [
  {
    icon: "📊",
    title: "Franchise model breakdowns",
    text: "How specific brands actually work: margins, royalties, territory sizes, and what the FDD won't tell you.",
  },
  {
    icon: "💡",
    title: "The honest financial math",
    text: "Ramp timelines, owner salary expectations, SBA loan realities, and how to read a franchise disclosure.",
  },
  {
    icon: "🧲",
    title: "Career transition intel",
    text: "What Corporate Refugees get wrong about timing, capital, and picking the right category for their background.",
  },
  {
    icon: "🗺️",
    title: "Territory & market analysis",
    text: "How to evaluate whether a market is saturated, under-served, or just misunderstood.",
  },
];

export default function NewsletterPage() {
  return (
    <main className="bg-[#FAF8F4] text-[#0c1929]">
      {/* ── Hero ── */}
      <section className="py-20 sm:py-28 md:py-36 border-b border-[#e2ddd2]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#8E3012] mb-5">
            Free Newsletter
          </p>
          <h1 className="font-playfair text-4xl sm:text-5xl md:text-6xl text-[#0c1929] leading-tight mb-6 max-w-3xl">
            The Franchise Dispatch
          </h1>
          <p className="text-base sm:text-lg md:text-xl text-[#5a5a4a] leading-relaxed max-w-2xl mb-10">
            No hype. No pitch decks. Just the honest mechanics of franchise ownership —
            financial models, FDD red flags, market analysis, and what Corporate Refugees
            actually need to know before they sign anything.
          </p>

          <div className="bg-white border border-[#e2ddd2] rounded-2xl p-8 sm:p-10 max-w-2xl shadow-sm">
            <p className="text-sm font-semibold text-[#0c1929] mb-6">
              Join free — cancel any time.
            </p>
            <NewsletterForm variant="page" />
          </div>

          <p className="mt-6 text-xs text-[#9a9a8a] max-w-lg">
            Your info is never shared. Unsubscribe in one click.
            Already subscribed via the scorecard or a checklist download? You&apos;re already on the list.
          </p>
        </div>
      </section>

      {/* ── What you get ── */}
      <section className="py-20 sm:py-28">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#8E3012] mb-5">
            What&apos;s Inside
          </p>
          <h2 className="font-playfair text-3xl sm:text-4xl text-[#0c1929] mb-12 max-w-2xl leading-tight">
            What you actually need to know. What most consultants won&apos;t tell you.
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 sm:gap-8">
            {WHAT_YOU_GET.map(({ icon, title, text }) => (
              <div key={title} className="bg-white border border-[#e2ddd2] rounded-xl p-6 sm:p-8">
                <span className="text-2xl mb-4 block">{icon}</span>
                <h3 className="font-semibold text-[#0c1929] mb-2 text-base">{title}</h3>
                <p className="text-sm text-[#5a5a4a] leading-relaxed">{text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Who it's for ── */}
      <section className="py-20 sm:py-28 bg-[#0c1929]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#CC6535] mb-5">
            Who This Is For
          </p>
          <h2 className="font-playfair text-3xl sm:text-4xl text-white mb-8 max-w-2xl leading-tight">
            Written for people who are serious about the decision. Or getting there.
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-px bg-white/10 rounded-xl overflow-hidden mt-10">
            {[
              { label: "The 3–5 Year Planner", text: "Still employed. Quietly researching. Wants to understand the math before committing." },
              { label: "The Corporate Expat", text: "Laid off or about to be. Capital is moving. Timeline is real." },
              { label: "The Off-Ramp Builder", text: "Wants to start building income on the side before leaving the W2 behind." },
            ].map(({ label, text }) => (
              <div key={label} className="p-8 bg-[#0f2035]">
                <h3 className="text-[#CC6535] font-semibold text-sm mb-3">{label}</h3>
                <p className="text-white/60 text-sm leading-relaxed">{text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Bottom subscribe ── */}
      <section className="py-20 sm:py-28 border-t border-[#e2ddd2]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#8E3012] mb-5">
            Start Here
          </p>
          <h2 className="font-playfair text-3xl sm:text-4xl text-[#0c1929] mb-4 leading-tight">
            Free. Honest. Worth reading.
          </h2>
          <p className="text-base text-[#5a5a4a] mb-10 max-w-lg mx-auto leading-relaxed">
            One issue at a time. No filler. Unsubscribe whenever you want.
          </p>
          <div className="flex justify-center">
            <div className="bg-white border border-[#e2ddd2] rounded-2xl p-8 sm:p-10 w-full max-w-xl shadow-sm text-left">
              <NewsletterForm variant="page" />
            </div>
          </div>
          <p className="mt-8 text-sm text-[#9a9a8a]">
            Not ready to subscribe yet?{" "}
            <Link href="/resources" className="text-[#8E3012] hover:text-[#CC6535] transition-colors">
              Browse the free article library →
            </Link>
          </p>
        </div>
      </section>
    </main>
  );
}
