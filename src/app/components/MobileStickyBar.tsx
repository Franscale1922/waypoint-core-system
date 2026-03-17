"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

/**
 * MobileStickyBar — B-5 CRO
 *
 * iOS Safari URL-bar drift: position:fixed;bottom:0 anchors to the LAYOUT
 * viewport. When Safari's URL bar shows/hides, the VISUAL viewport shifts
 * independently — the bar appears to float in the middle of what the user
 * actually sees.
 *
 * Why previous fixes failed:
 *   - vv.resize ONLY: fires once the URL bar finishes animating, missing
 *     all intermediate frames during the slow iOS transition.
 *   - transform: translateY: interacts poorly with Safari's own compositing
 *     of position:fixed during momentum scroll, causing visual jank.
 *
 * This fix (the production approach used by Twitter/Google):
 *   1. Listen to BOTH vv.resize AND vv.scroll — scroll tracks the visual
 *      viewport DURING the URL bar animation in realtime.
 *   2. Set `bottom` in px dynamically instead of transform — avoids Safari's
 *      compositing interference and doesn't interact with CSS transitions.
 *   3. Debounce with requestAnimationFrame to prevent layout thrash.
 *
 * Formula: bottom = window.innerHeight - vv.offsetTop - vv.height
 *   = how far the visual viewport bottom is ABOVE the layout viewport bottom.
 *   When URL bar is hidden: bottom = 0 (visual === layout). ✓
 *   When URL bar is visible: bottom > 0 (bar moves up to stay visible). ✓
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

    // rAF handle so we only do one layout write per frame even if both
    // vv.resize and vv.scroll fire in the same tick.
    let rafId = 0;

    const positionBar = () => {
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        const bar = barRef.current;
        if (!bar) return;
        // Distance between the visual viewport bottom and layout viewport bottom.
        // When URL bar is fully hidden this is 0. When URL bar is visible this
        // is the height of the URL bar area.
        const bottom = Math.max(
          0,
          window.innerHeight - vv.offsetTop - vv.height
        );
        bar.style.bottom = `${bottom}px`;
      });
    };

    // vv.scroll: fires DURING the URL bar animation (tracks intermediate frames)
    // vv.resize: fires at the END of the URL bar animation (catches final state)
    vv.addEventListener("resize", positionBar, { passive: true });
    vv.addEventListener("scroll", positionBar, { passive: true });
    positionBar(); // set correct position immediately on mount

    return () => {
      window.removeEventListener("scroll", handleWindowScroll);
      vv.removeEventListener("resize", positionBar);
      vv.removeEventListener("scroll", positionBar);
      cancelAnimationFrame(rafId);
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
        bottom: 0, // overridden by JS once vv is available
        left: 0,
        right: 0,
        zIndex: 9999,
        opacity: visible ? 1 : 0,
        pointerEvents: visible ? "auto" : "none",
        transition: "opacity 250ms ease",
        backgroundColor: "#0c1929",
        borderTop: "1px solid rgba(255,255,255,0.1)",
        willChange: "transform", // GPU compositing hint
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
