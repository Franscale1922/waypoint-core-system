import type { Metadata } from "next";
import Link from "next/link";

const investmentGuideSchema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "How much does it cost to buy a franchise?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "The total cost to buy a franchise typically ranges from $75,000 to $500,000+ depending on the business model. This includes the initial franchise fee ($20,000–$60,000), build-out or setup costs, equipment, working capital, and pre-opening expenses. Home-based and service franchises often fall in the $75,000–$200,000 range. Brick-and-mortar concepts typically run $200,000–$500,000 or more.",
      },
    },
    {
      "@type": "Question",
      name: "What is a franchise fee?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "The initial franchise fee is a one-time payment to the franchisor granting you the right to operate under their brand, system, and territory. It typically ranges from $20,000 to $60,000 and is paid when you sign the franchise agreement. It covers initial training, onboarding, and territory rights. Not ongoing operations.",
      },
    },
    {
      "@type": "Question",
      name: "What is a franchise royalty?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "A royalty is an ongoing fee paid to the franchisor, typically 4%–8% of gross revenue, in exchange for continued use of the brand, systems, and support. It is separate from the initial franchise fee and is paid monthly or weekly throughout the life of the franchise agreement.",
      },
    },
    {
      "@type": "Question",
      name: "How much liquid capital do I need to buy a franchise?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "A practical minimum is $100,000 in liquid assets (cash, brokerage accounts, 401k that can be rolled). This is not the total investment. It is the liquidity threshold that makes most solid options accessible. Candidates with $250,000 or more in liquid capital can typically leverage SBA or other financing to access higher-investment concepts.",
      },
    },
  ],
};

export const metadata: Metadata = {
  title: "How Much Does a Franchise Cost? | Investment Guide | Waypoint Franchise Advisors",
  description:
    "A plain-language guide to franchise investment costs: initial franchise fees ($20K–$60K), total investment ranges by category, royalty structures, working capital, and how SBA financing works. No sales pitch.",
  alternates: { canonical: "https://waypointfranchise.com/investment" },
  openGraph: {
    title: "Franchise Investment Guide | Waypoint Franchise Advisors",
    description:
      "How much does a franchise actually cost? Initial fees, setup costs, royalties, working capital, and SBA financing, explained plainly.",
    url: "https://waypointfranchise.com/investment",
    images: [{ url: "/og_default_1773343895292.png", width: 1200, height: 630, alt: "Franchise Investment Guide" }],
  },
};

const investmentTiers = [
  {
    range: "$75K – $150K",
    label: "Entry-level service franchises",
    description:
      "Home-based or van-based service models with low overhead. Common in home services, cleaning, pest control, and mobile categories. Minimal physical footprint, faster ramp-up, lower working capital requirements.",
    examples: ["Home-based service models", "Mobile service concepts", "B2B service franchises"],
  },
  {
    range: "$150K – $300K",
    label: "Light commercial or staffed service",
    description:
      "Small commercial space or staffed service model. Common in personal services, restoration, fitness (studio format), and senior care. Usually requires a small team from day one.",
    examples: ["Studio fitness concepts", "Restoration and remediation", "Senior in-home care", "Light retail"],
  },
  {
    range: "$300K – $600K",
    label: "Full brick-and-mortar",
    description:
      "Dedicated commercial space with build-out, signage, and equipment. Common in food service, auto-related services, and larger fitness concepts. Longer lead time before opening, higher working capital needed.",
    examples: ["Food service concepts", "Auto service franchises", "Full fitness facilities"],
  },
  {
    range: "$600K+",
    label: "Multi-unit or large-format",
    description:
      "Large-format retail, multi-territory deals, or capital-intensive concepts. Often funded via SBA or investor partnerships. Typically reserved for candidates with significant capital and prior business experience.",
    examples: ["Multi-unit packages", "Large format retail", "Hotel and hospitality concepts"],
  },
];

