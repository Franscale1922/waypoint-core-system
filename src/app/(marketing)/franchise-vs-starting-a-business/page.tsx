import type { Metadata } from "next";
import Link from "next/link";
import { SITE_URL, jsonLdGraph, webPageSchema, breadcrumbSchema, faqPageSchema } from "../../lib/structured-data";
import JsonLd from "../../components/JsonLd";
import { FAQItem } from "../faq/FAQItem";

// Single source for this page's FAQ — drives both the visible accordion and the
// FAQPage JSON-LD.
const faqs = [
  {
    q: "Is it better to buy a franchise or start your own business?",
    a: "Neither is universally better — they trade different things. A franchise gives you a proven system, brand, and support in exchange for fees, royalties, and rules you have to follow. An independent startup gives you full control and no royalties in exchange for building everything yourself and carrying more unknowns. The right answer depends on your risk tolerance, how much you value a playbook versus autonomy, and what you want to spend your time on.",
  },
  {
    q: "Is a franchise less risky than starting a business from scratch?",
    a: "A franchise reduces some specific risks — you are following a tested model, not inventing one, and you can study the brand's disclosures and talk to existing owners before you commit. That lowers the odds of certain first-timer mistakes. But it does not remove risk: you still have to execute, fund the business, and operate in your local market. No business model guarantees an outcome.",
  },
  {
    q: "What do you give up by choosing a franchise over your own business?",
    a: "Mainly autonomy and money on the margin. You follow the franchisor's system, use approved suppliers, and pay ongoing royalties, which means less freedom to improvise and a share of revenue going to the brand. In return you get the brand, the playbook, training, and a network of other owners. Independent founders keep all the upside and control but build the playbook themselves.",
  },
  {
    q: "Can I research a franchise before I commit?",
    a: "Yes, and that is one of the structural advantages. Every franchisor must provide a Franchise Disclosure Document (FDD) covering fees, obligations, litigation history, and more, and you can call existing franchisees to hear how the business actually runs before you sign. An independent startup has no equivalent disclosure to study.",
  },
];

export const metadata: Metadata = {
  title: "Franchise vs. Starting Your Own Business: How to Decide | Waypoint Franchise Advisors",
  description:
    "Franchise or independent startup? An honest comparison of control, risk, cost, and support — the real tradeoffs between buying a franchise and building a business from scratch.",
  alternates: { canonical: "https://www.waypointfranchise.com/franchise-vs-starting-a-business" },
  openGraph: {
    title: "Franchise vs. Starting Your Own Business | Waypoint Franchise Advisors",
    description:
      "A proven system with rules and royalties, or full control and a blank page? The real tradeoffs, side by side.",
    url: "https://www.waypointfranchise.com/franchise-vs-starting-a-business",
  },
};

const rows = [
  { dimension: "The system", franchise: "Proven, documented playbook you follow.", independent: "You build and test it yourself." },
  { dimension: "Brand & demand", franchise: "Established brand and marketing from day one.", independent: "You build awareness from zero." },
  { dimension: "Control", franchise: "Operate within the franchisor's rules and standards.", independent: "Full control over every decision." },
  { dimension: "Ongoing cost", franchise: "Royalties and fees on revenue, ongoing.", independent: "No royalties — you keep it all." },
  { dimension: "Support & network", franchise: "Training, support, and a peer network of owners.", independent: "You assemble your own advisors." },
  { dimension: "Diligence before you commit", franchise: "FDD + validation calls with existing owners.", independent: "No standardized disclosure to study." },
];

