"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";

const navLinks = [
  { href: "/about", label: "About" },
  { href: "/process", label: "How It Works" },
  { href: "/faq", label: "FAQ" },
  { href: "/resources", label: "Resources" },
  { href: "/quizzes", label: "Quizzes" },
];

export default function MobileNav() {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    setIsOpen(false);
  }, [pathname]);

  useEffect(() => {
    document.body.style.overflow = isOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [isOpen]);

  return (
    <>
      {/* Hamburger button — stays above overlay */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        aria-label={isOpen ? "Close menu" : "Open menu"}
        aria-expanded={isOpen}
        className="sm:hidden"
        style={{
          position: "relative",
          zIndex: 400,
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          width: 44,
          height: 44,
          gap: 6,
          marginRight: -8,
          background: "none",
          border: "none",
          cursor: "pointer",
          padding: 0,
        }}
      >
        {[
          isOpen ? "rotate(45deg) translateY(7.5px)" : "none",
          "none",
          isOpen ? "rotate(-45deg) translateY(-7.5px)" : "none",
        ].map((transform, i) => (
          <span
            key={i}
            style={{
              display: "block",
              width: 20,
              height: 1.5,
              background: isOpen ? "#ffffff" : "#1a1a1a",
              transform,
              opacity: i === 1 && isOpen ? 0 : 1,
              transition: "transform 0.3s ease, opacity 0.3s ease, background 0.3s ease",
            }}
          />
        ))}
      </button>

      {/* Full-screen overlay — uses ONLY inline styles to avoid all CSS inheritance */}
      <div
        className="sm:hidden"
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 350,
          background: "#0c1929",
          display: "flex",
          flexDirection: "column",
          opacity: isOpen ? 1 : 0,
          visibility: isOpen ? "visible" : "hidden",
          pointerEvents: isOpen ? "auto" : "none",
          transition: "opacity 0.3s ease, visibility 0.3s ease",
          // Explicitly kill any inherited glass/blur effects
          backdropFilter: "none",
          WebkitBackdropFilter: "none",
        }}
      >
        {/* Top bar — logo + close */}
        <div style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "14px 20px",
          borderBottom: "1px solid rgba(255,255,255,0.08)",
        }}>
          <Link
            href="/"
            style={{ display: "flex", alignItems: "center", textDecoration: "none" }}
            onClick={() => setIsOpen(false)}
          >
            <Image
              src="/images/White WP Transparent.png"
              alt="Waypoint Franchise Advisors"
              width={120}
              height={120}
              style={{ height: 40, width: "auto" }}
            />
          </Link>
          <button
            onClick={() => setIsOpen(false)}
            aria-label="Close menu"
            style={{
              width: 44,
              height: 44,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: 0,
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Nav links */}
        <nav style={{ flex: 1, padding: "24px 28px", overflowY: "auto" }}>
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              style={{
                display: "block",
                padding: "16px 0",
                fontSize: 20,
                fontWeight: 600,
                borderBottom: "1px solid rgba(255,255,255,0.07)",
                color: pathname === link.href ? "#d4a55a" : "#ffffff",
                textDecoration: "none",
                letterSpacing: "-0.01em",
              }}
            >
              {link.label}
            </Link>
          ))}

          {/* Single CTA */}
          <div style={{ marginTop: 36 }}>
            <Link
              href="/book"
              style={{
                display: "block",
                textAlign: "center",
                padding: "15px 24px",
                fontSize: 13,
                fontWeight: 700,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                color: "#0c1929",
                background: "#d4a55a",
                borderRadius: 8,
                textDecoration: "none",
              }}
            >
              Book a Free Call
            </Link>
          </div>

          <p style={{ marginTop: 28, fontSize: 11, color: "rgba(255,255,255,0.25)", letterSpacing: "0.12em", textTransform: "uppercase" }}>
            Whitefish, Montana
          </p>
        </nav>
      </div>
    </>
  );
}
