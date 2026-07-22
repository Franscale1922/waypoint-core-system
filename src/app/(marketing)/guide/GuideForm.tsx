"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Franchise Interview Guide - a private, fill-in-the-browser worksheet.
 * Native on phone and desktop (no app, no login). Answers autosave to the
 * visitor's own browser; "Save / Print" produces a PDF; "New brand" clears it.
 * Nothing is sent anywhere - the visitor's notes stay on their device.
 */

type Field = { key: string; n?: number; q: string; multiline?: boolean };
type Section = { heading: string; note?: string; fields: Field[] };

const SECTIONS: Section[] = [
  {
    heading: "What is the owner's role?",
    fields: [
      { key: "q1", n: 1, q: "Is the owner typically in the business every day working with customers and clients, or is it designed to run with a manager from day one?" },
      { key: "q2", n: 2, q: "Is the owner typically the main marketer and salesperson, or is the business designed to hire those roles from the beginning?" },
    ],
  },
  {
    heading: "Marketing",
    fields: [
      { key: "q3", n: 3, q: "As the business collects leads, are they coming in warm from local marketing, or does lead flow depend on outbound prospecting where I am introducing the company through cold outreach?" },
      { key: "q4", n: 4, q: "Is marketing managed in house, through a single third-party marketing company, or do I have choices and control over a marketing partner?" },
    ],
  },
  {
    heading: "Numbers",
    fields: [
      { key: "q5", n: 5, q: "What is the typical total investment range to open?" },
      { key: "q6", n: 6, q: "What is in your Item 19 (financial reporting)?" },
      { key: "q7", n: 7, q: "How many franchisees are in the system right now?" },
      { key: "q8", n: 8, q: "What percentage of eligible owners are represented in Item 19 (financial reporting)?" },
    ],
  },
  {
    heading: "Owner demographics",
    fields: [
      { key: "q9", n: 9, q: "What percentage of the owners are multi-unit?" },
      { key: "q10", n: 10, q: "What percentage of the owners are women?" },
    ],
  },
  {
    heading: "Support & coaching",
    fields: [
      { key: "q11", n: 11, q: "Does the brand have business coaches who support financial growth, personnel management, and marketing strategy?" },
      { key: "q12", n: 12, q: "What experience level do those coaches have in this industry?" },
    ],
  },
  {
    heading: "Going deeper: if it's a location-based business",
    fields: [
      { key: "q13", n: 13, q: "Do you help with site selection, lease negotiation, and construction?" },
      { key: "q14", n: 14, q: "Does your team manage that, or do you connect me with outside vendors?" },
    ],
  },
  {
    heading: "Going deeper: if it's home-based or mobile",
    fields: [
      { key: "q15", n: 15, q: "What is provided to me, and what do I have to buy or secure on my own?" },
    ],
  },
  {
    heading: "My read on this brand",
    fields: [
      { key: "readWorth", q: "Worth a second conversation?" },
      { key: "readStood", q: "What stood out:" },
      { key: "readConcerned", q: "What concerned me:" },
    ],
  },
];

const ALL_KEYS = ["brand", ...SECTIONS.flatMap((s) => s.fields.map((f) => f.key))];
const STORAGE_KEY = "waypoint-guide-draft-v1";
const emptyState = () => Object.fromEntries(ALL_KEYS.map((k) => [k, ""])) as Record<string, string>;

