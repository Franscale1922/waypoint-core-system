import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { FAQItem } from "./FAQItem";

export const metadata: Metadata = {
  title: "FAQ | Waypoint Franchise Advisors",
  description:
    "Honest answers to common questions about franchise consulting, cost, capital requirements, funding paths, territory, semi-absentee ownership, the FDD, and how the process works.",
  alternates: { canonical: "https://www.waypointfranchise.com/faq" },
  openGraph: {
    title: "Frequently Asked Questions | Waypoint Franchise Advisors",
    description:
      "No jargon, no pitch. Straight answers about what franchise consulting costs, how the process works, and what it takes to get started.",
    url: "https://www.waypointfranchise.com/faq",
    images: [{ url: "/og/og-faq.png", width: 1200, height: 630, alt: "Waypoint FAQ — Honest Answers" }],
  },
};

type FAQLink = { url: string; label: string };
type FAQQuestion = { q: string; a: string; link?: FAQLink; defaultOpen?: boolean; cta?: { text: string; href: string } };

const faqs: { category: string; questions: FAQQuestion[] }[] = [
  {
    category: "Getting Started",
    questions: [
      {
        q: "What does this cost me?",
        a: "Nothing. My consulting services are completely free to you. Franchise brands pay a referral fee when a candidate they are introduced to becomes a franchisee. That fee comes from the brand, not from you, and it does not affect what you pay to buy the franchise.",
        link: { url: "/resources/do-you-need-a-franchise-consultant", label: "Do you need a franchise consultant?" },
        defaultOpen: true,
        cta: { text: "Still wondering if your situation qualifies? Let's find out", href: "/book" },
      },
      {
        q: "Do I need to know anything about franchising to get started?",
        a: "No. Most of the people I talk with have never looked at a franchise before. You bring your background, your goals, and your honest input. I handle the industry knowledge, the brand research, and the process navigation. That is what I am here for.",
        link: { url: "/resources/do-you-need-a-franchise-consultant", label: "Do you need a franchise consultant?" },
      },
      {
        q: "How much money do I need?",
        a: "A practical starting point is $100,000 in liquid assets, though the right number depends on the business model we find together. If you have $250,000 or more in deployable capital, that opens up a lot of options — through direct funding, ROBS, HELOC, or if necessary, bank financing. Before we talk about any loan, we will take honest stock of what you have available. We will talk through your full financial picture during the discovery call.",
        link: { url: "/resources/the-true-cost-of-buying-a-franchise", label: "The true cost of buying a franchise" },
        defaultOpen: true,
      },
      {
        q: "I have never owned a business. Does that disqualify me?",
        a: "Not at all. In fact, some of the strongest franchise candidates I have worked with came out of corporate careers, not small business ownership. Franchising is designed to give you a system to follow. What matters more is whether you have the discipline to follow it, the drive to push it forward, and the financial foundation to give it time.",
        link: { url: "/resources/are-you-ready-to-own-a-franchise", label: "Are you ready to own a franchise?" },
      },
    ],
  },
  {
    category: "The Process",
    questions: [
      {
        q: "What happens after I book a call?",
        a: "We start with a short intro call — usually 20 to 30 minutes — to understand where you are and whether going deeper makes sense. If it does, we schedule the full discovery conversation from there. That conversation is not a pitch. I am not going to show you franchises on that call. I am going to spend that time getting to know you: your background, what you are looking for, your financial picture, your preferences, and what you want the next chapter of your life to look like. After that call, I write a brief summary of what I heard and send it to you for review.",
        defaultOpen: true,
      },
      {
        q: "How long does the whole process take?",
        a: "Most candidates go from first conversation to a clear decision in four to eight weeks. Some move faster. Some take longer. The pace is yours to set. I am not here to rush you, and I am not going to disappear if you take time to think.",
        defaultOpen: true,
        cta: { text: "Ready to see what it looks like from your starting point? Book a conversation", href: "/book" },
      },
      {
        q: "How many brands will you show me?",
        a: "Three or four. Never more. I have found that when you see too many options, you start evaluating based on marketing materials rather than real fit. I screen the brands before I show them to you, so by the time we are talking about them, they have already passed a filter: financials reviewed, territory confirmed, and track record checked.",
        link: { url: "/resources/big-name-vs-emerging-which-franchise-to-buy", label: "Big-name vs. emerging: which franchise to buy" },
      },
      {
        q: "Will you stay involved throughout, or hand me off to someone?",
        a: "I stay with you through the entire process. Once we connect you with brands, I am with you on a regular cadence: reviewing what you heard, helping you prepare for the next conversation, and eventually helping you make sense of the legal agreement and what it actually means. You are not getting handed off to an associate.",
        link: { url: "/resources/do-you-need-a-franchise-consultant", label: "Do you need a franchise consultant?" },
      },
      {
        q: "What is discovery day, and when does it happen?",
        a: "Discovery day is the final step in the evaluation process. You travel to the franchisor's headquarters, spend one to two days with the executive team, walk through the operation, and see the culture for yourself. By the time you get there, the real work should be done. You have read the FDD, talked to existing franchisees, confirmed your territory, and lined up your funding. Discovery day is where you make your final call, not where they make their case.",
        link: { url: "/resources/what-to-expect-at-discovery-day", label: "What to expect at discovery day" },
      },
      {
        q: "What should I have done before attending discovery day?",
        a: "Four things should be locked down before you register: your franchisee validation calls are complete, your territory is confirmed, you have retained a franchise attorney to review the agreement, and your funding is in position. Funding in position means your capital source is confirmed and ready — whether that is accessible liquid savings, a structured ROBS, a tapped HELOC, or in cases where those paths do not cover the full need, a pre-approved SBA loan. Showing up to discovery day with open questions in any of those areas puts you in a position of making decisions under pressure right after the visit. That is avoidable.",
        link: { url: "/resources/what-to-expect-at-discovery-day", label: "What to expect at discovery day" },
      },
    ],
  },
  {
    category: "Funding & Capital",
    questions: [
      {
        q: "What are the most common ways to finance a franchise?",
        a: "Before reaching for a loan, the right move is to inventory what you actually have. Liquid savings and cash are the cleanest path — no debt, no banker, no monthly payment. If you have home equity, a HELOC gives you access to it at lower rates than a business loan and without the underwriting marathon that SBA requires. If you have retirement savings, ROBS (Rollover for Business Startups) lets you invest those funds directly into your franchise with no debt and no credit score requirement — and it closes in weeks. SBA 7(a) loans are the most widely used path for buyers who need capital beyond what those options provide. They are also the most demanding: full documentation, 60 to 90 days of bank underwriting, collateral, and a personal guarantee. The right path depends on what you have available — and we work through that together before any lender conversation happens.",
        link: { url: "/resources/how-franchise-funding-actually-works", label: "How franchise funding actually works" },
        defaultOpen: true,
      },
      {
        q: "Can I use my 401(k) or IRA to buy a franchise?",
        a: "Yes, through a structure called a ROBS. A ROBS provider sets up a C-Corp, which sells stock to your retirement account. The proceeds fund your franchise purchase. There is no early withdrawal penalty and no taxable event because the funds are invested, not distributed. No loan, no interest, no fixed monthly payment. The catch is that your retirement savings are directly at risk if the business underperforms. ROBS closes in days rather than months and requires no credit score qualification.",
        link: { url: "/resources/how-franchise-funding-actually-works", label: "How franchise funding actually works" },
      },
      {
        q: "What credit score do I need to get an SBA loan for a franchise?",
        a: "Most SBA lenders require a minimum credit score around 680, though 700 or higher will get you better terms and faster decisions. Beyond the score, SBA requires collateral, a personal guarantee, a liquidity cushion of around 10% of the loan amount, and a full documentation package: 2 to 3 years of personal tax returns, a business plan, and financial projections. The process takes 60 to 90 days minimum — often longer. If your score is below 680, SBA will be harder and slower. And even if you qualify, it is worth asking whether ROBS, a HELOC, or a combination of direct capital could cover the need without the documentation burden and debt service that SBA carries.",
        link: { url: "/resources/how-franchise-funding-actually-works", label: "How franchise funding actually works" },
      },
      {
        q: "Does the way I fund my franchise affect what I pay the franchisor?",
        a: "No. The franchise fee, royalty rate, and other brand fees are fixed regardless of how you financed the purchase. What your funding choice does affect is your monthly cash flow and your business's ability to breathe during the ramp-up period. Cash or ROBS means no fixed monthly payment — the business gets to generate revenue before any financial obligation runs against it. A HELOC carries interest but is typically lower and more flexible than a business loan. SBA creates a fixed debt payment that starts immediately and runs whether or not the business has a good month. For a business still finding its footing, that fixed payment is real pressure. The right choice comes down to what you have available and which path preserves the most operational flexibility.",
        link: { url: "/resources/how-franchise-funding-actually-works", label: "How franchise funding actually works" },
      },
    ],
  },
  {
    category: "Territory & Unit Count",
    questions: [
      {
        q: "What is a franchise territory, and how is it defined?",
        a: "A franchise territory is a defined geographic area (typically by zip code, radius, or population threshold) within which you have exclusive or protected rights to operate. The specific terms are defined in Item 12 of the Franchise Disclosure Document and in the franchise agreement itself. For home services and other territory-based models, the territory is as much of the investment as the franchise brand. Two owners in the same system with the same effort will produce very different results if one is operating in a dense, underserved market and the other is fighting over a saturated area.",
        link: { url: "/resources/how-to-pick-a-franchise-territory", label: "How to pick a franchise territory" },
      },
      {
        q: "Should I start with one location or buy multiple territories?",
        a: "Most buyers who work with advisors end up purchasing two to five units or territories, not one and not ten. Starting with a single unit limits your territory access, can cap your exit value, and can leave you owning a job rather than an asset. Buying more than you can realistically manage spreads resources too thin. The two to five unit range is typically where manageable risk and real growth potential align for first-time buyers. One thing worth understanding: a multi-unit development agreement does not mean writing multiple checks today. It means committing to a build-out timeline where the first unit generates cash flow that helps fund the next openings.",
        link: { url: "/resources/one-unit-or-multi-unit-what-first-timers-get-wrong", label: "One unit or multi-unit: what first-timers get wrong" },
      },
      {
        q: "Can I change my territory after signing?",
        a: "Generally, no. Territory is defined in the franchise agreement and locked in at signing. Some systems allow franchisees to negotiate adjacent territory rights as a right of first refusal if they expand, but that is not guaranteed and varies by brand. This is one reason territory selection should be a deliberate research decision made before discovery day, not a convenience choice made under timeline pressure.",
        link: { url: "/resources/how-to-pick-a-franchise-territory", label: "How to pick a franchise territory" },
      },
    ],
  },
  {
    category: "Understanding Franchises",
    questions: [
      {
        q: "What is the difference between a good franchise brand and a bad one?",
        a: "I think of franchise brands the way baseball fans think about the farm system. Major league brands are the household names: they are established, but the best territories were claimed years ago. What I look for are what I call triple-A brands. They are mature enough to have real systems, real support structures, and a track record worth trusting. But they still have open territory, which means you are not buying the scraps of a market someone else built.",
        link: { url: "/resources/big-name-vs-emerging-which-franchise-to-buy", label: "Big-name vs. emerging: which franchise to buy" },
      },
      {
        q: "What is a franchisee validation call?",
        a: "At a certain point in the process, the franchise brand will connect you with existing owners across their system. The brand is not on those calls. It is just you and people who are actually running the business, in real markets, with their own money invested. You can ask them anything: what a hard week looks like, where the brand falls short, what they wish they had known before signing. These conversations are, in my experience, the most valuable part of the entire process.",
        link: { url: "/resources/how-to-tell-if-a-franchisor-actually-cares", label: "How to tell if a franchisor actually cares" },
      },
      {
        q: "What is the legal disclosure document and why does it matter?",
        a: "Every franchise brand is required to give potential buyers a federal disclosure document before you commit to anything. This document, which can be anywhere from 100 to 300 pages, contains the full financial picture: fees, royalties, reported revenue and earnings from existing locations, how many units have opened and closed, and the legal history of the brand. I review this document before I ever show you a brand. If a brand does not report their financial performance in that document, I will not bring them to you.",
        link: { url: "/resources/fdd-decoded-what-actually-matters", label: "The FDD decoded: what actually matters" },
      },
      {
        q: "What percentage of people who go through this process actually buy a franchise?",
        a: "About thirty percent. I tell candidates this up front because I want you to know that I am not approaching this conversation trying to close a deal. The majority of people I talk with do not end up buying a franchise, and that is completely fine. I have the financial freedom to do this because I enjoy it, not because I need every conversation to convert.",
        link: { url: "/resources/are-you-ready-to-own-a-franchise", label: "Are you ready to own a franchise?" },
      },
      {
        q: "What is the difference between a franchise consultant and a franchise broker?",
        a: "In practice, the terms are often used interchangeably, and both are paid by the franchise brand when a candidate becomes a franchisee. The distinction that matters is how they work: a broker hands you a catalog; a consultant spends time understanding your situation before showing you anything. At Waypoint, I do not show a single brand until I have completed a full discovery conversation, written a profile of what I heard, and had you confirm it is accurate. The brand presentation comes after the fit analysis, not before it.",
        link: { url: "/resources/do-you-need-a-franchise-consultant", label: "Do you need a franchise consultant?" },
      },
      {
        q: "What is a franchise fee, and what does it cover?",
        a: "The initial franchise fee is a one-time payment to the franchisor that grants you the right to operate under their brand, system, and intellectual property within a defined territory. It typically ranges from $20,000 to $60,000 depending on the brand, and it is paid at the time you sign the franchise agreement. The fee covers your onboarding, initial training, access to the brand's systems and manuals, and territory rights. It does not cover build-out costs, equipment, working capital, or any of the ongoing royalties and fees that come once you are operating.",
        link: { url: "/resources/the-true-cost-of-buying-a-franchise", label: "The true cost of buying a franchise" },
      },
    ],
  },
  {
    category: "Ownership Models",
    questions: [
      {
        q: "Can I keep my job while the franchise gets started?",
        a: "You can, but treating the job as a safety net while the franchise grows in the background tends to stall businesses before they find traction. When the job is the primary income source and the franchise is the secondary project, the franchise rarely gets the urgency, attention, and decision-making speed it needs in the first 12 to 24 months. The safety net can actually make the business less likely to succeed, not more. What tends to work better: build a salary into the business model from day one, or use the spouse-run model where one partner keeps their income and the other runs the franchise full-time.",
        link: { url: "/resources/w2-to-franchise-owner-when-youre-actually-ready", label: "W2 to franchise owner: when you're actually ready" },
      },
      {
        q: "What does semi-absentee franchise ownership actually mean?",
        a: "In franchise terminology, semi-absentee means the business is designed to be run by a general manager or team day-to-day, with the owner involved for a defined number of hours per week, often 10 to 20. For this to work, three things need to be true: there is enough capital to hire quality management from the start, the franchise system has proven training so the manager is not inventing the job, and there is enough revenue in the model to sustain that management layer. If the numbers in Item 19 of the FDD do not support the cost of a quality manager, the semi-absentee label is a marketing claim, not an operational reality.",
        link: { url: "/resources/the-semi-absentee-franchise-real-talk", label: "The semi-absentee franchise: real talk" },
      },
      {
        q: "Is semi-absentee the same as owning a passive investment?",
        a: "No. A well-run semi-absentee franchise is an actively managed business where someone with real decision-making authority, usually the owner, is still checking in regularly, reviewing numbers, and handling the decisions a general manager cannot. A truly passive franchise investment, one where you set it and forget it, is rare, and most businesses operated that way in the early years underperform. The candidates who succeed in this model treat it as an asset to build, not a machine to ignore.",
        link: { url: "/resources/the-semi-absentee-franchise-real-talk", label: "The semi-absentee franchise: real talk" },
      },
    ],
  },
  {
    category: "Franchise Agreement & Legal",
    questions: [
      {
        q: "Can I negotiate a franchise agreement?",
        a: "Limited negotiation is possible, primarily around territory size, development timelines for multi-unit agreements, and in some cases initial franchise fees with emerging brands. Core terms (royalty rate, brand standards, term length, and exit provisions) are typically standardized across the system and not subject to negotiation. Attempting to renegotiate those terms usually signals to the franchisor that you do not understand how the system works. The franchisor built a system that depends on operational consistency across every location, and those core terms protect that consistency for every franchisee in it, including you.",
        link: { url: "/resources/the-franchise-agreement-what-you-can-and-cant-negotiate", label: "The franchise agreement: what you can and cannot negotiate" },
      },
      {
        q: "Do I need a franchise attorney?",
        a: "Yes. Every franchise buyer should have a franchise-specific attorney review the agreement before signing. A general business attorney is not the right fit here. A franchise attorney understands FTC disclosure requirements, state franchise registration laws, and what standard terms actually mean. They are not reading the agreement hoping to renegotiate it wholesale. They are looking for unusually aggressive termination language, vaguely defined territory protections, non-compete clauses that follow you after the agreement ends, and any inconsistencies between what you were told in the sales process and what the agreement actually says. A review typically runs $1,500 to $3,500. On a $150,000 to $500,000 investment, this is not a place to save money.",
        link: { url: "/resources/the-franchise-agreement-what-you-can-and-cant-negotiate", label: "The franchise agreement: what you can and cannot negotiate" },
      },
      {
        q: "What if I was told something verbally that is not in the franchise agreement?",
        a: "It does not exist as an enforceable obligation. If anything you were told during the sales process is not in the franchise agreement or the FDD, it holds no legal weight. This is one of the primary reasons to have a franchise attorney review the agreement before signing, specifically to catch any inconsistencies between verbal representations and written terms. If you discover a material discrepancy at the signing stage, you are signing too early.",
        link: { url: "/resources/the-franchise-agreement-what-you-can-and-cant-negotiate", label: "The franchise agreement: what you can and cannot negotiate" },
      },
    ],
  },
  {
    category: "Making the Decision",
    questions: [
      {
        q: "What if I decide franchising is not right for me?",
        a: "Then we end the conversation with no hard feelings and no pressure. I would rather tell you that this is not the right move than watch you make a decision that does not fit. If it is not the right time, or the right path, or the right life situation, I will say so. That is what I am here for. Only about 30% of my clients end up buying a franchise. I hope 100% of them are making the right decision.",
        link: { url: "/resources/are-you-ready-to-own-a-franchise", label: "Are you ready to own a franchise?" },
      },
      {
        q: "Can I bring a partner or spouse into the process?",
        a: "Yes, and I would encourage it. Big financial decisions that affect a household usually need both people in the room at some point. The earlier your partner is involved, the better. It avoids a lot of the back-and-forth that can slow things down unnecessarily.",
      },
      {
        q: "What are the signs that it is the wrong time to buy a franchise?",
        a: "A few situations genuinely disqualify the timing, even if the person is otherwise a strong candidate. If your liquid capital is under $75,000 to $100,000, most solid options are off the table. If you are in the middle of a major life transition (divorce, a health crisis, a recent job loss with no financial runway), the stress load of starting a business on top of that is a real risk. If you need the business to replace your income in the first six months, that is also a warning sign. Franchises take time to ramp up. The candidates who struggle most are the ones who needed the money to flow before they were positioned for it.",
        link: { url: "/resources/w2-to-franchise-owner-when-youre-actually-ready", label: "W2 to franchise owner: when you're actually ready" },
      },
      {
        q: "How do I know when I am actually ready to move forward?",
        a: "A few signals usually line up at the same time: your liquid capital picture is clear and you know what you can deploy, you have a sense of what kind of work you want to be doing and what you want to step away from, and you have enough runway that the first 12 to 18 months of a new business building toward profitability is not a financial emergency. If those three things are in place, the remaining questions are about fit: which brand, which model, which territory. That is what the discovery process is designed to answer.",
        link: { url: "/checklists", label: "Download a free franchise readiness checklist" },
      },
    ],
  },
];