const costComponents = [
  {
    component: "Initial franchise fee",
    typical: "$20,000 – $60,000",
    notes: "One-time. Paid at signing. Grants brand rights, territory, and training access.",
  },
  {
    component: "Royalty fee",
    typical: "4% – 8% of gross revenue",
    notes: "Ongoing. Paid monthly or weekly. Covers continued brand use and support.",
  },
  {
    component: "Marketing / ad fund",
    typical: "1% – 3% of gross revenue",
    notes: "Ongoing. Funds national or regional advertising. Separate from royalty.",
  },
  {
    component: "Build-out / setup",
    typical: "$30,000 – $300,000+",
    notes: "Varies widely by concept. Home-based = near zero. Brick-and-mortar = significant.",
  },
  {
    component: "Equipment",
    typical: "$10,000 – $150,000",
    notes: "Included in Item 7 of the Franchise Disclosure Document (FDD), the section that details your total estimated investment before opening day. Often purchased from approved vendors.",
  },
  {
    component: "Working capital",
    typical: "$20,000 – $100,000",
    notes: "Three to six months of operating expenses before revenue stabilizes. Critical buffer.",
  },
  {
    component: "Pre-opening expenses",
    typical: "$5,000 – $30,000",
    notes: "Training travel, grand opening marketing, initial inventory, professional fees.",
  },
];