export default function FranchiseVsStartingPage() {
  return (
    <main className="bg-[#FAF8F4] text-[#0c1929]">
      <JsonLd
        data={jsonLdGraph(
          webPageSchema({
            url: `${SITE_URL}/franchise-vs-starting-a-business`,
            name: "Franchise vs. Starting Your Own Business | Waypoint Franchise Advisors",
            description:
              "An honest comparison of control, risk, cost, and support — the real tradeoffs between buying a franchise and building a business from scratch.",
            breadcrumb: breadcrumbSchema([
              { name: "Home", url: SITE_URL },
              { name: "Franchise vs. Starting a Business", url: `${SITE_URL}/franchise-vs-starting-a-business` },
            ]),
          }),
          faqPageSchema(faqs, `${SITE_URL}/franchise-vs-starting-a-business`),
        )}
      />

      {/* Hero */}
      <section className="pt-20 sm:pt-28 pb-12 sm:pb-16 px-6 border-b border-[#e8e0d0]">
        <div className="max-w-4xl mx-auto">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#8E3012] mb-4">Comparison</p>
          <h1 className="font-playfair text-4xl sm:text-5xl text-[#0c1929] leading-tight mb-6 max-w-3xl">
            Franchise vs. starting your own business
          </h1>
          <p className="text-base sm:text-lg text-[#4a4a3e] leading-relaxed max-w-2xl mb-4">
            Both paths can work. They just ask for different things. A franchise trades some autonomy and a share of revenue for a proven system, a brand, and support. An independent startup trades a tested playbook for total control and no royalties.
          </p>
          <p className="text-base text-[#4a4a3e] leading-relaxed max-w-2xl">
            The honest way to choose is not &ldquo;which is better&rdquo; but &ldquo;which set of tradeoffs fits how I want to work and what I am willing to risk.&rdquo;
          </p>
        </div>
      </section>

      {/* Comparison table */}
      <section className="max-w-4xl mx-auto px-6 py-14 sm:py-20">
        <h2 className="font-playfair text-2xl sm:text-3xl mb-10">The tradeoffs, side by side</h2>
        <div className="sm:hidden space-y-4">
          {rows.map((row, i) => (
            <div key={row.dimension} className={`rounded-xl p-5 border border-[#e8e0d0] ${i % 2 === 0 ? "bg-white" : "bg-[#faf8f4]"}`}>
              <p className="font-semibold text-[#0c1929] text-sm mb-3">{row.dimension}</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-[#1b3a5f] mb-1">Franchise</p>
                  <p className="text-xs text-[#3a3a2e] leading-relaxed">{row.franchise}</p>
                </div>
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-[#1b3a5f] mb-1">Own Business</p>
                  <p className="text-xs text-[#3a3a2e] leading-relaxed">{row.independent}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
        <div className="hidden sm:block overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b-2 border-[#8E3012]">
                <th className="text-left py-3 pl-4 pr-6 font-semibold text-[#1b3a5f] uppercase tracking-wider text-xs w-[24%]">Dimension</th>
                <th className="text-left py-3 pl-4 pr-6 font-semibold text-[#1b3a5f] uppercase tracking-wider text-xs w-[38%]">Franchise</th>
                <th className="text-left py-3 pl-4 pr-4 font-semibold text-[#1b3a5f] uppercase tracking-wider text-xs w-[38%]">Your Own Business</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr key={row.dimension} className={`border-b border-[#e8e0d0] ${i % 2 === 0 ? "bg-white" : "bg-[#faf8f4]"}`}>
                  <td className="py-4 pl-4 pr-6 font-medium text-[#0c1929] align-top">{row.dimension}</td>
                  <td className="py-4 pl-4 pr-6 text-[#3a3a2e] leading-relaxed align-top">{row.franchise}</td>
                  <td className="py-4 pl-4 pr-4 text-[#3a3a2e] leading-relaxed align-top">{row.independent}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* FAQ */}
      <section className="max-w-3xl mx-auto px-6 pb-14 sm:pb-20">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#8E3012] mb-4">Common Questions</p>
        <h2 className="font-playfair text-2xl sm:text-3xl mb-8">Questions about the decision</h2>
        <div>
          {faqs.map(({ q, a }) => (
            <FAQItem key={q} q={q} a={a} />
          ))}
        </div>
      </section>

      {/* Related */}
      <section className="max-w-4xl mx-auto px-6 pb-16 sm:pb-20 border-t border-[#e8e0d0] pt-12">
        <div className="flex items-center gap-4 mb-8">
          <div className="w-8 h-[2px] bg-[#CC6535]" />
          <p className="text-xs font-medium text-[#CC6535] uppercase tracking-[0.2em]">Keep Reading</p>
        </div>
        <div className="grid gap-5 sm:grid-cols-3">
          <Link href="/is-a-franchise-worth-it" className="group block bg-white border border-[#e8e0d0] rounded-lg p-5 hover:shadow-md hover:border-[#CC6535]/40 transition-all">
            <h3 className="font-playfair text-[0.95rem] leading-snug text-[#0c1929] group-hover:text-[#8E3012] transition-colors mb-3">Is a franchise worth it?</h3>
            <p className="text-xs text-[#8E3012] font-medium tracking-wide">Read →</p>
          </Link>
          <Link href="/resources/buying-an-existing-franchise-what-you-need-to-know" className="group block bg-white border border-[#e8e0d0] rounded-lg p-5 hover:shadow-md hover:border-[#CC6535]/40 transition-all">
            <h3 className="font-playfair text-[0.95rem] leading-snug text-[#0c1929] group-hover:text-[#8E3012] transition-colors mb-3">Buying an existing franchise</h3>
            <p className="text-xs text-[#8E3012] font-medium tracking-wide">Read →</p>
          </Link>
          <Link href="/process" className="group block bg-white border border-[#e8e0d0] rounded-lg p-5 hover:shadow-md hover:border-[#CC6535]/40 transition-all">
            <h3 className="font-playfair text-[0.95rem] leading-snug text-[#0c1929] group-hover:text-[#8E3012] transition-colors mb-3">How the Waypoint process works</h3>
            <p className="text-xs text-[#8E3012] font-medium tracking-wide">See the process →</p>
          </Link>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-[#0c1929] py-14 px-6 text-center">
        <p className="font-playfair text-2xl text-white mb-4">Not sure which path fits you?</p>
        <p className="text-white/70 mb-8 max-w-sm mx-auto text-sm leading-relaxed">
          Thirty minutes. No pitch. We will talk through how you want to work and whether a franchise fits — honestly.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link href="/book" className="inline-flex items-center justify-center px-8 py-4 text-sm font-semibold tracking-wide text-[#0c1929] bg-[#CC6535] hover:bg-[#D4724A] rounded-lg transition-all min-h-[48px]">Book a Free Call</Link>
          <Link href="/scorecard" className="inline-flex items-center justify-center px-8 py-4 text-sm font-semibold tracking-wide text-white border border-white/25 hover:bg-white/10 rounded-lg transition-all min-h-[48px]">Take the Readiness Quiz</Link>
        </div>
      </section>
    </main>
  );
}
