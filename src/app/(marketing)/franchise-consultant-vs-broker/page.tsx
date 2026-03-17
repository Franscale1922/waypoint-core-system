import type { Metadata } from "next";
import Link from "next/link";

const comparisonSchema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "What is the difference between a franchise consultant and a franchise broker?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "In the franchise industry, the terms consultant and broker are often used interchangeably, and both are typically paid by franchise brands when a candidate becomes a franchisee. The meaningful difference is in how they work. A franchise broker tends to present a large catalog of options and let the buyer do the sorting. A franchise consultant invests time understanding the buyer's background, capital, lifestyle goals, and risk tolerance before presenting any options. The result is a small curated list rather than a large catalog.",
      },
    },
    {
      "@type": "Question",
      name: "Do franchise consultants and brokers cost money?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "No. Franchise consulting and brokerage services are free to candidates. The franchise brand pays a referral fee when a candidate they were introduced to becomes a franchisee. That fee is paid by the brand, not added to what the buyer pays.",
      },
    },
    {
      "@type": "Question",
      name: "Is a franchise consultant the same as a franchise broker?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Legally and structurally, yes. Both are paid by the franchise brand and both help candidates evaluate franchise opportunities. The distinction is in the working style: how much time the advisor spends understanding the candidate before presenting options, how many brands they present, and how hands-on they are throughout the due diligence process.",
      },
    },
  ],
};

export const metadata: Metadata = {
  title: "Franchise Consultant vs. Franchise Broker: What's the Difference? | Waypoint",
  description:
    "Franchise consultants and franchise brokers are often the same thing legally, but they work very differently. Here is what the distinction actually means for your process.",
  alternates: { canonical: "https://waypointfranchise.com/franchise-consultant-vs-broker" },
  openGraph: {
    title: "Franchise Consultant vs. Broker | Waypoint Franchise Advisors",
    description:
      "Both are free to you. Both are paid by the brand. The difference is in how they work. And that difference matters a lot.",
    url: "https://waypointfranchise.com/franchise-consultant-vs-broker",
    images: [{ url: "/og_default_1773343895292.png", width: 1200, height: 630, alt: "Franchise Consultant vs Broker" }],
  },
};

const comparisonRows = [
  {
    dimension: "How they are paid",
    consultant: "Referral fee from the franchise brand at purchase. Free to you.",
    broker: "Referral fee from the franchise brand at purchase. Free to you.",
    note: "Same",
  },
  {
    dimension: "Time spent on discovery",
    consultant: "Extended discovery conversation (often 1–2 hours) before any brand is introduced.",
    broker: "Often minimal. May send a brand list after a short intake call.",
    note: "Different",
  },
  {
    dimension: "Number of brands presented",
    consultant: "Small curated list, typically 3 to 5 concepts matched to your specific situation.",
    broker: "Often a large catalog. May present 10–30 options for the candidate to sort.",
    note: "Different",
  },
  {
    dimension: "Involvement in due diligence",
    consultant: "Stays hands-on through FDD review, validation calls, and the franchise agreement.",
    broker: "Varies significantly. Some stay engaged; many hand off after introduction.",
    note: "Varies",
  },
  {
    dimension: "Inventory of brands",
    consultant: "Varies. Network affiliates (like FranChoice) give access to 200–400+ concepts.",
    broker: "Varies. Some networks offer similar inventory depth.",
    note: "Similar",
  },
  {
    dimension: "Legal distinction",
    consultant: "No formal legal difference. Both are typically operating as independent contractors.",
    broker: "No formal legal difference from a consultant. Term is interchangeable legally.",
    note: "Same",
  },
];

