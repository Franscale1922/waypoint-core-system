import type { Metadata } from "next";
import Link from "next/link";
import { SITE_URL, jsonLdGraph, webPageSchema, breadcrumbSchema, faqPageSchema } from "../../lib/structured-data";
import JsonLd from "../../components/JsonLd";
import { FAQItem } from "../faq/FAQItem";

const faqs = [
  {
    q: "Is buying a franchise worth it?",
    a: "It depends entirely on the fit between you, the brand, and your market. There is no universal yes or no. A franchise can be worth it when the system is genuinely strong, the economics work in your area, and the day-to-day role matches how you want to work. It is not worth it when you are buying a logo you like without validating the numbers, or when the operating reality clashes with your life. The work of deciding is doing the diligence, not finding a blanket answer.",
  },
  {
    q: "What makes a franchise 'worth it'?",
    a: "A few things tend to separate the worthwhile from the regrettable: a transparent franchisor with a track record you can verify, unit economics that hold up in the brand's own disclosures (Item 19) and in conversations with existing owners, territory availability in your market, and an owner role you would actually enjoy. When those line up, the fees and royalties buy real value. When they do not, the same fees buy frustration.",
  },
  {
    q: "How do I know if a franchise is a good investment for me?",
    a: "Validate, do not assume. Read the Franchise Disclosure Document, call a range of current and former franchisees, confirm the total investment and your funding path, and be honest about whether the daily work fits your life. A good advisor or consultant can help you pressure-test the fit before you commit. The goal is an informed decision, not a hopeful one, and sometimes the right call is to walk away.",
  },
  {
    q: "Do most franchises succeed?",
    a: "Outcomes vary widely by brand, by market, and by owner, and no one can promise a result. That is exactly why the diligence matters: rather than relying on a general success statistic, you evaluate the specific brand's disclosures, talk to its actual owners, and judge whether the model fits you. A strong, well-matched franchise stacks the odds; it does not remove risk.",
  },
];

export const metadata: Metadata = {
  title: "Is a Franchise Worth It? How to Decide Honestly | Waypoint Franchise Advisors",
  description:
    "Is buying a franchise worth it? An honest framework for deciding: what makes a franchise worthwhile, what to validate, and how to tell if it fits you. No hype, no earnings claims.",
  alternates: { canonical: "https://www.waypointfranchise.com/is-a-franchise-worth-it" },
  openGraph: {
    title: "Is a Franchise Worth It? | Waypoint Franchise Advisors",
    description:
      "There is no universal answer, only fit. Here is how to decide honestly, with the diligence that actually matters.",
    url: "https://www.waypointfranchise.com/is-a-franchise-worth-it",
  },
};

const factors = [
  { title: "A franchisor you can verify", body: "Track record, transparency, and a Franchise Disclosure Document that holds up to scrutiny, not just a polished pitch." },
  { title: "Economics that work in your market", body: "Unit-level performance in the brand's Item 19 and in validation calls, plus territory actually available where you are." },
  { title: "A role you would enjoy", body: "The honest daily reality (hours, staffing, customer type) matching how you want to spend your time, not just the brand's image." },
  { title: "A funding path that fits", body: "A clear way to reach the total investment without overextending, whether that is liquidity, an SBA loan, ROBS, or a mix." },
];