export default function GuideForm() {
  const [values, setValues] = useState<Record<string, string>>(emptyState);
  const [loaded, setLoaded] = useState(false);
  const formRef = useRef<HTMLDivElement>(null);

  // Restore any saved draft on this device.
  useEffect(() => {
    // Restoring persisted state on mount is a legitimate client-only hydration pattern
    // (reading localStorage during render would cause a server/client mismatch).
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (raw) setValues({ ...emptyState(), ...JSON.parse(raw) });
    } catch {
      /* ignore */
    }
    setLoaded(true);
  }, []);

  // Autosave (after the initial load, so we never overwrite with blanks first).
  useEffect(() => {
    if (!loaded) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(values));
    } catch {
      /* ignore */
    }
  }, [values, loaded]);

  // Grow every textarea to fit its content (so nothing is hidden on screen or in print).
  useEffect(() => {
    if (!loaded) return;
    formRef.current?.querySelectorAll("textarea").forEach((t) => {
      t.style.height = "auto";
      t.style.height = `${t.scrollHeight}px`;
    });
  }, [loaded, values]);

  const set = (key: string, v: string) => setValues((prev) => ({ ...prev, [key]: v }));

  const grow = (el: HTMLTextAreaElement) => {
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  };

  const newBrand = () => {
    if (window.confirm("Start a fresh guide for another brand? Your current answers on screen will clear. (Save or print first if you want to keep them.)")) {
      setValues(emptyState());
      try {
        localStorage.removeItem(STORAGE_KEY);
      } catch {
        /* ignore */
      }
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const brandLabel = values.brand?.trim() || "";

  return (
    <div ref={formRef}>
      {/* Print-only: hide site chrome + controls, tidy the worksheet for PDF */}
      <style>{`
        .print-answer { display: none; }
        @media print {
          header, footer, .no-print { display: none !important; }
          .print-only { display: block !important; }
          /* Textareas don't reliably print their content at the narrower print width,
             so hide them and print a plain text mirror that flows without clipping. */
          textarea { display: none !important; }
          input { border: none !important; padding-left: 0 !important; }
          .print-answer {
            display: block !important; white-space: pre-wrap; word-break: break-word;
            min-height: 1.3em; color: #1a1a1a; border-bottom: 1px solid #ddd; padding-bottom: 3px;
          }
          .guide-card { break-inside: avoid; box-shadow: none !important; border: 1px solid #ccc !important; }
          /* Closing card is navy-on-white on screen; browsers drop backgrounds in print,
             so force it dark-on-white so the booking URL + contact stay visible. */
          .guide-close { background: #fff !important; color: #1a1a1a !important; padding: 0 !important; border: none !important; }
          .guide-close a, .guide-close p, .guide-close span, .guide-close .print-only { color: #1a1a1a !important; }
          body { background: #fff !important; }
        }
      `}</style>

      {/* Header + intro */}
      <div className="mb-8">
        <p className="text-xs font-semibold text-[#8E3012] uppercase tracking-[0.2em] mb-3">
          Waypoint Franchise Advisors
        </p>
        <h1 className="font-playfair text-3xl sm:text-4xl md:text-5xl text-[#0c1929] leading-tight">
          Franchise Interview Guide
        </h1>
        <p className="mt-4 text-[#3a3a2e] leading-relaxed max-w-2xl">
          Fifteen questions to ask any brand. Fill one out for each brand you talk to. Your
          answers save automatically on this device. Tap <span className="font-semibold">Save / Print</span>{" "}
          to keep a copy, then start a fresh one for the next brand.
        </p>
      </div>

      {/* Action bar */}
      <div className="no-print sticky top-[52px] sm:top-[60px] z-30 -mx-4 sm:mx-0 mb-8 px-4 sm:px-5 py-3 bg-[#FAF8F4]/90 backdrop-blur border-y sm:border border-[#e8e0d0] sm:rounded-xl flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => window.print()}
          className="inline-flex items-center gap-2 bg-[#0c1929] text-white text-sm font-semibold px-4 py-2.5 rounded-lg hover:bg-[#1b3a5f] transition-colors"
        >
          Save / Print
        </button>
        <button
          type="button"
          onClick={newBrand}
          className="inline-flex items-center gap-2 border border-[#c9bda8] text-[#3a3a2e] text-sm font-semibold px-4 py-2.5 rounded-lg hover:border-[#8E3012] hover:text-[#8E3012] transition-colors"
        >
          New brand
        </button>
        <span className="text-xs text-[#9a9a8a] ml-auto hidden sm:block">Saves as you type</span>
      </div>

      {/* Brand name */}
      <div className="guide-card bg-white border border-[#e8e0d0] rounded-xl p-5 sm:p-6 mb-6">
        <label htmlFor="brand" className="block text-xs font-semibold text-[#8E3012] uppercase tracking-[0.15em] mb-2">
          Brand name
        </label>
        <input
          id="brand"
          type="text"
          value={values.brand}
          onChange={(e) => set("brand", e.target.value)}
          placeholder="Which brand is this?"
          className="w-full text-xl sm:text-2xl font-playfair text-[#0c1929] border-b-2 border-[#e8e0d0] focus:border-[#8E3012] outline-none pb-1.5 bg-transparent"
        />
      </div>

      {/* Sections */}
      {SECTIONS.map((section) => (
        <div key={section.heading} className="guide-card bg-white border border-[#e8e0d0] rounded-xl p-5 sm:p-6 mb-6">
          <h2 className="text-sm font-semibold text-[#8E3012] uppercase tracking-[0.15em] mb-5">
            {section.heading}
          </h2>
          <div className="space-y-5">
            {section.fields.map((f) => (
              <div key={f.key}>
                <label htmlFor={f.key} className="block text-[#0c1929] font-medium leading-snug mb-2">
                  {f.n ? <span className="text-[#8E3012] font-bold mr-1.5">{f.n}.</span> : null}
                  {f.q}
                </label>
                <textarea
                  id={f.key}
                  value={values[f.key]}
                  onChange={(e) => {
                    set(f.key, e.target.value);
                    grow(e.currentTarget);
                  }}
                  rows={1}
                  placeholder="Notes…"
                  className="w-full resize-none overflow-hidden text-[#3a3a2e] bg-[#faf9f6] border border-[#e8e0d0] rounded-lg px-3 py-2.5 leading-relaxed outline-none focus:border-[#8E3012] focus:bg-white transition-colors"
                />
                <div className="print-answer" aria-hidden="true">{values[f.key] || " "}</div>
              </div>
            ))}
          </div>
        </div>
      ))}

      {/* Closing: Kelsey's note + booking */}
      <div className="guide-card guide-close mt-10 bg-[#0c1929] text-white rounded-xl p-6 sm:p-8">
        <p className="text-[#e9d9c8] leading-relaxed">
          I have owned a franchise and I have built one. I have helped 150 people work through
          this decision, and I have helped award more than 220 franchise territories. I am
          partnered with over 250 brands. There is no cost to you. Franchise brands pay
          referral fees, so there is no invoice and no contract. The goal is to find the one
          that fits like a glass slipper.
        </p>
        <p className="mt-4 text-white/90 leading-relaxed">
          If you want to talk through what you heard today, I would love to get together.
        </p>
        <a
          href="https://tidycal.com/m7v2jox/2nd-act-expo-meeting"
          target="_blank"
          rel="noopener"
          className="no-print inline-flex items-center gap-2 mt-5 bg-[#CC6535] hover:bg-[#D4724A] text-white font-semibold px-5 py-3 rounded-lg transition-colors"
        >
          Grab 30 minutes with me →
        </a>
        <p className="print-only hidden mt-4 text-white/90">
          Book 30 minutes: tidycal.com/m7v2jox/2nd-act-expo-meeting
        </p>

        <div className="mt-6 pt-6 border-t border-white/15 text-sm text-white/80 leading-relaxed">
          <p className="font-playfair text-lg text-white">Kelsey Stuart</p>
          <p>Waypoint Franchise Advisors</p>
          <p>
            <a href="https://www.waypointfranchise.com" className="hover:text-white" rel="noopener">waypointfranchise.com</a>
            {" · "}
            <a href="mailto:kelsey@waypointfranchise.com" className="hover:text-white">kelsey@waypointfranchise.com</a>
            {" · "}
            <a href="tel:+12149951062" className="hover:text-white">(214) 995-1062</a>
          </p>
        </div>
      </div>

      {/* Bottom actions */}
      <div className="no-print mt-8 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => window.print()}
          className="inline-flex items-center gap-2 bg-[#0c1929] text-white text-sm font-semibold px-4 py-2.5 rounded-lg hover:bg-[#1b3a5f] transition-colors"
        >
          Save / Print{brandLabel ? ` · ${brandLabel}` : ""}
        </button>
        <button
          type="button"
          onClick={newBrand}
          className="inline-flex items-center gap-2 border border-[#c9bda8] text-[#3a3a2e] text-sm font-semibold px-4 py-2.5 rounded-lg hover:border-[#8E3012] hover:text-[#8E3012] transition-colors"
        >
          New brand
        </button>
      </div>
    </div>
  );
}
