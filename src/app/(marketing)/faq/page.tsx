"use client";
import { useState } from "react";
import Link from "next/link";

const faqs = [
  {
    category: "Getting Started",
    questions: [
      {
        q: "What does this cost me?",
        a: "Nothing. My consulting services are completely free to you. Franchise brands pay a referral fee when a candidate they are introduced to becomes a franchisee. That fee comes from the brand, not from you, and it does not affect what you pay to buy the franchise.",
      },
      {
        q: "Do I need to know anything about franchising to get started?",
        a: "No. Most of the people I talk with have never looked at a franchise before. You bring your background, your goals, and your honest input. I handle the industry knowledge, the brand research, and the process navigation. That is what I am here for.",
      },
      {
        q: "How much money do I need?",
        a: "A practical starting point is $100,000 in liquid assets, though the right number depends on the business model we find together. If you have $250,000 or more in deployable capital, you can generally leverage that up significantly through SBA financing or other programs. We will talk through your full financial picture during the discovery call.",
      },
      {
        q: "I have never owned a business. Does that disqualify me?",
        a: "Not at all. In fact, some of the strongest franchise candidates I have worked with came out of corporate careers, not small business ownership. Franchising is designed to give you a system to follow. What matters more is whether you have the discipline to follow it, the drive to push it forward, and the financial foundation to give it time.",
      },
    ],
  },
  {
    category: "The Process",
    questions: [
      {
        q: "What happens after I book a call?",
        a: "We schedule a two-hour discovery conversation. It is not a pitch. I am not going to show you franchises on that call. I am going to spend that time getting to know you: your background, what you are looking for, your financial picture, your preferences, and what you want the next chapter of your life to look like. After that call, I write a brief summary of what I heard and send it to you for review.",
      },
      {
        q: "How long does the whole process take?",
        a: "Most candidates go from first conversation to a clear decision in four to eight weeks. Some move faster. Some take longer. The pace is yours to set. I am not here to rush you, and I am not going to disappear if you take time to think.",
      },
      {
        q: "How many brands will you show me?",
        a: "Three or four. Never more. I have found that when you see too many options, you start evaluating based on marketing materials rather than real fit. I screen the brands before I show them to you, so by the time we are talking about them, they have already passed a filter: financials reviewed, territory confirmed, and track record checked.",
      },
      {
        q: "Will you stay involved throughout, or hand me off to someone?",
        a: "I stay with you through the entire process. Once we connect you with brands, I am with you on a regular cadence: reviewing what you heard, helping you prepare for the next conversation, and eventually helping you make sense of the legal agreement and what it actually means. You are not getting handed off to an associate.",
      },
    ],
  },
  {
    category: "Understanding Franchises",
    questions: [
      {
        q: "What is the difference between a good franchise brand and a bad one?",
        a: "I think of franchise brands the way baseball fans think about the farm system. Major league brands are the household names: they are established, but the best territories were claimed years ago. What I look for are what I call triple-A brands. They are mature enough to have real systems, real support structures, and a track record worth trusting. But they still have open territory, which means you are not buying the scraps of a market someone else built.",
      },
      {
        q: "What is a franchisee validation call?",
        a: "At a certain point in the process, the franchise brand will connect you with existing owners across their system. The brand is not on those calls. It is just you and people who are actually running the business, in real markets, with their own money invested. You can ask them anything: what a hard week looks like, where the brand falls short, what they wish they had known before signing. These conversations are, in my experience, the most valuable part of the entire process.",
      },
      {
        q: "What is the legal disclosure document and why does it matter?",
        a: "Every franchise brand is required to give potential buyers a federal disclosure document before you commit to anything. This document, which can be anywhere from 100 to 300 pages, contains the full financial picture: fees, royalties, reported revenue and earnings from existing locations, how many units have opened and closed, and the legal history of the brand. I review this document before I ever show you a brand. If a brand does not report their financial performance in that document, I will not bring them to you.",
      },
      {
        q: "What percentage of people who go through this process actually buy a franchise?",
        a: "About thirty percent. I tell candidates this up front because I want you to know that I am not approaching this conversation trying to close a deal. The majority of people I talk with do not end up buying a franchise, and that is completely fine. I have the financial freedom to do this because I enjoy it, not because I need every conversation to convert.",
      },
    ],
  },
  {
    category: "Making the Decision",
    questions: [
      {
        q: "What if I decide franchising is not right for me?",
        a: "Then we end the conversation with no hard feelings and no pressure. I would rather tell you that this is not the right move than watch you make a decision that does not fit. If it is not the right time, or the right path, or the right life situation, I will say so. That is what I am here for. Only about 30% of my clients end up buying a franchise. I hope 100% of them are making the right decision.",
      },
      {
        q: "Can I bring a partner or spouse into the process?",
        a: "Yes, and I would encourage it. Big financial decisions that affect a household usually need both people in the room at some point. The earlier your partner is involved, the better. It avoids a lot of the back-and-forth that can slow things down unnecessarily.",
      },
    ],
  },
];

function FAQItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-[#e8e0d0]">
      <button
        onClick={() => setOpen(!open)}
        className="w-full text-left py-5 flex justify-between items-start gap-4 group"
        aria-expanded={open}
      >
        <span className="font-medium text-[#0c1929] leading-snug group-hover:text-[#d4a55a] transition-colors">
          {q}
        </span>
        <span className="flex-shrink-0 mt-1 text-[#d4a55a] text-lg leading-none">
          {open ? "−" : "+"}
        </span>
      </button>
      {open && (
        <div className="pb-6 pr-8">
          <p className="text-[#5a5a4a] leading-relaxed">{a}</p>
        </div>
      )}
    </div>
  );
}

export default function FAQPage() {
  return (
    <main className="bg-[#FAF8F4] text-[#0c1929]">

      {/* ── Hero ────────────────────────────────────────── */}
      <section className="relative pt-24 pb-16 px-6 overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: "url('/images/faq-hero.png')", backgroundPosition: "center 40%" }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-[#0c1929]/75 via-[#0c1929]/55 to-[#0c1929]/30" />
        <div className="relative z-10 max-w-4xl mx-auto text-center">
          <p className="text-[#d4a55a] text-xs tracking-[0.2em] uppercase font-medium mb-4">
            Common Questions
          </p>
          <h1 className="font-playfair text-4xl sm:text-6xl text-white mb-6">
            Honest answers.
          </h1>
          <p className="text-white/80 text-lg max-w-xl mx-auto leading-relaxed">
            If something is not covered here, just ask. There are no questions that are too basic.
          </p>
        </div>
      </section>

      {/* ── FAQ body ────────────────────────────────────── */}
      <section className="max-w-3xl mx-auto px-6 py-16 sm:py-24 space-y-16">
        {faqs.map(({ category, questions }) => (
          <div key={category}>
            <h2 className="font-playfair text-xl text-[#d4a55a] mb-6 pb-3 border-b border-[#e8e0d0]">
              {category}
            </h2>
            <div>
              {questions.map(({ q, a }) => (
                <FAQItem key={q} q={q} a={a} />
              ))}
            </div>
          </div>
        ))}
      </section>

      {/* ── Still have questions ─────────────────────── */}
      <section className="bg-[#0c1929] py-16 px-6 text-center">
        <p className="font-playfair text-2xl text-white mb-4">
          Still have a question?
        </p>
        <p className="text-white/70 mb-8 max-w-md mx-auto">
          The fastest way to get a real answer is a real conversation.
        </p>
        <Link
          href="/book"
          className="inline-block bg-[#d4a55a] text-white px-8 py-4 text-sm tracking-widest uppercase hover:bg-[#c4953a] transition-colors"
        >
          Book a Free Call
        </Link>
      </section>

    </main>
  );
}
