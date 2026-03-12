import type { Metadata } from "next";
import TidyCalEmbed from "@/app/components/TidyCalEmbed";

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
    <>
      {/* Hero */}
      <section className="relative py-14 sm:py-16 md:py-20 overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: "url('/images/mountain-lake.png')" }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-[#0c1929]/55 to-[#0c1929]/35" />
        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 text-center">
          <p className="text-sm font-semibold text-[#d4a55a] uppercase tracking-[0.2em] mb-3 sm:mb-4">
            Let&apos;s Talk
          </p>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white tracking-tight">
            Book a Free Discovery Call
          </h1>
          <p className="mt-4 sm:mt-5 text-base sm:text-lg text-slate-300 max-w-2xl mx-auto leading-relaxed">
            30 minutes. No pitch. Just a real conversation about where you are,
            what you are thinking, and whether franchise ownership makes sense
            for your situation. If it does not, I will tell you.
          </p>
        </div>
      </section>

      {/* TidyCal Embed */}
      <section className="py-10 sm:py-16 bg-[#FAF8F4]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <div className="rounded-xl sm:rounded-2xl overflow-hidden border border-slate-100 shadow-lg bg-white">
            <TidyCalEmbed path="m7v2jox/waypoint30" />
          </div>
          <p className="mt-5 sm:mt-6 text-center text-xs sm:text-sm text-slate-400">
            100% free. Franchise brands pay the referral fee, not you.
          </p>
        </div>
      </section>
    </>
  );
}
