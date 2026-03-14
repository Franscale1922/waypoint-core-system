"use client";

import Script from "next/script";

/**
 * TidyCalEmbed — reliable TidyCal widget integration.
 *
 * Why next/script instead of manual useEffect injection:
 * - next/script deduplicates the script tag, so it won't double-load
 * - onLoad fires after the script is fully parsed and executed
 * - We call TidyCal's own init() function in onLoad so it always
 *   finds the .tidycal-embed div, regardless of Next.js hydration timing
 * - strategy="afterInteractive" means it waits for React to hydrate first
 */
export default function TidyCalEmbed({ path }: { path: string }) {
  return (
    <>
      {/* Target div must be rendered before the script runs */}
      <div
        className="tidycal-embed"
        data-path={path}
        style={{ minHeight: "600px" }}
      />

      <Script
        src="https://asset-tidycal.b-cdn.net/js/embed.js"
        strategy="afterInteractive"
        onLoad={() => {
          // TidyCal exposes a global init function — call it after the
          // script loads to guarantee the embed div is already in the DOM
          if (typeof window !== "undefined" && (window as Window & { TidyCal?: { init?: () => void } }).TidyCal?.init) {
            (window as Window & { TidyCal?: { init?: () => void } }).TidyCal!.init!();
          }
        }}
      />
    </>
  );
}
