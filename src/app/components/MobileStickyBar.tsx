"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

/**
 * MobileStickyBar — B-5 CRO
 *
 * DOM inspection confirmed: position:fixed + portal resolves correctly to
 * the viewport on desktop. The drift is iOS-Safari-specific: when the URL
 * bar shows/hides during scroll, the "visual viewport" shifts independently
 * of the "layout viewport". position:fixed;bottom:0 is relative to the
 * LAYOUT viewport, so it drifts relative to what the user actually sees.
 *
 * Fix: window.visualViewport API. It fires resize/scroll events whenever
 * the visible area changes (URL bar appear/disappear, keyboard, etc.) and
 * gives us the exact offset to correct the bar back to the visible bottom.
 * This API was built specifically for this class of problem.
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
    // Without this, position:fixed;bottom:0 drifts relative to what's visible.
    const vv = window.visualViewport;
    if (vv) {
      const updatePosition = () => {
        const bar = barRef.current;
        if (!bar) return;
        // layout viewport bottom = window.innerHeight (from screen top)
        // visual viewport bottom = vv.offsetTop + vv.height (from screen top)
        // gap = how far layout bottom is BELOW the visual bottom
        // We translate UP by that gap to keep the bar at the visible bottom.
        const gap = window.innerHeight - (vv.offsetTop + vv.height);
        bar.style.transform = gap > 0 ? `translateY(${-gap}px)` : "";
      };

      vv.addEventListener("resize", updatePosition, { passive: true });
      vv.addEventListener("scroll", updatePosition, { passive: true });
      updatePosition(); // set correct position on mount

      return () => {
        window.removeEventListener("scroll", handleWindowScroll);
        vv.removeEventListener("resize", updatePosition);
        vv.removeEventListener("scroll", updatePosition);
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
        willChange: "transform", // hint browser to keep this on GPU layer
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
