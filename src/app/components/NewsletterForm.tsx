"use client";

import { useState } from "react";

interface Props {
  variant?: "page" | "inline" | "footer";
  className?: string;
}

export default function NewsletterForm({ variant = "page", className = "" }: Props) {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email) return;
    setStatus("loading");

    try {
      const res = await fetch("/api/newsletter-subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, name }),
      });

      if (!res.ok) throw new Error("Failed");
      setStatus("success");
    } catch {
      setStatus("error");
    }
  }

  if (status === "success") {
    return (
      <div className={`text-center ${className}`}>
        <p className="text-[#8E3012] font-semibold text-sm mb-1">You&apos;re in.</p>
        <p className="text-[#5a5a4a] text-sm leading-relaxed">
          Check your inbox — first issue lands when it&apos;s ready.
        </p>
      </div>
    );
  }

  if (variant === "footer") {
    return (
      <form onSubmit={handleSubmit} className={`flex gap-2 max-w-sm ${className}`}>
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Your email"
          className="flex-1 px-4 py-2.5 text-sm bg-white/10 text-white placeholder-white/40 border border-white/20 rounded-lg focus:outline-none focus:border-white/50 transition-colors"
        />
        <button
          type="submit"
          disabled={status === "loading"}
          className="px-5 py-2.5 text-sm font-semibold text-[#0c1929] bg-[#CC6535] hover:bg-[#D97545] rounded-lg transition-all disabled:opacity-60 whitespace-nowrap"
        >
          {status === "loading" ? "…" : "Subscribe"}
        </button>
        {status === "error" && (
          <p className="absolute mt-12 text-xs text-red-400">Something went wrong. Try again.</p>
        )}
      </form>
    );
  }

  if (variant === "inline") {
    return (
      <form onSubmit={handleSubmit} className={`flex flex-col sm:flex-row gap-3 ${className}`}>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="First name"
          className="flex-none sm:w-36 px-4 py-3 text-sm border border-[#d8d0c0] rounded-lg focus:outline-none focus:border-[#8E3012] transition-colors bg-white"
        />
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Your email"
          className="flex-1 px-4 py-3 text-sm border border-[#d8d0c0] rounded-lg focus:outline-none focus:border-[#8E3012] transition-colors bg-white"
        />
        <button
          type="submit"
          disabled={status === "loading"}
          className="px-6 py-3 text-sm font-semibold text-white bg-[#0c1929] hover:bg-[#122640] rounded-lg transition-all disabled:opacity-60 whitespace-nowrap min-h-[48px]"
        >
          {status === "loading" ? "Subscribing…" : "Subscribe →"}
        </button>
        {status === "error" && (
          <p className="text-xs text-red-500 mt-1">Something went wrong. Try again.</p>
        )}
      </form>
    );
  }

  // Page variant
  return (
    <form onSubmit={handleSubmit} className={`flex flex-col gap-4 ${className}`}>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="nl-name" className="text-xs font-medium text-[#5a5a4a] uppercase tracking-wide">
            First Name
          </label>
          <input
            id="nl-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Kelsey"
            className="px-4 py-3 text-sm border border-[#d8d0c0] rounded-lg focus:outline-none focus:border-[#8E3012] focus:ring-2 focus:ring-[#8E3012]/10 transition-all bg-white"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="nl-email" className="text-xs font-medium text-[#5a5a4a] uppercase tracking-wide">
            Email Address <span className="text-[#8E3012]">*</span>
          </label>
          <input
            id="nl-email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@company.com"
            className="px-4 py-3 text-sm border border-[#d8d0c0] rounded-lg focus:outline-none focus:border-[#8E3012] focus:ring-2 focus:ring-[#8E3012]/10 transition-all bg-white"
          />
        </div>
      </div>
      <button
        type="submit"
        disabled={status === "loading"}
        className="w-full sm:w-auto sm:self-start inline-flex items-center justify-center px-8 py-4 text-sm font-semibold tracking-wide text-white bg-[#0c1929] hover:bg-[#122640] rounded-lg transition-all press-effect disabled:opacity-60 min-h-[52px]"
      >
        {status === "loading" ? "Subscribing…" : "Subscribe — it's free"}
      </button>
      {status === "error" && (
        <p className="text-sm text-red-600">Something went wrong. Please try again.</p>
      )}
      <p className="text-xs text-[#9a9a8a]">No spam. Unsubscribe any time.</p>
    </form>
  );
}
