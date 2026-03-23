"use client";

import Link from "next/link";
import { useState } from "react";

const testimonials = [
  {
    quote:
      "I came in excited about two different concepts. Kelsey helped me walk through the real numbers and the day-to-day reality of each one. By the end of those conversations, I had a much clearer picture of what I actually wanted. The one I chose has been a great fit.",
    name: "Marcus T.",
    role: "Former Regional Director, now franchise owner",
    location: "Denver, CO",
    score: "Readiness Score: 78",
  },
  {
    quote:
      "I thought I wanted a food concept. After one conversation with Kelsey, I realized I didn't want the hours. He matched me to a service brand I'd never heard of. Two years in, best decision I've made.",
    name: "Jennifer R.",
    role: "Corporate expat, franchise owner since 2023",
    location: "Austin, TX",
    score: "Readiness Score: 84",
  },
  {
    quote:
      "Most consultants send you a list and disappear. Kelsey stayed involved through the whole process, from reviewing the legal agreement to talking through what other owners actually experienced. Felt like having someone truly in my corner.",
    name: "David K.",
    role: "Trailing spouse, now owner of two units",
    location: "Nashville, TN",
    score: "Readiness Score: 71",
  },
  {
    quote:
      "Kelsey told me not to buy. He told me my situation wasn't right for the concept I wanted and walked me through why. Six months later I was ready, and we found something that fit. That conversation saved me from a bad decision.",
    name: "Carol M.",
    role: "Former healthcare executive, franchise owner since 2025",
    location: "Phoenix, AZ",
    score: "Readiness Score: 62",
  },
  {
    quote:
      "I just wanted to understand my options. I was not in a hurry. Kelsey never pushed me toward anything. He helped me put together a plan so that by the time I leave corporate, the business will already be running.",
    name: "James P.",
    role: "Still employed, franchise opens Q3 2026",
    location: "Chicago, IL",
    score: "Readiness Score: 73",
  },
  {
    quote:
      "My husband assumed this was another sales pitch. Ten minutes into the call he was asking more questions than I was. Once Kelsey explained how he gets paid, my husband was the one pushing us to move forward.",
    name: "Rachel S.",
    role: "Teacher turned franchise co-owner",
    location: "Raleigh, NC",
    score: "Readiness Score: 69",
  },
  {
    quote:
      "I came in with a list of brands I'd already researched. Kelsey set the list aside and showed me something I'd never considered. Six months after that call I opened my doors. I would not have found it without him.",
    name: "Tom W.",
    role: "Former tech executive, franchise owner",
    location: "Seattle, WA",
    score: "Readiness Score: 81",
  },
  {
    quote:
      "I needed something that didn't require me on-site 60 hours a week. Kelsey never brought me a brand that didn't fit that. What we found matched what I described from the first conversation.",
    name: "Lisa H.",
    role: "Trailing spouse, semi-absentee owner",
    location: "Scottsdale, AZ",
    score: "Readiness Score: 76",
  },
];

