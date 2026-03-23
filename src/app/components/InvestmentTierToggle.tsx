"use client";

import { useState } from "react";

export type TierMode = "cash" | "investment";

export interface InvestmentTier {
  cashRange: string;
  investmentRange: string;
  label: string;
  description: string;
  examples: string[];
}

interface Props {
  tiers: InvestmentTier[];
}

// SVG icons — inline so we avoid an extra import
function CashIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="2" y="6" width="20" height="12" rx="2" />
      <circle cx="12" cy="12" r="3" />
      <path d="M6 12h.01M18 12h.01" />
    </svg>
  );
}

function ChartIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <line x1="18" y1="20" x2="18" y2="10" />
      <line x1="12" y1="20" x2="12" y2="4" />
      <line x1="6" y1="20" x2="6" y2="14" />
      <line x1="2" y1="20" x2="22" y2="20" />
    </svg>
  );
}

// Animated range display — remounted by the parent via a changing `key` prop
function AnimatedRange({ value }: { value: string }) {
  return (
    <span
      className="block text-[#CC6535] font-black text-xl mb-1"
      style={{
        animation: "rangeReveal 0.35s cubic-bezier(0.22, 1, 0.36, 1) both",
      }}
    >
      {value}
    </span>
  );
}

// Subtle badge shown on each card in cash mode to explain what it represents
function CashBadge() {
  return (
    <span
      className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-widest text-[#CC6535]/70 border border-[#CC6535]/20 rounded-full px-2 py-0.5 mb-3"
      title="Approximate personal liquid capital required (20% of total investment)"
    >
      <CashIcon />
      <span>Cash required</span>
    </span>
  );
}

export default function InvestmentTierToggle({ tiers }: Props) {
  const [mode, setMode] = useState<TierMode>("cash");

  const isCash = mode === "cash";

  return (
    <section className="bg-[#0c1929] py-14 sm:py-20 px-5 sm:px-6">

      {/* Keyframe injected at component level — self-contained */}
      <style>{`
        @keyframes rangeReveal {
          from { opacity: 0; transform: translateY(6px) scale(0.97); }
          to   { opacity: 1; transform: translateY(0)   scale(1);    }
        }
        @media (prefers-reduced-motion: reduce) {
          .animate-range { animation: none !important; }
        }
      `}</style>

      <div className="max-w-4xl mx-auto">

        {/* Section label */}
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#CC6535] mb-4">
          Investment Tiers
        </p>

        {/* Heading + toggle row */}
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-5 mb-4">
          <h2
            className="font-playfair text-2xl sm:text-3xl text-white transition-opacity duration-300"
            style={{ fontFamily: "var(--font-playfair, Georgia, serif)" }}
          >
            {isCash
              ? "What your cash opens up"
              : "What your capital range opens up"}
          </h2>

          {/* Toggle pill */}
          <div
            role="radiogroup"
            aria-label="View investment tiers by"
            className="flex-shrink-0 flex items-center bg-[#0f2035] border border-[#1b3a5f] rounded-full p-1 gap-1 self-start"
          >
            <button
              role="radio"
              aria-checked={isCash}
              onClick={() => setMode("cash")}
              className={[
                "flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-semibold tracking-wide transition-all duration-300 min-w-[130px] justify-center",
                isCash
                  ? "bg-[#CC6535] text-white shadow-md"
                  : "text-white/50 hover:text-white/80",
              ].join(" ")}
            >
              <CashIcon />
              Personal Cash
            </button>
            <button
              role="radio"
              aria-checked={!isCash}
              onClick={() => setMode("investment")}
              className={[
                "flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-semibold tracking-wide transition-all duration-300 min-w-[130px] justify-center",
                !isCash
                  ? "bg-[#CC6535] text-white shadow-md"
                  : "text-white/50 hover:text-white/80",
              ].join(" ")}
            >
              <ChartIcon />
              Total Investment
            </button>
          </div>
        </div>

        {/* Contextual caption — different copy per mode */}
        <p className="text-sm text-white/60 leading-relaxed mb-3 max-w-2xl transition-opacity duration-300">
          {isCash
            ? "Most franchisors require roughly 20% of the total investment in liquid personal capital — the cash you actually control today."
            : "Total investment includes all costs to open: franchise fee, build-out, equipment, working capital, and pre-opening expenses."}
        </p>

        {/* Explanation pill — only in cash mode */}
        <div
          className="flex items-center gap-2 mb-10 overflow-hidden"
          style={{
            maxHeight: isCash ? "40px" : "0px",
            opacity: isCash ? 1 : 0,
            transition: "max-height 0.4s cubic-bezier(0.22,1,0.36,1), opacity 0.3s ease",
          }}
        >
          <div className="w-1 h-1 rounded-full bg-[#CC6535] flex-shrink-0" />
          <p className="text-xs text-white/40 leading-relaxed">
            Cash ranges below use a 20% rule with a $50K floor. Actual franchisor minimums vary — confirm in the FDD.
          </p>
        </div>

        {/* Tier cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {tiers.map((tier, i) => (
            <div
              key={tier.label}
              className="group bg-[#0f2035] border border-[#1b3a5f] rounded-xl p-6 hover:border-[#CC6535]/40 hover:bg-[#112238] transition-all duration-300"
              style={{ transitionDelay: `${i * 30}ms` }}
            >
              {/* Badge — only in cash mode */}
              <div
                style={{
                  maxHeight: isCash ? "32px" : "0px",
                  opacity: isCash ? 1 : 0,
                  overflow: "hidden",
                  transition: "max-height 0.35s cubic-bezier(0.22,1,0.36,1), opacity 0.25s ease",
                }}
              >
                <CashBadge />
              </div>

              {/* Range number — keyed by mode+label so React remounts and replays animation */}
              <AnimatedRange
                key={`${mode}-${tier.label}`}
                value={isCash ? tier.cashRange : tier.investmentRange}
              />

              {/* Label */}
              <p className="text-white font-semibold text-sm mb-3">{tier.label}</p>

              {/* Description */}
              <p className="text-white/60 text-sm leading-relaxed mb-4">{tier.description}</p>

              {/* Examples */}
              <ul className="space-y-1">
                {tier.examples.map((ex) => (
                  <li key={ex} className="text-xs text-white/50 flex items-start gap-2">
                    <span className="text-[#CC6535] mt-0.5 flex-shrink-0">—</span>
                    {ex}
                  </li>
                ))}
              </ul>

              {/* Hover bottom accent line */}
              <div className="mt-5 h-px w-0 bg-[#CC6535]/40 group-hover:w-full transition-all duration-500 ease-out" />
            </div>
          ))}
        </div>

        {/* Bottom note — total investment mode only */}
        <div
          style={{
            maxHeight: !isCash ? "60px" : "0px",
            opacity: !isCash ? 1 : 0,
            overflow: "hidden",
            transition: "max-height 0.4s cubic-bezier(0.22,1,0.36,1), opacity 0.3s ease",
          }}
        >
          <p className="mt-8 text-xs text-white/30 leading-relaxed">
            Total investment ranges represent the full cost to open, per the franchisor&apos;s FDD Item 7 estimates. Plan for the top of any stated range.
          </p>
        </div>

      </div>
    </section>
  );
}
