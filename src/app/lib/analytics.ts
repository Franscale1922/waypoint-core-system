/**
 * Waypoint Analytics — GA4 event helpers
 * Usage: import { trackEvent } from "@/app/lib/analytics"
 */

declare global {
  interface Window {
    gtag: (...args: unknown[]) => void;
  }
}

export const GA_ID = process.env.NEXT_PUBLIC_GA_ID ?? "";

/** Fire a GA4 custom event */
export function trackEvent(
  eventName: string,
  params?: Record<string, string | number | boolean>
) {
  if (typeof window === "undefined" || !window.gtag) return;
  window.gtag("event", eventName, params ?? {});
}

// ── Pre-built events ──────────────────────────────────────────────────────────

/** Called when user lands on /scorecard */
export const trackQuizStarted = () =>
  trackEvent("quiz_started", { page: "scorecard" });

/** Called when user submits email at end of quiz */
export const trackQuizCompleted = (score: number) =>
  trackEvent("quiz_completed", { score, page: "scorecard" });

/** Called when user clicks any "Book a Call" CTA */
export const trackBookCallClicked = (source: string) =>
  trackEvent("book_call_clicked", { source });