export default function IsAFranchiseWorthItPage() {
  return (
    <main className="bg-[#FAF8F4] text-[#0c1929]">
      <JsonLd
        data={jsonLdGraph(
          webPageSchema({
            url: `${SITE_URL}/is-a-franchise-worth-it`,
            name: "Is a Franchise Worth It? | Waypoint Franchise Advisors",
            description:
              "An honest framework for deciding whether a franchise is worth it: what makes one worthwhile, what to validate, and how to tell if it fits you.",
            breadcrumb: breadcrumbSchema([
              { name: "Home", url: SITE_URL },
              { name: "Is a Franchise Worth It?", url: `${SITE_URL}/is-a-franchise-worth-it` },
            ]),
          }),
          faqPageSchema(faqs, `${SITE_URL}/is-a-franchise-worth-it`),
        )}
      />

      {/* Hero */}
      <section className="pt-20 sm:pt-28 pb-12 sm:pb-16 px-6 border-b border-[#e8e0d0]">
        <div className="max-w-4xl mx-auto">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#8E3012] mb-4">The Honest Answer</p>
          <h1 className="font-playfair text-4xl sm:text-5xl text-[#0c1929] leading-tight mb-6 max-w-3xl">
            Is a franchise worth it?
          </h1>
          <p className="text-base sm:text-lg text-[#4a4a3e] leading-relaxed max-w-2xl mb-4">
            There is no universal answer, only fit. A franchise can be one of the smartest ways into business ownership, or an expensive mistake, depending on the brand, your market, and you. Anyone who gives you a blanket yes is selling something.
          </p>
          <p className="text-base text-[#4a4a3e] leading-relaxed max-w-2xl">
            What follows is the honest way to decide: the factors that make a franchise worthwhile, and the diligence that turns a hopeful guess into an informed call.
          </p>
        </div>
      </section>

      {/* Factors */}
      <section className="max-w-4xl mx-auto px-6 py-14 sm:py-20">
        <h2 className="font-playfair text-2xl sm:text-3xl mb-10">What makes a franchise worth it</h2>
        <div className="grid gap-6 sm:grid-cols-2">
          {factors.map((f) => (
            <div key={f.title} className="rounded-xl border border-[#e8e0d0] bg-white p-6">
              <div className="w-5 h-[2px] bg-[#CC6535] mb-4" />
              <h3 className="font-playfair text-lg text-[#0c1929] mb-2">{f.title}</h3>
              <p className="text-sm text-[#4a4a3e] leading-relaxed">{f.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Honest note */}
      <section className="bg-[#0c1929] py-14 sm:py-20 px-6">
        <div className="max-w-3xl mx-auto">
          <h2 className="font-playfair text-2xl text-white mb-4">Sometimes the right answer is no</h2>
          <p className="text-white/70 text-sm leading-relaxed mb-4">
            A real advisor will tell you when a franchise is not the right move: when the numbers do not work in your market, when the role would make you miserable, or when you are better off keeping your capital. Roughly speaking, a large share of people who seriously explore franchising decide not to buy, and that is a healthy outcome, not a failed one.
          </p>
          <p className="text-white/70 text-sm leading-relaxed">
            The point of the process is to reach the right decision for you, including walking away, not to talk you into a purchase.
          </p>
        </div>
      </section>

      {/* FAQ */}
      <section className="max-w-3xl mx-auto px-6 py-14 sm:py-20">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#8E3012] mb-4">Common Questions</p>
        <h2 className="font-playfair text-2xl sm:text-3xl mb-8">Questions about whether it is worth it</h2>
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
          <Link href="/franchise-vs-starting-a-business" className="group block bg-white border border-[#e8e0d0] rounded-lg p-5 hover:shadow-md hover:border-[#CC6535]/40 transition-all">
            <h3 className="font-playfair text-[0.95rem] leading-snug text-[#0c1929] group-hover:text-[#8E3012] transition-colors mb-3">Franchise vs. starting your own business</h3>
            <p className="text-xs text-[#8E3012] font-medium tracking-wide">Read →</p>
          </Link>
          <Link href="/resources/are-you-ready-to-own-a-franchise" className="group block bg-white border border-[#e8e0d0] rounded-lg p-5 hover:shadow-md hover:border-[#CC6535]/40 transition-all">
            <h3 className="font-playfair text-[0.95rem] leading-snug text-[#0c1929] group-hover:text-[#8E3012] transition-colors mb-3">Are you ready to own a franchise?</h3>
            <p className="text-xs text-[#8E3012] font-medium tracking-wide">Read →</p>
          </Link>
          <Link href="/scorecard" className="group block bg-white border border-[#e8e0d0] rounded-lg p-5 hover:shadow-md hover:border-[#CC6535]/40 transition-all">
            <h3 className="font-playfair text-[0.95rem] leading-snug text-[#0c1929] group-hover:text-[#8E3012] transition-colors mb-3">Take the readiness quiz</h3>
            <p className="text-xs text-[#8E3012] font-medium tracking-wide">Start →</p>
          </Link>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-[#0c1929] py-14 px-6 text-center">
        <p className="font-playfair text-2xl text-white mb-4">Want a straight answer for your situation?</p>
        <p className="text-white/70 mb-8 max-w-sm mx-auto text-sm leading-relaxed">
          Thirty minutes. No pitch. We will pressure-test whether a franchise is worth it for you, including if the answer is no.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link href="/book" className="inline-flex items-center justify-center px-8 py-4 text-sm font-semibold tracking-wide text-[#0c1929] bg-[#CC6535] hover:bg-[#D4724A] rounded-lg transition-all min-h-[48px]">Book a Free Call</Link>
          <a href="sms:+12149951062" className="inline-flex items-center justify-center gap-1.5 px-8 py-4 text-sm font-semibold tracking-wide text-white border border-white/25 hover:bg-white/10 rounded-lg transition-all min-h-[48px]">
            <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>
            Text Me
          </a>
        </div>
      </section>
    </main>
  );
}
