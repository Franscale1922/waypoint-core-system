"use client";

import { useState } from "react";

/**
 * EscapeKitCaptureForm — email capture form for the Corporate Escape Kit.
 * Posts to /api/escape-kit (name + email).
 * Renders a stacked full-width layout — designed for the /escape-kit landing page.
 */
export default function EscapeKitCaptureForm({
  articleSlug = "",
}: {
  articleSlug?: string;
}) {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email) return;
    setStatus("loading");

    try {
      const res = await fetch("/api/escape-kit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, name, articleSlug }),
      });
      if (res.ok) {
        setStatus("success");
      } else {
        setStatus("error");
      }
    } catch {
      setStatus("error");
    }
  }

  if (status === "success") {
    return (
      <div className="text-center py-4">
        <div className="w-10 h-10 rounded-full bg-[#CC6535]/15 flex items-center justify-center mx-auto mb-4">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#CC6535"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>
        <p className="font-playfair text-xl text-[#0c1929] mb-2">You&apos;re all set.</p>
        <p className="text-sm text-[#5a5a4a] leading-relaxed">
          Check your inbox — the guide is on its way. If you have questions before we talk,
          reply to that email directly.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3" id="escape-kit-form">
      <div className="flex flex-col md:flex-row gap-3">
        <input
          type="text"
          id="escape-kit-name"
          placeholder="First name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full md:w-36 px-4 py-3 text-sm border border-[#e2ddd2] rounded-lg bg-[#FAF8F4] text-[#0c1929] placeholder-[#9a9a8a] focus:outline-none focus:border-[#CC6535] transition-colors"
        />
        <input
          type="email"
          id="escape-kit-email"
          placeholder="Your email address"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="w-full md:flex-1 px-4 py-3 text-sm border border-[#e2ddd2] rounded-lg bg-[#FAF8F4] text-[#0c1929] placeholder-[#9a9a8a] focus:outline-none focus:border-[#CC6535] transition-colors"
        />
        <button
          type="submit"
          id="escape-kit-submit"
          disabled={status === "loading"}
          className="w-full md:w-auto md:flex-shrink-0 inline-flex items-center justify-center px-6 py-3 text-sm font-semibold text-white bg-[#CC6535] hover:bg-[#D4724A] rounded-lg transition-all disabled:opacity-70 min-h-[48px]"
        >
          {status === "loading" ? "Sending…" : "Send me the guide"}
        </button>
      </div>
      {status === "error" && (
        <p className="text-xs text-red-600">
          Something went wrong. Try emailing kelsey@waypointfranchise.com directly.
        </p>
      )}
    </form>
  );
}
