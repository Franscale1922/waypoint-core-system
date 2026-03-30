"use client";

import { useState } from "react";

/**
 * InlineCapture — B-6 CRO
 *
 * Designed to be injected into the reading flow of resource articles.
 * Specifically promotes the "Corporate Escape Kit".
 * On submit, posts to /api/capture-email.
 */
export default function InlineCapture() {
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
        // Identifying as the escape kit capture source
        body: JSON.stringify({ email, name, source: "escape_kit_inline" }),
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
      <div className="bg-[#1b3a5f] border border-[#1b3a5f] rounded-2xl p-6 sm:p-8 text-center shadow-lg my-12 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full blur-3xl -mr-10 -mt-10" />
        <div className="w-12 h-12 rounded-full bg-[#CC6535]/20 flex items-center justify-center mx-auto mb-4 relative z-10">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
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
        <p className="font-playfair text-xl sm:text-2xl text-white mb-2 relative z-10">The Kit is on its way.</p>
        <p className="text-sm text-white/70 leading-relaxed max-w-md mx-auto relative z-10">
          Check your inbox in a few minutes. If you have any questions while reading through the framework, just reply to that email.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-[#1b3a5f] rounded-2xl p-6 sm:p-10 shadow-xl my-12 relative overflow-hidden">
      {/* Decorative background glow */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-[#CC6535]/15 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" />
      
      <div className="relative z-10 flex flex-col md:flex-row gap-8 items-center md:items-start">
        <div className="flex-1 text-center md:text-left">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#CC6535] mb-2">
            Free Resource
          </p>
          <p className="font-playfair text-2xl sm:text-3xl text-white mb-3 leading-snug">
            The Corporate Escape Kit
          </p>
          <p className="text-sm text-white/80 leading-relaxed mb-6">
            A 5-step framework to transition out of W-2 life without risking your family's financial foundation. Read the blueprint that I wish I had before I left my job.
          </p>
          
          <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3">
            <input
              type="text"
              placeholder="First name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="flex-[0_0_auto] sm:w-[140px] px-4 py-3.5 text-sm border-none rounded-xl bg-white/10 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-[#CC6535] transition-all"
            />
            <input
              type="email"
              placeholder="Your best email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="flex-1 px-4 py-3.5 text-sm border-none rounded-xl bg-white/10 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-[#CC6535] transition-all"
            />
            <button
              type="submit"
              disabled={status === "loading"}
              className="flex-shrink-0 inline-flex items-center justify-center px-6 py-3.5 text-sm font-semibold text-[#0c1929] bg-[#CC6535] hover:bg-[#D4724A] rounded-xl transition-all disabled:opacity-70 min-h-[48px]"
            >
              {status === "loading" ? "Sending..." : "Get the Kit"}
            </button>
          </form>
          {status === "error" && (
            <p className="text-xs text-red-400 mt-3 text-left">
              Something went wrong. Try emailing kelsey@waypointfranchise.com directly.
            </p>
          )}
          <p className="text-xs text-white/40 leading-relaxed mt-4 text-left">
            I don't sequence you to death. Just the kit.
          </p>
        </div>
      </div>
    </div>
  );
}
