"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

/**
 * MobileStickyBar — B-5 CRO
 *
 * iOS Safari bug: position:fixed;bottom:0 anchors to the LAYOUT viewport.
 * When the URL bar shows/hides, the visual viewport changes independently,
 * causing the bar to appear in the middle of what the user sees.
 *
 * Fix:
 *   - Listen to visualViewport "resize" ONLY (not "scroll").
 *     URL bar show/hide fires "resize". Listening to "scroll" caused jank
 *     because it fires asynchronously on every pan gesture.
 *   - On resize, calculate the gap between the layout viewport bottom and
 *     the visual viewport bottom, then translateY up by that gap.
 *   - Suppress the CSS transition during the correction so there's no
 *     visible slide animation — the bar is already where the user expects.
 */
export default function MobileStickyBar() {
  const [visible, setVisible] = useState(false);
  const [mounted, setMounted] = useState(false);
  const barRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);

    // Show bar after scrolling past 80% of viewport height
    const handleWindowScroll = () => {
      setVisible(window.scrollY > window.innerHeight * 0.8);
    };
    window.addEventListener("scroll", handleWindowScroll, { passive: true });
    handleWindowScroll();

    // Visual Viewport API: correct position when URL bar shows/hides on iOS.
    // Key insight: only "resize" fires on URL bar toggle. "scroll" fires on
    // every pan gesture and introduced jank in all previous fix attempts.
    const vv = window.visualViewport;
    if (vv) {
      const updatePosition = () => {
        const bar = barRef.current;
        if (!bar) return;

        // Layout viewport bottom = window.innerHeight (from screen top)
        // Visual viewport bottom = vv.offsetTop + vv.height (from screen top)
        // When URL bar is hidden, visual viewport is taller → gap > 0
        // Translate up by gap to keep bar at the visible bottom edge.
        const gap = window.innerHeight - (vv.offsetTop + vv.height);
        const correction = gap > 0 ? gap : 0;

        // Suppress transition during correction — avoids a visible slide
        // animation when the URL bar snaps. Restore after one rAF.
        bar.style.transition = "none";
        bar.style.transform = correction > 0 ? `translateY(${-correction}px)` : "";

        requestAnimationFrame(() => {
          if (barRef.current) {
            barRef.current.style.transition = "";
          }
        });
      };

      vv.addEventListener("resize", updatePosition, { passive: true });
      updatePosition(); // set correct position on mount

      return () => {
        window.removeEventListener("scroll", handleWindowScroll);
        vv.removeEventListener("resize", updatePosition);
      };
    }

    return () => window.removeEventListener("scroll", handleWindowScroll);
  }, []);

  if (!mounted) return null;

  return createPortal(
    <div
      ref={barRef}
      aria-hidden={!visible}
      className="sm:hidden"
      style={{
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 9999,
        opacity: visible ? 1 : 0,
        pointerEvents: visible ? "auto" : "none",
        transition: "opacity 250ms ease",
        backgroundColor: "#0c1929",
        borderTop: "1px solid rgba(255,255,255,0.1)",
        willChange: "transform",
      }}
    >
      <div
        style={{
          display: "flex",
          gap: "12px",
          alignItems: "center",
          padding: "12px 16px",
          paddingBottom: "calc(12px + env(safe-area-inset-bottom, 0px))",
        }}
      >
        {/* Text Kelsey — secondary */}
        <a
          href="sms:+12149951062"
          aria-label="Text Kelsey at (214) 995-1062"
          style={{
            flex: 1,
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "8px",
            padding: "12px 16px",
            fontSize: "14px",
            fontWeight: 600,
            color: "#ffffff",
            border: "1px solid rgba(255,255,255,0.25)",
            borderRadius: "8px",
            minHeight: "48px",
            textDecoration: "none",
          }}
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

        {/* Book a Free Call — primary */}
        <a
          href="/book"
          aria-label="Book a free call with Kelsey Stuart"
          style={{
            flex: 1,
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "12px 16px",
            fontSize: "14px",
            fontWeight: 600,
            color: "#0c1929",
            backgroundColor: "#d4a55a",
            borderRadius: "8px",
            minHeight: "48px",
            textDecoration: "none",
          }}
        >
          Book a Free Call
        </a>
      </div>
    </div>,
    document.body
  );
}