export default function FranchiseConsultantVsBrokerPage() {
  return (
    <main className="bg-[#FAF8F4] text-[#0c1929]">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(comparisonSchema) }}
      />

      {/* Hero */}
      <section className="pt-20 sm:pt-28 pb-12 sm:pb-16 px-6 border-b border-[#e8e0d0]">
        <div className="max-w-4xl mx-auto">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#8E3012] mb-4">
            Comparison
          </p>
          <h1 className="font-playfair text-4xl sm:text-5xl text-[#0c1929] leading-tight mb-6 max-w-3xl">
            Franchise consultant vs. franchise broker: what is the actual difference?
          </h1>
          <p className="text-base sm:text-lg text-[#4a4a3e] leading-relaxed max-w-2xl mb-4">
            In the franchise industry, the terms are often used interchangeably. Legally and structurally, they describe the same role: an independent advisor paid by franchise brands when a candidate they represent becomes a franchisee. The service is free to you either way.
          </p>
          <p className="text-base text-[#4a4a3e] leading-relaxed max-w-2xl">
            The meaningful difference is not the title. It is the working style: how much time the advisor spends understanding you before showing you anything, how many brands they put in front of you, and how engaged they stay through the process. That difference has a real impact on the quality of the match you end up with.
          </p>
        </div>
      </section>

      {/* Comparison table */}
      <section className="max-w-4xl mx-auto px-6 py-14 sm:py-20">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#8E3012] mb-4">
          Side by Side
        </p>
        <h2 className="font-playfair text-2xl sm:text-3xl mb-10">
          How they compare across dimensions that matter
        </h2>

        {/* Mobile: stacked cards */}
        <div className="sm:hidden space-y-4">
          {comparisonRows.map((row, i) => (
            <div key={row.dimension} className={`rounded-xl p-5 border border-[#e8e0d0] ${i % 2 === 0 ? "bg-white" : "bg-[#faf8f4]"}`}>
              <div className="flex items-start justify-between gap-3 mb-3">
                <p className="font-semibold text-[#0c1929] text-sm">{row.dimension}</p>
                <span className={`shrink-0 text-[10px] font-semibold uppercase tracking-wider px-2 py-1 rounded ${
                  row.note === "Same" ? "bg-[#e8f0eb] text-[#3a6a4a]" :
                  row.note === "Different" ? "bg-[#f5ece0] text-[#8a4a20]" :
                  "bg-[#f0ede8] text-[#6a5a4a]"
                }`}>
                  {row.note}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-3 mt-3">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-[#1b3a5f] mb-1">Franchise Consultant</p>
                  <p className="text-xs text-[#3a3a2e] leading-relaxed">{row.consultant}</p>
                </div>
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-[#1b3a5f] mb-1">Franchise Broker</p>
                  <p className="text-xs text-[#3a3a2e] leading-relaxed">{row.broker}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Desktop: table */}
        <div className="hidden sm:block overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b-2 border-[#8E3012]">
                <th className="text-left py-3 pl-4 pr-6 font-semibold text-[#1b3a5f] uppercase tracking-wider text-xs w-[30%]">Dimension</th>
                <th className="text-left py-3 pl-4 pr-6 font-semibold text-[#1b3a5f] uppercase tracking-wider text-xs w-[32%]">Franchise Consultant</th>
                <th className="text-left py-3 pl-4 pr-4 font-semibold text-[#1b3a5f] uppercase tracking-wider text-xs w-[32%]">Franchise Broker</th>
                <th className="text-left py-3 pl-4 pr-4 font-semibold text-[#1b3a5f] uppercase tracking-wider text-xs w-[6%]"></th>
              </tr>
            </thead>
            <tbody>
              {comparisonRows.map((row, i) => (
                <tr key={row.dimension} className={`border-b border-[#e8e0d0] ${i % 2 === 0 ? "bg-white" : "bg-[#faf8f4]"}`}>
                  <td className="py-4 pl-4 pr-6 font-medium text-[#0c1929] align-top">{row.dimension}</td>
                  <td className="py-4 pl-4 pr-6 text-[#3a3a2e] leading-relaxed align-top">{row.consultant}</td>
                  <td className="py-4 pl-4 pr-4 text-[#3a3a2e] leading-relaxed align-top">{row.broker}</td>
                  <td className="py-4 pl-4 pr-4 align-top">
                    <span className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded ${
                      row.note === "Same" ? "bg-[#e8f0eb] text-[#3a6a4a]" :
                      row.note === "Different" ? "bg-[#f5ece0] text-[#8a4a20]" :
                      "bg-[#f0ede8] text-[#6a5a4a]"
                    }`}>
                      {row.note}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Key insight sections */}
      <section className="bg-[#0c1929] py-14 sm:py-20 px-6">
        <div className="max-w-4xl mx-auto grid sm:grid-cols-2 gap-8">
          <div>
            <h2 className="font-playfair text-2xl text-white mb-4">
              Why the distinction matters in practice
            </h2>
            <p className="text-white/70 text-sm leading-relaxed mb-4">
              When a broker hands you a catalog of 30 brands and asks which ones look interesting, you are essentially doing your own matching. You are evaluating marketing materials rather than fit. The result is often that buyers get excited about a brand that looks good on paper but is wrong for their actual situation.
            </p>
            <p className="text-white/70 text-sm leading-relaxed">
              When a consultant spends two hours understanding your background, your capital, your risk tolerance, and your life goals before presenting anything, the short list they put in front of you is already filtered. The brands you are evaluating are brands that have already passed a fit analysis.
            </p>
          </div>
          <div>
            <h2 className="font-playfair text-2xl text-white mb-4">
              How Waypoint approaches this
            </h2>
            <p className="text-white/70 text-sm leading-relaxed mb-4">
              Kelsey Stuart at Waypoint Franchise Advisors does not show a single brand until after a full discovery conversation, typically one to two hours, and a written profile of what he heard, reviewed and confirmed by the candidate.
            </p>
            <p className="text-white/70 text-sm leading-relaxed">
              The result is a short list: three to four concepts, never more. Each one has been pre-screened on financial disclosures (Item 19), territory availability, and unit-level performance. The goal is not volume. The goal is fit.
            </p>
            <Link
              href="/process"
              className="inline-flex items-center text-[#C8622E] text-sm font-medium hover:text-[#D4724A] transition-colors mt-5"
            >
              See exactly how the process works →
            </Link>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="max-w-3xl mx-auto px-6 py-14 sm:py-20">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#8E3012] mb-4">
          Common Questions
        </p>
        <h2 className="font-playfair text-2xl sm:text-3xl mb-8">Questions about working with a consultant</h2>
        <div className="space-y-6">
          {[
            {
              q: "Should I use a franchise consultant or go directly to a franchise brand?",
              a: "Going directly to brands is possible. Franchisors have their own development teams. But a development rep works for the franchisor. Their job is to qualify you for their specific brand. A consultant's job is to figure out which brand is right for you, which may not be any of the ones a single brand's rep can offer. The consulting relationship is also free, which means there is no cost to having representation.",
            },
            {
              q: "Can a franchise consultant show me any brand, or only brands in their network?",
              a: "Consultants who operate through networks like FranChoice have access to a curated inventory of 200–400+ brands that have opted into the consultant referral model. Not every franchisor participates. Some smaller or newer brands may not be in a consultant's inventory. If you have a specific brand in mind, ask your consultant whether they work with that brand before assuming they can represent you in that conversation.",
            },
            {
              q: "How do I know if a franchise consultant is actually independent?",
              a: "Ask them directly how many brands they presented to their last five clients, and whether any single brand generates a disproportionate share of their placements. Also look at how they structure the early part of the process: if they are showing you brands before understanding your situation, that is a signal. Independent consultants spend time on discovery before they spend time on presentation.",
            },
          ].map(({ q, a }) => (
            <div key={q} className="border-l-2 border-[#8E3012] pl-6">
              <h3 className="font-semibold text-[#0c1929] mb-2">{q}</h3>
              <p className="text-sm text-[#4a4a3e] leading-relaxed">{a}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Related resources, card format */}
      <section className="max-w-4xl mx-auto px-6 pb-16 sm:pb-20 border-t border-[#e8e0d0] pt-12">
        <div className="flex items-center gap-4 mb-8">
          <div className="w-8 h-[2px] bg-[#C8622E]" />
          <p className="text-xs font-medium text-[#C8622E] uppercase tracking-[0.2em]">Related Resources</p>
        </div>
        <div className="grid gap-5 sm:grid-cols-3">

          <Link
            href="/resources/do-you-need-a-franchise-consultant"
            className="group block bg-white border border-[#e8e0d0] rounded-lg p-5 hover:shadow-md hover:border-[#C8622E]/40 transition-all"
          >
            <p className="text-[0.65rem] font-medium text-[#8E3012] tracking-[0.15em] uppercase mb-3">Getting Started</p>
            <div className="w-5 h-[2px] bg-[#C8622E] mb-3 group-hover:w-8 transition-all duration-300" />
            <h3 className="font-playfair text-[0.95rem] leading-snug text-[#0c1929] group-hover:text-[#8E3012] transition-colors mb-3">
              Do you need a franchise consultant?
            </h3>
            <p className="text-xs text-[#7a7a6a] leading-relaxed">
              What a consultant actually does, how they differ from a broker, and how to tell if working with one makes sense for your search.
            </p>
            <p className="mt-4 text-xs text-[#8E3012] font-medium tracking-wide">Read →</p>
          </Link>

          <Link
            href="/process"
            className="group block bg-white border border-[#e8e0d0] rounded-lg p-5 hover:shadow-md hover:border-[#C8622E]/40 transition-all"
          >
            <p className="text-[0.65rem] font-medium text-[#8E3012] tracking-[0.15em] uppercase mb-3">The Process</p>
            <div className="w-5 h-[2px] bg-[#C8622E] mb-3 group-hover:w-8 transition-all duration-300" />
            <h3 className="font-playfair text-[0.95rem] leading-snug text-[#0c1929] group-hover:text-[#8E3012] transition-colors mb-3">
              How the Waypoint process works
            </h3>
            <p className="text-xs text-[#7a7a6a] leading-relaxed">
              A step-by-step look at what happens from the first conversation through candidate presentation and due diligence.
            </p>
            <p className="mt-4 text-xs text-[#8E3012] font-medium tracking-wide">See the process →</p>
          </Link>

          <Link
            href="/faq"
            className="group block bg-white border border-[#e8e0d0] rounded-lg p-5 hover:shadow-md hover:border-[#C8622E]/40 transition-all"
          >
            <p className="text-[0.65rem] font-medium text-[#8E3012] tracking-[0.15em] uppercase mb-3">Common Questions</p>
            <div className="w-5 h-[2px] bg-[#C8622E] mb-3 group-hover:w-8 transition-all duration-300" />
            <h3 className="font-playfair text-[0.95rem] leading-snug text-[#0c1929] group-hover:text-[#8E3012] transition-colors mb-3">
              Frequently asked questions
            </h3>
            <p className="text-xs text-[#7a7a6a] leading-relaxed">
              Honest answers to the most common questions about cost, capital requirements, timing, and how the whole process works.
            </p>
            <p className="mt-4 text-xs text-[#8E3012] font-medium tracking-wide">Read →</p>
          </Link>

        </div>
      </section>

      {/* CTA */}
      <section className="bg-[#0c1929] py-14 px-6 text-center">
        <p className="font-playfair text-2xl text-white mb-4">
          Ready to find out if the fit is there?
        </p>
        <p className="text-white/70 mb-8 max-w-sm mx-auto text-sm leading-relaxed">
          Thirty minutes. No catalog. No pitch. Just a real conversation about your situation.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/book"
            className="inline-flex items-center justify-center px-8 py-4 text-sm font-semibold tracking-wide text-[#0c1929] bg-[#C8622E] hover:bg-[#D4724A] rounded-lg transition-all min-h-[48px]"
          >
            Book a Free Call
          </Link>
          <a
            href="sms:+12149951062"
            className="inline-flex items-center justify-center gap-1.5 px-8 py-4 text-sm font-semibold tracking-wide text-white border border-white/25 hover:bg-white/10 rounded-lg transition-all min-h-[48px]"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>
            Text Me
          </a>
        </div>
      </section>
    </main>
  );
}
