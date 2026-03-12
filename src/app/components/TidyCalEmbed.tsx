"use client";
import { useEffect } from "react";

export default function TidyCalEmbed({ path }: { path: string }) {
  useEffect(() => {
    // Remove any previous instance to avoid duplicates on hot-reload
    const existing = document.querySelector('script[src*="tidycal"]');
    if (existing) existing.remove();

    const script = document.createElement("script");
    script.src = "https://asset-tidycal.b-cdn.net/js/embed.js";
    script.async = true;
    document.body.appendChild(script);

    return () => {
      script.remove();
    };
  }, [path]);

  return <div className="tidycal-embed" data-path={path} />;
}