function TestimonialCard({ t }: { t: (typeof testimonials)[number] }) {
  return (
    <div className="flex flex-col bg-white rounded-2xl p-7 sm:p-8 border border-[#e2ddd2] shadow-sm h-full">
      {/* Quote mark */}
      <div
        className="text-5xl sm:text-6xl font-serif text-[#CC6535] leading-none mb-4 select-none"
        aria-hidden="true"
      >
        &ldquo;
      </div>

      {/* Quote text */}
      <p className="text-sm sm:text-base text-[#3a3a3a] leading-relaxed flex-1">
        {t.quote}
      </p>

      {/* Copper rule */}
      <div className="h-px bg-[#CC6535]/30 my-5 sm:my-6" />

      {/* Attribution */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-[#1a1a1a]">{t.name}</p>
          <p className="text-xs text-[#555555] mt-0.5">{t.role}</p>
          <p className="text-xs text-[#555555]">{t.location}</p>
        </div>
        <div className="shrink-0 text-right">
          <span className="inline-block text-[10px] font-medium text-[#8E3012] bg-[#fdf5e6] px-2 py-1 rounded-md tracking-wide">
            {t.score}
          </span>
        </div>
      </div>
    </div>
  );
}

export default function Testimonials() {
  const [activeIndex, setActiveIndex] = useState(0);

  return (
    <section className="py-16 sm:py-24 md:py-32 bg-[#FAF8F4]">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        {/* Header */}
        <div className="reveal text-center mb-12 sm:mb-20">
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-[#8E3012] mb-4 sm:mb-6">
            From the people who&apos;ve been through it
          </p>
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-[#1a1a1a] tracking-tight max-w-2xl mx-auto leading-tight">
            Don&apos;t take my word for it.
          </h2>
        </div>

        {/* ── Mobile carousel (hidden on md+) ── */}
        <div className="md:hidden">
          <div className="relative">
            <TestimonialCard t={testimonials[activeIndex]} />
          </div>

          <div className="flex justify-center gap-1 mt-6" role="tablist" aria-label="Testimonials">
            {testimonials.map((_, i) => (
              <button
                key={i}
                role="tab"
                aria-selected={i === activeIndex}
                aria-label={`Testimonial ${i + 1}`}
                onClick={() => setActiveIndex(i)}
                className="flex items-center justify-center w-11 h-11 rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-[#CC6535]"
              >
                <span
                  className={`block rounded-full transition-all duration-300 ${
                    i === activeIndex
                      ? "w-6 h-2 bg-[#CC6535]"
                      : "w-2 h-2 bg-[#CC6535]/25 hover:bg-[#CC6535]/50"
                  }`}
                />
              </button>
            ))}
          </div>

          {/* Prev / Next buttons */}
          <div className="flex justify-center gap-4 mt-5">
            <button
              onClick={() => setActiveIndex((prev) => (prev - 1 + testimonials.length) % testimonials.length)}
              aria-label="Previous testimonial"
              className="flex items-center justify-center w-10 h-10 rounded-full border border-[#e2ddd2] bg-white text-[#555] hover:border-[#CC6535] hover:text-[#CC6535] transition-colors"
            >
              <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <button
              onClick={() => setActiveIndex((prev) => (prev + 1) % testimonials.length)}
              aria-label="Next testimonial"
              className="flex items-center justify-center w-10 h-10 rounded-full border border-[#e2ddd2] bg-white text-[#555] hover:border-[#CC6535] hover:text-[#CC6535] transition-colors"
            >
              <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>

        {/* ── Desktop grid (hidden below md) ── */}
        <div className="hidden md:grid grid-cols-3 gap-6 sm:gap-8">
          {testimonials.map((t, i) => (
            <div
              key={t.name}
              className="reveal hover:shadow-md transition-shadow duration-300"
              style={{ transitionDelay: `${i * 75}ms` }}
            >
              <TestimonialCard t={t} />
            </div>
          ))}
        </div>

        {/* CTA */}
        <div className="reveal mt-12 sm:mt-16 text-center">
          <p className="text-sm text-[#7a7a7a] mb-5">
            146+ owners helped across 35 states. All free.
          </p>
          <Link
            href="/scorecard"
            className="inline-flex items-center justify-center px-7 py-4 text-sm font-semibold tracking-wide text-[#0c1929] bg-[#CC6535] hover:bg-[#D4724A] rounded-lg transition-all press-effect min-h-[48px]"
          >
            Take the Readiness Quiz
          </Link>
          <p className="mt-5 text-sm text-[#7a7a7a]">
            Know someone who&apos;s been thinking about this?{" "}
            <Link href="/refer" className="text-[#8E3012] hover:text-[#CC6535] transition-colors font-medium">
              Point them this way →
            </Link>
          </p>
        </div>
      </div>
    </section>
  );
}
