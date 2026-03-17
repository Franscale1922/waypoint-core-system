"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

/**
 * MobileStickyBar — B-5 CRO
 *
 * Root cause of all prior drift bugs: overflow-x: clip (or hidden) on <body>
 * causes Safari to treat the body as a scroll container (CSS spec + Safari Bug
 * #745729), making position:fixed resolve relative to body instead of the
 * viewport. All visualViewport JS attempts failed because they were compensating
 * for a symptom rather than fixing the cause.
 *
 * Fix applied upstream: overflow-x: clip moved from body → marketing layout
 * wrapper. Now position:fixed resolves correctly to the viewport on all browsers.
 *
 * This component is now pure CSS positioning — no visualViewport API.
 * The visualViewport approach is unreliable for URL-bar transitions (events fire
 * AFTER animation ends, not during) and is NOT needed now that the containing
 * block is correct.
 */
export default function MobileStickyBar() {
  const [visible, setVisible] = useState(false);
  const [mounted, setMounted] = useState(false);
  const barRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);

    // Show bar after scrolling past 80% of viewport height
    const handleScroll = () => {
      setVisible(window.scrollY > window.innerHeight * 0.8);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();

    return () => window.removeEventListener("scroll", handleScroll);
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
      }}
    >
      <div
        style={{
          display: "flex",
          gap: "12px",
          alignItems: "center",
          padding: "12px 16px",
          // env(safe-area-inset-bottom) works now that viewport-fit=cover is set
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
