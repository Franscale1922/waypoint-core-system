"use client";

import { useState } from "react";

/**
 * EmailCapture — B-6 CRO
 *
 * Warm, low-pressure email capture for research-mode visitors.
 * Offers the "Franchise Readiness Checklist" as the deliverable.
 * Used on: /resources index, bottom of individual articles.
 *
 * On submit, posts to /api/capture-email.
 * Falls back gracefully if the API is unavailable.
 */
export default function EmailCapture({ variant = "default" }: { variant?: "default" | "article" }) {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email) return;
    setStatus("loading");

    try {
      const res = await fetch("/api/capture-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, name, source: variant === "article" ? "article" : "resources" }),
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
      <div className="bg-[#f0ede8] border border-[#e2ddd2] rounded-xl p-6 sm:p-8 text-center">
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
          Check your inbox — the checklist is on its way. If you have questions before we talk, reply to that email directly.
        </p>
      </div>
    );
  }

  return (
    <div className={`bg-[#f0ede8] border border-[#e2ddd2] rounded-xl ${variant === "article" ? "p-6" : "p-6 sm:p-10"}`}>
      <div className="max-w-xl">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#8E3012] mb-3">
          Before you go
        </p>
        <p className="font-playfair text-xl sm:text-2xl text-[#0c1929] mb-2 leading-snug">
          One thing worth having.
        </p>
        <p className="text-sm text-[#5a5a4a] leading-relaxed mb-6">
          The checklist I actually use before any first conversation. If you can answer yes to most of these, we should talk. If you can&apos;t yet, it&apos;ll tell you what to work on first.
        </p>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="flex flex-col sm:flex-row gap-3">
            <input
              type="text"
              placeholder="First name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="flex-[0_0_auto] sm:w-36 px-4 py-3 text-sm border border-[#e2ddd2] rounded-lg bg-white text-[#0c1929] placeholder-[#9a9a8a] focus:outline-none focus:border-[#CC6535] transition-colors"
            />
            <input
              type="email"
              placeholder="Your email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="flex-1 px-4 py-3 text-sm border border-[#e2ddd2] rounded-lg bg-white text-[#0c1929] placeholder-[#9a9a8a] focus:outline-none focus:border-[#CC6535] transition-colors"
            />
            <button
              type="submit"
              disabled={status === "loading"}
              className="flex-shrink-0 inline-flex items-center justify-center px-6 py-3 text-sm font-semibold text-[#0c1929] bg-[#CC6535] hover:bg-[#D4724A] rounded-lg transition-all disabled:opacity-70 min-h-[48px]"
            >
              {status === "loading" ? "Sending…" : "Send me the checklist"}
            </button>
          </div>
          {status === "error" && (
            <p className="text-xs text-red-600">
              Something went wrong. Try emailing kelsey@waypointfranchise.com directly.
            </p>
          )}
          <p className="text-[10px] text-[#9a9a8a] leading-relaxed">
            No newsletter. Just the checklist. Unsubscribe anytime.
          </p>
        </form>
      </div>
    </div>
  );
}
