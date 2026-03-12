import type { Metadata } from "next";
import TidyCalEmbed from "./TidyCalEmbed";

export const metadata: Metadata = {
  title: "Book a Free Discovery Call",
  description:
    "30 minutes with Kelsey Stuart. No pitch, no agenda. Just an honest conversation about whether franchise ownership makes sense for your situation right now.",
  alternates: { canonical: "https://waypointfranchise.com/book" },
  openGraph: {
    title: "Book a Free 30-Min Call | Waypoint Franchise Advisors",
    description:
      "Pick a time that works. 30 minutes, completely free. If franchising isn't right for you, I'll tell you that too.",
    url: "https://waypointfranchise.com/book",
    images: [{ url: "/og_book_1773343995375.png", width: 1200, height: 630, alt: "Book a Call with Kelsey Stuart" }],
  },
};

export default function BookPage() {
  return (
    <main className="bg-[#FAF8F4] text-[#0c1929]">

      {/* Hero — compact, letting the content below breathe */}
      <section className="relative py-14 sm:py-20 overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: "url('/images/mountain-lake.png')" }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-[#0c1929]/45 to-[#0c1929]/25" />
        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 text-center">
          <p className="text-sm font-semibold text-[#d4a55a] uppercase tracking-[0.2em] mb-3">
            Let&apos;s Talk
          </p>
          <h1
            className="text-3xl sm:text-4xl md:text-5xl font-bold text-white tracking-tight"
            style={{ textShadow: "0 2px 12px rgba(12,25,41,0.5)" }}
          >
            Book a Free Discovery Call
          </h1>
          <p
            className="mt-4 text-base sm:text-lg text-white/85 max-w-xl mx-auto leading-relaxed"
            style={{ textShadow: "0 1px 8px rgba(12,25,41,0.5)" }}
          >
            30 minutes. No pitch. If franchise ownership doesn&apos;t make sense
            for your situation, I will tell you that.
          </p>
        </div>
      </section>

      {/* Two-column layout: Kelsey info + calendar */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_2fr] gap-8 lg:gap-12 items-start">

          {/* Left: Kelsey info card */}
          <div className="lg:sticky lg:top-24 space-y-6">

            {/* Photo */}
            <div
              className="w-full aspect-[4/3] rounded-xl overflow-hidden bg-cover bg-center bg-[#0c1929]"
              style={{ backgroundImage: "url('/images/kelsey-campfire-group.png')" }}
            />

            {/* Name + title */}
            <div className="border-t-2 border-[#d4a55a] pt-5">
              <p className="text-xs font-semibold text-[#d4a55a] uppercase tracking-[0.2em] mb-1">
                Your advisor
              </p>
              <h2 className="font-playfair text-2xl text-[#0c1929] mb-1">
                Kelsey Stuart
              </h2>
              <p className="text-sm text-[#5a5a4a]">
                Franchise Advisor &middot; Whitefish, MT
              </p>
            </div>

            {/* What to expect */}
            <div className="bg-white border border-[#e8e0d0] rounded-xl p-5 space-y-4">
              <p className="text-xs font-semibold text-[#d4a55a] uppercase tracking-[0.15em]">
                What to expect
              </p>
              {[
                { icon: "30", label: "30 minutes, completely free" },
                { icon: "✓", label: "No brands shown on the first call" },
                { icon: "✓", label: "Real conversation, not a pitch" },
                { icon: "✓", label: "Honest answer, even if it's no" },
              ].map(({ icon, label }) => (
                <div key={label} className="flex items-start gap-3">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-[#d4a55a]/10 text-[#d4a55a] text-xs font-bold flex items-center justify-center">
                    {icon}
                  </span>
                  <span className="text-sm text-[#3a3a2e] leading-snug pt-0.5">
                    {label}
                  </span>
                </div>
              ))}
            </div>

            {/* Cost note */}
            <p className="text-xs text-[#9a9a8a] text-center leading-relaxed">
              100% free to you. Franchise brands pay the referral fee when you purchase, not before.
            </p>
          </div>

          {/* Right: TidyCal calendar */}
          <div className="bg-white rounded-xl border border-[#e8e0d0] shadow-sm overflow-hidden">
            <TidyCalEmbed path="m7v2jox/waypoint30" />
          </div>

        </div>
      </section>

    </main>
  );
}
