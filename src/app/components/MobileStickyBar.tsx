"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

/**
 * MobileStickyBar — B-5 CRO
 *
 * Positioned with position:fixed + visualViewport API so the bar stays
 * at the visible bottom edge on iOS Safari regardless of URL bar state.
 *
 * Event choice: vv.RESIZE only — NOT vv.scroll.
 *   vv.scroll fires on EVERY page pan gesture (it tracks visual viewport
 *   panning during pinch-zoom). Listening to it corrupts the `bottom`
 *   calculation during normal scroll, pushing the bar into the middle.
 *   vv.resize fires specifically when the visual viewport DIMENSIONS change
 *   (URL bar show/hide, keyboard, orientation) — the only cases that need
 *   a position correction.
 *
 * Bottom formula: window.innerHeight - vv.offsetTop - vv.height
 *   = how many px of layout viewport are BELOW the visual viewport.
 *   URL bar hidden → gap = 0 → bottom: 0px (bar at screen bottom).
 *   URL bar visible (top) → gap > 0 → bar pushed up by gap px.
 *   URL bar visible (bottom, modern iOS) → vv.height already excludes
 *   URL bar area, so layout viewport = vv.height → gap = 0. ✓
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

    const vv = window.visualViewport;
    if (!vv) {
      return () => window.removeEventListener("scroll", handleWindowScroll);
    }

    const positionBar = () => {
      const bar = barRef.current;
      if (!bar) return;
      // Distance from layout viewport bottom to visual viewport bottom.
      // Positive when URL bar is overlapping the layout viewport (top URL bar).
      // Zero when URL bar is part of the OS chrome below the layout viewport.
      const gap = Math.max(0, window.innerHeight - vv.offsetTop - vv.height);
      bar.style.bottom = `${gap}px`;
    };

    // vv.resize: fires when URL bar shows/hides, keyboard appears, orientation changes.
    // NOT vv.scroll — that fires on every scroll gesture and causes drift.
    vv.addEventListener("resize", positionBar, { passive: true });
    positionBar();

    return () => {
      window.removeEventListener("scroll", handleWindowScroll);
      vv.removeEventListener("resize", positionBar);
    };
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

        {/* Book a Free Call — primary copper */}
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
            backgroundColor: "#CC6535",
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
