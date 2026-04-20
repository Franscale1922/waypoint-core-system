"use client";

import { useState } from "react";

type Status = "idle" | "submitting" | "success" | "error";

export default function ContactForm() {
  const [status, setStatus] = useState<Status>("idle");
  const [errorMsg, setErrorMsg] = useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus("submitting");
    setErrorMsg("");

    const form = e.currentTarget;
    const data = {
      name: (form.elements.namedItem("name") as HTMLInputElement).value.trim(),
      email: (form.elements.namedItem("email") as HTMLInputElement).value.trim(),
      phone: (form.elements.namedItem("phone") as HTMLInputElement).value.trim(),
      message: (form.elements.namedItem("message") as HTMLTextAreaElement).value.trim(),
    };

    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error || "Something went wrong.");
      }

      setStatus("success");
      form.reset();
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Something went wrong.");
      setStatus("error");
    }
  }

  if (status === "success") {
    return (
      <div className="bg-[#0c1929] rounded-xl p-8 text-center">
        <div className="w-10 h-10 rounded-full bg-[#CC6535]/20 flex items-center justify-center mx-auto mb-4">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#CC6535" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
        </div>
        <p className="font-playfair text-xl text-white mb-2">Got it.</p>
        <p className="text-sm text-white/60 leading-relaxed">
          I&apos;ll follow up within one business day. Check your inbox for a confirmation.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label htmlFor="cf-name" className="block text-xs font-semibold text-[#0c1929] uppercase tracking-wider mb-1.5">
            Name <span className="text-[#8E3012]">*</span>
          </label>
          <input
            id="cf-name"
            name="name"
            type="text"
            required
            autoComplete="name"
            placeholder="Your full name"
            className="w-full px-4 py-3 text-sm rounded-lg border border-[#d0c9be] bg-white text-[#0c1929] placeholder-[#b0a898] focus:outline-none focus:ring-2 focus:ring-[#CC6535] focus:border-transparent transition"
          />
        </div>
        <div>
          <label htmlFor="cf-email" className="block text-xs font-semibold text-[#0c1929] uppercase tracking-wider mb-1.5">
            Email <span className="text-[#8E3012]">*</span>
          </label>
          <input
            id="cf-email"
            name="email"
            type="email"
            required
            autoComplete="email"
            placeholder="you@example.com"
            className="w-full px-4 py-3 text-sm rounded-lg border border-[#d0c9be] bg-white text-[#0c1929] placeholder-[#b0a898] focus:outline-none focus:ring-2 focus:ring-[#CC6535] focus:border-transparent transition"
          />
        </div>
      </div>

      <div>
        <label htmlFor="cf-phone" className="block text-xs font-semibold text-[#0c1929] uppercase tracking-wider mb-1.5">
          Phone <span className="text-[#9a9a8a] font-normal normal-case tracking-normal">optional</span>
        </label>
        <input
          id="cf-phone"
          name="phone"
          type="tel"
          autoComplete="tel"
          placeholder="(214) 555-0100"
          className="w-full px-4 py-3 text-sm rounded-lg border border-[#d0c9be] bg-white text-[#0c1929] placeholder-[#b0a898] focus:outline-none focus:ring-2 focus:ring-[#CC6535] focus:border-transparent transition"
        />
        <p className="mt-1.5 text-[10px] text-[#9a9a8a] leading-snug">
          By providing your phone number, you consent to receive SMS messages from Waypoint Franchise Advisors regarding your inquiry. Msg &amp; data rates may apply. Reply STOP to opt out at any time.
        </p>
      </div>

      <div>
        <label htmlFor="cf-message" className="block text-xs font-semibold text-[#0c1929] uppercase tracking-wider mb-1.5">
          What&apos;s on your mind? <span className="text-[#8E3012]">*</span>
        </label>
        <textarea
          id="cf-message"
          name="message"
          required
          rows={5}
          placeholder="Where are you in the process? What are you trying to figure out?"
          className="w-full px-4 py-3 text-sm rounded-lg border border-[#d0c9be] bg-white text-[#0c1929] placeholder-[#b0a898] focus:outline-none focus:ring-2 focus:ring-[#CC6535] focus:border-transparent transition resize-none"
        />
      </div>

      {status === "error" && (
        <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-2">
          {errorMsg}
        </p>
      )}

      <button
        type="submit"
        disabled={status === "submitting"}
        className="w-full inline-flex items-center justify-center px-8 py-4 text-sm font-semibold tracking-wide text-[#0c1929] bg-[#CC6535] hover:bg-[#D4724A] disabled:opacity-60 disabled:cursor-not-allowed rounded-lg transition-all min-h-[48px]"
      >
        {status === "submitting" ? "Sending..." : "Send Message"}
      </button>

      <p className="text-xs text-center text-[#9a9a8a] leading-relaxed">
        By providing your phone number and submitting this form, you expressly consent to receive text (SMS) messages from Waypoint Franchise Advisors at the number provided. Message frequency varies. Msg &amp; data rates may apply.
        Reply <strong>STOP</strong> to opt out at any time. View our{" "}
        <a href="/privacy" className="text-[#8E3012] hover:underline">Privacy Policy</a>.
      </p>

      <p className="text-xs text-center text-[#9a9a8a]">
        Prefer to skip ahead?{" "}
        <a href="/book" className="text-[#8E3012] hover:underline">Book a call directly</a>
        {" "}or text <a href="sms:+12149951062" className="text-[#8E3012] hover:underline">(214) 995-1062</a>.
      </p>
    </form>
  );
}
