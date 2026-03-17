"use client";

import { useEffect, useState } from "react";

/**
 * MobileStickyBar — B-5 CRO
 *
 * Fixed bottom bar on mobile with "Text Kelsey" + "Book a Free Call".
 * Hides when the hero section is in the viewport so it doesn't overlap
 * the hero's own CTAs. Appears after the user scrolls past the hero.
 *
 * Desktop: not shown (hidden sm:hidden).
 *
 * iOS Safari notes:
 * - NO backdrop-filter/backdrop-blur: creates a stacking context that
 *   breaks position:fixed on Safari, causing the element to drift mid-page
 *   during momentum scroll.
 * - translateZ(0) via inline style forces GPU layer promotion so the fixed
 *   element stays anchored to the viewport during all scroll phases.
 */
export default function MobileStickyBar() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      // Show bar once user has scrolled more than 80vh (past the hero)
      setVisible(window.scrollY > window.innerHeight * 0.8);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll(); // check on mount
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-40 sm:hidden"
      aria-hidden={!visible}
      style={{
        // translate3d(0,0,0) when visible: anchors to bottom AND forces a GPU
        // compositing layer — prevents the element drifting mid-page on both
        // Chrome and Safari during momentum/inertia scrolling.
        // translate3d(0,100%,0) when hidden: slide off-screen below.
        transform: visible ? "translate3d(0, 0, 0)" : "translate3d(0, 100%, 0)",
        WebkitTransform: visible ? "translate3d(0, 0, 0)" : "translate3d(0, 100%, 0)",
        transition: "transform 300ms ease-in-out",
        WebkitTransition: "-webkit-transform 300ms ease-in-out",
      }}
    >
      {/* Safe area inset for iPhone home indicator.
          No backdrop-blur here — it causes fixed positioning to break on Safari. */}
      <div
        className="border-t border-white/10 px-4 pt-3"
        style={{
          backgroundColor: "#0c1929",
          paddingBottom: "calc(0.75rem + env(safe-area-inset-bottom, 0px))",
        }}
      >
        <div className="flex gap-3 items-center">
          {/* Text Kelsey — secondary action */}
          <a
            href="sms:+12149951062"
            className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-3 text-sm font-semibold text-white border border-white/25 rounded-lg min-h-[48px]"
            aria-label="Text Kelsey at (214) 995-1062"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
            </svg>
            Text Kelsey
          </a>

          {/* Book a Free Call — primary action */}
          <a
            href="/book"
            className="flex-1 inline-flex items-center justify-center px-4 py-3 text-sm font-semibold text-[#0c1929] bg-[#d4a55a] rounded-lg min-h-[48px]"
            aria-label="Book a free call with Kelsey Stuart"
          >
            Book a Free Call
          </a>
        </div>
      </div>
    </div>
  );
}

