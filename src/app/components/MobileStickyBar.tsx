"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

/**
 * MobileStickyBar — B-5 CRO
 *
 * Position:fixed works via two layered CSS fixes:
 *   1. overflow-x: clip moved from body → marketing layout wrapper
 *      (body overflow creates a scroll container on Safari, breaking
 *      viewport-relative position:fixed — CSS spec + Safari Bug #745729)
 *   2. iOS-only @supports block in globals.css locks html/body to stable
 *      viewport dimensions, bypassing WebKit Bug #297779 (compositor
 *      drifts fixed GPU layers during scroll direction changes).
 *
 * Scroll detection note: When the iOS fix in globals.css is active,
 * body becomes the scroll container (overflow-y: auto). In that case,
 * window.scrollY = 0 always and window.scroll never fires. We listen
 * to BOTH window scroll (desktop/Chrome) and body scroll (iOS Safari)
 * and read document.body.scrollTop as the authoritative source on iOS.
 */
export default function MobileStickyBar() {
  const [visible, setVisible] = useState(false);
  const [mounted, setMounted] = useState(false);
  const barRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);

    // Reads the current scroll position regardless of whether
    // window or body is the scroll container.
    const getScrollY = () =>
      document.body.scrollTop || window.scrollY || 0;

    const handleScroll = () => {
      setVisible(getScrollY() > window.innerHeight * 0.8);
    };

    // Desktop / Chrome on iOS: window scroll
    window.addEventListener("scroll", handleScroll, { passive: true });
    // iOS Safari with @supports fix: body is the scroll container,
    // scroll events fire on body rather than window.
    document.body.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();

    return () => {
      window.removeEventListener("scroll", handleScroll);
      document.body.removeEventListener("scroll", handleScroll);
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
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          padding: "8px 16px 0",
          paddingBottom: "calc(12px + env(safe-area-inset-bottom, 0px))",
          gap: "6px",
        }}
      >
        {/* Consent notice — TCPA compliance for the Text Kelsey CTA */}
        <p
          style={{
            fontSize: "9px",
            color: "rgba(255,255,255,0.35)",
            textAlign: "center",
            lineHeight: 1.4,
            margin: 0,
          }}
        >
          By texting, you consent to SMS from Waypoint Franchise Advisors. Msg &amp; data rates may apply. Reply STOP to opt out.
        </p>
        <div
          style={{
            display: "flex",
            gap: "12px",
            alignItems: "center",
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
      </div>
    </div>,
    document.body
  );
}
