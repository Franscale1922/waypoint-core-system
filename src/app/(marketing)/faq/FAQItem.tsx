"use client";
import { useState } from "react";
import Link from "next/link";

type FAQLink = { url: string; label: string };

export function FAQItem({ q, a, link }: { q: string; a: string; link?: FAQLink }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-[#e8e0d0]">
      <button
        onClick={() => setOpen(!open)}
        className="w-full text-left py-5 flex justify-between items-start gap-4 group"
        aria-expanded={open}
      >
        <span className="font-medium text-[#0c1929] leading-snug group-hover:text-[#d4a55a] transition-colors">
          {q}
        </span>
        <span className="flex-shrink-0 mt-1 text-[#d4a55a] text-lg leading-none">
          {open ? "−" : "+"}
        </span>
      </button>
      {open && (
        <div className="pb-6 pr-8">
          <p className="text-[#5a5a4a] leading-relaxed">
            {a}
            {link && (
              <>
                {" "}
                <Link
                  href={link.url}
                  className="text-[#d4a55a] hover:underline whitespace-nowrap"
                >
                  {link.label} →
                </Link>
              </>
            )}
          </p>
        </div>
      )}
    </div>
  );
}