// Build FAQPage schema from the faqs array above
const faqPageSchema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: faqs.flatMap(({ questions }) =>
    questions.map(({ q, a }) => ({
      "@type": "Question",
      name: q,
      acceptedAnswer: {
        "@type": "Answer",
        text: a,
      },
    }))
  ),
};

export default function FAQPage() {
  return (
    <main className="bg-[#FAF8F4] text-[#0c1929]">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqPageSchema) }}
      />

      {/* Hero */}
      <section className="relative pt-24 pb-16 px-6 overflow-hidden">
        <Image
          src="/images/faq-hero.jpg"
          alt="Montana highland scenery"
          fill
          priority
          sizes="100vw"
          className="object-cover"
          style={{ objectPosition: "center 40%" }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-[#0c1929]/60 via-[#0c1929]/35 to-[#0c1929]/15" />
        <div className="relative z-10 max-w-4xl mx-auto text-center">

          <h1 className="font-playfair text-4xl sm:text-6xl text-white mb-6">
            Honest answers
          </h1>
          <p className="text-white/80 text-lg max-w-xl mx-auto leading-relaxed">
            If something is not covered here, just ask. There are no questions that are too basic.
          </p>
        </div>
      </section>

      {/* G.1 — Category anchor nav */}
      <div className="sticky top-0 z-10 bg-[#FAF8F4] border-b border-[#e2ddd2] overflow-x-auto">
        <div className="flex gap-2 px-6 py-3 no-scrollbar">
          {[
            { label: "Getting Started", id: "getting-started" },
            { label: "The Process", id: "the-process" },
            { label: "Funding & Capital", id: "funding-capital" },
            { label: "Territory & Unit Count", id: "territory-unit-count" },
            { label: "Understanding Franchises", id: "understanding-franchises" },
            { label: "Ownership Models", id: "ownership-models" },
            { label: "Agreement & Legal", id: "agreement-legal" },
            { label: "Making the Decision", id: "making-the-decision" },
          ].map(({ label, id }) => (
            <a
              key={id}
              href={`#${id}`}
              className="flex-shrink-0 text-xs font-semibold px-4 py-2 rounded-full border border-[#0c1929]/20 text-[#0c1929] hover:bg-[#0c1929] hover:text-white hover:border-[#0c1929] transition-all whitespace-nowrap"
            >
              {label}
            </a>
          ))}
        </div>
      </div>

      {/* FAQ body */}
      <section className="max-w-3xl mx-auto px-6 py-16 sm:py-24 space-y-16">
        {faqs.map(({ category, questions }) => {
          const id = category
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/(^-|-$)/g, "");
          return (
          <div key={category} id={id} style={{ scrollMarginTop: "120px" }}>
            <h2 className="font-playfair text-xl text-[#CC6535] mb-6 pb-3 border-b border-[#e8e0d0]">
              {category}
            </h2>
            <div>
              {questions.map(({ q, a, link, defaultOpen, cta }) => (
                <FAQItem key={q} q={q} a={a} link={link} defaultOpen={defaultOpen} cta={cta} />
              ))}
            </div>
          </div>
        )})}
      </section>

      {/* Still have questions */}
      <section className="bg-[#0c1929] py-16 px-6 text-center">
        <p className="font-playfair text-2xl text-white mb-4">
          Still have a question?
        </p>
        <p className="text-white/70 mb-8 max-w-md mx-auto">
          The fastest way to get a real answer is a real conversation.{" "}
          Or <a href="/process" className="text-[#CC6535] hover:underline">see exactly how the process works →</a>
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
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
