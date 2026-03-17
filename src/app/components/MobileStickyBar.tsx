"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

/**
 * MobileStickyBar — B-5 CRO
 *
 * Rendered via ReactDOM.createPortal into <body> to avoid any parent
 * CSS transform creating a wrong containing block for position:fixed.
 *
 * Visibility is controlled ONLY by opacity + pointer-events — zero transforms.
 * The element is ALWAYS at { position: fixed; bottom: 0 } in the DOM.
 * This eliminates every translate/transform-based positioning glitch
 * on iOS Safari and Chrome for Android.
 */
export default function MobileStickyBar() {
  const [visible, setVisible] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);

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
      aria-hidden={!visible}
      style={{
        // Always pinned to bottom — NO transform, NO translate.
        // Opacity + pointer-events control visibility.
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 9999,
        opacity: visible ? 1 : 0,
        pointerEvents: visible ? "auto" : "none",
        transition: "opacity 250ms ease",
        // Background and border via inline style (portal bypasses Tailwind purge)
        backgroundColor: "#0c1929",
        borderTop: "1px solid rgba(255,255,255,0.1)",
      }}
      // sm:hidden — hide on desktop (640px+)
      // Note: class is still needed for desktop suppression; the inline
      // opacity/pointer-events above handle mobile show/hide.
      className="sm:hidden"
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
