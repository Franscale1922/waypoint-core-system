"use client";
import { useState } from "react";
import Link from "next/link";

type FAQLink = { url: string; label: string };
type FAQCta = { text: string; href: string };

export function FAQItem({
  q,
  a,
  link,
  cta,
  defaultOpen = false,
}: {
  q: string;
  a: string;
  link?: FAQLink;
  cta?: FAQCta;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border-b border-[#e8e0d0]">
      <button
        onClick={() => setOpen(!open)}
        className="w-full text-left py-5 flex justify-between items-start gap-4 group"
        aria-expanded={open}
      >
        <span className="font-medium text-[#0c1929] leading-snug group-hover:text-[#CC6535] transition-colors">
          {q}
        </span>
        <span className="flex-shrink-0 mt-1 text-[#CC6535] text-lg leading-none">
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
                  className="text-[#CC6535] hover:underline break-words"
                >
                  {link.label} →
                </Link>
              </>
            )}
          </p>
          {cta && (
            <div className="mt-4">
              <Link
                href={cta.href}
                className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#0c1929] bg-[#CC6535] hover:bg-[#D4724A] px-5 py-2.5 rounded-lg transition-all"
              >
                {cta.text} →
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