export default function InvestmentPage() {
  return (
    <main className="bg-[#FAF8F4] text-[#0c1929]">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(investmentGuideSchema) }}
      />

      {/* Hero */}
      <section className="relative pt-20 sm:pt-28 pb-14 sm:pb-20 px-6 border-b border-[#e8e0d0]">
        <div className="max-w-4xl mx-auto">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#8E3012] mb-4">
            Investment Guide
          </p>
          <h1 className="font-playfair text-4xl sm:text-5xl md:text-6xl text-[#0c1929] leading-tight mb-6">
            How much does a franchise actually cost?
          </h1>
          <p className="text-base sm:text-lg text-[#4a4a3e] leading-relaxed max-w-2xl mb-6">
            The total investment to buy a franchise typically ranges from <strong>$75,000 to $500,000+</strong>, depending on the business model. That number includes the initial franchise fee, setup costs, equipment, working capital, and pre-opening expenses. Not just the fee on the cover page.
          </p>
          <p className="text-sm text-[#6a6a5e] leading-relaxed max-w-2xl">
            This guide breaks down every cost component, explains how investment tiers work across business categories, and covers how financing fits in. Last updated: March 2026.
          </p>
        </div>
      </section>

      {/* Quick answer summary bar */}
      <section className="border-b border-[#e8e0d0] bg-[#f0ede8]">
        <div className="max-w-4xl mx-auto px-5 sm:px-10 py-8 grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-6 text-center">
          {[
            { stat: "$20K–$60K", label: "Initial franchise fee" },
            { stat: "4%–8%", label: "Typical royalty rate" },
            { stat: "$75K+", label: "Liquid capital minimum" },
            { stat: "Item 7", label: "Where total costs live in the FDD" },
          ].map(({ stat, label }) => (
            <div key={label} className="bg-white border border-[#e2ddd2] rounded-lg py-5 px-4">
              <p className="text-xl sm:text-2xl font-black text-[#1b3a5f]">{stat}</p>
              <p className="mt-1 text-[10px] text-[#7a7a7a] uppercase tracking-widest leading-snug">{label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Cost components table */}
      <section className="max-w-4xl mx-auto px-5 sm:px-10 py-14 sm:py-20">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#8E3012] mb-4">
          Cost Breakdown
        </p>
        <h2 className="font-playfair text-2xl sm:text-3xl mb-4">
          What you are actually paying for
        </h2>
        <p className="text-sm text-[#4a4a3e] leading-relaxed mb-10 max-w-2xl">
          Most buyers focus on the franchise fee. That is the smallest line item. Here is the full picture of what it costs to get open and operational.
        </p>

        {/* Mobile: stacked cards */}
        <div className="sm:hidden space-y-4">
          {costComponents.map((row, i) => (
            <div key={row.component} className={`rounded-xl p-4 border border-[#e8e0d0] ${i % 2 === 0 ? "bg-white" : "bg-[#faf8f4]"}`}>
              <p className="font-semibold text-[#0c1929] text-sm mb-1">{row.component}</p>
              <p className="text-[#1b3a5f] font-bold text-base mb-2">{row.typical}</p>
              <p className="text-xs text-[#5a5a4a] leading-relaxed">{row.notes}</p>
            </div>
          ))}
        </div>

        {/* Desktop: table */}
        <div className="hidden sm:block overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b-2 border-[#8E3012]">
                <th className="text-left py-3 pl-4 pr-6 font-semibold text-[#1b3a5f] uppercase tracking-wider text-xs">Cost component</th>
                <th className="text-left py-3 pl-4 pr-6 font-semibold text-[#1b3a5f] uppercase tracking-wider text-xs">Typical range</th>
                <th className="text-left py-3 pl-4 font-semibold text-[#1b3a5f] uppercase tracking-wider text-xs">Notes</th>
              </tr>
            </thead>
            <tbody>
              {costComponents.map((row, i) => (
                <tr key={row.component} className={`border-b border-[#e8e0d0] ${i % 2 === 0 ? "bg-white" : "bg-[#faf8f4]"}`}>
                  <td className="py-4 pl-4 pr-6 font-medium text-[#0c1929]">{row.component}</td>
                  <td className="py-4 pl-4 pr-6 text-[#1b3a5f] font-semibold whitespace-nowrap">{row.typical}</td>
                  <td className="py-4 pl-4 text-[#5a5a4a] leading-relaxed">{row.notes}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="mt-6 text-xs text-[#7a7a7a] leading-relaxed">
          All figures are general ranges. Actual costs vary by brand, location, and market. The Franchise Disclosure Document (FDD) Item 7 contains the franchisor&apos;s own estimated investment range for their specific system.
        </p>
      </section>

      {/* Investment tiers */}
      <section className="bg-[#0c1929] py-14 sm:py-20 px-5 sm:px-6">
        <div className="max-w-4xl mx-auto">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#CC6535] mb-4">
            Investment Tiers
          </p>
          <h2 className="font-playfair text-2xl sm:text-3xl text-white mb-4">
            What your capital range opens up
          </h2>
          <p className="text-sm text-white/70 leading-relaxed mb-10 max-w-2xl">
            Your available liquid capital determines which categories of franchise are accessible. Here is how the landscape breaks down by investment tier.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {investmentTiers.map((tier) => (
              <div key={tier.range} className="bg-[#0f2035] border border-[#1b3a5f] rounded-xl p-6">
                <p className="text-[#CC6535] font-black text-xl mb-1">{tier.range}</p>
                <p className="text-white font-semibold text-sm mb-3">{tier.label}</p>
                <p className="text-white/60 text-sm leading-relaxed mb-4">{tier.description}</p>
                <ul className="space-y-1">
                  {tier.examples.map((ex) => (
                    <li key={ex} className="text-xs text-white/50 flex items-start gap-2">
                      <span className="text-[#CC6535] mt-0.5 flex-shrink-0">—</span>
                      {ex}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Mid-page CTA — bridge between tiers and financing */}
      <section className="max-w-4xl mx-auto px-5 sm:px-10 py-10">
        <div className="bg-[#f7f5f1] border border-[#e2ddd2] rounded-xl p-7 sm:p-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
          <div>
            <p className="font-playfair text-xl sm:text-2xl text-[#0c1929] mb-2">
              Know roughly what tier fits your situation?
            </p>
            <p className="text-sm text-[#5a5a4a] leading-relaxed max-w-md">
              That&apos;s actually the most useful thing to bring to a first call. Let&apos;s figure out where you fit and what options are worth your time.
            </p>
          </div>
          <Link
            href="/book"
            className="flex-shrink-0 inline-flex items-center justify-center px-7 py-4 text-sm font-semibold tracking-wide text-[#0c1929] bg-[#CC6535] hover:bg-[#D4724A] rounded-lg transition-all min-h-[48px]"
          >
            Let&apos;s talk
          </Link>
        </div>
      </section>

      {/* Capital and financing */}

      <section className="max-w-4xl mx-auto px-5 sm:px-10 py-14 sm:py-20">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#8E3012] mb-4">
          Liquid Capital &amp; Financing
        </p>
        <h2 className="font-playfair text-2xl sm:text-3xl mb-6">
          What &ldquo;liquid capital&rdquo; actually means
        </h2>
        <div className="grid sm:grid-cols-2 gap-8">
          <div>
            <p className="text-sm text-[#4a4a3e] leading-relaxed mb-4">
              Liquid capital is the money you can access without selling a house or liquidating a retirement account under penalty. It includes cash, brokerage accounts, and 401(k) or IRA balances that can be rolled into a business using a ROBS (Rollover for Business Startups) structure without triggering early withdrawal penalties.
            </p>
            <p className="text-sm text-[#4a4a3e] leading-relaxed">
              Most franchisors set a minimum liquid capital requirement in their FDD. This is the amount they expect you to have available before financing, not the total investment. Think of it as the down payment threshold.
            </p>
          </div>
          <div>
            <h3 className="font-playfair text-lg text-[#0c1929] mb-6">Common financing paths</h3>
            <div className="grid gap-4">
              {[
                {
                  title: "SBA 7(a) Loan",
                  oneliner: "The most common financing path for franchise buyers.",
                  range: "Up to 90% of total project cost",
                  bestFor: "First-time buyers with good credit who want to keep cash reserves intact.",
                  watchOut: "Personal guarantee required. Approval can take 60 to 90 days. Start the process early.",
                },
                {
                  title: "ROBS (Rollover for Business Startups)",
                  oneliner: "Use your 401(k) or IRA to fund the business. No loan, no early withdrawal penalty.",
                  range: "Any qualified retirement balance; typically $50K+",
                  bestFor: "Buyers with meaningful retirement savings who want to avoid taking on debt.",
                  watchOut: "Requires a C-Corp and strict IRS compliance. Use a ROBS specialist, not a generalist accountant.",
                },
                {
                  title: "Home Equity / HELOC",
                  oneliner: "Draw against existing home equity to fund working capital or an equity injection.",
                  range: "Depends on equity; typically $50K\u2013$250K",
                  bestFor: "Supplementing an SBA loan or covering the down payment without liquidating investments.",
                  watchOut: "Your home is on the line. Model both the business and the HELOC repayment before signing.",
                },
              ].map(({ title, oneliner, range, bestFor, watchOut }) => (
                <div key={title} className="bg-white border border-[#e2ddd2] rounded-lg p-5">
                  <div className="flex items-start gap-3 mb-3">
                    <div className="w-1.5 h-1.5 rounded-full bg-[#CC6535] mt-2 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-bold text-[#0c1929]">{title}</p>
                      <p className="text-xs text-[#5a5a4a] mt-0.5 leading-relaxed">{oneliner}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pl-4">
                    <div>
                      <p className="text-[9px] font-semibold uppercase tracking-widest text-[#aaa] mb-1">Typical range</p>
                      <p className="text-xs text-[#3a3a2e]">{range}</p>
                    </div>
                    <div>
                      <p className="text-[9px] font-semibold uppercase tracking-widest text-[#aaa] mb-1">Best for</p>
                      <p className="text-xs text-[#3a3a2e]">{bestFor}</p>
                    </div>
                    <div>
                      <p className="text-[9px] font-semibold uppercase tracking-widest text-[#8E3012] mb-1">Watch out for</p>
                      <p className="text-xs text-[#3a3a2e]">{watchOut}</p>
                    </div>
                  </div>
                </div>
              ))}
              <p className="text-xs text-[#7a7a7a] leading-relaxed pl-1">
                <strong className="text-[#0c1929]">Franchisor financing:</strong>{" "}
                Some brands offer financing for the franchise fee. Usually limited in scope. Ask about it during your FDD review.
              </p>
            </div>
          </div>
        </div>
      </section>


      {/* FAQ */}
      <section className="bg-[#f0ede8] py-14 sm:py-20 px-6">
        <div className="max-w-3xl mx-auto">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#8E3012] mb-4">
            Common Questions
          </p>
          <h2 className="font-playfair text-2xl sm:text-3xl mb-10">Franchise Investment FAQ</h2>
          <div className="space-y-6">
            {[
              {
                q: "Is the franchise fee negotiable?",
                a: "Rarely. The initial franchise fee is usually fixed across the system. If a franchisor negotiated it selectively, they would face equity and legal exposure with existing franchisees. What is occasionally negotiable: multi-unit discounts for buying multiple territories at once, and the timing of when the fee is due.",
              },
              {
                q: "What does Item 7 of the FDD tell me?",
                a: "Item 7 is the franchisor's own estimated total investment range to open one unit of their franchise. It breaks out each cost category, including build-out, equipment, initial inventory, working capital, and pre-opening costs, and shows low-to-high ranges. It is not a guarantee, and most experienced advisors recommend planning for the top of that range.",
              },
              {
                q: "Should I plan beyond the FDD Item 7 estimate?",
                a: "Yes. Item 7 reflects the franchisor's experience across their system. Your specific market may have higher real estate costs, labor costs, or regulatory requirements. A common rule of thumb is to add a 10% to 20% buffer above the top of the Item 7 range for first-time buyers.",
              },
              {
                q: "Does the cost of a franchise affect what I pay when I sell it?",
                a: "Indirectly. Franchises are typically sold as businesses, and the purchase price often reflects a multiple of revenue or EBITDA rather than the original franchise fee. Your franchise agreement will also govern who approves the transfer and what fees apply. This is worth understanding early, especially if you plan to build toward an eventual exit.",
              },
            ].map(({ q, a }) => (
              <div key={q} className="bg-white rounded-xl p-6 border border-[#e8e0d0]">
                <h3 className="font-playfair text-lg text-[#0c1929] mb-3">{q}</h3>
                <p className="text-sm text-[#4a4a3e] leading-relaxed">{a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Related resources — card format */}
      <section className="max-w-4xl mx-auto px-5 sm:px-10 pb-16 sm:pb-20 border-t border-[#e8e0d0] pt-12">
        <div className="flex items-center gap-4 mb-8">
          <div className="w-8 h-[2px] bg-[#CC6535]" />
          <p className="text-xs font-medium text-[#CC6535] uppercase tracking-[0.2em]">Related Resources</p>
        </div>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">

          <Link
            href="/resources/the-true-cost-of-buying-a-franchise"
            className="group block bg-white border border-[#e8e0d0] rounded-lg p-5 hover:shadow-md hover:border-[#CC6535]/40 transition-all"
          >
            <p className="text-[0.65rem] font-medium text-[#8E3012] tracking-[0.15em] uppercase mb-3">Getting Started</p>
            <div className="w-5 h-[2px] bg-[#CC6535] mb-3 group-hover:w-8 transition-all duration-300" />
            <h3 className="font-playfair text-[0.95rem] leading-snug text-[#0c1929] group-hover:text-[#8E3012] transition-colors mb-3">
              The true cost of buying a franchise
            </h3>
            <p className="text-xs text-[#7a7a6a] leading-relaxed">Beyond the franchise fee: what you actually spend to get open and operating.</p>
            <p className="mt-4 text-xs text-[#8E3012] font-medium tracking-wide">Read →</p>
          </Link>

          <Link
            href="/resources/how-franchise-funding-actually-works"
            className="group block bg-white border border-[#e8e0d0] rounded-lg p-5 hover:shadow-md hover:border-[#CC6535]/40 transition-all"
          >
            <p className="text-[0.65rem] font-medium text-[#8E3012] tracking-[0.15em] uppercase mb-3">Going Deeper</p>
            <div className="w-5 h-[2px] bg-[#CC6535] mb-3 group-hover:w-8 transition-all duration-300" />
            <h3 className="font-playfair text-[0.95rem] leading-snug text-[#0c1929] group-hover:text-[#8E3012] transition-colors mb-3">
              How franchise funding actually works
            </h3>
            <p className="text-xs text-[#7a7a6a] leading-relaxed">SBA loans, ROBS, HELOC, and franchisor financing. How buyers actually fund the deal.</p>
            <p className="mt-4 text-xs text-[#8E3012] font-medium tracking-wide">Read →</p>
          </Link>

          <Link
            href="/resources/fdd-decoded-what-actually-matters"
            className="group block bg-white border border-[#e8e0d0] rounded-lg p-5 hover:shadow-md hover:border-[#CC6535]/40 transition-all"
          >
            <p className="text-[0.65rem] font-medium text-[#8E3012] tracking-[0.15em] uppercase mb-3">Going Deeper</p>
            <div className="w-5 h-[2px] bg-[#CC6535] mb-3 group-hover:w-8 transition-all duration-300" />
            <h3 className="font-playfair text-[0.95rem] leading-snug text-[#0c1929] group-hover:text-[#8E3012] transition-colors mb-3">
              FDD decoded: what actually matters
            </h3>
            <p className="text-xs text-[#7a7a6a] leading-relaxed">Which items in the Franchise Disclosure Document tell you the most, and what to look for in each.</p>
            <p className="mt-4 text-xs text-[#8E3012] font-medium tracking-wide">Read →</p>
          </Link>

          <Link
            href="/faq"
            className="group block bg-white border border-[#e8e0d0] rounded-lg p-5 hover:shadow-md hover:border-[#CC6535]/40 transition-all"
          >
            <p className="text-[0.65rem] font-medium text-[#8E3012] tracking-[0.15em] uppercase mb-3">Common Questions</p>
            <div className="w-5 h-[2px] bg-[#CC6535] mb-3 group-hover:w-8 transition-all duration-300" />
            <h3 className="font-playfair text-[0.95rem] leading-snug text-[#0c1929] group-hover:text-[#8E3012] transition-colors mb-3">
              Frequently asked questions
            </h3>
            <p className="text-xs text-[#7a7a6a] leading-relaxed">Honest answers about cost, capital, process timeline, and what working with a consultant actually looks like.</p>
            <p className="mt-4 text-xs text-[#8E3012] font-medium tracking-wide">Read →</p>
          </Link>

        </div>
      </section>

      {/* CTA */}
      <section className="bg-[#0c1929] py-16 px-6 text-center">
        <p className="font-playfair text-2xl text-white mb-4">
          Not sure what investment range fits your situation?
        </p>
        <p className="text-white/70 mb-8 max-w-md mx-auto text-sm leading-relaxed">
          That is exactly what the discovery call is for. Thirty minutes, no pressure, no pitch. Just a real conversation about your capital, your goals, and what options actually make sense.
        </p>
        <div className="flex flex-col sm:flex-row flex-wrap gap-4 justify-center">
          <Link
            href="/book"
            className="inline-flex items-center justify-center px-8 py-4 text-sm font-semibold tracking-wide text-[#0c1929] bg-[#CC6535] hover:bg-[#D4724A] rounded-lg transition-all min-h-[48px]"
          >
            Book a Free Call
          </Link>
          <Link
            href="/scorecard"
            className="inline-flex items-center justify-center px-8 py-4 text-sm font-semibold tracking-wide text-white border border-white/40 hover:bg-white/10 rounded-lg transition-all min-h-[48px]"
          >
            Take the Readiness Quiz
          </Link>
          <a
            href="sms:+12149951062"
            className="inline-flex items-center justify-center text-sm font-medium text-white/60 hover:text-white transition-colors min-h-[48px] px-2"
          >
            Or text me &rarr;
          </a>
        </div>
      </section>
    </main>
  );
}
