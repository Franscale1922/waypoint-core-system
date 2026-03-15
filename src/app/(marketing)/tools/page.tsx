import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Free Franchise Tools | Waypoint Franchise Advisors",
  description:
    "Two free tools to help you figure out where you stand before talking to anyone. The Franchise Readiness Quiz tells you if your capital, mindset, and situation are aligned. The Archetype Quiz tells you which franchise categories fit the way you naturally work.",
  alternates: { canonical: "https://waypointfranchise.com/tools" },
  openGraph: {
    title: "Free Franchise Tools | Waypoint Franchise Advisors",
    description:
      "Two free assessments — franchise readiness and personality archetype — that tell you where you stand before committing to a conversation.",
    url: "https://waypointfranchise.com/tools",
    images: [{ url: "/og_default_1773343895292.png", width: 1200, height: 630, alt: "Free Franchise Tools" }],
  },
};

export default function ToolsPage() {
  return (
    <main className="bg-[#FAF8F4] text-[#0c1929]">

      {/* Hero */}
      <section className="pt-20 sm:pt-28 pb-14 sm:pb-20 px-6 border-b border-[#e8e0d0]">
        <div className="max-w-3xl mx-auto">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#c08b3e] mb-4">Free Tools</p>
          <h1 className="font-playfair text-4xl sm:text-5xl text-[#0c1929] leading-tight mb-6 max-w-2xl">
            Figure out where you stand — before talking to anyone.
          </h1>
          <p className="text-base sm:text-lg text-[#4a4a3e] leading-relaxed max-w-2xl">
            Two short assessments. No account. No email required to start. Each one answers a different question about your situation and takes under five minutes to complete.
          </p>
        </div>
      </section>

      {/* Quiz cards */}
      <section className="max-w-5xl mx-auto px-6 py-16 sm:py-24">
        <div className="grid gap-8 sm:grid-cols-2">

          {/* Readiness Quiz card */}
          <div className="bg-white border border-[#e8e0d0] rounded-xl p-8 sm:p-10 flex flex-col">
            <div className="mb-6">
              <p className="text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-[#c08b3e] mb-4">Assessment 1 of 2</p>
              <div className="w-8 h-[2px] bg-[#d4a55a] mb-5" />
              <h2 className="font-playfair text-2xl sm:text-3xl text-[#0c1929] leading-snug mb-4">
                Franchise Readiness Quiz
              </h2>
              <p className="text-sm text-[#4a4a3e] leading-relaxed mb-6">
                The most common reason franchise searches stall is not lack of interest — it is discovering too late that the timing, capital, or mindset was not actually in place. This quiz evaluates your situation against the real criteria that determine whether this is the right move right now.
              </p>

              <div className="space-y-3 mb-8">
                <p className="text-xs font-semibold text-[#0c1929] uppercase tracking-[0.15em] mb-4">What you will find out</p>
                {[
                  "Whether your liquid capital is in the realistic range for solid options",
                  "How your risk tolerance and timeline align with franchise ownership",
                  "Whether your goals — income, autonomy, lifestyle — are a fit for this path",
                  "A plain-language read on where you stand and what to think about next",
                ].map((item) => (
                  <div key={item} className="flex items-start gap-3">
                    <div className="mt-1.5 w-1.5 h-1.5 rounded-full bg-[#d4a55a] shrink-0" />
                    <p className="text-sm text-[#5a5a4a] leading-relaxed">{item}</p>
                  </div>
                ))}
              </div>

              <div className="border-t border-[#e8e0d0] pt-6 flex flex-wrap gap-4 text-xs text-[#7a7a7a]">
                <span>⏱ About 4 minutes</span>
                <span>· 12 questions</span>
                <span>· Scored results</span>
              </div>
            </div>

            <div className="mt-auto pt-6">
              <Link
                href="/scorecard"
                className="inline-flex items-center justify-center w-full px-7 py-4 text-sm font-semibold tracking-wide text-[#0c1929] bg-[#d4a55a] hover:bg-[#e2be80] rounded-lg transition-all min-h-[48px]"
              >
                Take the Readiness Quiz →
              </Link>
            </div>
          </div>

          {/* Archetype Quiz card */}
          <div className="bg-white border border-[#e8e0d0] rounded-xl p-8 sm:p-10 flex flex-col">
            <div className="mb-6">
              <p className="text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-[#c08b3e] mb-4">Assessment 2 of 2</p>
              <div className="w-8 h-[2px] bg-[#d4a55a] mb-5" />
              <h2 className="font-playfair text-2xl sm:text-3xl text-[#0c1929] leading-snug mb-4">
                Franchise Archetype Quiz
              </h2>
              <p className="text-sm text-[#4a4a3e] leading-relaxed mb-6">
                Most people start a franchise search by asking "what's available?" The better question is "what kind of business fits the way I naturally work?" Your operating style, management preference, and how you add value all point toward certain franchise categories and away from others. This quiz identifies your archetype and maps it to the industries that typically align with it.
              </p>

              <div className="space-y-3 mb-8">
                <p className="text-xs font-semibold text-[#0c1929] uppercase tracking-[0.15em] mb-4">What you will find out</p>
                {[
                  "Your franchise ownership archetype — the type of operator you naturally are",
                  "Which franchise categories tend to fit your working style well",
                  "Which categories are typically a poor fit — and why",
                  "A starting point for narrowing your search before talking to anyone",
                ].map((item) => (
                  <div key={item} className="flex items-start gap-3">
                    <div className="mt-1.5 w-1.5 h-1.5 rounded-full bg-[#d4a55a] shrink-0" />
                    <p className="text-sm text-[#5a5a4a] leading-relaxed">{item}</p>
                  </div>
                ))}
              </div>

              <div className="border-t border-[#e8e0d0] pt-6 flex flex-wrap gap-4 text-xs text-[#7a7a7a]">
                <span>⏱ About 3 minutes</span>
                <span>· 8 questions</span>
                <span>· Archetype results</span>
              </div>
            </div>

            <div className="mt-auto pt-6">
              <Link
                href="/archetype"
                className="inline-flex items-center justify-center w-full px-7 py-4 text-sm font-semibold tracking-wide text-[#0c1929] bg-[#d4a55a] hover:bg-[#e2be80] rounded-lg transition-all min-h-[48px]"
              >
                Take the Archetype Quiz →
              </Link>
            </div>
          </div>

        </div>
      </section>

      {/* "After the quizzes" context */}
      <section className="border-t border-[#e8e0d0] bg-[#f0ede8] py-14 px-6">
        <div className="max-w-3xl mx-auto">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#c08b3e] mb-4">After the Quizzes</p>
          <p className="font-playfair text-2xl text-[#0c1929] mb-4 leading-snug">
            The quizzes give you a starting point. A conversation fills in the rest.
          </p>
          <p className="text-sm text-[#4a4a3e] leading-relaxed mb-8 max-w-xl">
            If your readiness score is strong and you have a sense of which categories fit your archetype, a 30-minute call is the natural next step. No catalog, no pitch — just an honest look at whether the categories that came up actually match your market, your capital, and your goals.
          </p>
          <div className="flex flex-col sm:flex-row gap-4">
            <Link
              href="/book"
              className="inline-flex items-center justify-center px-7 py-4 text-sm font-semibold tracking-wide text-[#0c1929] bg-[#d4a55a] hover:bg-[#e2be80] rounded-lg transition-all min-h-[48px]"
            >
              Book a Free Call
            </Link>
            <a
              href="sms:+12149951062"
              className="inline-flex items-center justify-center gap-1.5 px-7 py-4 text-sm font-semibold tracking-wide text-[#0c1929] border border-[#c08b3e]/40 hover:bg-[#e8dcc8] rounded-lg transition-all min-h-[48px]"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>
              Text Me Instead
            </a>
          </div>
        </div>
      </section>

    </main>
  );
}
