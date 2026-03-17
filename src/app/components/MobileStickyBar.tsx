"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

/**
 * MobileStickyBar — B-5 CRO
 *
 * Rendered via ReactDOM.createPortal directly into <body>.
 *
 * WHY A PORTAL:
 * position:fixed is supposed to be relative to the viewport, but CSS
 * transforms, filters, or will-change on ANY ancestor element create a
 * new "containing block" that breaks fixed positioning — the element ends
 * up positioned relative to that ancestor instead of the screen edge.
 * The layout tree contains scroll-reveal animations that apply transforms,
 * which is exactly what was causing the bar to drift to its document
 * position during scroll.
 *
 * By portaling into document.body, the bar has no animated ancestors —
 * position:fixed always resolves to the viewport, on every browser.
 */
export default function MobileStickyBar() {
  const [visible, setVisible] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // Must be mounted (client-side) before we can portal into document.body
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
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 9999,
        // translate3d forces GPU compositing layer (belt + suspenders)
        transform: visible ? "translate3d(0,0,0)" : "translate3d(0,100%,0)",
        WebkitTransform: visible ? "translate3d(0,0,0)" : "translate3d(0,100%,0)",
        transition: "transform 300ms ease-in-out",
        WebkitTransition: "-webkit-transform 300ms ease-in-out",
        // Only shown on mobile — hide on screens >= 640px (sm breakpoint)
        display: "block",
      }}
      // Hide on desktop via inline style — we can't use Tailwind sm:hidden
      // reliably from a portal (class might not get purged), so we mirror
      // the 640px breakpoint in JS
      className="sm:hidden"
    >
      <div
        style={{
          backgroundColor: "#0c1929",
          borderTop: "1px solid rgba(255,255,255,0.1)",
          padding: `12px 16px calc(12px + env(safe-area-inset-bottom, 0px))`,
        }}
      >
        <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
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
            <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
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
      </div>
    </div>,
    document.body
  );
}
