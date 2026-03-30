"use client";

import { useState } from "react";
import Link from "next/link";

export type Testimonial = {
  quote: string;
  name: string;
  role: string;
  location: string;
  score: string;
};

function TestimonialCard({ t }: { t: Testimonial }) {
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

export default function TestimonialsCarousel({
  testimonials,
  ownersHelped,
  statesServed,
}: {
  testimonials: Testimonial[];
  ownersHelped: number;
  statesServed: number;
}) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);

  const minSwipeDistance = 50;

  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const onTouchEndHandler = () => {
    if (!touchStart || !touchEnd) return;
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;

    if (isLeftSwipe) {
      setActiveIndex((prev) => (prev + 1) % testimonials.length);
    }
    if (isRightSwipe) {
      setActiveIndex((prev) => (prev - 1 + testimonials.length) % testimonials.length);
    }
  };

  return (
    <>
      {/* ── Mobile carousel (hidden on md+) ── */}
      <div className="md:hidden">
        <div 
          className="relative touch-pan-y" 
          onTouchStart={onTouchStart} 
          onTouchMove={onTouchMove} 
          onTouchEnd={onTouchEndHandler}
        >
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
          {ownersHelped}+ owners helped across {statesServed} states. All free.
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
    </>
  );
}
