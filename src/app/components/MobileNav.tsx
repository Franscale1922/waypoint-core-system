"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function MobileNav() {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();

  // Close menu on route change
  useEffect(() => {
    setIsOpen(false);
  }, [pathname]);

  // Prevent body scroll when menu is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  return (
    <>
      {/* Hamburger button - only visible on mobile */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="sm:hidden flex flex-col justify-center items-center w-11 h-11 gap-1.5 -mr-2"
        aria-label={isOpen ? "Close menu" : "Open menu"}
        aria-expanded={isOpen}
      >
        <span
          className={`block w-5 h-[1.5px] bg-[#1a1a1a] transition-all duration-300 ${
            isOpen ? "rotate-45 translate-y-[4.5px]" : ""
          }`}
        />
        <span
          className={`block w-5 h-[1.5px] bg-[#1a1a1a] transition-all duration-300 ${
            isOpen ? "opacity-0" : ""
          }`}
        />
        <span
          className={`block w-5 h-[1.5px] bg-[#1a1a1a] transition-all duration-300 ${
            isOpen ? "-rotate-45 -translate-y-[4.5px]" : ""
          }`}
        />
      </button>

      {/* Fullscreen overlay menu */}
      <div
        className={`fixed inset-0 z-[200] transition-all duration-500 sm:hidden ${
          isOpen
            ? "opacity-100 pointer-events-auto"
            : "opacity-0 pointer-events-none"
        }`}
        style={{ isolation: "isolate" }}
      >
        {/* Backdrop — fully opaque dark overlay */}
        <div
          className="absolute inset-0 bg-[#0c1929]/80"
          onClick={() => setIsOpen(false)}
        />

        {/* Menu panel - slides from right, fully opaque */}
        <div
          className={`absolute top-0 right-0 h-full w-[280px] shadow-2xl transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] ${
            isOpen ? "translate-x-0" : "translate-x-full"
          }`}
          style={{ background: "#FAF8F4", backdropFilter: "none", WebkitBackdropFilter: "none" }}
        >
          {/* Close button */}
          <div className="flex justify-end p-5">
            <button
              onClick={() => setIsOpen(false)}
              className="w-11 h-11 flex items-center justify-center"
              aria-label="Close menu"
            >
              <svg className="w-5 h-5 text-[#1a1a1a]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Nav links */}
          <nav className="px-8 pt-4">
            <div className="space-y-1">
              {[
                { href: "/about", label: "About" },
                { href: "/process", label: "How It Works" },
                { href: "/faq", label: "FAQ" },
                { href: "/resources", label: "Resources" },
                { href: "/quizzes", label: "Quizzes" },
                { href: "/book", label: "Book a Call" },
              ].map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`block py-4 text-base font-medium tracking-wide border-b border-[#e2ddd2]/60 transition-colors ${
                    pathname === link.href
                      ? "text-[#c08b3e]"
                      : "text-[#1a1a1a] hover:text-[#c08b3e]"
                  }`}
                >
                  {link.label}
                </Link>
              ))}
            </div>

            {/* CTA button */}
            <div className="mt-10">
              <Link
                href="/book"
                className="block w-full text-center px-6 py-4 text-sm font-semibold tracking-wide uppercase text-[#0c1929] bg-[#d4a55a] hover:bg-[#e2be80] rounded-lg transition-all press-effect"
              >
                Book a Free Call
              </Link>
            </div>

            {/* Location */}
            <p className="mt-8 text-xs text-[#7a7a7a] tracking-wide">
              Whitefish, Montana
            </p>
          </nav>
        </div>
      </div>
    </>
  );
}
