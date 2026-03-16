"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

/**
 * ScrollReveal — Intersection Observer that adds .visible
 * to any element with .reveal, .reveal-left, or .reveal-right
 * when it scrolls into view.
 *
 * Drop this component once in a layout and forget about it.
 *
 * FIX: usePathname as a dep so the observer re-attaches after every
 * Next.js client-side navigation. Without this, navigating away and
 * back leaves all .reveal elements permanently hidden because the
 * cleanup disconnects the observer and the empty-dep effect never
 * re-runs.
 */
export default function ScrollReveal() {
  const pathname = usePathname();

  useEffect(() => {
    if (typeof window === "undefined") return;

    // Respect reduced motion
    const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (prefersReduced.matches) return;

    // Reset any elements that were left in a partial/invisible state
    // from a previous visit to this route, then re-observe them all.
    const elements = document.querySelectorAll(".reveal, .reveal-left, .reveal-right");
    elements.forEach((el) => el.classList.remove("visible"));

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("visible");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.1 }
    );

    // Small rAF delay so the DOM settles after navigation before we
    // snapshot element positions — avoids a race on fast machines where
    // the observer fires before layout is complete.
    const raf = requestAnimationFrame(() => {
      elements.forEach((el) => observer.observe(el));
    });

    return () => {
      cancelAnimationFrame(raf);
      observer.disconnect();
    };
  }, [pathname]);

  return null;
}
