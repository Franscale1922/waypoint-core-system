"use client";
import { useEffect } from "react";

/**
 * TidyCalEmbed — loads TidyCal's embed.js only after this component mounts,
 * guaranteeing the target div is in the DOM before the script runs.
 * Using next/script with lazyOnload or beforeInteractive can race with React
 * hydration; useEffect is the only reliable pattern for third-party embeds.
 */
export default function TidyCalEmbed({ path }: { path: string }) {
  useEffect(() => {
    // Remove any existing instance to avoid double-init on hot reload
    const existing = document.querySelector(
      'script[src="https://asset-tidycal.b-cdn.net/js/embed.js"]'
    );
    if (existing) {
      existing.remove();
    }

    const script = document.createElement("script");
    script.src = "https://asset-tidycal.b-cdn.net/js/embed.js";
    script.async = true;
    document.body.appendChild(script);

    return () => {
      // Cleanup on unmount
      script.remove();
    };
  }, [path]);

  return (
    <div
      className="tidycal-embed"
      data-path={path}
      style={{ minHeight: "600px" }}
    />
  );
}
